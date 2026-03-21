# Batch 17: 模型注册可编辑与显示控制 — 执行检查清单

## 执行前

- [x] 确认模型注册当前仅有 register/delete/switch，无 update 链路
- [x] 确认 Add Model 表单可复用为 edit 模式
- [x] 确认 Appearance 面板已有现成设置体系可承载新开关

## 执行中

### Phase 1: 模型编辑能力

- [x] aiCompanion.js 新增 getRegisteredModel()
- [x] aiCompanion.js 新增 updateRegisteredModel()
- [x] Registered Models 表格新增 Edit 按钮
- [x] Edit 按钮派发 editRegisteredModel 事件

### Phase 2: 表单 create/edit 双模式

- [x] application.js 增加模型表单编辑状态
- [x] 支持表单回填与 provider 字段显隐复用
- [x] 支持 Save Changes / Cancel Edit
- [x] 支持 API Key 留空保留原密钥

### Phase 3: Appearance 显示控制

- [x] index.html 增加两个 Appearance 开关
- [x] application.js 接入持久化与即时生效
- [x] CSS 隐藏用户消息
- [x] CSS 隐藏 metric / KPI 区
- [x] 修复 message metadata 自动隐藏开关受基础样式覆盖导致的失效问题
- [ ] 技术债：统一 legacy/unified metadata 选择器，减少重复规则

### Phase 4: 文档与验证

- [x] 更新 TODO.md
- [x] 更新 CHANGELOG.md
- [x] 更新相关功能文档
- [x] 完成语法/错误检查

## 执行后

- [ ] 用户验证模型编辑、新显示控制均正常工作
