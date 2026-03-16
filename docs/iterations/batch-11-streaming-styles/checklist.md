# Batch 11: Streaming 样式与速度优化 — 执行检查清单（完成记录）

## 执行前

- [x] 确认 Batch 3 架构基线稳定
- [x] 确认当前消息渲染流程可插入策略层

## 执行中

### Phase 1: 策略层实现

- [x] 定义 streaming 策略接口
- [x] 实现至少 3 种样式策略（Typewriter/Word/Sentence/Instant + 新增 Smooth light-rendering）
- [x] 提供 instant 兜底策略

### Phase 2: 速度控制

- [x] 接入统一速度参数（Slow/Normal/Fast/Ultra）
- [x] 样式默认速度映射
- [x] 速度变更即时作用于新消息

### Phase 3: 设置界面

- [x] 新增样式选择 UI（Appearance 面板）
- [x] 新增速度配置 UI（Appearance 面板）
- [x] 预览通过下一条消息即时生效

### Phase 4: 持久化与回退

- [x] 本地存储读写配置（localStorage）
- [x] 异常时自动回退到 instant

### Phase 5: 验证与文档

- [x] 执行测试计划 T1-T6
- [x] 更新 docs/iterations/TODO.md
- [x] 更新 CHANGELOG.md

## 执行后

- [x] 用户确认流式体验可感知改进
