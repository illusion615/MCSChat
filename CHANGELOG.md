# CHANGELOG

All notable changes to MCS Chat will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

### Removed
- **GitHub 提交前清理**：删除 `migration-backup-20250902-032535/`（旧迁移备份）、`legacy/`（旧版代码）、`tests/`（开发调试 HTML）、`utils/`（一次性脚本）、备份文件（`directLineLogsService-backup.js`、`index-old.js`）和 svg-icon-manager 临时文档（CLEANUP/COMPLETION/DESIGN_ANALYSIS/MIGRATION SUMMARY）。新增 `.gitignore` 排除 `.DS_Store`、`.venv/`、`node_modules/`、`.env`、IDE 配置等。

### Added
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

## [2.0.0] - 2024-01-15

### Added
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
- Basic conversation search functionality
- Message copy buttons for code blocks
- Improved keyboard navigation

### Fixed
- Session persistence issues in certain browsers
- CSS styling conflicts with user themes

## [1.5.0] - 2023-11-25

### Added
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
- Basic conversation export functionality
- Improved error messages and user guidance

### Fixed
- Session management edge cases
- Cross-browser compatibility issues

## [1.3.0] - 2023-09-20

### Added
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
- Basic error logging for debugging

## [1.1.0] - 2023-07-20

### Added
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
