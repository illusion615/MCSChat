# Batch 20: 首页增强与风格化 — 设计方案

## 设计原则

1. **向后兼容**：旧 Agent（无 description）正常显示，无空白区域
2. **最小修改**：复用现有 Agent 数据结构，仅新增 description 字段
3. **响应式**：卡片放大后移动端自适应为单列

## 数据结构变更

### agentManager.js

在 Agent 对象上新增可选 `description` 字段：

```javascript
{
    id: 'agent_xxx',
    name: 'Lenovo IVA',
    secret: '...',
    initParams: [],
    description: 'Lenovo customer service agent for troubleshooting hardware issues'  // 新增
}
```

保存/加载保持不变（localStorage JSON 序列化自动包含新字段）。

## UI 变更

### 首页标题

`index.html` 中：
- `<h1 class="home-title">` 文本改为 `Copilot Studio Agent Hub`
- 副标题可调整为 `Manage, test and evaluate your Copilot Studio agents`

### Agent 卡片

当前结构：
```
┌──────────────────────┐
│ Agent Name           │
│ ● Ready              │
│ 5 chats · 12 msgs    │
│ 2h 15m · Mar 18      │
└──────────────────────┘
```

新结构：
```
┌────────────────────────────────┐
│ Agent Name                     │
│ ● Ready    2 params            │
│ Description text here, max 2   │
│ lines with ellipsis...         │
│ ─────────────────────────────  │
│ 5 chats · 12 msgs · 2h 15m    │
│ Last active: Mar 18            │
└────────────────────────────────┘
```

### 新建/编辑 Agent 表单

在 Name 输入框下方增加：
```html
<div class="form-group">
    <label for="agentDescription">Description</label>
    <textarea id="agentDescription" placeholder="Describe what this agent does..." 
              maxlength="200" rows="2"></textarea>
    <small class="help-text">Optional, max 200 characters</small>
</div>
```

## CSS 变更

### home.css

- `.home-agent-card` 最小宽度从 ~200px 增至 280px
- 新增 `.home-agent-card-description` 样式（2 行截断、灰色文本）
- 网格 `grid-template-columns` 调整为 `repeat(auto-fill, minmax(280px, 1fr))`

### mobile.css

- 移动端卡片改为 `grid-template-columns: 1fr`

## 涉及文件

| 文件 | 改动 |
|------|------|
| `index.html` | 标题文本、新建/编辑表单增加 description |
| `src/core/application.js` | 卡片渲染增加描述、表单读写 description |
| `src/managers/agentManager.js` | Agent 数据结构增加 description |
| `css/components/home.css` | 卡片放大、描述样式 |
| `css/responsive/mobile.css` | 移动端适配 |

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 旧 Agent 无 description 字段 | 渲染时 `agent.description \|\| ''`，空则不渲染描述区域 |
| 卡片放大导致网格列数减少 | 使用 auto-fill + minmax，自动适应窄屏 |
