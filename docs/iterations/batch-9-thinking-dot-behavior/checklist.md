# Batch 9: Thinking Dot 行为改进 — 执行检查清单（完成记录）

## 执行前

- [x] 梳理当前 showing/hiding 入口
- [x] 明确事件触发链路和优先级

## 执行中

### Phase 1: 机制梳理

- [x] 确认 hide() 已做即时清理（clearInterval + DOM 移除）
- [x] 确认 handleCompleteMessage 第一行即调用 hideProgressIndicator
- [x] 定位潜在竞争：迟到的 typing 事件可能在 message 到达后重新召回 indicator

### Phase 2: 防重显机制

- [x] 在 handleCompleteMessage 和 handleStreamingActivity 中记录 _lastMessageTime
- [x] 在 typing 事件处理中增加 500ms 防重显窗口
- [x] 安全超时从 60s 缩短至 30s

### Phase 3: 验证与文档

- [x] 更新 docs/iterations/TODO.md
- [x] 更新 CHANGELOG.md

## 执行后

- [x] 消息到达 → indicator 即时消失，无拖尾
- [x] 迟到 typing 事件不再导致 indicator 闪回
