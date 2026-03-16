# Batch 15: Home 页面与流程统一 — 执行检查清单（完成记录）

## 执行前

- [x] 分析现有 Splash Screen 和初始化流程
- [x] 确认 Home 页面不依赖重型初始化模块

## 执行中

### Phase 1: Home 页面

- [x] index.html 新增 #homePage 结构（header/grid/footer）
- [x] css/components/home.css 新建全部样式
- [x] index.html 链接 home.css
- [x] renderHomeAgentCards() 渲染 Agent 卡片 + 统计信息
- [x] "+" 卡片新增 Agent
- [x] 版本信息底部显示
- [x] 背景跟随 --theme-background CSS 变量

### Phase 2: Agent 管理

- [x] Agent 卡片齿轮按钮 → showAgentEditOverlay（编辑模式）
- [x] Agent 卡片垃圾桶按钮 → showDeleteAgentOverlay（名称确认删除）
- [x] 统一 Add/Edit overlay（agentEditOverlay）
- [x] 参数编辑支持增删（Key + Display Name）
- [x] Params badge 与 status 同行显示

### Phase 3: 会话启动流程

- [x] showAgentSplashOverlay 统一用于 Home 和 New Chat
- [x] 连接进度在 overlay 内显示 + Cancel 按钮
- [x] overlay 保持到 Agent 第一条消息到达后 fade out
- [x] Home 页面同步 fade out
- [x] startNewChat 改为 in-place（不 reload）
- [x] agentSwitched 事件改为弹 overlay（不 reload）

### Phase 4: 布局重构

- [x] Conversations 按钮移到 panel header
- [x] Left Panel 移入 mainChatArea（浮动式样）
- [x] Command bar 顶部改为 Home 按钮（Home 页面隐藏）
- [x] Command buttons 底部对齐（spacer div）

### Phase 5: Splash Screen 移除

- [x] 移除 #splashScreen HTML
- [x] 移除内联 Splash CSS
- [x] 移除 splashScreen.js 引用
- [x] 移除底部 Splash 初始化脚本
- [x] loadAndConnectAgent 改为直接 showHomePage

### Phase 6: Settings 精简

- [x] 移除 Agent Management nav link
- [x] Agent Options 移到 Appearance 面板
- [x] loadUIState 恢复 Appearance checkbox 状态

### Phase 7: 文档同步

- [x] CHANGELOG.md 更新
- [x] docs/iterations/TODO.md 更新
- [x] Batch 15 四件套文档创建

## 执行后

- [x] 用户确认 Home 页面功能正常
- [x] 用户确认 Agent 连接/新建/编辑/删除流程完整
- [x] 用户确认无 reload 闪烁
