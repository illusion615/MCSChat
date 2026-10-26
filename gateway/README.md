# MCSChat D2E Local Router · 使用指南

本地 Node.js Router，通过第三方 REST/SSE API 暴露 Copilot Studio New Agent `/agenticruntime/3p` D2E 数据流。

**核心设计**：一台受控 Entra 用户代理 Power Platform 令牌；第三方调用方从不接收或获取 Power Platform 令牌；S2S/应用专属令牌未实现；仅监听 `127.0.0.1`，不是生产互联网网关。

---

## 快速开始

### 第 1 步：前置条件

- **Node.js 22.x 或更新版本**（由 @azure/msal-node 5.5.0 要求）
- **Copilot Studio 中已配置的 New Agent**
- **Entra App Registration**（拥有 Power Platform 权限、Power Apps 授权已获得）
- **一台受控 Entra 用户**（拥有 Power Apps 和该 Copilot 工作区的访问权限）

### 第 2 步：克隆仓库并安装依赖

```bash
# 进入 gateway 目录
cd gateway

# 安装依赖
npm install
```

### 第 3 步：获取必要的配置参数

在 Entra 应用注册和 Power Platform 中获取：

- **Tenant ID**：你的 Azure 租户 ID
- **ENTRA_CLIENT_ID**：应用注册的 Application (client) ID
- **POWER_PLATFORM_ENVIRONMENT_ID**：Copilot 工作空间的环境 ID（Power Platform 管理中心查看）
- **POWER_PLATFORM_SCHEMA_NAME**：Agent 所属的 Power Platform 解决方案内的 schema name

### 第 4 步：生成 4 个秘钥

```bash
# ENTRA_CLIENT_SECRET 在 Entra App Registration 的 Certificates & secrets 创建，手动复制值

# 其余四个密钥：
npm run generate:secrets
```

该脚本输出四个可直接粘贴到 `.env.local` 的行：

| 变量 | 编码 | 用途 |
|------|------|------|
| `LOCAL_MSAL_CACHE_ENCRYPTION_KEY` | **base64**（32 字节） | 加密 MSAL 令牌缓存（AES-256-GCM） |
| `LOCAL_PROTOTYPE_API_KEY` | hex | `/v1` Router API 调用方凭据 |
| `LOCAL_ADMIN_API_KEY` | hex，**可选** | 控制台密码；留空则控制台无密码，可在界面里自行设置 |
| `LOCAL_ADMIN_SESSION_SIGNING_KEY` | hex | 仅用于签名浏览器会话 Cookie |

> 缓存密钥必须是 base64。填入 hex 会在启动时报 `MSAL cache encryption key must be 32 bytes encoded as base64`。

### 第 5 步：配置 `.env.local`

```bash
# 复制示例配置
cp .env.example .env.local

# 编辑 .env.local，填入 4 个 LOCAL_* 秘钥
nano .env.local
# 或用你常用的编辑器打开
```

**关键参数**：

| 参数 | 来源 | 示例 |
|------|------|------|
| `PORT` | 自定义（本地） | `8090` |
| `TENANT_ID` | Azure 租户 ID | `899aca58-7bdc-45e9-bec6-1cc9d3f12894` |
| `ENTRA_CLIENT_ID` | Entra App Registration | `00000000-0000-0000-0000-000000000000` |
| `PUBLIC_BASE_URL` | **必填**，Entra redirect URI 的前缀 | `http://localhost:8090` |
| `LOCAL_ENTRA_CLIENT_SECRET` | Entra Certificates & secrets | `xxx_xxx_xxx` |
| `LOCAL_MSAL_CACHE_ENCRYPTION_KEY` | `generate:secrets` 输出 | base64（44 字符） |
| `ALLOWED_UPSTREAM_USER_OID` | 受控 Entra 用户的 Object ID | `00000000-0000-0000-0000-000000000000` |
| `POWER_PLATFORM_ENVIRONMENT_ID` | Power Platform 管理中心 | `448464af-64af-ec92-a521-6d203cf6811d` |
| `POWER_PLATFORM_SCHEMA_NAME` | Power Platform 解决方案 | `Default_KnowledgeAgentNewCopilot_sodjEw` |
| `LOCAL_PROTOTYPE_API_KEY` | `generate:secrets` 输出 | 32 字符十六进制 |
| `LOCAL_ADMIN_API_KEY` | `generate:secrets` 输出 | 48 字符十六进制 |
| `LOCAL_ADMIN_SESSION_SIGNING_KEY` | `generate:secrets` 输出 | 64 字符十六进制 |
| `ALLOWED_ORIGINS` | CORS 白名单 | `http://localhost:8000,http://127.0.0.1:8000` |
| `ADMIN_SESSION_TTL_MINUTES` | 可选，控制台会话时长 | `60` |
| `ADMIN_RESTART_DRAIN_MS` | 可选，重启前排空宽限 | `10000` |
| `LOG_BUFFER_SIZE` | 可选，内存日志条数 | `2000` |
| `RETENTION_DAYS` | 日志、会话记录和轮次轨迹保留期 | `30` |
| `DEBUG_CAPTURE` | 捕获原始 Activity / thought 与归约事件（仅 loopback） | `true` |

**安全检查**：

```bash
# 确保文件权限为 600（仅所有者可读）
chmod 600 .env.local

# 语法检查全部源文件
npm run check
```

### 第 6 步：首次启动 — 管理员授权

```bash
# 启动本地服务
npm run start:local
```

日志会显示：
```
Delegated identity not ready (cache missing). 
Start administrator authorization: POST /admin/auth/start
```

**打开管理控制台**：

```
http://127.0.0.1:8090/admin
```

1. 输入 `LOCAL_ADMIN_API_KEY` 登录（密钥只存内存，换成 HttpOnly 会话 Cookie）
2. 在【仪表盘】的「委派身份」卡片中点击 **开始授权**
3. 在新标签页中用受控 Entra 用户登录并授权
4. Entra 回调 `/admin/auth/callback` 后自动返回控制台，身份状态变为 **身份就绪**

Router 会把加密的 MSAL 缓存持久化到 `.local-state/identity/msal-cache.bin`（mode 600），重启后自动恢复。

<details>
<summary>不用控制台，改用 curl 触发授权</summary>

```bash
curl -X POST http://127.0.0.1:8090/admin/auth/start \
  -H "X-Admin-Key: $LOCAL_ADMIN_API_KEY" \
  -H "Content-Type: application/json"
```

响应：

```json
{ "authorizationUrl": "https://login.microsoftonline.com/.../authorize?client_id=..." }
```

在浏览器中打开该 URL 完成登录即可。
</details>

### 第 7 步：验证本地服务

#### 方式 A：使用验证页面（推荐 UI 演示）

打开浏览器：
```
http://127.0.0.1:8090/prototype
```

无需登录 —— 页面自动取得 loopback 会话并建会话。该页由 `examples/d2e-streaming-test.html` 复制而来，**仅替换传输层**，因此功能与直连页完全一致：

1. 聊天、Work 面板（reasoning 转录 + tool 阶段）、打字机逐步显示、Markdown 渲染
2. 性能基准套件：题库 / 批次 / TTFT 与 Total 的 avg·p50·p90·max / 堆叠图 / CSV 导出
3. 浮动日志面板：copy / clear / **export raw**
4. Adaptive Cards 与 Suggested Actions
5. `?debug=1` 显示 fixture 回放

#### 方式 B：使用 curl 验证（API 验证）

```bash
# 创建会话
CONV_ID=$(curl -s -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "knowledge-new"}' | jq -r '.conversationId')

echo "Created conversation: $CONV_ID"

# 发送一个转向，使用 curl 读取 SSE
curl -N http://127.0.0.1:8090/v1/conversations/$CONV_ID/turns \
  -X POST \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "clientTurnId": "turn-1"}'
```

可以观察到：
- `event: stage` — 处理阶段（脉络/工具调用，已脱敏）
- `event: answer` — 累计的答案快照
- `event: final` — 完整答案（流的最后一个业务事件）

### 第 8 步：集成到主应用

在 MCSChat 浏览器应用中使用 New Agent D2E：

```javascript
// src/core/application.js
const agentType = new URLSearchParams(location.search).get('agent');
if (agentType === 'new') {
  const connector = new DirectEngineConnector(
    'http://127.0.0.1:8090',  // 本地 Router 地址
    agentUserId                 // 该 Agent 对用户可见的 ID
  );
  // ... 连接事件处理
}
```

**验证页面** (examples/d2e-router-streaming-test.html) 已包含完整集成示例，包括：
- Connect 流（创建会话 → 启用 Send）
- 多转向消息历史
- 实时数据流处理
- JSON 证据导出

---

## 常见命令

| 命令 | 用途 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run start:local` | 启动本地服务（带监督者，支持控制台重启） |
| `npm run start:local:once` | 直接启动单进程（调试用，不支持重启） |
| `npm run verify:local` | 运行 CLI 取证脚本，输出 `evidence/local-router-live.json` |
| `npm test` | 运行全量测试 |
| `npm run check` | 对 `src/` 与 `scripts/` 全量语法检查 |
| `npm run generate:secrets` | 生成四个随机密钥 |
| `node scripts/fakeRouterServer.js` | 启动假 Router（无需 Power Platform） |

---

## 管理控制台

地址：`http://127.0.0.1:8090/admin`，中英双语、light/dark 自适应。

### 登录模型

**默认无密码。** 首次打开 `http://127.0.0.1:8090/admin` 直接可用，顶部横幅提示尚未设置密码，【控制台安全】卡片可一键设置。

| 状态 | 行为 |
|------|------|
| 无密码（默认） | 控制台直接打开；本机任何进程可访问 |
| 在界面设了密码 | 需要登录；只存 scrypt 加盐哈希于 `.local-state/admin/credential.json`，明文不落盘 |
| `.env.local` 设了 `LOCAL_ADMIN_API_KEY` | 该密钥优先，且无法在界面修改（适合脚本/CI） |

密码登录后换取 `mcschat_admin` 会话 Cookie（`HttpOnly` / `SameSite=Strict` / `Path=/admin`，默认 60 分钟）。密码只存在内存，不写 localStorage、URL 或导出文件。会话令牌无状态，服务重启后仍然有效。

> 改了 `.env.local` 后需要重启**监督者**（终端 Ctrl+C 后重跑 `npm run start:local`）—— 控制台的【重启 Router】只重启子进程，不会重读 `.env.local`。

### 三个视图

| 视图 | 内容 |
|------|------|
| 仪表盘 | Agent 业务请求/轮次/错误计数、近 5 分钟曲线、最近 20 个轮次、TTFT 与总耗时 p50/p95、业务路由与状态码分布、上游调用、委派身份、运行时、控制台安全与脱敏后的 Router 配置。卡片可从右上角句柄拖动，顺序保存在浏览器；`Alt+方向键` 可用键盘重排，↺ 恢复默认布局 |
| 日志 | SSE 实时流、级别/关键字/correlationId 过滤、暂停与继续、导出 |
| 会话 | 会话记录、状态与管理员强制关闭 |

仪表盘的请求 KPI、5 分钟曲线、HTTP 请求耗时、路由和状态码默认只统计 Agent 业务面（`/v1/*` 与 verification passthrough）。控制台自身的 `/admin/*` 请求不进入这些图表，避免轮询流量淹没 Agent 调用。

### 重启机制

`npm run start:local` 启动的是监督者 `scripts/routerSupervisor.js`：

```
控制台点击重启 → 202 → 停止接受新连接 → SSE 终止帧 → 排空在途请求（默认 10s）
  → 进程以退出码 75 退出 → 监督者重新拉起 → 页面轮询 /healthz 恢复后自动刷新
```

连续 5 次在 3 秒内退出会触发崩溃回退，监督者停止重启并报错。SIGINT / SIGTERM 走同一排空序列。

### 日志与指标边界

- 日志同时写入内存环形缓冲与 `.local-state/logs/router-YYYY-MM-DD.ndjson`，重启时回填最近记录
- 所有字段经脱敏：token / secret / cookie / MSAL 缓存 / UPN 一律丢弃，高熵长串替换为 `[redacted]`
- 会话 ID 与调用方主体只以 SHA-256 前缀形式出现
- 普通日志与诊断导出不记录答案正文；独立的 turn trace 会保留 Activity 正文、thought 和归约事件，但仍强制剥离凭据
- 指标按 business / console / support / other 分面；仪表盘默认只展示 Agent business 面

### 调试证据与保留

- `.local-state/conversations/`：会话功能 TTL 仍为 60 分钟，但过期和关闭只改变状态，不再删除记录
- `.local-state/debug/<conversationId>/<turnId>.ndjson`：逐轮上游 Activity、下游事件、时序与错误；单轮上限 256 KB
- 日志、会话记录与轮次轨迹默认保留 30 天；每 5 分钟按保留期清理，PKCE 授权事务继续使用自己的短 TTL
- 管理控制台可关闭后续 debug capture，并按明确时间点手工删除更早的日志或会话；删除会话时同步删除孤儿轨迹

### 导出

| 端点 | 内容 |
|------|------|
| `GET /admin/api/export/logs?format=json\|ndjson\|txt` | 按当前筛选导出日志 |
| `GET /admin/api/export/metrics` | 指标快照 |
| `GET /admin/api/export/diagnostics` | 诊断包（概览 + 指标 + 日志 + 脱敏配置） |
| `GET /admin/api/settings` / `PATCH /admin/api/settings` | 证据占用、保留期与 debug capture 开关 |
| `DELETE /admin/api/logs?before=<ISO>` | 精确删除早于指定时刻的日志 |
| `DELETE /admin/api/conversations?before=<ISO>` | 删除早于指定时刻的会话记录与孤儿轨迹 |
| `GET /admin/api/conversations/:id/turns` | 列出已捕获轮次 |
| `GET /admin/api/debug/:conversationId/:turnId` | 下载单轮 NDJSON 轨迹 |

---

## 两条并存的下游契约

```text
第三方 ─ prototype-api-key ─► POST /v1/conversations/{id}/turns
                                归约后：stage / answer / final / error
                                脱敏：无 thought 正文、无工具参数、无上游 ID

本机验证 ─ loopback 会话 ──► POST /admin/api/verification/conversations[/{id}]
                                逐帧原样透传上游 Activity
                                仅改写 activity.conversation.id 为不透明 ID
```

> **安全边界**：透传面接受 `X-Admin-Key`、admin 会话或 `POST /local/bootstrap` 签发的 loopback 会话。因此它的边界是“**本机 vs 非本机**”而非“管理员 vs 第三方”：任何能触达该端口的本机进程都能读到 raw activity（含 reasoning 正文与工具参数）。路由仅在 `localDevelopment` 下注册，**若未来托管 Router，必须关闭透传或改回 admin 准入**。管理控制台 API 仍然只接受 admin 凭据。

### 契约对拍（检测 Router 是否改变了 D2E 数据结构）

```text
1. examples/d2e-streaming-test.html（直连）  发问题 Q → export raw → A.json
2. http://127.0.0.1:8090/prototype（透传） 发问题 Q → export raw → B.json
3. diff A.activities B.activities
   预期唯一差异：conversation.id
   出现其他差异 = Router 改变了 D2E 数据结构
```

两个页面的渲染管线、Work 面板与基准套件是逐字节相同的代码，因此行为差异只可能来自传输层。

---

## 架构和数据流

```
┌─────────────────────┐
│  MCSChat 浏览器应用  │
│ (examples/*.html)   │
└──────────┬──────────┘
           │ REST/SSE
           ↓
┌──────────────────────────┐
│   D2E Local Router       │
│   (gateway/)             │
│                          │
│ • 会话映射               │
│ • Token 缓存管理         │
│ • 流标准化               │
└──────────┬───────────────┘
           │ SSE + Token
           ↓
┌──────────────────────────┐
│  Copilot Studio          │
│  New Agent D2E Upstream  │
│  (/agenticruntime/3p)    │
└──────────────────────────┘
```

**关键特性**：

| 特性 | 说明 |
|------|------|
| **会话映射** | 浏览器获得不透明会话 ID；Router 内部维护到上游会话的映射 |
| **令牌缓存** | MSAL 缓存以 AES-256-GCM 加密，存储在 `.local-state/identity/msal-cache.bin` |
| **SSE 标准化** | 简化上游复杂流为：`stage` → `answer` → `final` \| `error` |
| **会话生命周期** | 60 分钟功能 TTL（可配置）；超时后不可继续，但记录保留至 30 天证据保留期或手工删除 |
| **并发安全** | 使用原子文件写（temp + rename）+ ETag 冲突检测 |

---

## 测试和验证

### 运行完整测试套件

```bash
npm test
```

覆盖范围：
- ✅ New Agent 重放减速（消除重复的 `final` 事件）
- ✅ 晚期/无序块抑制
- ✅ 最终事件去重
- ✅ SSE 帧格式
- ✅ 缓存加密和篡改检测
- ✅ 本地原子 ETag 冲突行为
- ✅ 会话所有权、锁定和重复转向拒绝
- ✅ 假上游 REST/SSE 端到端行为

### 对真实 New Agent 的本地验证

已通过对配置的 New Agent 的验证：
- ✅ 静默缓存恢复（无需再次登录）
- ✅ 标准化 SSE（流事件映射到 `stage` / `answer` / `final`）
- ✅ 最终文本匹配（答案内容正确）
- ✅ 无效密钥拒绝（安全验证）
- ✅ 多转向会话（状态隔离和持久化）

证据记录在 `evidence/local-router-live.json`（已忽略，包含敏感数据）。

---

## 故障排查

### 问题：`Delegated identity not ready`

**症状**：日志显示缓存缺失或令牌获取失败

**解决方案**：
```bash
# 1. 完成管理员授权流（见"第 6 步"）
# 2. 验证 ALLOWED_UPSTREAM_USER_OID 在 .env.local 中是否正确
# 3. 检查受控用户是否有 Power Apps 工作区访问权限
```

### 问题：`401 Unauthorized` 响应

**症状**：API 调用返回 401

**原因**：
- `Authorization` 头缺失或格式错误（应为 `Bearer <API_KEY>`）
- API 密钥不匹配
- 浏览器 HttpOnly 会话 cookie 缺失

**解决方案**：
```bash
# 验证 API 调用格式
curl -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer <YOUR_LOCAL_PROTOTYPE_API_KEY>" \
  -H "Content-Type: application/json"

# 如果是浏览器会话，先调用 /local/bootstrap 获取会话 cookie
curl -c cookies.txt -X POST http://127.0.0.1:8090/local/bootstrap
```

### 问题：`CORS 错误`或`Origin not allowed`

**症状**：浏览器控制台显示 CORS 拒绝

**解决方案**：
```bash
# 检查 .env.local 中的 ALLOWED_ORIGINS
# 确保你的浏览器地址在列表中
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000,https://your-domain.com
```

### 问题：`ENOTFOUND` 或网络超时

**症状**：Router 无法连接上游 Copilot Studio

**原因**：
- 上游 API 端点配置错误
- Power Platform 环境 ID 或 schema name 不匹配
- 受控用户无访问权限

**解决方案**：
```bash
# 验证配置的环境 ID 是否正确
# 在 Power Platform 管理中心确认 schema name
# 检查日志中的上游请求 URL
```

---

## 安全最佳实践

- ✅ 生产环境绝不暴露到互联网（仅 `127.0.0.1` 监听）
- ✅ `.env.local` 权限设为 600（`chmod 600`）
- ✅ MSAL 缓存自动加密（AES-256-GCM）
- ✅ 第三方调用方永不接收 Power Platform 令牌
- ✅ S2S/应用专属模式未实现（仅用户委托）
- ✅ HttpOnly session cookie 用于浏览器认证

---

## 下一步

- 在 `examples/d2e-router-streaming-test.html` 中查看完整集成示例
- 使用 `scripts/generateSecrets.js` 生成新秘钥
- 参考 `src/d2e/` 目录了解数据流处理逻辑
- 检查 `test/` 目录查看完整的测试用例
