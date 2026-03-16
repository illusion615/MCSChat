# Batch 15: Home 页面与流程统一 — 需求文档

## 目标

1. 新建 Home 页面作为应用入口，取代 Splash Screen
2. Agent 管理功能从 Settings modal 迁移到 Home 页面卡片式交互
3. 统一会话启动/新建/切换流程，消除所有 `window.location.reload()`
4. 布局重构：Command bar / Left Panel / Panel header 角色调整

## 功能需求

### Home 页面
- 应用加载后直接显示 Home 页面（无 Splash Screen）
- 显示已注册 Agent 的卡片网格（名称、状态、统计信息）
- 每张卡片支持：点击连接、齿轮编辑、垃圾桶删除
- "+" 卡片用于新增 Agent
- 底部显示版本信息
- 背景跟随 Appearance 主题色

### Agent 编辑 Overlay
- 统一用于新增和编辑 Agent
- 字段：Agent Name、DirectLine Secret、Initialization Parameters（Key + Display Name）
- 参数支持增删

### 会话启动流程
- 点击 Agent 卡片 → "Let's Begin" overlay
  - 有 params → 显示参数表单 + Start Session
  - 无 params → 显示"Ready to connect" + Connect
- 连接进度在 overlay 内显示，支持 Cancel
- overlay 保持到 Agent 第一条消息到达后 fade out
- Home 页面同步 fade out

### New Chat 流程
- 断开当前连接 → 清空聊天 → 弹出同一个 overlay → 重新连接
- 不 reload 页面

### 布局调整
- Conversations 按钮从 command bar 移到 panel header 标题前
- Left Panel 移入 mainChatArea，浮动式样（圆角 + 阴影）
- Command bar 顶部改为 Home 按钮（聊天页面可见，Home 页面隐藏）
- 其余 command buttons 底部对齐

### Settings 精简
- 移除 Agent Management section
- Agent Options 移到 Appearance 面板

## 非功能需求

- 所有页面跳转无 reload，全部 in-place 状态切换
- Per-Agent 统计数据独立存储在 localStorage
- 删除 Agent 需要输入名称确认
