# Batch 25: Livestreaming 兼容性与渲染统一 — 执行检查清单

## 批次 1 — 兼容性与健壮性（DirectLineService）

- [ ] 1.1 新增 `_getStreamInfo(activity)`（channelData + entities[streaminfo]）
- [ ] 1.2 `_handleActivity` 改用 `_getStreamInfo`
- [ ] 1.3 `_handleStreamingChunk` 增加 `lastSequence` 乱序丢弃
- [ ] 1.4 首片段稳定 id（`entry.id = activity.id || streamId`）
- [ ] 1.5 `_finalizeStream` 不覆盖 entry.id，记录 finalId 到 _seenIds
- [ ] 1.6 空 final → 移除 entry + 发 `streamCancelled`
- [ ] 1.7 application 监听 `streamCancelled` 移除气泡
- [ ] 1.8 回写 Batch 8 文档结论（checklist/requirements/design/test-plan）

## 批次 2 — 渲染统一（application + messageRenderer 复用）

- [x] 2.1 `_handleStreamingChunk` 标记 `entry.meta.wasStreamed = true`
- [x] 2.2 重写 `application.handleStreamingChunk` → `messageRenderer.handleStreamingMessageDirect(entry)`
- [x] 2.3 移除 `_streamingElements` 裸气泡逻辑
- [x] 2.4 `handleCompleteMessage` 检测 `wasStreamed` → `finalizeStreamingMessage`
- [x] 2.5 验证无重复气泡

## 批次 3 — 真实数据修正（2026-06-15）

- [x] 3.1 基于 `dump.json` 确认真实 streaming 形态（informative→streaming→final）
- [x] 3.2 发现并修复 DELTA 累加 bug（`_handleStreamingChunk` 累加器重写）
- [x] 3.3 离线回放验证（682 片段重建全文 == final，1427 字符）
- [x] 3.4 验证报告追加第 11 节（真实抓包确认）
- [ ] 3.5 用真实 streaming agent 端到端浏览器验证

## 文档同步

- [ ] CHANGELOG.md `[Unreleased]` 追加
- [ ] docs/iterations/TODO.md 增加 Batch 25
- [ ] docs 架构文档（directline-service.md 扩展点）更新
- [ ] Batch 8 文档结论更正

## 测试

- [ ] 启动本地服务，连接真实 Copilot Studio agent
- [ ] 观察 console：原生 streaming 是否检测到、entities 路径是否生效
- [ ] 流式气泡 Markdown/图标/指标是否正常
- [ ] final 无重复气泡
- [ ] 用户确认
