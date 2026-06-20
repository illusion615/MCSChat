# CHANGELOG

All notable changes to MCS Chat will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

### Changed
- **DL test page — fix cross-turn message contamination**: Copilot Studio keeps emitting streaming chunks AFTER a turn's `final`, and the benchmark advances to the next question on `final` + idle. The page reset the `StreamAssembler` on every turn, wiping its finalized-streamId tombstones, so those trailing chunks landed in the NEXT turn's empty assembler and rendered as a rogue bubble under the wrong question. The assembler is now reset only on new conversation (matching `DirectLineService`), so tombstones persist for the whole conversation and trailing chunks are correctly ignored. Verified: a 4-question benchmark renders exactly one bubble per question with no duplicates.
- **DL test page — streamed/one-shot badge**: Benchmark result cards now show `ok · streamed (N chunks)` or `ok · one-shot`, and CSV export gains a `chunks` column, so it is obvious whether the server streamed token-by-token or returned the answer in one shot (a server-side decision).
- **DL test page — disable input during reconnect**: Clicking "+ New conversation" now disables the message box and send button until the new conversation is fully established. Previously a message could be posted against a half-initialized conversation, failing with `HTTP 403 — Invalid token or secret`. (Note: whether a turn streams token-by-token is decided server-side by Copilot Studio and is independent of the manual-send vs benchmark path — both post an identical `deliveryMode: "stream"` activity.)
- **Agent type labels updated**: The add/edit agent selector now shows **Copilot Studio Agent (Direct Line)** and **Copilot Studio Agent (Direct-to-Engine)** in both the UI markup and i18n locale strings.
- **流式日志可读性优化**：消除了流式渲染期间刷屏的 `No typing indicator found to remove`（`hideProgressIndicator` 每个块都触发）和逐块的 `handleStreamingChunk` 对象日志。`handleStreamingChunk` 现在每块只打印一行 `💬 [stream <id>] N chars | …<内容尾部>`，可直接在控制台看到流式内容的增长。D2E 连接器移除了逐块的 `📥 SSE raw` / `🔗 listeners` 噪音日志，`📡 D2E Activity` 仅对非流式块（informative/message/final）记录，保留 `🔌 stream opened/closed` 摘要。
- **D2E test page — bot bubble whitespace fix**: Bot bubbles now use `white-space: normal` instead of inheriting `pre-wrap`. They hold rendered HTML, and `marked` emits a newline between every block tag — `pre-wrap` rendered those as blank lines, roughly doubling bubble height (870px → 384px for the same content). Intra-paragraph line breaks are still preserved via marked `breaks:true`; the plain-text fallback re-applies `pre-wrap`.
- **D2E test page — benchmark Stop feedback**: Clicking Stop now gives instant feedback (button → "Stopping…", disabled; progress text → "Stopping — finishing the current question…") since the in-flight probe (a full Q&A) can take 10s+, then exits cleanly after it completes.
- **DirectLine streaming opt-in**: DirectLine startup and outgoing message activities now send `deliveryMode: "stream"` (plus `ClientCapabilities` on `startConversation`), matching Copilot Studio's streaming test canvas behavior. Without this opt-in, DirectLine returns only typing keep-alives plus the final message even when the agent streaming flag is enabled.
- **DirectLine streaming lifecycle unified**: DirectLine streaming is now normalized by shared helpers (`streamingActivity.js`) and a single `StreamAssembler` state machine used by both the main DirectLine connector and the standalone verification page. This replaces divergent per-file handling of stream metadata, cumulative-vs-delta text merging, id-less first chunks, final activities, late chunks, and fallback finals.
- **DirectLine streaming duplicate-bubble fix**: DirectLine emits the FIRST streaming chunk of an answer with NO `streamId` and only attaches one from the second chunk onward (the concluding `final` carries it too), and it can keep sending streaming chunks AFTER the final. The old streamId-keyed handling could render two identical bubbles per answer (the id-less stream bubble plus a second one created by the final's `streamId`) and could create a new bubble from late chunks. `StreamAssembler` now binds the id-less first chunk to the later real `streamId`, produces one stable stream ref per answer, and tombstones finalized streamIds so late chunks are ignored.
- **Benchmark waits for typewriter to finish (test page)**: The benchmark previously sent the next question as soon as the `final` activity arrived (plus a short idle), while the typewriter reveal of the current answer was still animating — so a new turn could start mid-render. `completeReveal()` now returns a Promise that resolves when the bubble is fully rendered, and each turn (`sendMessage`/`sendCardResponse`/`benchProbe`) awaits it before completing. The `Total` metric is unchanged: it is frozen at turn conclusion (`final` + idle) via a new `turnEndTime`, so the measured response time still excludes the front-end animation.
- **DirectLine streamed answer masked by fallback final**: The agent can stream a full answer (verified: 165 chunks → 949 chars) and then conclude the SAME `streamId` with a short, unrelated fallback message (e.g. "I'm sorry…" / "Escalating…", ~70 chars). The final handler previously overwrote the streamed answer with that fallback. Shared fallback detection now keeps the streamed answer intact and surfaces the divergent fallback as a separate message.
- **Greeting ordering (test page)**: `startConversation` enabled input as soon as the `startConversation` event was posted, but the bot greeting is pushed asynchronously over the WebSocket afterward — so an auto-filled or quick user message could be sent before the greeting rendered, putting the greeting out of order. The page now waits for the greeting (first bot text) to arrive before enabling input, with a 3s fallback.

### Added
- **DirectLine streaming verification page**: `examples/directline-streaming-test.html` — a standalone copy of the D2E test page whose transport is swapped from MSAL + per-turn SSE to **DirectLine via a secret over a persistent WebSocket**. Layout, rendering, typewriter reveal, suggested actions, adaptive cards, per-message TTFT/total metrics, and the sidebar Performance Benchmark are all identical. The connector starts a DirectLine conversation with the secret, opts into `deliveryMode: "stream"`, streams every activity over one WebSocket (with reconnect + periodic token refresh), filters the user's own echoed activities, and resolves each turn on the bot's final message (short idle debounce) so manual sends and the benchmark loop work unchanged.
- **Direct-to-Engine streaming connector (real token-by-token streaming)**: New isolated `DirectEngineConnector` (`src/components/directline/DirectEngineConnector.js`) connects to Copilot Studio agents via the Power Platform Direct-to-Engine (D2E) API with **real Server-Sent-Events streaming**, using interactive MSAL.js user sign-in (no secret). It emits the exact same event surface as `DirectLineService` (`message`/`messageChunk`/`informative`/`streamCancelled`/`greeting`/…) so the existing rendering pipeline is reused unchanged. The classic DirectLine path is untouched and remains the default.
- **Per-agent connection type selection**: The home-page Add/Edit Agent form now offers a third agent type — **"Copilot Studio Agent (Direct-to-Engine streaming)"** — alongside the existing DirectLine and Website types. Selecting it reveals four fields (App Client ID, Tenant ID, Environment ID, Schema Name) instead of a DirectLine secret. Connection routing in `application.js` (`getConnectorForAgent`) dispatches each agent to the correct transport; both connectors are wired through a shared `wireConnectorEvents()` method.
- **MSAL.js**: Added `@azure/msal-browser` (CDN) for interactive Entra sign-in, used only by the Direct-to-Engine connector.
- **D2E verification page**: `examples/d2e-streaming-test.html` — a standalone, self-contained page to verify anonymous-agent + real streaming end-to-end before/independently of the main app.
- **D2E test page — full client + benchmark**: Grew the verification page into a self-contained D2E client with popup MSAL sign-in, a two-column chat layout, live SSE streaming (informative steps, suggested actions, adaptive cards, per-message TTFT/total metrics + copy/retry), and a sidebar **Performance Benchmark** that drives the REAL chat pipeline in the CURRENT conversation (topic-aware) — each question + streamed answer renders live, with p50/p90 stats, SVG bar charts, expandable per-answer detail cards, and CSV export. The raw SSE log is a toggleable floating panel.
- **D2E test page — typewriter reveal (smooth streaming)**: Added a display-layer reveal loop fully decoupled from network arrival. Chunks accumulate into the authoritative `st.text` (transport layer untouched: classification, ordering, TTFT/total timing, benchmark reads all unchanged); a self-sustaining `requestAnimationFrame` loop advances a per-bubble `shownLen` toward the target on word boundaries, so the animation stays smooth whether the server streams token-by-token or delivers everything at once. The final activity plays out the remainder, then guarantees the full text.

### Fixed
- **Native livestreaming delta chunks dropped (verified against real data)**: `DirectLineService._handleStreamingChunk` assumed every chunk carried the full cumulative text. A real Copilot Studio streaming capture (687 typing activities) proved chunks are **delta fragments** (each ≤10 chars) that must be concatenated. The old logic took the non-cumulative branch and overwrote `entry.text` with each tiny fragment, so only the last fragment survived. The accumulator now treats `entry.text` as authoritative and supports both delta and cumulative encodings; offline replay over the real capture reconstructs the full 1,427-char answer exactly. (Batch 25)
- **Native livestreaming duplicate bubble (latent)**: When a Copilot Studio livestream concluded, `DirectLineService._finalizeStream` emitted `message` (rendering a fresh bubble) while the interim streaming bubble was never cleaned up — leaving two bubbles. Native streaming chunks and the final message now share a single DOM element via `messageRenderer`'s streaming API. (Batch 25)
- **Livestreaming silently disabled when metadata in `entities`**: `DirectLineService` only read stream metadata from `channelData`. Per BotFramework-WebChat LIVESTREAMING.md, Copilot Studio may place `streamType`/`streamId`/`streamSequence` in `entities[type="streaminfo"]` instead; those sessions fell back to one-shot rendering. Added `_getStreamInfo()` that reads both locations. (Batch 25)
- **LaTeX rendering failures**: Rewrote LaTeX processing pipeline with placeholder isolation. KaTeX HTML is now stored as safe placeholders before passing through marked/DOMPurify, then restored afterward. Eliminates two classes of bugs: (1) `isMathematicalExpression` heuristic incorrectly rejecting valid LaTeX commands like `$\rightarrow$`, `$\pm$`, `$\neq$`; (2) downstream marked/DOMPurify corrupting KaTeX-generated HTML. Now uses KaTeX itself as the authoritative parser — if KaTeX can render it, it renders; if not, original text is preserved.
- **Citation side browser not opening**: `openCitationPreview()` referenced non-existent DOM IDs (`citationFrame`, `citationPreviewPanel`), causing citations to always open in external browser instead of the in-app side panel. Remapped to use existing `sideBrowser`/`sideBrowserFrame` elements and the CSS `.open` class slide-in animation.

### Added
- **Livestreaming out-of-order protection**: `DirectLineService` now tracks `streamSequence` per stream and drops obsolete/out-of-order interim chunks, preventing text from jumping backwards during a livestream. (Batch 25)
- **Livestreaming "regret" support**: An empty final activity (no text/attachments) now removes the in-progress streaming bubble via a new `streamCancelled` event, matching the LIVESTREAMING.md contentless-final behavior. (Batch 25)
- **Native streaming renders like normal messages**: Live streaming bubbles now go through `messageRenderer` (Markdown, KaTeX, links, message icon, response metrics) instead of a raw `textContent` element, eliminating the visual jump when the stream finalizes. (Batch 25)
- **Agent type selection**: Agent creation/edit form now includes an "Agent Type" selector with two options: **Copilot Studio Agent** (default, existing behavior) and **Website**. Website agents store a URL instead of a DirectLine secret and embed the URL as a full-size iframe in the main chat area when opened. Back-to-home navigates directly without disconnect confirmation.
- **AI Companion website analysis**: When a website agent is active, AI Companion can analyze the embedded webpage content. Quick actions (Analyze, Summarize) automatically extract page text from the iframe (same-origin DOM access or fetch fallback) and send website-appropriate analysis prompts to the LLM.
- **Open attachments in side browser**: New "Open attachments in side browser" setting in Appearance > Agent Behavior. When enabled, clicking a file attachment (document/generic) opens it as a tab in the analysis panel side browser instead of the overlay preview modal.
- **Analysis panel tab system**: Added a tab bar to the AI Companion panel with **Performance** (KPI scores + insights) tab. Citation browser now opens as a dynamic closable tab within the same panel instead of a separate overlay.
- **Auto-open message links**: New "Auto-open message links in side browser" setting in Agent Options. When enabled, URLs found in agent replies are automatically opened as a citation tab in the analysis panel, using the link text or page name as the tab title.

### Changed
- **Citation browser moved to analysis panel**: When "Open citations in side browser" is enabled, citations now open as a tab inside the AI Companion analysis panel instead of a fixed-position side browser overlay. Tab shows hostname, loading spinner, error fallback, and a close button.
- **Analysis tabs left-aligned**: Tab bar in the AI Companion panel now uses left-aligned layout instead of space-between.

### Removed
- **Legacy side browser overlay**: Removed the `#sideBrowser` fixed-position panel from `index.html` and cleaned up associated legacy CSS/JS code in `messageRenderer.js` and `application.js`.
- **Deprecated AI Chat tab**: Removed the AI Chat tab and `llmChatWindow` from the analysis panel. AI Companion output had already migrated to the Performance tab's KPI insights section, making this tab non-functional.

### Added
- **多语言支持（Phase 1）**：新建 `src/utils/i18n.js` 多语言基础设施，支持英文/中文切换。Appearance 面板新增 Language 选择器，切换后首页、导航、Appearance 面板、Agent 卡片标签、确认弹窗实时切换语言。AI Companion 根据界面语言自动注入 system 指令以对应语言输出。
- **侧边栏毛玻璃效果与自动隐藏**：左侧 Command Bar 改为毛玻璃（backdrop-filter blur + 半透明背景）效果。Appearance 设置新增 "Auto hide sidebar" 开关，开启后侧边栏收缩为 6px 细条，鼠标悬停时展开恢复 48px，主内容区自动补位。
- **首页标题自定义**：Appearance 设置新增 Home Title 和 Home Subtitle 输入框，用户可自定义首页标题和副标题，实时预览并自动保存到 localStorage，清空则恢复默认值。
- **首页背景图片**：Appearance 设置新增首页背景图片上传，图片以虚化（blur）方式显示并叠加半透明遮罩，突出前景 Agent 卡片氛围感。支持预览、移除，图片以 base64 存储在 localStorage，限制 5MB 以内。
- **首页卡片拖拽排序**：首页 Agent 卡片支持拖拽重新排列顺序，松手后自动保存到 localStorage，刷新页面保持顺序。拖拽中卡片半透明，目标位置显示虚线指示框。
- **模型测试性能指标**：测试连接改为流式请求，精确采集 TTFT（首字节延迟）、TTLT（总延迟）、Token/s（生成速率）。测试结果持久化到注册模型数据中，在模型列表 Perf 列显示（悬浮查看详情）。
- **禁用推理模式开关**：模型注册/编辑表单新增 "Disable Reasoning" 复选框。启用后 Ollama 请求追加 `think: false`，OpenAI Compatible 请求追加 `chat_template_kwargs: {enable_thinking: false}`，可显著提升 Qwen/DeepSeek 等推理模型的响应速度。模型列表中以 ⚡ 徽标标识已禁用推理的模型。
- **输入框内嵌按钮布局**：将 AI Companion 切换按钮、附件按钮、发送按钮全部移入输入框内部，统一为圆角 pill 容器。左侧 AI Companion + 附件、右侧发送，按钮无背景无边框，hover 时高亮响应。
- **AI Companion 模式切换悬浮菜单**：AI Companion 按钮 hover 时向上滑出切换菜单（Agent Mode / AI Companion Mode），点击即切换消息发送目标，当前模式标记 ✓。
- **AutoQA 自动化质检功能**：AI Companion 新增 AutoQA 引擎，可自动模拟用户与 Agent 交互并评估 Agent 回复质量。
  - **场景配置**：自定义测试场景描述，支持售后、咨询、投诉等任意场景。
  - **性格系统**：4 种模拟用户性格（配合/普通/苛刻/刁难），影响提问语气与内容策略。
  - **测试维度**：4 种测试维度（业务流程/边界测试/合规测试/综合），可针对性验证 Agent 能力。
  - **LLM 驱动决策**：每轮 Agent 回复后由 LLM 理解内容并策略性决定下一步行动（输入文本/点击 Suggested Action/填写 Adaptive Card）。
  - **6 维通用评估指标**：相关性、准确性、完整性、语气适当性、边界意识、引导能力（0-10 分），业务无关的通用质量评估。
  - **灵活退出机制**：支持固定轮次、指标驱动、先到先退三种退出模式，以及早停条件（连续失败、Agent 死循环、超时）。
  - **UI 感知交互**：自动感知 Suggested Actions 和 Adaptive Cards，模拟点击按钮和填写表单。
  - **综合质检报告**：测试结束后生成 Markdown 格式报告，包含逐轮详情、维度分析和改进建议。
  - **配置弹窗 UI**：Quick Action 区域新增 AutoQA 按钮，点击弹出配置面板。
  - **Test Case 持久化**：支持按 Agent 保存多个测试用例，避免重复配置。Modal 顶部显示已保存的 test case 表格，支持一键运行(▶)、编辑(✎)、删除(✕)。
- **AutoQA Prompt 模板**：promptManager 新增 3 个 prompt 模板（消息生成/回复评估/报告生成），支持用户自定义。
- **模型注册管理重构**：AI Companion 设置界面全新模型管理系统。
  - **Registered Models 表格**：显示所有已注册模型，包含名称、Provider、Token 用量，当前模型用 ★ 标记。
  - **⼚ Switch**：一键切换 AI Companion 到任意已注册模型（自动设置 provider + config）。
  - **+ Add Model**：折叠表单，支持 OpenAI Compatible / OpenAI / Anthropic / Azure / Ollama 五种 provider。
  - **Test Connection**：仅测试连接，不注册。**Register Model**：测试通过后添加到模型列表。
  - **持久化存储**：模型注册信息存储在 localStorage，API Key 通过 SecureStorage 加密存储。

- **附件上传功能完善（Batch 16）**：完整实现前端文件上传链路，包括文件选择预览、消息内附件封面卡片、DirectLine REST upload API 对接和上传进度提示。
  - **文件选择预览 UI**：选择文件后在输入区显示文件类型图标、文件名、大小和移除按钮；支持拖放文件到聊天窗口。
  - **文件大小校验**：自动校验 4MB 上限（DirectLine 限制），超限文件拒绝并提示。
  - **消息内附件封面卡片**：用户发送带附件消息后，消息气泡内显示文档封面卡片（PDF/Word/Excel/PPT/图片各有专属图标）。
  - **DirectLine Upload API**：新增 `uploadFile()` 方法，通过 REST `POST /v3/directline/conversations/{id}/upload` multipart 上传文件，正确对接 Copilot Studio。
  - **上传进度条**：使用 XMLHttpRequest 跟踪真实上传进度，在文件预览区显示进度条和百分比/状态文字。
  - **上传状态管理**：上传中禁用发送按钮，完成/失败后自动恢复 UI 状态。

### Changed
- **Appearance 面板信息分组重构**：按类型将外观设置重组为 5 个分区（消息显示、主题与首页背景、字体与动画、智能体行为、系统），在不改变控件语义与持久化逻辑的前提下提升可发现性与配置效率。
- **首页页脚定位更新**：将 `.home-footer` 的定位方式调整为 `position: absolute`，使其按首页容器定位而非视口固定定位。
- **首页页脚定位策略调整**：移除 `home-footer` 的 `position` 固定定位属性，改为遵循页面结构层级布局，避免在背景图模式下被层级规则覆盖后产生定位冲突。
- **首页背景图层级规则调整**：移除 `.home-page.has-bg-image > *:not(.home-bg-image)` 的 `position` 强制声明，避免覆盖子节点自身定位策略（如页脚/浮层）。
- **sendMessageWithFile 重构**：从直接调用 `postActivity` 改为调用 `uploadFile()` REST API，支持真实文件上传和进度回调。
- **renderUserMessage 增强**：支持 `attachments` 参数，用户消息可渲染附件封面卡片。
- **addAttachments 增加 PDF 分支**：自动识别 PDF 附件并使用专属文档卡片渲染。
- **Bot Configuration 弹窗加宽**：`max-width` 从 1000px 增加到 1200px，为模型列表 Perf 列提供更多显示空间。
- **性能指标单位自适应**：TTFT/TTLT 显示根据数值自动选择最合适的单位（ms / s / min），告别固定 ms 的可读性问题。
- **初始化提示呼吸动画增强**：`breathingPulse` 动画透明度范围从 0.5→1 扩大到 0.3→1，新增微缩放 + 颜色渐变，动态感更明显。
- **aiCompanion.js 模块拆分（Batch 21）**：将 ~10600 行的单体文件拆分为三个模块，核心降至 9398 行。
  - `autoQAEngine.js`（1478 行）：AutoQA 自动化质检引擎
  - `modelRegistry.js`（633 行）：模型注册/切换/Token 跟踪/性能测试/UI 渲染
  - 标题生成重构：6 个重复的 provider-specific fetch 方法统一为 `_llmRequest()` 调用，消除 ~215 行重复代码

### Fixed
- **首页底部版本标识位置修复**：将 Home 页底部 `Empowered with Microsoft Copilot Studio + 版本号` 区域改为固定右下角对齐显示，避免因居中布局导致的位置偏移；并在移动端增加右下间距覆盖，保证小屏可见性与对齐一致。
- **AutoQA 空消息气泡**：thinking simulation 在 AutoQA 快速连续消息时产生孤儿 DOM 元素（空 `currentThinkingDiv` 留在聊天窗口）。修复：force-reset 时从 DOM 移除孤儿 div；`finally` 清理无内容的 thinking div。
- **全通道空消息过滤**：5 个消息处理入口（handleCompleteMessage / handleStreamingChunk / handleConversationUpdate / handleStreamingActivity / handleEventActivity）统一使用 `text?.trim()` 过滤，防止空白字符串通过。
- **AutoQA thinking 不显示**：`simulateThinkingProcess()` 在上一轮 thinking 仍活跃时直接返回旧 promise，导致后续 thinking 永远无法启动。改为强制结束前一个并启动新的。
- **模型测试 reasoning 参数未注入**：测试按钮未将 "Disable Reasoning" checkbox 状态传给测试请求，导致 Qwen 等模型测试时仍进入完整 reasoning 模式、速度异常低。
- **TTFT 计算不准**：原逻辑以首个 chunk 到达时间作为 TTFT，reasoning 模型首个 chunk 是空的 thinking 标记而非真实 content token。改为仅在解析出有实际内容的 SSE 事件时记录 TTFT。
- **KPI JSON 截断解析失败**：LLM 返回的 KPI 评估 JSON 因 token 限制被截断（缺少闭合 `}`），新增 `_repairTruncatedJSON()` 自动修复未闭合的字符串、大括号和方括号。

### Removed
- **GitHub 提交前清理**：删除 `migration-backup-20250902-032535/`（旧迁移备份）、`legacy/`（旧版代码）、`tests/`（开发调试 HTML）、`utils/`（一次性脚本）、备份文件（`directLineLogsService-backup.js`、`index-old.js`）和 svg-icon-manager 临时文档（CLEANUP/COMPLETION/DESIGN_ANALYSIS/MIGRATION SUMMARY）。新增 `.gitignore` 排除 `.DS_Store`、`.venv/`、`node_modules/`、`.env`、IDE 配置等。

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **Home 页面系统**：全新的 Home 页面取代 Splash Screen 作为应用入口。显示 Agent 卡片网格（含名称、状态、对话数、总时长、消息数、最近活跃），支持点击进入会话、"+" 卡片新增 Agent、齿轮按钮编辑 Agent（名称/Secret/参数）、垃圾桶按钮删除 Agent（需输入名称确认）。
- **Agent 初始化参数系统**：Agent 支持自定义初始化参数（Parameter Key + Display Name）。配置了参数的 Agent 在发起新会话时会弹出 "Let's Begin" overlay 表单，用户填写后参数通过 DirectLine startConversation event 的 value 和 channelData.initParams 传给 Bot。
- **Suggested Actions 位置选项**：在 Appearance 面板新增 Suggested Actions Position 下拉选项，支持"固定在输入框上方"和"内联在消息气泡内"两种模式。
- **Smooth 流式输出样式**：新增 "Smooth (light rendering)" 流式输出模式，每个词以 glow 动画逐个浮现，同时实时增量渲染 markdown 格式。
- **Thinking Dot 样式选择器**：Appearance 面板新增 5 种 Thinking Indicator 动画风格（Bounce/Pulse/Wave/Elastic/Ripple）。
- **AI Thinking 开关**：Settings → AI Companion 新增 "Use AI Companion for thinking simulation" 选项，允许用户选择 AI 思考模拟或简单 typing dot。
- **KPI Insights 面板**：Agent Performance 面板新增结构化分析区域，每个 KPI 独立卡片展示 Overview / Found Issue / Suggestion，替代原有的 chat 日志堆叠方式。
- **Per-Agent 统计追踪**：每个 Agent 独立追踪对话数、消息数、总时长、最近交互时间，数据存储在 localStorage。
- **Agent 编辑/删除功能**：Home 页面 Agent 卡片支持齿轮按钮编辑（名称/Secret/参数）和垃圾桶按钮删除（需输入名称确认）。

### Changed
- **应用初始化流程重构**：移除 Splash Screen，页面加载直接显示 Home 页面。所有初始化（DOM/事件/AI Companion/图标等）在 Home 页面背后静默完成。
- **会话启动流程统一**：Home 页面和 New Chat 共用同一个 "Let's Begin" overlay 连接流程。overlay 在 Agent 第一条消息到达后与 Home 页面同步 fade out，无需 window.location.reload()。
- **布局架构调整**：Conversations 按钮从 command bar 移到 panel header 标题前；Left Panel 移入 mainChatArea 作为浮动面板（圆角+阴影）；Command bar 顶部改为 Home 按钮（在 Home 页面隐藏），其余按钮底部对齐。
- **Settings 面板精简**：移除 Agent Management section（功能已迁移到 Home 页面），Agent Options（streaming/side browser/full width）移到 Appearance 面板。
- **AI Companion LLM 调用统一化（Batch 14）**：新增 `_buildProviderConfig()` 和 `_llmRequest()` 统一底层方法，净减少约 500 行重复代码。
- **Metadata 悬停显示**：Bot 消息 metadata 默认不占空间，鼠标悬停时 max-height + opacity 平滑展开。
- **消息气泡圆角调整**：Bot/Companion/Thinking 消息气泡统一左上角直角。
- **Thinking Dot 重构**：EnhancedTypingIndicator 从 ~1100 行缩减到 ~66 行，改为真实事件驱动。
- **TTFT 修正**：基于真实 DirectLine typing activity 计算。
- **DirectLine SDK 升级**：botframework-directlinejs@0.11.6 → @0.15.8。
- **面板展开动画**：AI Companion 面板向左平滑扩张/收缩。
- **OpenAI Compatible 模型显示**：全链路优先 Display Name，Token 按具体模型独立追踪。

### Fixed
- **KPI 评分不更新**：修复 handleCompleteMessage() 未派发 completeMessage 事件。
- **KPI 分析首次跳过**：修复 isFirstModelUse 检查对非 Ollama 供应商始终跳过。
- **标题生成失败**：修复 openai-compatible 分支缺失和 key 名不匹配。
- **OpenAI Compatible Benchmark 修复**：修复 A/B Test API key 查找和请求分支缺失。
- **AI Companion Toggle 图标反差色**：改为 currentColor。
- **Appearance 面板 Checkbox 样式**：独立自定义 checkbox 样式。
- **Splash Screen 卡死**：修复 enhancedTypingIndicator.js 重写后旧代码残留。
- **Agent Options 未显示**：修复 checkbox 从 Settings 迁移到 Appearance 后状态未在 loadUIState 中恢复。
- **DirectLine 组件重构（Batch 3）**：彻底移除所有历史 DirectLineManager/Connector/Queue/WebChatRenderer 相关实现，统一为 UI 无关、事件驱动、队列内聚的 DirectLineService。所有消息流、TTS、渲染状态通过 MessageEntry 模型管理，主应用与 UI 通过事件桥接。
- **文档回填与进度反向同步**：补齐 Batch 8-12 的 design/checklist/test-plan，重写 Batch 3 为完成回顾版，并更新迭代总表与架构入口说明，确保文档与当前开发基线一致。
- **CSS 设计令牌迁移（Batch 4）**：在 variables.css 新增 20+ 通用 token（text/surface/border/companion/warning），将 10 个 CSS 组件文件中的硬编码颜色从 446 处降至 210 处，替换率 53%。保留的为渐变色、暗色主题和独立设计体系的专用色。
- **新增 Batch 13（OpenAI Compatible 接口支持）**：允许 AI Companion 连接任何兼容 OpenAI API 协议的 LLM 供应方，含完整需求/设计/检查/测试文档。

### Fixed
- **AI Companion 测试连接按钮进度态**：在设置面板点击 Test Connection 后，按钮会立即切换为 `Testing...` 并临时禁用，测试结束后自动恢复，避免重复点击并明确当前执行状态。
- **初始化死循环修复**：修复因事件模型重构导致的 splash screen/设置面板无法进入问题。补充事件桥接与超时兜底，确保初始化流程健壮。
- **IME 回车误发送修复（Batch 10）**：在 Enter keydown 中增加 `e.isComposing` 判断与 `e.preventDefault()`，防止中文/日文 IME 候选确认时误触发消息发送。
- **Full-width 模式持久化修复**：修复新会话/页面刷新后 full-width 设置未生效的问题，在 `loadUIState()` 中增加 localStorage 读取与应用。
- **Thinking dot 文字换行修复**：修复 typing indicator 状态文字多行换行问题，强制单行显示并自适应气泡宽度。
- **初始化流程优化**：连接建立后立即释放 splash screen，不再等待 greeting 消息完成，减少用户等待时间。
- **Thinking Dot 行为改进（Batch 9）**：增加消息到达后 500ms 防重显窗口，防止迟到的 typing 事件在消息已显示后重新召回 indicator。安全超时从 60s 缩短至 30s。
- **文档补全（Batch 5）**：新增 DirectLineService 架构文档和 Conversation-Aware Thinking 功能文档，更新文档索引。导出模式统一和导入顺序修正暂跳过（当前稳定运行中，无回归风险需要）。
- **消息性能指标增强（Batch 6）**：Agent 回复消息元信息中新增 TTFT（Time To First Token）指标，显示从用户发送到收到第一个响应的时间。复用现有 responseTimeTracking 基础设施，无新增全局变量。
- **Appearance 右侧栏面板（Batch 12）**：在左侧 command bar 新增 Appearance 图标按钮，点击后在右侧弹出外观设置面板（主题色彩、消息图标、字体大小），修改即时生效。
- **Streaming 样式与速度配置（Batch 11）**：在 Appearance 面板中新增消息流式输出样式选择（Typewriter/Word/Sentence/Instant）和速度控制（Slow/Normal/Fast/Ultra），选择后对新消息即时生效，配置持久化到 localStorage。
- **原生 Streaming 支持重设计（Batch 8）**：修正此前错误结论，实现自动检测+双路径策略。DirectLineService 新增 activity 诊断日志和 streaming chunk 检测（channelData.streamType/streamSequence/typing+text），检测到原生流式时通过 messageChunk 事件实时渲染，未检测到时自动回退模拟流式。

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **OpenAI Compatible 接口支持（Batch 13）**：在 AI Companion 供应方下拉框新增“OpenAI Compatible”选项，支持连接任何兼容 OpenAI `/v1/chat/completions` 协议的 LLM 供应方（DeepSeek、Groq、LM Studio 等）。含 Base URL / API Key / Model Name / Display Name 配置、测试连接按钮、加密存储和 streaming 输出支持。
- **Conversation-Aware Thinking System**: Revolutionary thinking mechanism that leverages complete conversation context (last 3-5 turns) for more insightful and relevant AI thinking responses
- **Enhanced Thinking Context Integration**: Rich conversation history formatting with timestamps, role identification, and attachment awareness for deeper contextual understanding
- **Progressive Thinking Types**: Four distinct thinking phases - Analysis, Context-Aware, Practical, and Synthesis thinking that build upon conversation history and current discussion flow
- **Intelligent Timeout Feedback**: User-friendly timeout messages when thinking completes without agent response, providing clear guidance to rephrase questions and try again
- **Contextual Continuous Thinking**: Advanced continuous thinking that references conversation patterns, follow-up questions, and thematic connections across discussion history
- **Thinking Language Consistency**: Automatic language detection and consistent thinking responses that match user's question language (English/Chinese)
- **Conversation Flow Analysis**: Deep understanding of conversation evolution, question patterns, and contextual relationships between messages
- **Real-time Thinking Performance**: Immediate LLM invocation with 1.5-second display delay and 200ms response polling for optimal user experience
- **Enhanced Thinking Testing Tools**: Global testing functions for conversation-aware thinking validation and debugging capabilities
- **LocalStorage Debug Tool**: Comprehensive debugging utility (`utils/localStorage-debug.html`) for diagnosing and fixing localStorage corruption issues with scan, clean, and validation features
- **Safe JSON Parsing Utilities**: Robust localStorage parsing system with automatic corruption detection, cleanup, and type validation to prevent application crashes
- **Enhanced Error Recovery System**: Comprehensive localStorage protection with corruption pattern detection and automatic remediation for stable deployment
- **Microsoft Copilot Studio Branding**: Updated splash screen with official Microsoft Copilot gradient colors and SVG agent icon for professional Microsoft Copilot Studio Companion branding
- **Enhanced Splash Screen System**: Intelligent loading progress tracking with library detection (marked, DOMPurify, katex) and smooth fade transitions
- **CSS Thinking Message Fix**: Resolved CSS cascade conflicts affecting thinking message display using semantic design tokens instead of !important declarations
- **Project Structure Optimization**: Complete cleanup of root directory with documentation consolidation and removal of development artifacts

### Removed  
- **Tests Directory Cleanup**: Removed entire `/tests/` folder (41 test files) with zero impact on main application functionality after comprehensive dependency analysis
- **Development Artifacts**: Eliminated test-related documentation sections and references for cleaner production-ready codebase
- **Root Directory Cleanup**: Moved development utilities to `utils/` directory and documentation summaries to appropriate `docs/` sections
- **Root Directory Deep Cleanup (Batch 1)**: Removed 80 obsolete .md report/summary files, 21 test/debug .html files, 5 debug .js scripts, and 1 rollback shell script from root directory. Root now contains only README.md, TODO.md, CHANGELOG.md, index.html, chat-server.js, and ollama-proxy.js
- **CommonJS Fallback Removal (Batch 2)**: Removed `if (typeof module !== 'undefined' && module.exports)` blocks from 5 files and replaced with proper ES Module `export` statements
- **Duplicate DirectLineConnector (Batch 2)**: Deleted unused `src/core/DirectLineConnector.js` (zero import references); sole implementation now at `src/components/directline/DirectLineConnector.js`

### Changed
- **Thinking Context Architecture**: Complete overhaul from keyword-based topic extraction to rich conversation history analysis with proper message role tracking and temporal context
- **Enhanced Thinking Prompting**: Structured conversation context formatting with progressive reasoning types that build upon discussion history and demonstrate conversation continuity
- **Improved Contextual Awareness**: Thinking responses now reference previous topics, follow-up questions, conversation patterns, and thematic connections for more meaningful insights
- **Advanced Thinking Flow**: Four-phase thinking progression (Analysis → Context-Aware → Practical → Synthesis) that creates comprehensive understanding of conversation evolution
- **Documentation Consolidation**: Reorganized all migration and development documentation following English/Chinese bilingual structure in `docs/` folder
- **Development Utilities Organization**: Moved all debugging tools, test files, and development scripts to dedicated `utils/` directory with comprehensive documentation
- **CSS Architecture Enhancement**: Implemented design token system in `css/base/variables.css` with Microsoft Copilot gradient support
- **Splash Screen Integration**: Unified loading experience with Microsoft branding and intelligent progress tracking

### Fixed
- **Critical JSON Parsing Error**: Fixed "[object Object]" is not valid JSON error affecting companion KPI analysis by implementing robust localStorage corruption detection and cleanup
- **LocalStorage Data Corruption**: Added comprehensive protection against corrupted localStorage data that could cause application crashes during GitHub Pages deployment
- **Enhanced Error Recovery**: Implemented safe JSON parsing utilities with automatic cleanup of malformed data and browser extension interference protection
- **AI Companion Initialization**: Fixed companion KPI analysis failures caused by localStorage corruption through enhanced error handling and data validation
- **Storage Error Prevention**: Added localStorage guard utilities to prevent future corruption and provide detailed debugging capabilities
- **Thinking Timing Issues**: Resolved thinking messages appearing after agent responses by implementing immediate LLM invocation with delayed display logic
- **Conversation Context Gaps**: Fixed limited thinking insights by implementing full conversation history analysis instead of simple keyword extraction
- **Thinking Relevance Problems**: Enhanced thinking contextual awareness to generate more meaningful insights that build upon conversation history and demonstrate understanding
- **Language Inconsistency**: Fixed thinking language switching issues by implementing proper language detection and consistent response formatting
- **Timeout User Experience**: Added helpful timeout messages with guidance for users when no agent response is received after thinking period
- **CSS Cascade Issues**: Resolved thinking message display problems using proper CSS specificity and semantic design tokens
- **Splash Screen Timing**: Fixed element reference and initialization timing issues in splash screen system
- **Documentation Organization**: Standardized bilingual documentation structure for better maintainability

- **KPI Grid Layout Optimization**: Improved agent KPI section from 4 columns to 3 columns in non-expanded state for better visual balance and readability
- **Enhanced Speech Recognition Error Handling**: Fixed critical bug where transcript processing could fail with non-string data types, improving voice input reliability across all speech providers
- **Robust Speech Input Validation**: Added comprehensive type checking and data sanitization for speech recognition results, supporting string, object, and mixed-type responses
- **Azure Speech Recognition Compatibility**: Fixed Azure Speech SDK initialization errors with proper constructor usage for language detection features
- **Smart Timeout Notification System**: Intelligent state-aware timeout management that only shows notifications while waiting for LLM response and clears them immediately when content streaming starts
- **Enhanced Notification Lifecycle**: Proper cleanup and state management preventing notification pollution during active streaming operations
- **Unified Notification System for AI Companion**: Fixed notification area positioned above quick action area, providing clean separation between valuable AI output and system notifications
- **Enhanced A/B Test Streaming**: Real-time streaming implementation for benchmark comparisons with progressive content building for better user engagement
- **Clean UI Design**: Removed status spinner from AI companion chat window, leveraging unified notification system for all progress indicators
- **Real-time Streaming Speech Feature**: Revolutionary speech synthesis that starts speaking immediately as text streams, eliminating wait times and creating a responsive conversational experience
- **Intelligent Sentence Boundary Detection**: Advanced text parsing to identify complete sentences during streaming for natural speech flow
- **Speech Queue Management System**: Sequential processing of speech chunks with proper timing and error handling
- **Multi-Provider Speech Engine Fallbacks**: Robust error handling with automatic fallback from Local AI → Web Speech API when models fail to load
- **Enhanced Speech Provider Architecture**: Improved initialization with timeout handling, error recovery, and user notifications
- **Streaming Speech State Management**: Comprehensive state tracking for speech processing during text streaming
- **Progressive Speech Enhancement**: Text cleaning and markdown processing optimized for speech synthesis
- **Streaming Speech Test Page**: Comprehensive testing interface (`test-streaming-speech.html`) for validating speech functionality across providers
- **Speech Provider Status Notifications**: Real-time user feedback for provider fallbacks and initialization issues
- **Comprehensive KPI Explanation System**: Integrated guide explaining the meaning and benefits of all performance metrics, especially the "CHANGES" KPI
- **Interactive Performance Guide**: Added "📖 Guide" button in Performance Metrics section with real-world examples and usage patterns
- **Enhanced CHANGES KPI Modal**: Detailed explanation of conversation evolution tracking, trend analysis, and optimization strategies
- **User Benefit Examples**: Practical scenarios showing how different change counts and trends indicate conversation effectiveness
- **Progressive Response Notifications**: User-friendly notification system that provides helpful guidance during long AI model processing without imposing hard timeouts
- **Deep Thinking Model Support**: Respectful approach that allows unlimited processing time for complex reasoning models while offering lighter model suggestions
- **First-Use Model Detection**: Enhanced tracking of model usage to provide appropriate expectations for initial model loading vs. subsequent requests
- **Non-Intrusive Performance Guidance**: Progressive notifications at 15s, 30s, 60s, and 120s intervals with helpful model recommendations
- **First-Invocation Performance Optimization**: Intelligent model loading detection with extended timeouts and retry logic for first-time model use
- **Model Performance State Tracking**: Track model usage history to optimize subsequent invocations and provide appropriate user feedback
- **Adaptive KPI Analysis**: Skip heavy LLM analysis during first model invocation to reduce initial response time
- **Enhanced Loading Indicators**: Context-aware typing indicators that inform users about model loading states
- **Debug Utilities**: Developer console tools for troubleshooting AI companion performance (`window.aiCompanionDebug`)
- **Mobile Responsive Design**: Complete mobile-friendly interface with touch optimization
- **Mobile AI Companion**: Floating action button for easy AI companion access on mobile devices
- **Swipe Gestures**: Intuitive navigation with swipe-to-open/close panel functionality
- **Mobile Utilities Class**: Comprehensive mobile state management and event handling
- **Touch-Optimized Controls**: 44px minimum touch targets and iOS-friendly input handling
- **Adaptive Layout System**: Intelligent panel management across different screen sizes
- **Mobile Documentation**: Comprehensive guides for mobile features and troubleshooting
- Comprehensive documentation restructure with organized sections
- AI Companion system with auto title generation and suggested actions
- User icon selection system with 10 pre-built avatars
- Custom user icon upload functionality
- Enhanced message icon positioning and alignment
- Improved localStorage management with consistent key naming

### Changed
- **AI Companion Approach**: Completely redesigned from timeout-based to notification-based system that respects user model choices and supports deep thinking models
- **Response Time Management**: Removed aggressive timeout controls in favor of progressive user notifications with helpful suggestions
- **Model Processing Freedom**: Eliminated artificial constraints on model processing time to support legitimate deep reasoning models
- **User Experience**: Enhanced feedback system that informs without interrupting, providing model recommendations for users seeking faster responses
- **AI Companion Performance**: Optimized first-time model invocation with 60-second timeout instead of 30 seconds
- **KPI Analysis Efficiency**: Deferred heavy LLM analysis during first model use to prioritize response speed
- **Error Handling**: Enhanced retry logic with up to 2 retries for first-time model loading failures
- Updated mobile breakpoints for better responsive behavior (768px tablet, 480px mobile)
- Enhanced CSS media queries with landscape mode optimizations  
- Improved mobile panel animations with hardware acceleration
- Restructured documentation from single README to modular doc system
- Updated icon positioning CSS for better visual alignment
- Improved user icon application logic with automatic persistence

### Fixed
- **Model Processing Constraints**: Removed inappropriate timeout controls that interfered with legitimate deep thinking model usage
- **User Choice Respect**: Fixed system behavior to honor user model selection without artificial processing limitations  
- **First Invocation Experience**: Improved user feedback during initial model loading without forcing premature timeouts
- **Progressive Guidance**: Implemented helpful notifications that guide users toward faster models without restricting their choices
- **First Invocation Delays**: Resolved performance issues where first-time AI model invocation could timeout or take excessively long
- **Model Loading Feedback**: Added proper user feedback during model loading states to reduce perceived wait time
- AI companion panel completely hidden on mobile devices
- Mobile layout conflicts and overlapping UI elements
- Touch gesture detection and panel management issues
- Responsive design inconsistencies across different devices
- User icon selection not applying automatically to messages
- Inconsistent localStorage key handling between components
- Message icon alignment issues with message content
- Auto title generation being inadvertently disabled

### Changed
- **AI Companion 模型注册可编辑**：Registered Models 表格新增 `Edit` 操作，复用 Add Model 表单进行就地修改；编辑时 API Key 可留空以保留 SecureStorage 中现有密钥；若编辑的是当前激活模型，保存后会立即刷新当前 provider 状态和模型显示。
- **Appearance 可见性控制**：新增 `Show user messages` 与 `Show metric information` 开关，可即时隐藏用户消息气泡、消息 metadata 以及 AI Companion KPI 区域，并持久化到 localStorage。
- **模型编辑约束与移动端修正**：编辑已注册模型时固定原 provider，避免跨 provider 复用空 API Key 导致配置失效；同时修正窄屏下 Registered Models 表格断点覆盖顺序，恢复 480px 以下两行布局。

### Fixed
- **Message metadata 自动隐藏开关失效**：修复 bot/agent metadata 被基础样式默认隐藏导致的设置无效问题；关闭 Auto hide 后 metadata 默认显示，开启后才按悬停显示。
- **统一消息样式契约补齐**：Unified 渲染器输出 metadata 同时携带 `message-metadata` 与 `unified-message-metadata` 类，减少 legacy/unified 样式分裂带来的行为偏差。
- **KPI 分析期间旧结果闪清问题**：分析进行中保留上一次分析结果（降低不透明度标记陈旧），仅在新结果就绪后替换内容；新增状态指示器（Analyzing / Analysis complete / Analysis failed）显示在 Insights 区域顶部。
- **Phase 1 死代码清理**：归档删除 CustomChatInterface（749+220 LOC）、EnhancedChatWidget（1,219 LOC）、chat/ui/MessageRenderer（175+120 LOC）、UNIFIED_CHAT_COMPONENT_DESIGN.md（131KB）共 6 个无引用文件；清理 versionRegistry 和 aboutSection 中已删模块引用；移除 application.js 注释掉的导入块。
- **KPI 评估提示词臆测问题**：修复 `buildKPIExplanationPrompt` 上下文提取前缀不匹配（`User (time):` vs `User:`）导致 LLM 收到空对话、被迫基于假设评估的问题。改用 `getAdaptiveConversationContext('analysis')` 获取完整对话，提示词增加「不得假设、只分析实际对话、引用原文」约束。

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **首页增强与风格化（Batch 20）**：首页标题更名为「Copilot Studio Agent Hub」；Agent 配置新增 description 字段（新建/编辑表单支持）；卡片上显示描述文本（2 行截断）。
- **粘贴图片发送（Batch 19）**：支持在聊天输入框 Ctrl/Cmd+V 粘贴剪贴板图片，自动转为 File 对象并复用文件上传管线。

## [2.0.0] - 2024-01-15

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **Multi-Provider AI Support**: OpenAI, Anthropic, Ollama, and Azure OpenAI
- **Agent Management System**: Pre-configured and custom agents
- **AI Companion Features**: Auto title generation and suggested actions
- **Progressive Web App**: PWA support with offline capabilities
- **Advanced Message Rendering**: Markdown, syntax highlighting, and interactive features
- **Theme System**: Dark, light, and custom theme support
- **Export/Import**: Multiple formats including JSON, Markdown, and Plain Text
- **Search Functionality**: Full-text search across conversations
- **Local Storage**: Secure local data storage with encryption options

### Changed
- **Complete Architecture Rewrite**: Modular, component-based architecture
- **Modern JavaScript**: ES6+ modules and async/await patterns
- **Enhanced UI/UX**: Responsive design with mobile optimization
- **Performance Improvements**: Virtual scrolling and lazy loading
- **Security Enhancements**: Content sanitization and secure storage

### Removed
- **Legacy Dependencies**: Removed outdated libraries and polyfills
- **Single Provider Limitation**: No longer limited to one AI provider

## [1.5.2] - 2023-12-20

### Fixed
- Conversation loading performance issues
- Message rendering bugs with code blocks
- Export functionality edge cases

### Changed
- Improved error handling and user feedback
- Updated dependencies for security patches

## [1.5.1] - 2023-12-10

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- Basic conversation search functionality
- Message copy buttons for code blocks
- Improved keyboard navigation

### Fixed
- Session persistence issues in certain browsers
- CSS styling conflicts with user themes

## [1.5.0] - 2023-11-25

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **Conversation Management**: Save, load, and organize multiple conversations
- **Message History**: Persistent conversation history
- **Basic Themes**: Dark and light theme options
- **Settings Panel**: Centralized configuration interface

### Changed
- Improved message rendering performance
- Enhanced mobile responsiveness
- Better error handling and user feedback

### Fixed
- Memory leaks in long conversations
- Scroll position issues in message view

## [1.4.1] - 2023-11-10

### Fixed
- API key storage and retrieval issues
- Message formatting edge cases
- Browser compatibility issues with older versions

### Security
- Enhanced input sanitization
- Improved XSS protection measures

## [1.4.0] - 2023-10-28

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **Multiple AI Providers**: Support for OpenAI and Anthropic
- **Streaming Responses**: Real-time response streaming
- **Message Actions**: Edit, delete, and regenerate messages
- **Code Syntax Highlighting**: Enhanced code block rendering

### Changed
- Redesigned user interface with modern styling
- Improved message layout and readability
- Better mobile device support

### Deprecated
- Legacy API configuration methods

## [1.3.2] - 2023-10-15

### Fixed
- Message persistence bugs
- UI responsiveness issues
- API rate limiting edge cases

### Changed
- Optimized bundle size and loading performance
- Updated styling for better accessibility

## [1.3.1] - 2023-10-05

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- Basic conversation export functionality
- Improved error messages and user guidance

### Fixed
- Session management edge cases
- Cross-browser compatibility issues

## [1.3.0] - 2023-09-20

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **Local Storage**: Conversations now persist locally
- **Session Management**: Basic session handling
- **Settings Persistence**: User preferences saved across sessions

### Changed
- Improved application startup performance
- Enhanced error handling and recovery
- Better user feedback for API errors

### Fixed
- Message ordering issues in fast typing scenarios
- Memory usage optimization

## [1.2.1] - 2023-09-10

### Fixed
- Critical bug in message sending functionality
- CSS styling issues on mobile devices
- Performance issues with long conversations

### Security
- Fixed potential XSS vulnerability in message rendering

## [1.2.0] - 2023-08-25

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **Markdown Support**: Full markdown rendering in messages
- **Message Formatting**: Rich text formatting options
- **Copy Functionality**: Copy messages and code blocks
- **Responsive Design**: Mobile and tablet optimization

### Changed
- Improved user interface design
- Better message bubble styling
- Enhanced readability and typography

### Fixed
- Text input performance issues
- Message rendering bugs

## [1.1.2] - 2023-08-15

### Fixed
- API connection timeout issues
- User input validation edge cases
- Browser compatibility problems

### Changed
- Improved error messages for better user guidance
- Enhanced loading indicators

## [1.1.1] - 2023-08-05

### Fixed
- Critical bug preventing message sending
- Styling issues in certain browsers
- Memory leak in message handling

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- Basic error logging for debugging

## [1.1.0] - 2023-07-20

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **User Interface**: Modern chat interface design
- **Message History**: Basic conversation tracking
- **Input Validation**: User input sanitization and validation
- **Error Handling**: Basic error handling and user feedback

### Changed
- Improved application structure and organization
- Better separation of concerns in codebase
- Enhanced user experience flows

### Fixed
- Message display formatting issues
- Input field focus problems

## [1.0.1] - 2023-07-10

### Fixed
- Initial release bug fixes
- Documentation updates
- Performance optimizations

### Security
- Added basic input sanitization
- Implemented secure API key handling

## [1.0.0] - 2023-07-01

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- **Initial Release**: Basic chat functionality with OpenAI integration
- **Core Features**:
  - Single conversation interface
  - OpenAI GPT integration
  - Basic message sending and receiving
  - Simple HTML/CSS interface
- **Documentation**: Basic setup and usage instructions
- **License**: MIT license for open source distribution

### Technical Details
- Pure HTML, CSS, and JavaScript implementation
- Client-side only architecture
- Local browser storage for API keys
- Responsive web design principles

---

## Release Notes

### Version 2.0.0 - Major Rewrite
This version represents a complete rewrite of the application with modern architecture, enhanced features, and improved performance. The transition from v1.x to v2.0 includes:

- **Breaking Changes**: Configuration format changes require migration
- **New Features**: Extensive new functionality and capabilities
- **Performance**: Significant performance improvements
- **Security**: Enhanced security measures and best practices

### Migration Guide (v1.x to v2.0)
1. **Settings Migration**: Export settings from v1.x before upgrading
2. **Conversation Data**: Conversations from v1.x can be imported using the new import feature
3. **API Configuration**: Reconfigure API providers using the new settings interface
4. **Custom Themes**: Custom themes need to be adapted to the new theme system

### Deprecation Notice
- **v1.x Support**: v1.x will receive security updates only until July 2024
- **Legacy Features**: Some v1.x features may not be available in v2.0
- **Migration Tools**: Automated migration tools available in the application

### Future Releases

#### v2.1.0 (Planned - Q2 2024)
- Voice input and output capabilities
- Enhanced mobile experience
- File upload and processing
- Advanced AI provider features

#### v2.2.0 (Planned - Q3 2024)
- Team collaboration features
- Enhanced security options
- Performance optimizations
- Additional AI providers

#### v3.0.0 (Planned - Q4 2024)
- Desktop application
- Cloud synchronization options
- Enterprise features
- Plugin ecosystem

---

## Contributing to Changelog

When contributing to this project:

1. **Version Numbering**: Follow semantic versioning (MAJOR.MINOR.PATCH)
2. **Change Categories**: Use standard categories (Added, Changed, Deprecated, Removed, Fixed, Security)
3. **Description Format**: Write clear, concise descriptions of changes
4. **Links and References**: Include relevant issue/PR numbers
5. **Breaking Changes**: Clearly mark breaking changes and provide migration guidance

### Change Categories

- **Added**: New features and capabilities
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Features removed in this release
- **Fixed**: Bug fixes and corrections
- **Security**: Security-related changes and fixes

### Example Entry
```markdown
## [1.2.3] - 2023-XX-XX

### Added
- **模型测试性能指标**：在模型配置测试连接时，新增支持采集 TTFT（首字节延迟）、TTLT（总延迟）和 Token/s 指标，并在注册模型列表中展示。
- **禁用推理模式开关**：模型配置中新增“禁用 Reasoning 模式”开关，通过注入系统 prompt 来提高部分带有推理功能模型的响应速度。
- New feature description (#123)
- Another feature with clear benefits

### Changed
- Modified existing behavior with rationale
- Updated dependency with version info

### Fixed
- Bug fix description (#456)
- Performance improvement details

### Security
- Security vulnerability fix (CVE-XXXX-XXXX)
```

---

For the complete history and detailed technical changes, see the [GitHub commit history](https://github.com/illusion615/MCSChat/commits/main).
