---
applyTo: "src/ai/**"
description: "Use when editing AI Companion code (aiCompanion.js, promptManager.js). This is the largest module (~9700 lines). Changes require careful impact analysis. AI Companion communicates with the main app via callbacks, not direct imports of core modules."
---

# AI Companion 模块规范

## 结构

- `aiCompanion.js` — 主要分析面板逻辑（~9700 行），包括 KPI 计算、LLM 调用、流式输出
- `promptManager.js` — Prompt 工程系统，管理不同分析类型的提示模板

## 关键约束

- AI Companion 是独立面板，与主聊天通过回调通信，不直接操作主聊天 DOM
- LLM 模型切换后，token 统计和 header 显示需同步更新
- Quick Action 需遵循当前 enable/disable 状态
- 超时通知仅在等待 LLM 响应时显示，收到内容后立即禁用
- 生成的标题限制在 20 词以内

## 修改此模块前

由于文件体积大，修改前必须：
1. 搜索定位到具体函数，理解上下文
2. 确认不会影响 KPI 计算链路
3. 确认不会破坏流式输出机制
