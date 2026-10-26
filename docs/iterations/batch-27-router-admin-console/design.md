# Batch 27: Router 管理控制台 - 设计方案

## 架构定位

```text
管理员浏览器
     |  admin key -> HttpOnly admin session
     v
GET /admin  (双语控制台单页)
     |
     |  /admin/api/*   (独立限流桶)
     v
Localhost Router (127.0.0.1:8090)
  |-- adminApi          会话、身份、日志、指标、会话管理、导出、重启
  |-- observability     logStore (环形缓冲 + 脱敏) / metrics (计数器 + 时间桶)
  |-- runtime lifecycle 排空、优雅关闭、重启信号
  |-- (既有) createApp / delegatedIdentity / conversationStore / d2eClient
        |
        v
     scripts/routerSupervisor.js  退出码 75 -> 重启
```

管理面与业务面共用同一进程但路由、认证、限流三者完全分离。控制台永远不接触 Power Platform token、client secret、MSAL 缓存与上游真实 conversationId。

## 模块边界

在 Batch 26 边界表基础上新增：

| 模块 | 职责 | 禁止 |
|------|------|------|
| `observability/logStore` | 结构化日志环形缓冲、脱敏、订阅推送 | 落盘、记录明文 secret/token/答案正文 |
| `observability/metrics` | 计数器、耗时分位、滚动时间桶 | HTTP、身份、持久化 |
| `runtime/lifecycle` | 排空在途请求、优雅关闭、重启信号 | 业务逻辑、直接写 HTTP 响应 |
| `http/adminApi` | 管理会话、身份操作、日志/指标查询、导出、重启入口 | 调用 D2E、解析 MSAL 缓存、`process.exit` |
| Admin 控制台页 | 展示与操作、双语、导出触发 | MSAL、Power Platform token、D2E endpoint |

`adminApi` 只能通过 `lifecycle.requestRestart()` 表达重启意图，`process.exit` 由 `runtime/lifecycle` 独占。

## 认证模型

```text
1. 管理员在控制台输入 admin key（password 输入框，仅内存）
2. POST /admin/session  (X-Admin-Key: <LOCAL_ADMIN_API_KEY>)
3. 响应 Set-Cookie: mcschat_admin=<payload>.<hmac>
      HttpOnly; SameSite=Strict; Path=/admin; Max-Age=3600
4. 后续 /admin/api/* 仅凭 cookie
5. DELETE /admin/session 清除
```

- payload 为 `{ scope: 'admin', issuedAt, expiresAt, sessionId }`，用 `admin-session-signing-key` 做 HMAC-SHA256
- `authenticateAdmin` 接受 `X-Admin-Key` 头或有效 admin cookie，两者均走 `constantTimeEqual`
- cookie 无状态，重启后依然有效，这是重启功能得以自动恢复的前提
- `sessionId` 只取随机值前 8 位写入日志，用于审计"谁触发了重启"，不含任何身份信息

### Secret 拆分（PRE-3）

| 名称 | 环境变量 | 用途 |
|------|----------|------|
| `admin-api-key` | `LOCAL_ADMIN_API_KEY` | 管理面登录凭据 |
| `admin-session-signing-key` | `LOCAL_ADMIN_SESSION_SIGNING_KEY` | 仅用于签名会话 cookie |

`generateSecrets.js` 相应输出 4 个密钥，且 MSAL 缓存密钥改为 **base64**（PRE-1）。

## 可观测性内核

### logStore

```js
{
  seq, at, level, message,
  correlationId, route, code,
  ...fields            // 仅结构化字段，经 redactor
}
```

- 环形缓冲容量 2000，仅内存
- 级别：`debug` / `info` / `warn` / `error`
- **脱敏为白名单制**：`message` 必须是静态字面量，动态内容一律走 `fields`；`fields` 每个值过 redactor
- redactor 规则：
  - 键名命中 `token|secret|password|authorization|cookie|cache|upn|email` → 丢弃
  - 值形似 JWT / base64 长串（≥ 40 字符高熵）→ 替换为 `[redacted]`
  - 已知需要可读但敏感的标识（conversationId、subject）→ 只保留 SHA-256 前 8 位
- `subscribe(handler)` 返回取消函数，供 SSE 推送；订阅者上限 16，超出拒绝

### metrics

- 计数器：`requests.total`、`requests.inFlight`、`requests.byRoute`、`requests.byStatusClass`、`auth.unauthorized`、`auth.adminEvents`、`ratelimit.hits`、`conversations.{active,created,closed}`
- 上游：`upstream.{createConversation,openTurn}.{count,errors}`、耗时样本
- Turn：TTFT 样本、总时长样本、`turns.outcome.{final,error,interrupted}`、answer 快照数、stage 数
- 分位数用固定容量水塘采样（1024 样本）估算 p50/p95，避免无界内存
- 滚动桶：60 × 5 秒（近 5 分钟）与 60 × 60 秒（近 1 小时），环形覆盖

## Runtime Lifecycle

`src/runtime/lifecycle.js`

```js
class RouterLifecycle {
  attach(server)                       // 持有 http server
  trackRequest() -> release()          // 在途请求计数
  onDrain(handler)                     // SSE 终止帧广播
  requestRestart({ reason, drainMs })  // 202 后异步执行
  shutdown({ exitCode, reason })
}
```

停机序列：

1. 标记 `draining`，`/readyz` 立即返回 503
2. `server.close()` 停止接受新连接
3. 广播 drain 事件 → 所有 SSE 写入器发终止帧并 `end()`
4. 轮询在途请求数，最长等待 `drainMs`（默认 10000，`ADMIN_RESTART_DRAIN_MS` 可配）
5. `process.exit(exitCode)`

重启用 `exitCode = 75`（EX_TEMPFAIL 约定），普通停机用 0。SIGINT / SIGTERM 复用同一序列，退出码 0，顺带解决既有的无优雅关闭问题。

### 监督者

`scripts/routerSupervisor.js`

- 以 `spawn(process.execPath, [...execArgv, serverEntry], { stdio: 'inherit' })` 拉起子进程
- 子进程退出码 75 → 重启；其他退出码 → 监督者以同码退出
- 崩溃回退：连续 5 次在 3 秒内退出则停止重启并报错，避免无限重启风暴
- SIGINT / SIGTERM 转发给子进程后自身退出

脚本变更：

| 脚本 | 命令 |
|------|------|
| `start:local` | `node --env-file=.env.local scripts/routerSupervisor.js` |
| `start:local:once` | `node --env-file=.env.local src/server.js` |

## Admin API

全部要求 admin 认证（`/admin/session` 的 POST 除外，它本身就是认证入口）。

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/admin/session` | admin key 换 HttpOnly 会话 |
| DELETE | `/admin/session` | 登出 |
| GET | `/admin/api/overview` | 身份状态、运行时信息、脱敏配置摘要 |
| POST | `/admin/api/auth/start` | 触发 Entra 授权，返回授权 URL |
| POST | `/admin/api/auth/reset` | 清除 MSAL 缓存与账号状态 |
| GET | `/admin/api/logs` | 环形缓冲查询（`level` / `q` / `correlationId` / `since` / `limit`） |
| GET | `/admin/api/metrics` | 计数器 + 分位数 + 时间桶 |
| GET | `/admin/api/conversations` | 活跃会话列表 |
| DELETE | `/admin/api/conversations/:id` | 强制关闭 |
| POST | `/admin/api/restart` | 202 + 异步排空重启 |
| GET | `/admin/api/stream` | SSE 实时推送 `log` / `metrics` / `shutdown` |
| GET | `/admin/api/export/logs` | `format=json\|ndjson\|txt`，沿用筛选 |
| GET | `/admin/api/export/metrics` | 指标快照 |
| GET | `/admin/api/export/diagnostics` | 诊断包 |

导出响应带 `Content-Disposition: attachment; filename="router-<kind>-<timestamp>.<ext>"`。

既有 `/admin/auth/start` 保留以兼容 curl 流程，内部与 `/admin/api/auth/start` 共用实现。

## 控制台页面

`gateway/public/admin.html`，路由 `GET /admin`。单文件、原生 JS、无构建，复用 prototype 页的 Clawpilot 主题变量与 light/dark 逻辑。

### 视图

1. **仪表盘** — Agent 业务流量 KPI、5 分钟请求/错误曲线与最近 20 个 turn（上图下表）、业务路由/状态码、上游调用、TTFT 与总时长 p50/p95，以及身份、运行时、安全、脱敏配置。监控面 `/admin/*` 和静态资源请求不进入业务图表。九张卡片组成 masonry 网格：活动卡保持全宽，其余卡片保留自然高度并填入最短列；桌面可从句柄拖动或用 `Alt+方向键` 重排，顺序保存到 `localStorage`，移动端退化为固定单列
2. **日志** — SSE 实时流、级别过滤、关键字与 correlationId 过滤、暂停/继续、导出下拉
3. **会话** — 会话记录、状态与强制关闭

### 双语

沿用主应用约定：`data-i18n`、`data-i18n-placeholder`、`data-i18n-title`、`data-i18n-aria`，`t(key, params)` 支持 `${param}` 插值，语言存 `localStorage.appLanguage`，默认取 `navigator.language`。词条表内置于页面，gateway 不依赖浏览器应用的翻译包。

### 重启交互

点击重启 → 二次确认弹窗 → `POST /admin/api/restart` → 页面进入"重启中"态并断开 SSE → 轮询 `/healthz`（1 秒间隔，最长 60 秒）→ 恢复后自动重连 SSE 并刷新全部数据。admin cookie 无状态，无需重新登录。

## 前置修复

### PRE-1 密钥编码

`generateSecrets.js` 的 MSAL 缓存密钥改为 `randomBytes(32).toString('base64')`；其余密钥保持 hex。README / QUICKSTART / `.env.example` 同步更正。

### PRE-2 中间件顺序

`createApp` 中间件重排为：

```
helmet
correlationId + CORS      <-- 前移
rateLimit (业务桶)
express.json
```

使 400 / 413 / 429 响应同样携带 `Access-Control-Allow-Origin` 与 `X-Correlation-ID`。限流 429 改为抛 `GatewayError('RATE_LIMITED', ..., { status: 429, retryable: true })`，统一错误信封。健康端点与 admin 路由不占业务限流桶。

`correlationId` 增加字符白名单 `[A-Za-z0-9._:-]`，非法字符直接改用新生成的 UUID，避免畸形头触发 500。

补充 JSON 404 兜底，使未知路由也返回统一错误信封。

### PRE-3 Secret 拆分

见"认证模型"。`.env.example` 新增 `LOCAL_ADMIN_API_KEY`。

## 对既有文件的改动

| 文件 | 改动 |
|------|------|
| `src/server.js` | 构造 logStore / metrics / lifecycle 并注入；绑定 server 句柄 |
| `src/http/createApp.js` | 中间件重排、请求计时与埋点、logger 替换、挂载 admin 路由、JSON 404 |
| `src/config.js` | 新增 `adminRestartDrainMs`、`adminSessionTtlMinutes` |
| `src/secrets/secretProvider.js` | 新增 `adminApiKey` |
| `src/identity/delegatedIdentity.js` | 新增 `signOut()`；日志走 RouterLogger |
| `src/d2e/d2eClient.js` | 注入可选 metrics sink 记上游耗时 |
| `src/storage/conversationStore.js` | 新增 `list()` 供管理面查询 |
| `scripts/generateSecrets.js` | 输出 4 个密钥，MSAL 密钥改 base64 |
| `package.json` | 新增 `start:local:once`，`start:local` 改走监督者 |

## 失败模型

| 条件 | 结果 |
|------|------|
| admin key 无效 | `401 ADMIN_AUTHENTICATION_REQUIRED` |
| admin cookie 过期或签名不符 | `401 ADMIN_AUTHENTICATION_REQUIRED` |
| SSE 订阅超出上限 | `429 ADMIN_STREAM_LIMIT` |
| 排空超时仍有在途请求 | 记 warn 日志后强制退出 |
| 监督者连续崩溃 5 次 | 停止重启并以非 0 码退出 |
| 强制关闭不存在的会话 | `404 CONVERSATION_NOT_FOUND` |

## 风险

| 风险 | 缓解 |
|------|------|
| 日志字段意外带出敏感值 | 白名单 + redactor，单测断言日志与导出物均不含 secret material |
| admin cookie 被本机其他进程窃取 | `Path=/admin` + HttpOnly + SameSite=Strict + 60 分钟 TTL + 可主动登出 |
| 重启造成在途 turn 丢失 | 排空宽限期 + SSE 终止帧，客户端可感知并重试 |
| 无限重启风暴 | 监督者崩溃回退计数 |
| 改动触及 `createApp` 主链路 | 既有 27 项测试作为回归基线，新增测试后必须全绿 |
