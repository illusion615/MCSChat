# Batch 6: 消息性能指标增强 — 执行检查清单（完成记录）

## 执行前

- [x] Batch 5 已完成
- [x] 理解现有 messageRenderer 的元信息渲染机制和 responseTimeTracking 基础设施

## 执行中

### Phase 1: 计时基础设施
- [x] 复用 startResponseTimeTracking()（已在 sendMessage 中调用）
- [x] 在 responseTimeTracking 中增加 ttft/ttftRecorded 字段
- [x] 在 calculateTimeSpent() 首次被调用时记录 TTFT

### Phase 2: 渲染展示
- [x] 在 addResponseMetadata() 中展示 TTFT 指标
- [x] 复用现有 formatDuration()（已支持 ms/s/m 自适应）
- [x] TTFT 显示后重置，避免后续消息重复显示

## 执行后

- [x] CHANGELOG.md 追加 Added 条目
- [x] TODO.md 更新
