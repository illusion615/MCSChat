# Batch 15: Home 页面与流程统一 — 测试计划

## 测试场景

| # | 场景 | 预期结果 | 状态 |
|---|------|---------|------|
| T1 | 页面加载 | 直接显示 Home 页面，无 Splash Screen | ✅ |
| T2 | Home 页面 Agent 卡片 | 显示名称、状态、统计信息 | ✅ |
| T3 | 点击 Agent 卡片 | 弹出 "Let's Begin" overlay | ✅ |
| T4 | 有 params 的 Agent | overlay 显示参数表单 | ✅ |
| T5 | 无 params 的 Agent | overlay 显示 "Ready to connect" | ✅ |
| T6 | Start Session | overlay 显示进度，Agent 回复后 fade out | ✅ |
| T7 | Cancel 连接 | 中断连接，回到 overlay 初态 | ✅ |
| T8 | "+" 卡片新增 Agent | 弹出 Add overlay，保存后刷新卡片 | ✅ |
| T9 | 齿轮按钮编辑 Agent | 弹出 Edit overlay，预填数据，保存后刷新 | ✅ |
| T10 | 垃圾桶按钮删除 Agent | 弹出确认 overlay，需输入名称，删除后刷新 | ✅ |
| T11 | New Chat | 断开 + 清空 + 弹 overlay + 重连，无 reload | ✅ |
| T12 | Home 按钮 | 断开连接，回到 Home 页面 | ✅ |
| T13 | Appearance 主题切换 | Home 页面背景同步变化 | ✅ |
| T14 | Agent Options in Appearance | streaming/side browser/full width 开关生效 | ✅ |
| T15 | Command bar 底部对齐 | Home/agent 页面按钮都底部对齐 | ✅ |
| T16 | Left Panel 浮动 | 圆角、阴影、与右侧面板同高 | ✅ |
| T17 | Home 按钮可见性 | Home 页面隐藏，agent 页面可见 | ✅ |
| T18 | Per-Agent 统计 | 各 Agent 独立计数 | ✅ |
