# Batch 28: Router 验证页与 D2E 契约对拍 - 设计方案

## 核心思路

不再为 Router 单独写一个验证页，而是**复制 `d2e-streaming-test.html` 并只替换传输层**。为此 Router 必须提供 Activity 透传模式。

这样做的三重收益：

1. **功能一致由构造保证** —— 渲染管线、Work 面板、基准套件一行不改，不存在移植遗漏
2. **页面本身成为契约回归测试** —— 两个页面的 `export raw` 产出同构 JSON，diff 即可证明 Router 有没有改变 D2E 数据结构
3. **改动量从 1500 行重写降到约 80 行传输层替换**

## 两条并存的下游契约

```text
                          ┌── /v1/conversations/{id}/turns
                          │     归约后：stage / answer / final / error
第三方调用方 ─ API key ────┤     脱敏：无 thought 正文、无工具参数、无上游 ID
                          │     ← 契约不变
                          │
管理员/验证 ─ admin ───────┴── /admin/api/verification/conversations[/{id}]
                                逐帧原样透传上游 Activity
                                仅改写 conversation.id
```

两条路径共用同一套身份、会话存储、指标与日志。区别只在于下游写什么。

### 为什么透传不能开放给第三方

raw activity 携带 `entities[type='thought']` 正文与工具调用参数 —— 那正是 `/v1` 契约刻意不给第三方的内容。若 `prototype-api-key` 可访问透传，脱敏保证即失效。

**准入条件（用户要求移除登录后调整）**：透传接受以下任一：

1. `X-Admin-Key` 头（脚本场景）
2. admin 会话 Cookie
3. **loopback 会话 Cookie**（`POST /local/bootstrap` 签发，无需任何密钥）

第 3 项使验证页无需登录，代价是**安全边界从“管理员 vs 第三方”变为“本机 vs 非本机”**：任何能触达 127.0.0.1:8090 的本机进程都可以自行 bootstrap 并读到 raw activity。因此：

- 透传路由**仅在 `config.localDevelopment` 下注册**
- 该面永远不得暴露到 loopback 之外；若未来托管 Router，必须关闭透传或改回 admin 准入
- 管理控制台 API（`/admin/api/overview` 等）**仍然只接受 admin 凭据**，loopback 会话访问返回 401

## 模块改动

### `d2e/d2eClient.js`

现有 `consumeActivities(response, onActivity)` 解析 JSON 后丢弃原始帧文本。新增底层方法：

```js
async consumeFrames(response, onFrame)   // { event, id, data } 原始帧
async consumeActivities(response, onActivity)  // 基于 consumeFrames，行为不变
```

单一 SSE 读取路径，超时归类与流取消逻辑不重复。

### `http/adminApi.js`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/api/verification/conversations` | 建会话，响应头 `x-ms-conversationid: <opaque>`，body 为 start stream 透传 |
| POST | `/admin/api/verification/conversations/:id` | 发轮次，body `{activity:{...}}`，响应为 Activity 透传 |

路径形状刻意与上游 D2E 对齐，使页面的 `conversationsUrl()` 只需换前缀。

**ID 改写规则**（`rewriteConversationId`）：

```
帧 data 不含上游 conversationId 子串  → 原文透传，零 JSON 往返
帧 data 含上游 conversationId         → parse → 改写 activity.conversation.id → stringify
```

`JSON.parse` / `JSON.stringify` 保持键序，因此往返后结构保真。

透传轮次同样走 `conversationStore.beginTurn` / `completeTurn`，复用租约、TTL 与重复 turn 保护；同样记 `metrics.recordUpstream` 与结构化日志，可在管理控制台观察。

### `http/createApp.js`

**静态资源白名单**（显式映射，无路径拼接）：

| 路径 | 来源 |
|------|------|
| `/prototype-assets/marked.min.js` | `lib/marked.min.js` |
| `/prototype-assets/purify.min.js` | `lib/purify.min.js` |
| `/prototype-assets/streamingActivity.js` | `src/utils/streamingActivity.js` |
| `/prototype-assets/fixtures/new-agent-3p-replay.json` | `examples/fixtures/` |
| `/prototype-assets/fixtures/new-agent-3p-expected.json` | `examples/fixtures/` |

**`/prototype` 单路由 CSP 放宽**：验证页需要从 unpkg 加载 Adaptive Cards。在 `/prototype` 处理器内显式设置 `Content-Security-Policy` 覆盖 helmet 的全局策略，`scriptSrc` 追加 `https://unpkg.com`。管理控制台与其余路由保持严格 CSP。

## 页面替换清单

由 `examples/d2e-streaming-test.html` 复制，改动仅限以下部分：

| 删除 / 替换 | 保持逐行不变 |
|------|------|
| MSAL script 标签、`ensureMsal` / `autoLogin` / `getToken` | `applyActivity` 整条管线 |
| `CFG.appClientId` / `tenantId` / `environmentId` | `uniqueStreamStates` / `revealTick` / `scheduleReveal` / `completeReveal` |
| `environmentHost()`、`AGENTS` 多 agent 表 | `botBubbleFor` / `authoritativeFinal` / `finalizeBubble` |
| Agent 选择器与其 onchange | Work 面板全套（`ensureWorkPanel` / `updateReasoning` / `upsertStage` / `finishSteps`） |
| `post()` 的 Bearer 头 → `credentials:'same-origin'` | `renderExtras` / `renderAdaptiveCard` / `renderSuggestedActions` |
| `conversationsUrl()` → Router verification 路径 | `tidyMarkdown` / `renderMarkdown` / `buildMeta` |
| 资源路径 `../lib/` `../src/` `./fixtures/` → `/prototype-assets/` | **整个基准套件**（`runBenchmark` / `benchProbe` / `percentile` / `summarize` / `renderStackedChart` / `renderBenchResults` / `exportBenchCsv`） |
| 启动流程：MSAL 静默登录 → 管理员密钥登录门 | 浮动日志面板、`consumeSSE`、fixture 回放 |

**`consumeSSE` 一行不改** —— 这是透传设计成立的判据。

### 登录门

无登录门。页面加载时直接 `POST /local/bootstrap` 取得 loopback HttpOnly 会话（与旧验证页一致的机制），然后自动建会话。页面不出现任何密钥输入框。

### `activeAgentKey` 必须为 `'new'`

渲染器在四处以 `activeAgentKey === 'new'` 分支选择 New Agent 的 turn 装配路径（`botBubbleFor` 的 `turn.answerState` 别名、final 分支的状态查找、message 分支的权威终稿）。该常量属于**渲染契约**而非传输配置，因此不得在移除 agent 选择器时改写 —— 改成其他值会静默退化到经典 agent 路径，表现为空气泡与重复气泡。

### 导出区分

`export raw` 结构与 d2e 页一致，仅两处标记来源：

```json
{ "evidenceType": "router-passthrough-export", "transport": "router-verification" }
```

文件名 `router-raw-<timestamp>.json`。d2e 页为 `d2e-raw-<agent>-<timestamp>.json`、`evidenceType: "live-client-export"`。

## 契约对拍流程

```text
1. d2e 页（直连）  发问题 Q → export raw → A.json
2. Router 页（透传）发问题 Q → export raw → B.json
3. diff A.activities B.activities
   预期唯一差异：conversation.id
   出现其他差异 = Router 改变了 D2E 数据结构
```

## 旧页面处置

`examples/d2e-router-streaming-test.html` 被新页面覆盖。原文件先移入 `.archive-batch-28/`（gitignore 覆盖），待用户确认新页可用后删除。

## 失败模型

| 条件 | 结果 |
|------|------|
| 未登录访问 verification | `401 ADMIN_AUTHENTICATION_REQUIRED` |
| 用 prototype-api-key 访问 verification | `401` |
| 会话不存在或过期 | `404 CONVERSATION_NOT_FOUND` |
| 同会话已有进行中的轮次 | `409 CONVERSATION_BUSY` |
| 上游超过 `UPSTREAM_TIMEOUT_MS` | `504 UPSTREAM_TIMEOUT`，页面按连接中断处理并提示重试 |

## 风险

| 风险 | 缓解 |
|------|------|
| 透传泄漏 thought/工具参数给第三方 | admin 认证；测试断言 prototype key 返回 401 |
| 上游 conversationId 泄漏 | 逐帧改写；测试断言导出物不含上游 ID |
| JSON 往返破坏结构 | 仅在命中 ID 时往返；测试断言往返前后键序与内容一致 |
| CSP 放宽影响管理控制台 | 放宽范围限定在 `/prototype` 单路由响应头 |
| 基准跑批撞限流 | verification 走 admin 桶（300/min），不占业务桶 |
