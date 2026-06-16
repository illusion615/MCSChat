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
| Batch 8 | [原生 Streaming 输出](#batch-8-原生-streaming-输出) | P3 | 🟢 已完成（结论被 Batch 25 修正） | Batch 6 |
| Batch 9 | [Thinking Dot 行为改进](#batch-9-thinking-dot-行为改进) | P2 | � 已完成 | Batch 4 |
| Batch 10 | [IME 回车误触发送修复](#batch-10-ime-回车误触发送修复) | P1 | � 已完成 | 无 |
| Batch 11 | [Streaming 样式与速度优化](#batch-11-streaming-样式与速度优化) | P3 | � 已完成 | Batch 8 |
| Batch 12 | [Appearance 面板移至右侧栏](#batch-12-appearance-面板移至右侧栏) | P3 | � 已完成 | Batch 4 |
| Batch 13 | [OpenAI Compatible 接口支持](#batch-13-openai-compatible-接口支持) | P2 | � 已完成 | 无 || Batch 14 | [AI Companion LLM 调用统一化](#batch-14-llm-调用统一化) | P1 | 🟢 已完成 | Batch 13 |
| Batch 15 | [Home 页面与流程统一](#batch-15-home-页面与流程统一) | P0 | 🟢 已完成 | Batch 14 |
| Batch 16 | [附件上传功能完善](#batch-16-附件上传功能完善) | P2 | 🟡 进行中 | Batch 3 |
| Batch 17 | [模型注册可编辑与显示控制](#batch-17-模型注册可编辑与显示控制) | P1 | 🟡 进行中 | Batch 13, 15 |
| Batch 18 | [技术债 Phase 1 — 死代码清理](#batch-18-技术债-phase-1) | P1 | 🟢 已完成 | 无 |
| Batch 19 | [粘贴图片发送](#batch-19-粘贴图片发送) | P2 | 🟢 已完成 | Batch 16 |
| Batch 20 | [首页增强与风格化](#batch-20-首页增强与风格化) | P2 | 🟢 已完成 | Batch 15 |
| Batch 21 | [技术债 Phase 2 — 巨型文件拆分](#batch-21-技术债-phase-2) | P1 | 🔴 未开始 | Batch 18 |
| Batch 22 | [技术债 Phase 3 — 渲染器统一](#batch-22-技术债-phase-3) | P2 | 🔴 未开始 | Batch 21 |
| Batch 23 | [技术债 Phase 4 — 规范统一](#batch-23-技术债-phase-4) | P3 | 🔴 未开始 | Batch 18 |
| Batch 24 | [技术债 Phase 5 — CSS 精细化](#batch-24-技术债-phase-5) | P3 | 🔴 未开始 | Batch 4 |
| Batch 25 | [Livestreaming 兼容性与渲染统一](#batch-25-livestreaming-兼容性与渲染统一) | P2 | 🟡 进行中 | Batch 8 |
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
| 8.1 | 调研 DirectLine API streaming 文档 | 🟢 |
| 8.2 | 调研 Copilot Studio streaming 设置 | 🟢 |
| 8.3 | 编写调研报告 | 🟢 |
| 8.4 | 设计实施方案 | ➡️ 移交 Batch 25 |
| 8.5 | 实现 streaming 接入 | ➡️ 移交 Batch 25 |
| 8.6 | 测试验证 | ➡️ 移交 Batch 25 |
| 8.7 | CHANGELOG.md + Git commit | 🟢 |

> **结论已被 Batch 25 修正**：当年判断"不支持原生 streaming"有误。Copilot Studio 实际支持基于 typing 活动的 livestreaming，已在 Batch 25 补齐兼容性与渲染统一。

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

## Batch 16: 附件上传功能完善

**目录：** `docs/iterations/batch-16-file-upload/`
**优先级：** P2
**目标：** 完善附件上传功能：前端附件封面展示、DirectLine upload API 对接、上传进度提示

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 16.1 | 实装文件选择预览 UI（showFilePreview / hideFilePreview） | 🔴 |
| 16.2 | 文件大小校验（4MB 限制）与拖放支持 | 🔴 |
| 16.3 | 用户消息渲染附件封面卡片（renderUserMessage 带 attachments） | 🔴 |
| 16.4 | messageRenderer 新增 renderDocumentAttachment() | 🔴 |
| 16.5 | DirectLineService 新增 uploadFile() 方法（REST upload endpoint） | 🔴 |
| 16.6 | sendMessageWithFile 改用 uploadFile + 进度回调 | 🔴 |
| 16.7 | 上传进度条 UI（进度条 + 状态文字 + 按钮禁用） | 🔴 |
| 16.8 | 附件封面 CSS 样式（messages.css + chat.css） | 🔴 |
| 16.9 | 测试验证（T1-T16 + R1-R6） | 🔴 |
| 16.10 | CHANGELOG.md + TODO.md + 文档同步 | 🔴 |

---

## Batch 17: 模型注册可编辑与显示控制

**目录：** `docs/iterations/batch-17-model-registry-editing/`
**优先级：** P1
**目标：** 为 AI Companion 模型注册系统补齐编辑能力，并在 Appearance 中增加用户消息与 metric 信息显示控制。

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 17.1 | 梳理注册模型当前数据结构与表单复用点 | 🟢 |
| 17.2 | 根据用户新增需求更新 requirements / design / checklist | 🟢 |
| 17.3 | aiCompanion.js 增加模型 update/edit 能力 | 🟢 |
| 17.4 | application.js 接入编辑模式表单状态 | 🟢 |
| 17.5 | Appearance 增加两个显示控制开关 | 🟢 |
| 17.6 | CSS 增加编辑动作与隐藏态样式 | 🟢 |
| 17.7 | 文档、CHANGELOG、TODO 同步 | 🟢 |
| 17.8 | 用户验证 | 🔴 |

---

## Batch 18: 技术债 Phase 1 — 死代码清理

**目录：** N/A（无独立文档目录，直接执行）
**优先级：** P1
**目标：** 归档/删除项目中无运行时引用的死代码模块，清理注释残留

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 18.1 | 归档 CustomChatInterface.js + .css（749+220 LOC，零引用） | 🟢 |
| 18.2 | 归档 EnhancedChatWidget.js（1,219 LOC，仅版本列名） | 🟢 |
| 18.3 | 归档 chat/ui/MessageRenderer.js + styles/component.css（175+120 LOC） | 🟢 |
| 18.4 | 归档 UNIFIED_CHAT_COMPONENT_DESIGN.md（131KB 设计文档） | 🟢 |
| 18.5 | 清理 versionRegistry.js 和 aboutSection.js 中已删模块引用 | 🟢 |
| 18.6 | 清理 application.js 注释掉的导入块 | 🟢 |
| 18.7 | 用户测试确认无回归 | 🔴 |
| 18.8 | 确认后删除 .archive-phase1/ 临时目录 | 🔴 |
| 18.9 | CHANGELOG + 文档同步 | 🔴 |

---

## Batch 19: 粘贴图片发送

**目录：** `docs/iterations/batch-19-image-paste/`
**优先级：** P2
**依赖：** Batch 16（文件上传基础设施）
**目标：** 支持从剪贴板粘贴图片（Ctrl/Cmd+V）到聊天输入区，预览后发送

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 19.1 | 监听 userInput paste 事件，检测 clipboardData.items 中的图片 | 🔴 |
| 19.2 | 将粘贴的 Blob 转为 File 对象，复用已有文件上传管线 | 🔴 |
| 19.3 | 在文件预览区显示图片缩略图 | 🔴 |
| 19.4 | 测试验证（截图粘贴、网页图片粘贴、多图粘贴） | 🔴 |
| 19.5 | CHANGELOG + 文档同步 | 🔴 |

---

## Batch 20: 首页增强与风格化

**目录：** `docs/iterations/batch-20-home-enhancement/`
**优先级：** P2
**依赖：** Batch 15（Home 页面基础）
**目标：** 强化首页品牌与信息密度：更名标题、Agent 卡片支持描述、卡片放大

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 20.1 | 首页标题改为 "Copilot Studio Agent Hub" | � |
| 20.2 | agentManager 新增 description 字段（新建/编辑 Agent 表单） | 🟢 |
| 20.3 | Home 页面 Agent 卡片渲染描述文本（截断 + tooltip） | 🟢 |
| 20.4 | 卡片尺寸放大，容纳描述和更丰富统计信息 | 🟢 |
| 20.5 | 移动端适配 | 🔴 |
| 20.6 | CHANGELOG + 文档同步 | 🟢 |

---

## Batch 21: 技术债 Phase 2 — 巨型文件拆分

**目录：** `docs/iterations/batch-21-file-split/`（待创建）
**优先级：** P1
**依赖：** Batch 18
**目标：** 将 aiCompanion.js（11,767 LOC）拆分为 5-6 个聚焦模块；提取 application.js 中职责过重的子系统

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 21.1 | 从 aiCompanion.js 提取 KPIAnalyzer 模块（~2,500 LOC） | 🔴 |
| 21.2 | 从 aiCompanion.js 提取 AutoQAEngine 模块（~1,500 LOC） | 🔴 |
| 21.3 | 从 aiCompanion.js 提取 ModelRegistry 模块（~1,000 LOC） | 🔴 |
| 21.4 | 从 aiCompanion.js 提取 LLMBridge 模块（~800 LOC） | 🔴 |
| 21.5 | 从 aiCompanion.js 提取 ThinkingSimulator 模块（~800 LOC） | 🔴 |
| 21.6 | 从 application.js 提取 FileUploadHandler（~200 LOC） | 🔴 |
| 21.7 | 从 application.js 提取 ModelRegistrationHandler（~300 LOC） | 🔴 |
| 21.8 | 全面回归测试 | 🔴 |
| 21.9 | CHANGELOG + 文档同步 | 🔴 |

---

## Batch 22: 技术债 Phase 3 — 渲染器统一

**目录：** `docs/iterations/batch-22-renderer-merge/`（待创建）
**优先级：** P2
**依赖：** Batch 21
**目标：** 合并 messageRenderer.js 与 unifiedMessageRenderer.js 为单一渲染器；合并对应 CSS

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 22.1 | 盘点两套渲染器功能差异矩阵 | 🔴 |
| 22.2 | 将 messageRenderer 差异功能迁入 unifiedMessageRenderer | 🔴 |
| 22.3 | 合并 messages.css 与 unifiedMessageStyles.css | 🔴 |
| 22.4 | 归档 messageMigrationAdapter.js 和 messageAPI.js | 🔴 |
| 22.5 | 更新所有渲染器调用点 | 🔴 |
| 22.6 | 全面回归测试 | 🔴 |
| 22.7 | CHANGELOG + 文档同步 | 🔴 |

---

## Batch 23: 技术债 Phase 4 — 规范统一

**目录：** `docs/iterations/batch-23-conventions/`（待创建）
**优先级：** P3
**依赖：** Batch 18
**目标：** 统一存储工具、通知系统、DOM 操作模式和 localStorage 键名规范

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 23.1 | 合并 4 个 localStorage 工具为 StorageService | 🔴 |
| 23.2 | 收归通知系统到 unifiedNotificationManager | 🔴 |
| 23.3 | 统一 DOM show/hide 到 DOMUtils（禁止 style.display） | 🔴 |
| 23.4 | 收归 82 个 window 全局到 `__MCSCHAT__` 命名空间 | 🔴 |
| 23.5 | 统一 localStorage 键名规范（`mcschat.{domain}.{key}`） | 🔴 |
| 23.6 | 全面回归测试 | 🔴 |
| 23.7 | CHANGELOG + 文档同步 | 🔴 |

---

## Batch 24: 技术债 Phase 5 — CSS 精细化

**目录：** `docs/iterations/batch-24-css-refinement/`（待创建）
**优先级：** P3
**依赖：** Batch 4（CSS 令牌迁移基础）
**目标：** 继续设计令牌迁移（剩余 388 处硬编码色值）；消除 32 处 !important

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 24.1 | 盘点剩余硬编码色值分布（按文件） | 🔴 |
| 24.2 | 在 variables.css 补充缺失 token | 🔴 |
| 24.3 | 按文件批量替换硬编码色值 | 🔴 |
| 24.4 | 审查并消除 32 处 !important | 🔴 |
| 24.5 | 合并 metadata 选择器体系 | 🔴 |
| 24.6 | 视觉回归测试（截图对比） | 🔴 |
| 24.7 | CHANGELOG + 文档同步 | 🔴 |

---

## Batch 25: Livestreaming 兼容性与渲染统一

**目录：** `docs/iterations/batch-25-livestreaming-enhancement/`
**优先级：** P2
**依赖：** Batch 8（原生 streaming 调研）
**目标：** 对齐 BotFramework-WebChat LIVESTREAMING.md 约定，补齐原生 livestreaming 兼容性缺口并统一渲染路径

### 任务清单

| # | 任务 | 状态 |
|---|------|------|
| 25.1 | `_getStreamInfo`：channelData + entities[streaminfo] 双路解析 | 🟢 |
| 25.2 | `_handleActivity` 改用 `_getStreamInfo` | 🟢 |
| 25.3 | `streamSequence` 乱序/过期片段丢弃 | 🟢 |
| 25.4 | 流首片段稳定 id（= streamId），finalize 不覆盖 | 🟢 |
| 25.5 | 空 final（"反悔"）移除气泡 + `streamCancelled` 事件 | 🟢 |
| 25.6 | 原生 chunk 改走 messageRenderer 流式渲染 | 🟢 |
| 25.7 | final 复用 `finalizeStreamingMessage`，修复重复气泡隐患 | 🟢 |
| 25.8 | 回写 Batch 8 文档结论 | 🟢 |
| 25.9 | 真实数据确认 + 修复 DELTA 累加 bug（离线回放验证） | 🟢 |
| 25.10 | 用真实 streaming agent 端到端验证 | 🟡 |

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
| 2026-06-13 | 新增 Batch 25（Livestreaming 兼容性与渲染统一）；修正 Batch 8 过期结论 |
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
| 2026-03-16 | 新增 Batch 16（附件上传功能完善），含完整四件套文档 |
| 2026-03-18 | 新增 Batch 17（模型注册可编辑与显示控制），覆盖模型编辑与 Appearance 可见性开关 |
| 2026-03-18 | 修复 message metadata 自动隐藏开关无效：移除 bot metadata 默认隐藏逻辑，改为仅在 auto-hide 开启时悬停显示；并补齐 unified metadata 类名契约 |
| 2026-03-18 | KPI Insights 保留旧结果直到新分析完成；新增 status indicator（Analyzing / Complete / Failed）显示分析进度 |
| 2026-03-18 | 新增 Batch 18（技术债 Phase 1）、Batch 19（粘贴图片发送）、Batch 20（首页增强与风格化）；开始执行 Phase 1 死代码清理 |
| 2026-03-18 | 修复 KPI 评估提示词臆测问题：上下文提取前缀不匹配导致 LLM 基于假设评估 |
| 2026-03-18 | 新增 Batch 21-24（技术债 Phase 2-5）完整计划：巨型文件拆分、渲染器统一、规范统一、CSS 精细化 |
| 2026-03-18 | Batch 20 完成：首页标题更名、Agent 描述字段、卡片描述展示 |
| 2026-03-18 | Batch 19 实施：粘贴图片发送（paste 事件监听 + Blob→File + 复用上传管线） |
