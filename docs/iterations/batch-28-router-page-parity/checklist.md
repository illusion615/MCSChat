# Batch 28: Router 验证页与 D2E 契约对拍 - 执行检查清单

## 0. 方案与审批

- [x] 0.1 用户指出复制 + 换传输层优于逐项移植
- [x] 0.2 确认障碍：Router 是归约器而非代理，需要 Activity 透传模式
- [x] 0.3 用户确认不保留旧页的 Clawpilot 主题、事件时间线与 Export JSON

## 1. 文档先行

- [x] 1.1 requirements.md
- [x] 1.2 design.md
- [x] 1.3 checklist.md
- [x] 1.4 docs/iterations/TODO.md 增加 Batch 28

## 2. Gateway 透传能力

- [x] 2.1 `d2eClient.consumeFrames()` 暴露原始帧
- [x] 2.2 `consumeActivities()` 改为基于 `consumeFrames`，行为不变
- [x] 2.3 `rewriteConversationId()` 仅在命中上游 ID 时做 JSON 往返
- [x] 2.4 `POST /admin/api/verification/conversations` 建会话 + start stream 透传
- [x] 2.5 响应头 `x-ms-conversationid` 返回不透明 ID
- [x] 2.6 `POST /admin/api/verification/conversations/:id` 轮次透传
- [x] 2.7 复用 `conversationStore` 租约与 TTL
- [x] 2.8 透传轮次计入 metrics 与结构化日志

## 3. Router 静态资源

- [x] 3.1 `/prototype-assets/streamingActivity.js`
- [x] 3.2 `/prototype-assets/fixtures/*.json`
- [x] 3.3 `/prototype` 单路由 CSP 放宽（unpkg），其余路由保持严格

## 4. 验证页替换

- [x] 4.1 旧页移入 `.archive-batch-28/`
- [x] 4.2 由 `d2e-streaming-test.html` 复制生成新页
- [x] 4.3 移除 MSAL 与直连 URL 构造
- [x] 4.4 移除 Agent 选择器
- [x] 4.5 `post()` 改为同源凭据
- [x] 4.6 `conversationsUrl()` 指向 verification 路径
- [x] 4.7 资源路径改为 `/prototype-assets/`
- [x] 4.8 移除登录门，改为自动取 loopback 会话（用户要求）
- [x] 4.9 `export raw` 标记来源
- [x] 4.10 确认 `consumeSSE` 与渲染管线零改动

## 5. 测试

- [x] 5.1 透传保真：帧内容与上游一致
- [x] 5.2 `conversation.id` 被改写为不透明 ID
- [x] 5.3 导出物不含上游 conversationId
- [x] 5.4 prototype-api-key 访问 verification 返回 401
- [x] 5.5 未认证访问返回 401
- [x] 5.6 `/v1` 归约契约未受影响（既有测试）
- [x] 5.7 既有 52 项测试全绿

## 6. 文档同步

- [x] 6.1 batch-26 design.md 补充 verification 透传模式
- [x] 6.2 `gateway/README.md` 验证页章节更新
- [x] 6.3 `gateway/QUICKSTART.md` 更新
- [x] 6.4 `docs/GATEWAY_DOCS_INDEX.md` 更新
- [x] 6.5 `CHANGELOG.md` `[Unreleased]` 追加
- [x] 6.6 根 `TODO.md` 更新
- [x] 6.7 `docs/iterations/TODO.md` 更新状态

## 7. 实测

- [x] 7.1 页面自动取会话并进入 Ready（无登录）
- [x] 7.2 手动发消息：Work 面板 / 打字机 / 元数据 / Markdown 均正确（298 字答案、Markdown 列表 7 项）
- [ ] 7.3 基准小批跑通并产出统计、堆叠图、结果卡
- [ ] 7.4 CSV 导出
- [x] 7.5 `?debug=1` fixture 回放 **PASS**（早前 FAIL 系 `activeAgentKey` 误设为 `router` 走了经典分支，已修）
- [~] 7.6 契约对拍：CLI 已证明 26 个 Activity 结构全保真；两页 export raw 对拍待用户执行
- [x] 7.7 无 console error
- [ ] 7.8 用户确认后删除归档旧页
