# Batch 12: Appearance 面板移至右侧栏 — 执行检查清单（完成记录）

## 执行前

- [x] 盘点当前 Appearance 入口与面板挂载点
- [x] 盘点右侧栏现有面板状态管理机制

## 执行中

### Phase 1: 入口迁移

- [x] 在 command bar 增加 Appearance 图标按钮
- [x] 接入点击事件与激活态

### Phase 2: 面板迁移

- [x] 将 Appearance 面板迁移到右侧栏容器
- [x] 接入面板打开/关闭逻辑
- [x] 接入关闭按钮行为

### Phase 3: 状态协调

- [x] 与 AI Companion 等右栏面板互斥或协调
- [x] 处理重复点击和快速切换场景

### Phase 4: 设置生效链路验证

- [x] 主题/颜色修改即时生效
- [x] 图标显示设置即时生效
- [x] 新增 Suggested Actions 位置、Thinking Dot 样式、Streaming 样式/速度 即时生效

### Phase 5: 文档同步

- [x] Settings modal 已移除 Appearance section（避免重复入口）
- [x] 更新 docs/iterations/TODO.md
- [x] 更新 CHANGELOG.md

## 执行后

- [x] 用户确认右栏交互体验符合预期
