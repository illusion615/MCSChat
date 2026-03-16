# 代码卫生迭代计划 — 统一任务追踪

> 基于 2026-03-15 代码审查报告创建。追踪 13 个迭代批次的执行状态。

## 每批次执行流程

每个批次严格按以下步骤执行，不得跳步：

1. **计划汇报** — 向用户说明本批次准备做什么、涉及的文件和风险
2. **接收反馈** — 等待用户确认或给出新需求/调整
3. **更新文档** — 将用户反馈同步到批次的 requirements/design/checklist 中
4. **执行实施** — 按更新后的文档逐项执行
5. **进度归纳** — 完成后汇报本次执行结果、遇到的问题、实际变更清单
6. **收尾确认** — 等待用户确认后更新 TODO.md 状态和 CHANGELOG.md

## 总览

| 批次 | 名称 | 优先级 | 状态 | 依赖 |
|------|------|--------|------|------|
| Batch 1 | [根目录清理](#batch-1-根目录清理) | P0 | 🟢 已完成 | 无 |
| Batch 2 | [模块系统清理](#batch-2-模块系统清理) | P1 | 🟢 已完成 | Batch 1 |
| Batch 3 | [DirectLine 组件重新设计](#batch-3-directline-组件重新设计) | P2 | 🟢 已完成 | Batch 2 |
| Batch 4 | [CSS 设计令牌迁移](#batch-4-css-设计令牌迁移) | P2 | 🟢 已完成 | Batch 1 |
| Batch 5 | [文档补全与导出统一](#batch-5-文档补全与导出统一) | P3 | � 已完成 | Batch 3, 4 |
| Batch 6 | [消息性能指标增强](#batch-6-消息性能指标增强) | P3 | � 已完成 | Batch 5 |
| Batch 7 | [认证登录界面](#batch-7-认证登录界面) | P3 | 🔴 未开始 | Batch 6 |
| Batch 8 | [原生 Streaming 输出](#batch-8-原生-streaming-输出) | P3 | � 已完成 | Batch 6 |
| Batch 9 | [Thinking Dot 行为改进](#batch-9-thinking-dot-行为改进) | P2 | � 已完成 | Batch 4 |
| Batch 10 | [IME 回车误触发送修复](#batch-10-ime-回车误触发送修复) | P1 | � 已完成 | 无 |
| Batch 11 | [Streaming 样式与速度优化](#batch-11-streaming-样式与速度优化) | P3 | � 已完成 | Batch 8 |
| Batch 12 | [Appearance 面板移至右侧栏](#batch-12-appearance-面板移至右侧栏) | P3 | � 已完成 | Batch 4 |
| Batch 13 | [OpenAI Compatible 接口支持](#batch-13-openai-compatible-接口支持) | P2 | � 已完成 | 无 || Batch 14 | [AI Companion LLM 调用统一化](#batch-14-llm-调用统一化) | P1 | 🟢 已完成 | Batch 13 |
| Batch 15 | [Home 页面与流程统一](#batch-15-home-页面与流程统一) | P0 | 🟢 已完成 | Batch 14 |
**状态图标：** 🔴 未开始 → 🟡 进行中 → 🟢 已完成 → ⚪ 已跳过

---

## Batch 1: 根目录清理

**目录：** `docs/iterations/batch-1-root-cleanup/`
**优先级：** P0（最优先）
**目标：** 根目录深度清理，移除历史调试/报告残留文件

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 1.1 | 评估文件：全部标记为过时删除 | 🟢 |
| 1.2 | 创建临时归档目录 .archive-batch1/ | 🟢 |
| 1.3 | 引用完整性检查（grep 确认无断链风险） | 🟢 |
| 1.4 | 执行 80 个 .md 文件删除 | 🟢 |
| 1.5 | 执行 21 个 .html 文件删除 | 🟢 |
| 1.6 | 执行 5 个 .js + 1 个 .sh 文件删除 | 🟢 |
| 1.7 | 用户测试确认无影响 | 🟢 |
| 1.8 | 删除临时归档目录 | 🟢 |
| 1.9 | CHANGELOG.md 追加条目 | 🟢 |

---

## Batch 2: 模块系统清理

**目录：** `docs/iterations/batch-2-module-cleanup/`
**优先级：** P1
**目标：** 移除 CommonJS 回退代码 + 消除重复 DirectLineConnector

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 2.1 | 移除 CommonJS 回退：CustomChatInterface.js | 🟢 |
| 2.2 | 移除 CommonJS 回退：MessageQueueManager.js | 🟢 |
| 2.3 | 移除 CommonJS 回退：WebChatRenderer.js | 🟢 |
| 2.4 | 移除 CommonJS 回退：DirectLineConnector.js (components) | 🟢 |
| 2.5 | 移除 CommonJS 回退 + 删除：DirectLineConnector.js (core) | 🟢 |
| 2.6 | 移除 CommonJS 回退：safeLocalStorage.js | 🟢 |
| 2.7 | 分析两个 DirectLineConnector 的引用关系 | 🟢 |
| 2.8 | 确定保留方案（core 无引用，删除） | 🟢 |
| 2.9 | 5 个文件添加 ES export（原先缺失） | 🟢 |
| 2.10 | 测试验证 — 用户确认通过 | 🟢 |
| 2.11 | CHANGELOG.md 更新 | 🟢 |

---

## Batch 3: DirectLine 组件重新设计

**目录：** `docs/iterations/batch-3-directline-refactor/`
**优先级：** P2
**目标：** 重构为单一 DirectLineService 实现，替换历史多套组件并修复初始化稳定性

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 3.1 | 调研官方文档并完成现状盘点 | 🟢 |
| 3.2 | 与用户确认“无向下兼容、彻底替换”方案 | 🟢 |
| 3.3 | 落地 DirectLineService + MessageEntry | 🟢 |
| 3.4 | application.js 完成 on/off 事件接线 | 🟢 |
| 3.5 | 删除 12 个历史 DirectLine 相关文件 | 🟢 |
| 3.6 | 修复初始化死循环并补齐 greeting/timeout/error 兜底 | 🟢 |
| 3.7 | 完成核心链路验证与用户确认 | 🟢 |
| 3.8 | 同步 TODO/CHANGELOG/批次文档回顾版 | 🟢 |

---

## Batch 4: CSS 设计令牌迁移

**目录：** `docs/iterations/batch-4-css-token-migration/`
**优先级：** P2
**目标：** css/components/ 中所有硬编码颜色/间距值替换为设计令牌

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 4.1 | 盘点 variables.css 现有 token | � |
| 4.2 | 全面扫描 css/components/ 硬编码值 | 🟢 |
| 4.3 | 建立映射表（硬编码值 → token） | 🟢 |
| 4.4 | 在 variables.css 补充缺失 token | 🟢 |
| 4.5 | 替换 utilities.css + 视觉验证 | � |
| 4.6 | 替换 panels.css + 视觉验证 | 🟢 |
| 4.7 | 替换其余 css/components/*.css + 视觉验证 | 🟢 |
| 4.8 | 截图对比（重构前 vs 后） | 🔴 |
| 4.9 | 修复 thinking dot 文字换行：单行居中于进度条上方 | � |
| 4.10 | 修复 full-width 模式消息左右 margin 过小 | 🟢 |
| 4.11 | 测试验证（T1-T5） | 🔴 |
| 4.12 | CHANGELOG.md + Git commit | 🔴 |

---

## Batch 5: 文档补全与导出统一

**目录：** `docs/iterations/batch-5-docs-and-exports/`
**优先级：** P3
**目标：** 补全文档并统一导出模式，保证架构文档与实现一致

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 5.1 | 编写 DirectLineService 架构文档（EN + ZH） | � |
| 5.2 | 编写 Conversation-Aware Thinking 功能文档 | 🟢 |
| 5.3 | 更新 docs/ 索引 | 🟢 |
| 5.4 | 统一 AdaptiveCardModal.js 导出 | ⚪ 跳过 |
| 5.5 | 统一 application.js 导出 | ⚪ 跳过 |
| 5.6 | 统一 versionRegistry.js 导出 | ⚪ 跳过 |
| 5.7 | 统一 unifiedNotificationManager.js 导出 | ⚪ 跳过 |
| 5.8 | 更新所有相关 import 语句 | ⚪ 跳过 |
| 5.9 | 修正 application.js 导入顺序 | ⚪ 跳过 |
| 5.10 | 修正 aiCompanion.js 导入顺序 | ⚪ 跳过 |
| 5.11 | 测试验证（T1-T5） | 🟢 |
| 5.12 | CHANGELOG.md + Git commit | 🟢 |

---

## Batch 6: 消息性能指标增强

**目录：** `docs/iterations/batch-6-message-metrics/`
**优先级：** P3
**目标：** 在 Agent 回复消息元信息中增加 TTFT、TTLT、Total Duration 指标

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 6.1 | sendMessage() 中记录发送时间戳 | � |
| 6.2 | activity 处理中计算 TTFT 和 TTLT | 🟢 |
| 6.3 | messageRenderer 展示指标 | 🟢 |
| 6.4 | 实现 formatDuration() 工具函数 | 🟢 |
| 6.5 | 流式/非流式场景验证 | 🟢 |
| 6.6 | 测试验证（T1-T5） | 🟢 |
| 6.7 | CHANGELOG.md + Git commit | 🟢 |

---

## Batch 7: 认证登录界面

**目录：** `docs/iterations/batch-7-auth-login/`
**优先级：** P3
**目标：** 增加认证登录界面，支持需要 OAuth2 认证的 Copilot Studio Agent

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 7.1 | agentManager 新增 authType/authConfig 字段 | 🔴 |
| 7.2 | 创建 authService.js（PKCE + OAuth2 流程） | 🔴 |
| 7.3 | SecureStorage 适配 token 存取 | 🔴 |
| 7.4 | DirectLineService 支持 token 初始化 | 🔴 |
| 7.5 | UI：认证配置表单 | 🔴 |
| 7.6 | UI：登录/登出/状态显示 | 🔴 |
| 7.7 | CSS 样式（设计令牌） | 🔴 |
| 7.8 | 测试验证（T1-T6） | 🔴 |
| 7.9 | 文档更新 + CHANGELOG.md + Git commit | 🔴 |

---

## Batch 8: 原生 Streaming 输出

**目录：** `docs/iterations/batch-8-native-streaming/`
**优先级：** P3
**目标：** 调研 Copilot Studio 原生 streaming 能力，如支持则实现接入

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 8.1 | 调研 DirectLine API streaming 文档 | � |
| 8.2 | 调研 Copilot Studio streaming 设置 | 🟢 |
| 8.3 | 编写调研报告 | 🟢 |
| 8.4 | 设计实施方案（如支持） | ⚪ 不适用 |
| 8.5 | 实现 streaming 接入 | ⚪ 不适用 |
| 8.6 | 测试验证 | ⚪ 不适用 |
| 8.7 | CHANGELOG.md + Git commit | 🟢 |

---

## Batch 9: Thinking Dot 行为改进

**目录：** `docs/iterations/batch-9-thinking-dot-behavior/`
**优先级：** P2
**目标：** 改进 thinking dot 显示/隐藏机制，消息到达时立即消失

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 9.1 | 分析当前 thinking dot 的显示/隐藏机制 | � |
| 9.2 | 定位固定定时器逻辑 | 🟢 |
| 9.3 | 改为事件驱动隐藏（消息到达即消失） | 🟢 |
| 9.4 | 消除多组件竞争逻辑 | 🟢 |
| 9.5 | 测试验证（快速连续消息、超时场景） | 🟢 |
| 9.6 | CHANGELOG.md + Git commit | 🟢 |

---

## Batch 10: IME 回车误触发送修复

**目录：** `docs/iterations/batch-10-ime-bugfix/`
**优先级：** P1
**目标：** 修复输入法组合输入时回车确认候选词误触发消息发送

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 10.1 | 定位 Enter 键事件处理代码 | � |
| 10.2 | 添加 `isComposing` 判断 | 🟢 |
| 10.3 | 测试中文/日文 IME 场景 | 🟢 |
| 10.4 | CHANGELOG.md + Git commit | 🟢 |

---

## Batch 11: Streaming 样式与速度优化

**目录：** `docs/iterations/batch-11-streaming-styles/`
**优先级：** P3
**目标：** 提供可配置的 streaming 样式和速度，并在设置面板中即时应用

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 11.1 | 定义 streaming 渲染策略层（typewriter/word/sentence/fade/instant） | � |
| 11.2 | 实现速度控制模型（slow/normal/fast/ultra） | 🟢 |
| 11.3 | 设置面板新增样式与速度配置 | 🟢 |
| 11.4 | 本地持久化 + 异常回退机制 | 🟢 |
| 11.5 | 测试验证 + 文档与 CHANGELOG 更新 | 🟢 |

---

## Batch 12: Appearance 面板移至右侧栏

**目录：** `docs/iterations/batch-12-appearance-sidebar/`
**优先级：** P3
**目标：** 将 Appearance 面板迁移到右侧栏，并通过 command bar 图标触发

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 12.1 | command bar 新增 Appearance 图标入口 | � |
| 12.2 | Appearance 面板迁移到右侧栏容器 | 🟢 |
| 12.3 | 打开/关闭与右栏状态协调 | 🟢 |
| 12.4 | 保持外观设置即时生效链路 | 🟢 |
| 12.5 | 测试验证 + 文档与 CHANGELOG 更新 | 🟢 |

---

## Batch 13: OpenAI Compatible 接口支持

**目录：** `docs/iterations/batch-13-openai-compatible/`
**优先级：** P2
**目标：** 在 AI Companion 中支持连接任何兼容 OpenAI API 协议的 LLM 供应方

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 13.1 | index.html 新增 OpenAI Compatible 选项与配置区域 | � |
| 13.2 | aiCompanion.js 新增 sendToOpenAICompatible() | 🟢 |
| 13.3 | application.js 供应方切换支持新选项 | 🟢 |
| 13.4 | 测试连接功能 | 🟢 |
| 13.5 | 配置持久化（localStorage + SecureStorage） | 🟢 |
| 13.6 | 测试验证 + 文档与 CHANGELOG 更新 | 🟢 |
| 13.7 | Test Connection 按钮进度态与防重复点击 | 🟢 |

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-03-15 | 创建迭代计划，后续扩展到 12 个批次 |
| 2026-03-15 | Batch 1 完成：删除 80 md + 21 html + 5 js + 1 sh，用户测试通过 |
| 2026-03-15 | 新增 Batch 6（消息指标）、Batch 7（认证登录）；Batch 4 追加 thinking dot 修复 |
| 2026-03-15 | Batch 2 完成：5 文件 CommonJS→ES export，删除 core/DirectLineConnector.js |
| 2026-03-15 | 新增 Batch 8（原生 Streaming 调研）、Batch 9（Thinking Dot 行为改进） |
| 2026-03-15 | Batch 4 追加 full-width 消息 margin 修复 |
| 2026-03-15 | Batch 3 范围调整为全面重新设计；新增 Batch 10（IME 回车 bug） |
| 2026-03-15 | Batch 3 实施：DirectLineService.js 替换 12 个旧文件，修复初始化死循环 |
| 2026-03-15 | 新增 Batch 11（Streaming 样式优化）、Batch 12（Appearance 右侧栏） |
| 2026-03-15 | 历史文档回填：Batch 3 改为完成回顾版，补齐 Batch 8-12 设计/检查/测试文档 |
| 2026-03-15 | 新增 Batch 13（OpenAI Compatible 接口支持），含完整四件套文档 |
| 2026-03-15 | Batch 10 完成：Enter keydown 增加 isComposing 判断，修复 IME 误发送 |
| 2026-03-15 | Batch 13 完成：OpenAI Compatible 接口支持（UI + 请求层 + 测试连接 + 持久化） |
| 2026-03-15 | AI Companion 设置改进：Test Connection 点击后按钮进入 Testing... 并禁用，完成后自动恢复 |
| 2026-03-15 | 修复 full-width 模式新会话不持久化问题；修复 thinking dot 文字换行（正确定位到 typing-status-area） |
| 2026-03-15 | Batch 4 进行中：补充 variables.css token，完成 splash/navigation/buttons/panels/chat CSS 令牌迁移 |
| 2026-03-15 | Batch 4 完成：全部 10 个 CSS 组件文件迁移完毕，硬编码颜色从 446 降至 210（保留的为渐变色、暗色主题和 Tailwind 专用色等） |
| 2026-03-16 | Agent 初始化参数系统：Agent 列表增加 Params 按钮与配置面板，新会话时弹 overlay 表单收集参数，通过 DirectLine startConversation event 传给 Bot |
| 2026-03-16 | Home 页面系统：全新 Home 页面取代 Splash Screen，显示 Agent 卡片网格（含统计信息），支持新增/编辑/删除 Agent |
| 2026-03-16 | 应用流程统一：移除 Splash Screen 和所有 window.location.reload()，Home→overlay→连接→fade out 全部 in-place 完成 |
| 2026-03-16 | AI Companion LLM 统一化（Batch 14）：18 个独立 LLM 调用函数收归为 _buildProviderConfig + _llmRequest 单一入口 |
| 2026-03-16 | UI 大量改进：Smooth 流式输出、Thinking Dot 5 种风格、KPI Insights 结构化面板、Metadata 悬停显示、消息气泡直角、面板展开动画 |
| 2026-03-16 | Bug 修复：KPI 评分不更新、标题生成失败、Benchmark API key、Toggle 图标反差、Agent Options 未显示 |
| 2026-03-16 | 布局重构：Conversations 按钮移到 panel header、Left Panel 浮动化、Command bar Home 按钮、Settings 精简 |
