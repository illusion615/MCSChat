# Batch 26: D2E Delegated Gateway 原型验证 - 需求文档

## 背景

现有 `examples/d2e-streaming-test.html?agent=new` 已验证：有权限的 Entra 用户可以通过 New Agent `/agenticruntime/3p` D2E endpoint 接收真实 Activity SSE。目标是在其前方运行 localhost Router，使第三方调用方不参与 Microsoft 登录，同时继续调用同一个 Copilot Studio New Agent 并获得真实 streaming。

S2S 仍处于 Private Preview，本批次不把 S2S、service principal 或 app-only token 作为候选实现。Router 固定使用一个受控 Entra 用户的 delegated Power Platform token。

## 目标

1. 建立独立的 localhost Router 原型，不修改现有浏览器 D2E connector 的行为。
2. 管理员仅在初始化或 `interaction_required` 时完成 Microsoft 登录；第三方请求不触发 Entra 登录。
3. Router 在 private local files 中加密持久化 MSAL token cache，并通过 `acquireTokenSilent` 获取 delegated token。
4. Router 将上游 Activity SSE 归一化为稳定的外部 `stage`、`answer`、`final`、`error` SSE contract。
5. 创建新的 Router Streaming 验证页，采集 TTFT、总耗时、事件数、最终文本和错误证据。
6. 将真实 localhost 验证过程与结果同步到 Study-Room 的 Copilot Studio Streaming 文章。

## 范围

### Router 后端

- 独立 `gateway/` Node.js 22 子项目；允许在该目录使用 npm，根前端继续保持无 npm、无 bundler。
- Microsoft Entra authorization-code 登录与管理员回调。
- MSAL Node 序列化 cache，AES-256-GCM 加密后保存到 `.local-state/`。
- mode-600 private files、temp file + atomic rename 与 SHA-256 ETag 条件写入。
- `.env.local` 提供 Entra client secret、cache encryption key、prototype API key 与本地 session signing key；文件必须 mode 600 且被 gitignore。
- 服务固定监听 `127.0.0.1`，不暴露为公网生产网关。
- 外部 API：健康检查、身份状态、建会话、发送 turn、关闭会话。
- 每个外部 conversation 使用 opaque ID，服务端映射 D2E `conversationId`。
- 同一 conversation 串行 turn；D2E POST 发出后不自动重放。

### 验证页面

- 新增 `examples/d2e-router-streaming-test.html`。
- 页面不加载 MSAL，不直接持有 Power Platform token。
- 支持 Router URL；localhost 页面通过 signed HttpOnly cookie 建立本地 session，API key 输入仅保留为显式 API contract 验证入口。
- 展示 work stages、流式答案、TTFT、总耗时、事件计数与原始下游 SSE 日志。
- 支持导出脱敏 JSON 验证结果。
- Router 同源托管页面及 marked/DOMPurify assets，完成无 CDN 的安全 Markdown 渲染。

### 本地运行环境

- URL: `http://localhost:8090`
- Listen address: `127.0.0.1`
- State: `gateway/.local-state/`
- Config: `gateway/.env.local`
- Entra app registration: `MCSChat D2E Gateway POC`（保留，供 localhost delegated callback 使用）
- Prototype page: `http://localhost:8090/prototype`

## 非目标

- 不启用或等待 S2S Private Preview。
- 不使用 ROPC，不保存用户名密码。
- 不修改 Copilot Studio Agent 逻辑、知识或工具。
- 不部署 App Service、Storage、Key Vault、APIM、VNet、WAF 或 Container Apps。
- 不把 localhost 原型描述为公网生产架构或生产 SLA。
- 已创建的 Azure POC 资源不属于最终方案；清理作为独立可逆操作，等待用户确认后执行。

## 验收标准

1. Fixture replay 能稳定产生 `stage -> answer snapshot(s) -> final`，且 final 文本与最终 answer 一致。
2. 未完成管理员授权时，Router fail closed 并返回稳定的 `UPSTREAM_IDENTITY_REAUTH_REQUIRED`。
3. 管理员授权后，进程重启仍能从加密 local cache 执行 `acquireTokenSilent`。
4. API key 错误时不调用 Entra 或 D2E；正确 key 可创建 opaque conversation。
5. New Agent `/3p` turn 在 final 前产生非空 answer snapshot；snapshot 数量由上游决定，final 必须与最后 snapshot 一致。
6. Router 接收上游 chunk 后立即 flush 下游 SSE，不缓冲完整答案。
7. 浏览器页面可完成建会话、发送消息、接收 final、导出证据，且无 console error。
8. 记录 localhost URL、时间、身份类型、事件数、TTFT、总耗时、最终结果和限制到 Study-Room 文章。
9. `gateway/` 单元测试、语法检查、真实 CLI 验证和最终浏览器验证全部通过。
