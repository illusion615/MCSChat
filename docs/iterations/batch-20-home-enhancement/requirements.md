# Batch 20: 首页增强与风格化 — 需求文档

## 目标

强化首页品牌定位和信息密度：更名标题、Agent 卡片支持描述信息、放大卡片以呈现更丰富内容。

## 背景

当前首页标题为 "Copilot Studio Companion"，副标题偏向工具描述。Agent 卡片仅显示名称、状态和简单统计（对话数/消息数/时长/最近活跃），无法让用户了解每个 Agent 的用途和特点。卡片尺寸偏小，信息密度不足。

## 功能需求

### F1: 首页标题更名

- 主标题改为 **"Copilot Studio Agent Hub"**
- 副标题可调整以配合新品牌定位

### F2: Agent 描述字段

- 在 `agentManager` 的 Agent 数据结构中新增 `description` 字段（可选，字符串）
- **新建 Agent** 表单（Home 页面 "+" 卡片弹窗）增加描述输入：
  - 标签："Description"
  - 控件：`<textarea>` 多行文本
  - 占位符："Describe what this agent does..."
  - 非必填，最大 200 字符
- **编辑 Agent** 表单（齿轮按钮弹窗）同步增加描述编辑
- 描述随 Agent 配置一起持久化到 localStorage

### F3: 卡片展示描述

- Agent 卡片在名称和状态行下方新增描述区域
- 描述文本最多显示 2 行，超长部分截断并以 `...` 结尾
- 无描述的 Agent 不显示此区域（向后兼容）

### F4: 卡片尺寸优化

- 增大卡片最小宽度和高度以容纳描述文本
- 保持网格布局的响应式自适应
- 移动端卡片改为单列全宽

## 非功能需求

- 不引入新依赖
- 向后兼容：已有 Agent（无 description 字段）正常显示
- 仅修改 CSS 和 JS，不改变 localStorage 存储键名

## 涉及文件预估

| 文件 | 改动类型 |
|------|---------|
| `index.html` | 修改：首页标题文本 |
| `src/core/application.js` | 修改：Agent 卡片渲染增加描述、新建/编辑表单增加字段 |
| `src/managers/agentManager.js` | 修改：Agent 数据结构增加 description 字段 |
| `css/components/home.css` | 修改：卡片尺寸放大、描述区域样式 |
| `css/responsive/mobile.css` | 修改：移动端卡片适配 |

## 验收标准

1. 首页标题显示 "Copilot Studio Agent Hub"
2. 新建 Agent 时可填写描述（非必填）
3. 编辑 Agent 时可修改描述
4. Agent 卡片上显示描述文本（2 行截断）
5. 无描述的旧 Agent 卡片正常显示，无空白区域
6. 移动端卡片布局适配
