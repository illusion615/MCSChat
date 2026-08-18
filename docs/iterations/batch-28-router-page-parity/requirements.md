# Batch 28: Router 验证页与 D2E 契约对拍 - 需求

## 背景

Batch 26 交付的 `examples/d2e-router-streaming-test.html` 是为 Router 从零写的页面，只有 637 行，缺少 `examples/d2e-streaming-test.html`（1437 行）里绝大部分测试能力：

- 完全没有性能基准套件（题库、批次、TTFT/Total 分位统计、堆叠图、CSV 导出）
- 没有打字机逐步显示，因而基准计时会被渲染动画污染
- Work 面板只有 `<summary>Working</summary>` 简版，没有 reasoning 转录与 tool stage 原地更新
- 没有消息元数据行、浮动日志面板、fixture 回放
- Adaptive Cards 与 Suggested Actions 完全缺失

用户明确要求：**除了连接 agent 走 Router，其余功能与 `d2e-streaming-test.html` 完全一致**。

## 关键障碍

Router 不是代理而是归约器。`/v1/conversations/{id}/turns` 在服务端跑 `D2ETurnReducer`，下游只发 `stage` / `answer` / `final` / `error`。而 d2e 页的整条渲染管线消费的是原始 Bot Framework Activity：

```
activity.channelData.streamType / streamId / streamSequence / chunkType
activity.entities[type='thought'] / entities[type='toolCall']
activity.attachments / activity.suggestedActions
```

因此单纯复制页面无法工作 —— 需要 Router 提供 Activity 透传模式。

## 功能需求

### FR-1 Activity 透传模式

- FR-1.1 Router 提供逐帧原样透传上游 Activity 的 SSE 端点
- FR-1.2 SSE 帧格式与上游一致，页面的 `consumeSSE` 无需改动
- FR-1.3 仅改写 `activity.conversation.id` 为 Router 不透明 ID；其余字段一律不动
- FR-1.4 不含 `conversation.id` 的帧原文透传，不做 JSON 往返
- FR-1.5 建会话响应带 `x-ms-conversationid` 头（值为不透明 ID），与上游同名
- FR-1.6 请求体形状与上游一致：建会话 `{emitStartConversationEvent:true}`，发轮次 `{activity:{...}}`

### FR-2 权限边界

- FR-2.1 透传模式挂在 admin 认证下，第三方 `prototype-api-key` 不可访问
- FR-2.2 `/v1` 归约契约完全不变，第三方脱敏保证不受影响
- FR-2.3 透传会话复用 `conversationStore`，受同样的 TTL、租约与并发保护
- FR-2.4 透传轮次计入指标与日志，可在管理控制台观察

### FR-3 验证页

- FR-3.1 页面由 `d2e-streaming-test.html` 复制而来，仅替换传输层
- FR-3.2 渲染管线、Work 面板、打字机、基准套件、浮动日志、fixture、元数据行全部逐行保留
- FR-3.3 移除 MSAL 与直连 D2E 的 URL 构造
- FR-3.4 移除 Agent 选择器（Router 固定单 agent）
- FR-3.5 页面顶部改为管理员密钥登录，走 `POST /admin/session` 换 HttpOnly Cookie
- FR-3.6 `export raw` 导出结构与 d2e 页一致，仅 `evidenceType` 与文件名前缀区分来源

### FR-4 Router 托管静态资源

页面由 Router 在 `/prototype` 托管，以下依赖必须由 Router 提供：

- FR-4.1 `marked.min.js` / `purify.min.js`（已有）
- FR-4.2 `streamingActivity.js`（来自 `src/utils/`，页面 ES module 导入）
- FR-4.3 `fixtures/*.json`（来自 `examples/fixtures/`）
- FR-4.4 Adaptive Cards CDN 脚本需要放宽 `/prototype` 单一路由的 CSP，管理控制台保持严格

## 非功能需求

- NFR-1 旧 Router 验证页先移入临时归档目录，用户确认后再删除
- NFR-2 既有 52 项测试保持全绿
- NFR-3 监听边界不变，仍只绑 `127.0.0.1`

## 验收标准

- AC-1 页面加载后用管理员密钥登录，自动建会话并进入 Ready
- AC-2 手动发一条消息，Work 面板、打字机、元数据行、Markdown 渲染表现与 d2e 页一致
- AC-3 基准套件可跑小批并产出 TTFT/Total 分位统计、堆叠图、结果卡与 CSV
- AC-4 `?debug=1` 的 fixture 回放通过
- AC-5 同一问题分别在 d2e 页与 Router 页 `export raw`，两份 JSON 除 `conversation.id` 外结构一致
- AC-6 用 `prototype-api-key` 访问透传端点返回 401
- AC-7 全量测试通过，无 console error
