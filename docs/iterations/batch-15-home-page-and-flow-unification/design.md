# Batch 15: Home 页面与流程统一 — 设计方案

## 架构设计

### 页面层级

```
┌──────────────────────────────────────────────────┐
│ #homePage (z-index: 100, left: 48px)             │
│   ├── home-header (logo + title + subtitle)      │
│   ├── home-agent-grid (卡片网格)                  │
│   │   ├── agent-card × N (点击连接/齿轮编辑/删除) │
│   │   └── add-card (+ 新增)                      │
│   └── home-footer (版本信息)                      │
├──────────────────────────────────────────────────┤
│ #agentSplashOverlay (z-index: 10001)             │
│   └── agent-splash-card                          │
│       ├── params form (条件显示)                  │
│       ├── progress indicator                     │
│       └── actions (Start/Cancel)                 │
├──────────────────────────────────────────────────┤
│ #container + #mainChatArea (聊天界面)             │
│   ├── #leftPanel (浮动式，圆角)                   │
│   ├── #agentChatPanel                            │
│   └── #llmAnalysisPanel                          │
├──────────────────────────────────────────────────┤
│ #sideCommandBar (z-index: 10000, 固定左侧 48px)  │
│   ├── Home 按钮 (顶部)                           │
│   ├── spacer                                     │
│   └── Appearance/Docs/KnowledgeHub/Settings (底部)│
└──────────────────────────────────────────────────┘
```

### 流程状态机

```
[页面加载] → [初始化] → [Home 页面]
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              点击 Agent   点击 +    点击齿轮
                    │         │         │
                    ▼         ▼         ▼
              [Let's Begin] [Add]   [Edit Agent]
              [Overlay]     [Overlay] [Overlay]
                    │
              ┌─────┴─────┐
              │           │
          连接成功      连接失败/取消
              │           │
       等待首条消息   回到 overlay 初态
              │
         fade out overlay + Home
              │
              ▼
         [聊天页面]
              │
       ┌──────┼──────┐
       │      │      │
    New Chat  Home  Settings切换
       │      │      │
       ▼      ▼      ▼
    [overlay] [Home] [overlay]
```

### 数据模型

Agent stats 存储在 `localStorage`:
```
agentStats_{agentId} = {
    sessionCount: number,
    messageCount: number,
    totalDurationMs: number,
    lastInteractionTs: number,
    lastSessionId: string,
    sessionStartTs: number,
    lastDurationCheckTs: number
}
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| index.html | Home 页面 HTML、Agent Splash overlay、Agent Edit overlay、移除 Splash Screen |
| css/components/home.css | 新建，Home 页面全部样式 |
| src/core/application.js | loadAndConnectAgent→Home、showHomePage/hideHomePage、showAgentSplashOverlay、showAgentEditOverlay、startNewChat 重写、per-agent stats |
| css/layout/desktop.css | Left Panel 浮动化、panel header 布局 |
| css/components/navigation.css | Command bar Home 按钮布局 |

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 移除 reload 后状态残留 | 在 startNewChat 中显式 disconnect + clearMessages |
| 旧 sessionStorage 流程残留 | loadAndConnectAgent 不再读取 pendingAgentConnect |
| Splash Screen 依赖残留 | splashScreen.js 仍保留但不再加载或调用 |
