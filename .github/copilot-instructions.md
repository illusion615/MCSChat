# MCSChat — Copilot 工作指引

## 项目概览

MCSChat 是 Microsoft Copilot Studio 的自定义聊天前端界面，纯浏览器端运行（Vanilla JS + ES Modules），无构建工具。支持多 Agent 管理、DirectLine 通信、AI Companion 分析面板、自适应卡片、语音交互等。

## 开发流程（必须严格遵守）

### 1. 先分析、再设计、后动手

- 收到任务后，**先分析现有代码并说明设计方案**，等待用户确认后再实现。
- 禁止跳过分析直接写代码。禁止"补丁式开发"——遇到 bug 必须定位根因到对应模块和架构层，不得在症状处打补丁。
- 如果用户反馈 fix 未解决问题，立即停下来重新做根因分析，不要继续同一思路反复尝试。

### 2. 实现后检查

- 完成修改后，自查是否破坏现有功能、是否引入新问题。
- 请用户测试并等待反馈，根据反馈修正，循环直到用户确认完成。

### 3. 文档同步（每次代码变更后立即执行）

完成每个任务后，**立即**完成以下文档更新，不得延迟到会话结束时批量处理：

1. **TODO.md** — 勾选已完成项或添加新项
2. **CHANGELOG.md** — 在 `[Unreleased]` 下按 Added/Changed/Fixed/Removed 追加条目（只追加，不修改历史条目）
3. **相关文档** — 如果变更影响了架构、功能或使用方式，更新 `docs/` 下对应文档，确保只反映最新状态，移除过时内容
4. **README.md** — 如有用户可见的功能变更，同步更新

## 技术栈与约束

| 项目 | 约定 |
|------|------|
| 语言 | Vanilla JavaScript（ES6+） |
| 模块 | 浏览器原生 ES Modules（`import`/`export`），无 bundler |
| 构建 | 无构建步骤 — 浏览器直接加载 |
| 开发服务器 | `python -m http.server 8000`（VS Code Task 已配置） |
| 外部依赖 | DirectLine JS (CDN)、adaptivecards (CDN)、marked / DOMPurify / KaTeX (本地 lib/) |
| 存储 | 浏览器 localStorage + AES-256-GCM 加密层 |

## 架构要点

### 源码结构

```
src/
├── main.js                    # 入口
├── core/                      # 核心控制器（application.js、DirectLineConnector）
├── managers/                  # 状态管理（Agent、Session）
├── services/                  # 业务服务（语音、日志、通知）
├── components/                # UI 组件
│   └── directline/            # 三组件架构：Connector / QueueManager / WebChatRenderer
├── ui/                        # 渲染层（消息渲染、闪屏、关于页）
├── ai/                        # AI Companion（aiCompanion.js ~9700行、promptManager）
└── utils/                     # 工具函数（DOM、加密、性能监控）
```

### CSS 分层

```
css/
├── base/       → reset.css → variables.css（设计令牌）→ typography.css
├── layout/     → desktop.css
├── components/ → 各组件样式
└── responsive/ → mobile.css（最后加载，媒体查询覆盖）
```

### 关键设计模式

- **事件驱动**：组件通过 `setCallback(eventName, handler)` 松耦合通信
- **单例导出**：`class X { } export const x = new X()`
- **适配器模式**：向后兼容的迁移适配器
- **三组件分离**（DirectLine）：连接管理 ≠ 消息队列 ≠ UI 渲染，严格单一职责

### 入口流程

`index.html` → `src/main.js` → `core/application.js` → `app.initialize()` (DOMContentLoaded)

## 编码规范

| 类别 | 规范 |
|------|------|
| 类名 | PascalCase（`DirectLineConnector`） |
| 函数/变量 | camelCase（`initializeApplication`） |
| 常量 | UPPER_SNAKE_CASE（`APPLICATION_VERSION`） |
| CSS 类 | kebab-case（`.chat-container`） |
| 文件命名 | 类文件 PascalCase，服务文件 camelCase |
| 导入顺序 | utils → services → managers → core |
| 每文件 | 一个主导出 |

## 禁止事项

- **禁止引入 npm/bundler** — 这不是 Node.js 项目
- **禁止在 CHANGELOG 中修改已有条目** — 只追加
- **禁止跳过文档同步** — 代码改完必须立即同步文档
- **禁止补丁式修复** — 必须定位根因后再修
- **禁止在根目录创建新的报告/摘要 .md 文件** — 文档一律放入 `docs/` 对应子目录
- **禁止破坏三组件 DirectLine 架构边界** — Connector、QueueManager、WebChatRenderer 各司其职

## 文档体系

| 文档 | 位置 | 用途 |
|------|------|------|
| README.md | 根目录 | 项目介绍、快速开始 |
| TODO.md | 根目录 | 任务追踪 |
| CHANGELOG.md | 根目录 | 版本历史（追加制） |
| 架构/功能/部署文档 | `docs/en/` 和 `docs/zh/` | 双语详细文档 |
| 迭代计划 | `docs/iterations/` | 批次任务追踪与文档 |
| 组件文档 | 各组件目录内 `README.md` | 组件使用说明 |
| 图表 | Mermaid 格式 | 架构/流程/状态图 |

## 迭代批次执行流程（必须严格遵守）

每个迭代批次必须按以下 6 步顺序执行，不得跳步：

1. **计划汇报** — 向用户说明本批次准备做什么、涉及的文件、风险和决策点
2. **接收反馈** — 等待用户确认或给出新需求/调整意见，根据用户输入修改方案
3. **更新文档** — 将最终确认的方案反向同步到批次的 requirements / design / checklist 中
4. **执行实施** — 按更新后的文档逐项执行，需要用户测试的先启动服务等待测试反馈
5. **进度归纳** — 完成后汇报执行结果、实际变更清单、遇到的问题
6. **收尾确认** — 等待用户确认后更新 `docs/iterations/TODO.md` 状态和 `CHANGELOG.md`

**关键原则：**
- 批次开始前用户可能追加新需求或修改方案，必须先更新文档再执行
- 涉及文件删除的操作，先移至临时归档目录让用户测试，确认无影响后再彻底删除
- 每批次结束必须更新 `docs/iterations/TODO.md` 反映最新进度
