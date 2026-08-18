# Batch 26: D2E Delegated Gateway 原型验证 - 设计方案

## 架构定位

```text
第三方 / Router 测试页
        |  prototype API key
        v
Localhost Router (127.0.0.1:8090)
  |-- Caller Access Control
  |-- Conversation Store (opaque ID -> D2E conversationId)
  |-- Delegated Identity Runtime (MSAL Node)
  |-- D2E Activity Reducer
  `-- Downstream SSE Writer
        |
        | delegated Power Platform token
        v
Copilot Studio New Agent /agenticruntime/3p
```

外部调用方身份与 Power Platform 上游身份严格分离。第三方只持有 Router API key 和 opaque conversation ID；Power Platform token、environment ID、schema name 与真实 D2E conversation ID 均留在服务端。

## 模块边界

| 模块 | 职责 | 禁止 |
|------|------|------|
| `server` | HTTP 路由、CORS、限流、错误通道、SSE flush | 解析 MSAL cache 或拼接答案 |
| `delegatedIdentity` | auth code、cache plugin、`acquireTokenSilent`、`reauthRequired` | ROPC、向客户端返回 token |
| `encryptedMsalCache` | AES-256-GCM、local file ETag、原子持久化 | 记录明文 token/cache |
| `conversationStore` | opaque ID、主体绑定、TTL、租约/版本 | 信任客户端传入真实 D2E ID |
| `d2eClient` | endpoint、D2E POST、上游 SSE 分帧 | 下游 UI 或客户授权 |
| `activityReducer` | Activity -> `stage/answer/final/error` | HTTP、DOM、Azure SDK |
| Router test page | 外部 API 消费、视觉呈现、指标与导出 | MSAL、Power Platform token、D2E endpoint |

## 身份流程

### 初始化

1. 管理员访问 `/admin/auth/start`。
2. Router 生成 state/PKCE 信息并跳转 Entra authorization endpoint。
3. `/admin/auth/callback` 使用 MSAL Node 兑换 token。
4. 回调验证 tenant 与允许的上游用户 object ID。
5. MSAL serialized cache 由 AES-256-GCM 加密，原子写入 private local file；账号 homeAccountId 单独存储但不记录 UPN。
6. 身份状态切换为 `ready`。

### 运行时

1. 每次 D2E 调用前从 local state store 恢复 cache。
2. 调用 `acquireTokenSilent({ account, scopes })`。
3. MSAL cache plugin 在发生刷新时用 SHA-256 ETag 条件写回 mode-600 文件。
4. `interaction_required`、账号禁用或 consent 撤销时，状态切换为 `reauthRequired`。
5. Router 返回 `503 UPSTREAM_IDENTITY_REAUTH_REQUIRED`，不循环触发交互登录。

## Secret 与状态存储

### `.env.local`

- `LOCAL_ENTRA_CLIENT_SECRET`
- `LOCAL_MSAL_CACHE_ENCRYPTION_KEY`
- `LOCAL_PROTOTYPE_API_KEY`
- `LOCAL_ADMIN_SESSION_SIGNING_KEY`

该文件 mode 600 且被 gitignore。服务不加载 Key Vault、Blob 或 Managed Identity SDK。

### `.local-state/`

- `identity/msal-cache.bin`：AES-256-GCM envelope
- `identity/account.json`：homeAccountId、tenantId、状态，不含 UPN/token
- `conversations/{opaqueId}.json`：客户主体哈希、agentId、上游 conversationId、状态、TTL、version

所有写入使用同目录 temp file + atomic rename，最终文件 mode 600；目录被 gitignore。

## 外部 API

### `GET /healthz`

只表示进程存活，不读取 secret 或 token。

### `GET /readyz`

返回 Router 是否配置完成及 upstream identity state；不返回账号或 secret。

### `POST /local/bootstrap`

仅在 loopback local runtime 可用。签发 8 小时、`HttpOnly`、`SameSite=Strict` 的 HMAC session cookie，页面无需把 API key 暴露给 JavaScript。

### `POST /admin/auth/start`

启动一次管理员授权。callback 只接受目标 tenant 和允许的用户 object ID。

### `POST /v1/conversations`

```json
{ "agentId": "knowledge-new" }
```

返回：

```json
{ "conversationId": "opaque-id", "expiresAt": "..." }
```

### `POST /v1/conversations/{id}/turns`

```json
{ "text": "...", "clientTurnId": "..." }
```

响应为 `text/event-stream`：

```text
event: stage
data: {"turnId":"...","stage":"...","status":"started"}

event: answer
data: {"turnId":"...","text":"snapshot","mode":"snapshot"}

event: final
data: {"turnId":"...","text":"complete","finishReason":"completed"}
```

`final` 或 `error` 后不得再输出业务事件。无业务事件时每 20 秒发送 SSE comment keep-alive。

### `DELETE /v1/conversations/{id}`

关闭并删除映射；不尝试删除 Copilot Studio 服务端会话。

## D2E Adapter

- Environment: `448464af-64af-ec92-a521-6d203cf6811d`
- Agent schema: `Default_KnowledgeAgentNewCopilot_sodjEw`
- Runtime family: `agenticruntime/3p`
- API version: `1`
- Scope: `https://api.powerplatform.com/.default`
- Upstream header: `Accept: text/event-stream`

建会话时完整消费上游 start stream 并读取 `x-ms-conversationid`。发送 turn 后逐 frame 解析 Activity；上游 D2E POST 一旦发出，不做自动重放。

## Reducer

- `thought`、`toolCall`、`informative` -> 脱敏 `stage`
- `streamType=streaming` -> 累积/修订后的 `answer` snapshot
- `streamType=final` 或 authoritative message -> 单一 `final`
- 空 activity 不输出
- 重复 sequence、晚到 chunk、重复 final 丢弃
- 不输出 raw thought、工具参数、raw Activity

Reducer 使用 `examples/fixtures/new-agent-3p-replay.json` 做确定性回放，并与新增 Gateway expected event fixture 对比。

## Router 验证页

`examples/d2e-router-streaming-test.html` 使用 Clawpilot 主题变量，并保留现有 D2E 页面中的聊天、Work panel、Benchmark 指标和日志能力，但移除 MSAL、Agent picker 与直接 D2E URL。

页面状态：

- Disconnected
- Connect：先检查 Router ready，再自动创建 conversation；只有进入 Conversation ready 才启用输入与 Send
- upstream reauthentication required：保持输入与 Send 禁用
- Send：只重置当前 turn reducer 与 evidence，按 `user → Work panel → answer` 追加到现有消息历史
- New conversation：显式创建替代会话，清空上一会话的可见历史与 turn evidence，并禁用 Export 直到新 turn 完成
- Streaming
- Final / interrupted

API key 使用 password input，只保存在内存；不写 localStorage、URL 或导出文件。localhost 默认使用 HttpOnly local session，API key 字段可保持为空。回答用 Router 同源托管的 marked + DOMPurify 安全渲染；公开 Work label 不显示 upstream tool-call ID。

## 本地运行边界

- `npm run start:local` 从 `.env.local` 启动服务。
- HTTP listener 固定为 `127.0.0.1`，不是公网接口。
- Entra redirect URI 为 `http://localhost:8090/admin/auth/callback`。
- Entra app registration 与 delegated Power Platform consent 继续使用；它们属于身份依赖，不是 Azure hosting。
- 先前创建的 Bicep 与 Azure POC 资源已退出实施主线，等待用户确认后单独清理。

## 失败模型

| 条件 | 结果 | 上游调用 |
|------|------|----------|
| API key 无效 | `401 AUTHENTICATION_REQUIRED` | 否 |
| conversation 不存在/主体不匹配 | `404 CONVERSATION_NOT_FOUND` | 否 |
| 同会话已有 turn | `409 CONVERSATION_BUSY` | 否 |
| `interaction_required` | `503 UPSTREAM_IDENTITY_REAUTH_REQUIRED` | 否 |
| D2E POST 前网络失败 | `502 UPSTREAM_UNAVAILABLE` | 最多有限重试 |
| D2E POST 后中断 | SSE `error: STREAM_INTERRUPTED` | 不重放 |

## 验证顺序

1. Reducer fixture tests
2. 加密 cache/local ETag/会话状态单元测试
3. 本地 fake-D2E SSE 集成测试
4. Entra app localhost callback + 管理员一次性授权
5. 进程重启与 silent token recovery
6. API key 错误不触发上游调用
7. CLI 真实 New Agent streaming 验证
8. 浏览器无 key 的 HttpOnly session streaming 验证
9. Study-Room 文章写入实测结果

## 风险与限制

| 风险 | 缓解 |
|------|------|
| Conditional Access 要求重登 | fail closed + 管理员 runbook |
| 所有上游审计显示同一用户 | Router 记录外部 subjectHash/correlationId |
| local file 并发写 cache | ETag 条件写入，冲突后重新加载 |
| 浏览器暴露 API key | loopback HttpOnly session；key 不进入 JS/URL/Web Storage |
| localhost 无公网高可用 | 明确限定为验证原型；生产化需另立架构批次 |
| 上游 POST outcome unknown | 禁止自动重放，返回稳定错误 |
