# Batch 20: 首页增强与风格化 — 执行检查清单

## 执行前

- [ ] 确认当前 Agent 数据结构（agentManager）
- [ ] 确认当前卡片渲染逻辑（application.js renderAgentCard）
- [ ] 设计方案用户确认

## 执行中

### Phase 1: 标题更名

- [ ] index.html: 修改 `.home-title` 文本为 "Copilot Studio Agent Hub"
- [ ] index.html: 修改 `.home-subtitle` 文本

### Phase 2: Agent 描述字段

- [ ] agentManager.js: 确认 description 字段在保存/加载中兼容
- [ ] index.html: 新建 Agent 表单增加 description textarea
- [ ] index.html: 编辑 Agent 表单增加 description textarea
- [ ] application.js: 新建 Agent 时读取并保存 description
- [ ] application.js: 编辑 Agent 时回填并保存 description

### Phase 3: 卡片渲染

- [ ] application.js: renderAgentCard 增加描述区域（2 行截断）
- [ ] 无描述时不渲染空白区域

### Phase 4: 卡片样式

- [ ] home.css: 卡片最小宽度增至 280px
- [ ] home.css: 新增 `.home-agent-card-description` 样式
- [ ] home.css: 网格列宽调整
- [ ] mobile.css: 移动端单列适配

### Phase 5: 文档同步

- [ ] CHANGELOG.md 追加
- [ ] TODO.md 更新
- [ ] docs/iterations/TODO.md 更新

## 执行后

- [ ] 用户测试确认标题显示正确
- [ ] 用户测试确认新建 Agent 可填写描述
- [ ] 用户测试确认编辑 Agent 可修改描述
- [ ] 用户测试确认卡片正确显示描述
- [ ] 用户测试确认旧 Agent（无描述）正常显示
- [ ] 用户测试确认移动端布局适配
