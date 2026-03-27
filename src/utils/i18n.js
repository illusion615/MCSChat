/**
 * Internationalization (i18n) Module
 * Supports English and Chinese UI languages
 */

const locales = {
    en: {
        // Home page
        'home.defaultTitle': 'Copilot Studio Agent Hub',
        'home.defaultSubtitle': 'Manage, test and evaluate your Copilot Studio agents.',
        'home.loading': 'Loading...',
        'home.footer': 'Empowered with Microsoft Copilot Studio',
        'home.addAgent': 'Add New Agent',
        'home.ready': 'Ready',
        'home.conversations': 'Conversations',
        'home.totalTime': 'Total Time',
        'home.messages': 'Messages',
        'home.lastActive': 'Last Active',
        'home.params': 'params',

        // Navigation & sidebar
        'nav.backToHome': 'Back to Home',
        'nav.appearance': 'Appearance',
        'nav.documentation': 'Documentation',
        'nav.knowledgeHub': 'Knowledge Hub',
        'nav.settings': 'Settings',

        // Appearance panel
        'appearance.title': 'Appearance',
        'appearance.close': 'Close',
        'appearance.groupMessageDisplay': 'Message Display',
        'appearance.groupThemeBackground': 'Theme & Home Background',
        'appearance.groupTypographyMotion': 'Typography & Motion',
        'appearance.groupAgentBehavior': 'Agent Behavior',
        'appearance.groupSystem': 'System',
        'appearance.showMessageIcons': 'Show message icons',
        'appearance.showMessageIconsHelp': 'Display user and agent avatars next to messages',
        'appearance.showUserMessages': 'Show user messages',
        'appearance.showUserMessagesHelp': 'Hide user-side bubbles when reviewing agent-only output',
        'appearance.showMetadata': 'Show message metadata',
        'appearance.showMetadataHelp': 'Control message metadata display after each message',
        'appearance.autoHideMetadata': 'Auto hide message metadata',
        'appearance.autoHideMetadataHelp': 'Metadata is hidden by default and revealed on hover',
        'appearance.autoHideSidebar': 'Auto hide sidebar',
        'appearance.autoHideSidebarHelp': 'Sidebar collapses to a thin strip and expands on hover',
        'appearance.colorTheme': 'Color Theme:',
        'appearance.colorThemeHelp': 'Choose a background color theme',
        'appearance.homeBgImage': 'Home Background Image:',
        'appearance.noImage': 'No image selected',
        'appearance.uploadImage': 'Upload Image',
        'appearance.remove': 'Remove',
        'appearance.bgImageHelp': 'Image will be displayed with blur effect behind agent cards',
        'appearance.homeTitle': 'Home Title:',
        'appearance.homeSubtitle': 'Home Subtitle:',
        'appearance.fontSizeSettings': 'Font Size Settings:',
        'appearance.agentChat': 'Agent Chat:',
        'appearance.aiCompanion': 'AI Companion:',
        'appearance.streamingStyle': 'Message Streaming Style:',
        'appearance.streamingStyleHelp': 'How agent messages appear on screen',
        'appearance.smooth': 'Smooth (light rendering)',
        'appearance.typewriter': 'Typewriter (character by character)',
        'appearance.wordByWord': 'Word by word',
        'appearance.sentenceBySentence': 'Sentence by sentence',
        'appearance.instant': 'Instant (no animation)',
        'appearance.streamingSpeed': 'Streaming Speed:',
        'appearance.streamingSpeedHelp': 'Speed of the streaming animation',
        'appearance.slow': 'Slow',
        'appearance.normal': 'Normal',
        'appearance.fast': 'Fast',
        'appearance.ultraFast': 'Ultra Fast',
        'appearance.suggestedActionsPosition': 'Suggested Actions Position:',
        'appearance.suggestedActionsHelp': 'Where suggested action buttons appear in the chat',
        'appearance.aboveInput': 'Above input box (fixed)',
        'appearance.inlineAfterMessage': 'Inline after message',
        'appearance.thinkingStyle': 'Thinking Indicator Style:',
        'appearance.thinkingStyleHelp': 'Animation style for the typing indicator dots',
        'appearance.agentOptions': 'Agent Options:',
        'appearance.enableStreaming': 'Enable streaming responses (simulation mode)',
        'appearance.enableStreamingHelp': 'Simulates progressive response display for better UX',
        'appearance.openCitationsSideBrowser': 'Open citations in side browser',
        'appearance.openCitationsHelp': 'View citation sources within the app instead of external browser',
        'appearance.autoOpenCitations': 'Auto-open message links in side browser',
        'appearance.autoOpenCitationsHelp': 'Automatically open URLs in agent replies as a tab in the analysis panel',
        'appearance.fullWidthMessages': 'Display agent messages in full width',
        'appearance.fullWidthMessagesHelp': 'Show agent responses across the full panel width',
        'appearance.language': 'Language:',
        'appearance.languageHelp': 'Interface and AI Companion output language',

        // Leave confirm overlay
        'leave.title': 'Leave Current Session?',
        'leave.message': 'The current agent session will be disconnected. You can start a new session from the home page.',
        'leave.cancel': 'Cancel',
        'leave.confirm': 'Leave',

        // Delete agent overlay
        'delete.title': 'Delete Agent',
        'delete.message': 'This action cannot be undone. To confirm, type the agent name below:',
        'delete.placeholder': 'Type agent name to confirm',
        'delete.cancel': 'Cancel',
        'delete.confirm': 'Delete',

        // Chat area
        'chat.title': 'Agent Conversation',
        'chat.inputPlaceholder': 'Type your message...',
        'chat.send': 'Send message',

        // Agent card stats
        'stats.never': 'Never',
        'stats.justNow': 'Just now',
        'stats.minutesAgo': '${n}m ago',
        'stats.hoursAgo': '${n}h ago',
        'stats.daysAgo': '${n}d ago',

        // Theme names
        'theme.default': 'Default',
        'theme.ocean': 'Ocean',
        'theme.sunset': 'Sunset',
        'theme.forest': 'Forest',
        'theme.cosmic': 'Cosmic',
        'theme.aurora': 'Aurora',
        'theme.minimal': 'Minimal',
        'theme.dark': 'Dark',

        // AI Companion language instruction
        'ai.languageInstruction': 'You MUST respond in English.',

        // Chat area
        'chat.conversations': 'Conversations',
        'chat.newChat': 'New chat',
        'chat.clearAllHistory': 'Clear All History',
        'chat.loadingHistory': 'Loading chat history...',
        'chat.welcomeTitle': 'Welcome to Copilot Studio Companion',
        'chat.welcomeMessage': 'Connect with your Copilot Studio agent to test and improve the agent user interactive experience, configure your bot in settings or start typing to begin.',
        'chat.analyzeResponse': 'Analyze Response',
        'chat.summarizeChat': 'Summarize Chat',
        'chat.abTest': 'A/B Test Response',
        'chat.autoQA': 'AutoQA',
        'chat.analyzeTitle': 'Analyze agent responses',
        'chat.summarizeTitle': 'Summarize conversation',
        'chat.abTestTitle': 'Run A/B test: Compare agent response with general knowledge',
        'chat.autoQATitle': 'Automated QA: Simulate user interactions and evaluate agent quality',
        'chat.attachFile': 'Attach file',
        'chat.voiceInput': 'Voice input',
        'chat.uploading': 'Uploading...',
        'chat.agentMode': 'Agent Mode',
        'chat.companionMode': 'AI Companion Mode',
        'chat.agentModeStatus': 'Agent Mode — messages are sent to your Copilot Studio agent.',
        'chat.toggleRightPanel': 'Toggle Right Panel',
        'chat.expandPanel': 'Expand panel to 50/50 layout',
        'chat.mobileTitle': 'Copilot Studio Companion',

        // KPI panel
        'kpi.agentPerformance': 'Agent Performance',
        'kpi.accuracy': 'Accuracy',
        'kpi.helpfulness': 'Helpfulness',
        'kpi.completeness': 'Completeness',
        'kpi.efficiency': 'Efficiency',
        'kpi.changes': 'Changes',
        'kpi.aiConsumption': 'AI Consumption',
        'kpi.stable': 'Stable',
        'kpi.ready': 'Ready',
        'kpi.insightsPlaceholder': 'Performance insights will appear here after agent responses.',
        'kpi.companionWelcome': 'AI Companion ready to analyze conversations and provide insights.',
        'kpi.scoreDetails': 'Score Details',
        'kpi.currentScore': 'Current Score:',
        'kpi.howCalculated': 'How this score is calculated:',
        'kpi.basedOnAnalysis': 'Based on conversation analysis:',

        // Analysis panel tabs
        'tabs.performance': 'Performance',


        // Side browser
        'browser.citationSource': 'Citation Source',
        'browser.closeBrowser': 'Close browser',
        'browser.loadingCitation': 'Loading citation source...',
        'browser.loadFailed': 'Unable to load citation source. This content may be blocked by security policies.',
        'browser.openExternal': 'Open in External Browser',

        // Knowledge Hub
        'knowledge.title': 'Knowledge Hub',
        'knowledge.uploadPdf': 'Upload PDF Document',
        'knowledge.dragDrop': 'Drag and drop a PDF file here or click to browse',
        'knowledge.browseFiles': 'Browse Files',
        'knowledge.processing': 'Processing...',
        'knowledge.docPages': 'Document Pages',
        'knowledge.uploadNew': 'Upload New Document',
        'knowledge.deleteDoc': 'Delete Document',
        'knowledge.docLibrary': 'Document Library',

        // Settings modal
        'settings.title': 'Bot Configuration',
        'settings.about': 'About',
        'settings.ttsSTT': 'TTS/STT',
        'settings.aiCompanion': 'AI Companion',

        // About section
        'about.title': 'About MCSChat',
        'about.appName': 'Microsoft Copilot Studio Companion',
        'about.description': 'A sophisticated chatbot testing interface with multi-agent support, AI companion features, and real-time streaming capabilities.',
        'about.version': 'Version',
        'about.buildDate': 'Build Date',
        'about.moduleVersions': 'Module Versions:',
        'about.coreModules': '🔧 Core Modules',
        'about.uiModules': '🎨 UI Modules',
        'about.aiSpeech': '🤖 AI & Speech',
        'about.services': '📋 Services',
        'about.components': '🧩 Components',
        'about.utils': '🔨 Utils',
        'about.systemInfo': 'System Information:',
        'about.browser': 'Browser:',
        'about.userAgent': 'User Agent:',
        'about.screenResolution': 'Screen Resolution:',
        'about.language': 'Language:',
        'about.viewOnGitHub': 'View on GitHub',
        'about.copyVersionInfo': 'Copy Version Info',

        // Agent management
        'agent.management': 'Agent Management',
        'agent.configuredAgents': 'Configured Agents:',
        'agent.addNewAgent': '+ Add New Agent',
        'agent.noAgents': 'No agents configured. Click "+ Add New Agent" to get started.',
        'agent.agentName': 'Agent Name:',
        'agent.agentNameHelp': 'A friendly name to identify this agent',
        'agent.agentNamePlaceholder': 'e.g., Customer Support Bot',
        'agent.directLineSecret': 'DirectLine Secret:',
        'agent.directLineSecretHelp': 'DirectLine secret from Azure Bot Service for this agent',
        'agent.directLineSecretPlaceholder': 'Enter DirectLine secret',
        'agent.description': 'Description:',
        'agent.descriptionPlaceholder': 'Describe what this agent does...',
        'agent.descriptionHelp': 'Optional, max 200 characters',
        'agent.initParams': 'Initialization Parameters:',
        'agent.initParamsHelp': 'Define parameters sent to the bot when starting a conversation. "Key" is sent to the bot; "Display Name" is shown to users.',
        'agent.addParam': '+ Add Parameter',
        'agent.notConnected': 'Not connected',
        'agent.testConnection': 'Test Connection',
        'agent.saveAgent': 'Save Agent',
        'agent.activeAgent': 'Currently Active Agent:',
        'agent.noAgentSelected': 'No agent selected',
        'agent.disconnected': 'Disconnected',
        'agent.startSession': 'Start Session',
        'agent.cancel': 'Cancel',
        'agent.connecting': 'Connecting...',

        // Speech settings
        'speech.title': 'Speech Settings:',
        'speech.behavior': '⚙️ Speech Behavior',
        'speech.autoSpeak': 'Auto-speak agent messages when they arrive',
        'speech.autoSpeakHelp': 'Automatically read agent responses aloud using text-to-speech',
        'speech.enableVoice': 'Enable voice input (microphone)',
        'speech.enableVoiceHelp': 'Allow sending messages using voice commands',
        'speech.voiceProvider': '🎤 Voice & Provider',
        'speech.provider': 'Speech Provider:',
        'speech.webSpeech': 'Enhanced Web Speech API (Recommended)',
        'speech.azureSpeech': 'Azure Speech Services (Premium)',
        'speech.voice': 'Voice:',
        'speech.loadingVoices': 'Loading voices...',
        'speech.testVoice': '🔊 Test Voice',
        'speech.azureConfig': 'Azure Speech Services Configuration',
        'speech.subscriptionKey': 'Subscription Key:',
        'speech.region': 'Region:',
        'speech.azureVoice': 'Azure Voice:',
        'speech.multiLanguage': '🌍 Multi-Language Support',
        'speech.autoDetect': 'Auto-detect language and switch voice',
        'speech.autoDetectHelp': 'Enable speech language identification',
        'speech.continuousDetection': 'Continuous language detection',
        'speech.expectedLanguages': 'Expected Languages:',
        'speech.voiceControls': '🎛️ Voice Controls',
        'speech.speakingRate': 'Speaking Rate:',
        'speech.volume': 'Volume:',
        'speech.naturalness': 'Naturalness:',

        // AI Companion settings
        'aiSettings.title': 'AI Companion Settings:',
        'aiSettings.enableLLM': 'Enable AI Companion (requires API key or local Ollama)',
        'aiSettings.enableLLMHelp': 'AI assistant for conversation analysis and insights',
        'aiSettings.useThinking': 'Use AI Companion for thinking simulation',
        'aiSettings.useThinkingHelp': 'When enabled, AI Companion generates contextual thinking messages while waiting for agent response. When disabled, a simple typing indicator (thinking dot) is shown instead.',
        'aiSettings.showModel': 'Show companion model in header',
        'aiSettings.showModelHelp': 'Display the current AI Companion model name in the panel header',
        'aiSettings.registeredModels': 'Registered Models:',
        'aiSettings.addModel': '+ Add Model',
        'aiSettings.addNewModel': 'Add New Model',
        'aiSettings.provider': 'Provider:',
        'aiSettings.openaiCompatible': 'OpenAI Compatible',
        'aiSettings.openaiGPT': 'OpenAI GPT',
        'aiSettings.anthropicClaude': 'Anthropic Claude',
        'aiSettings.azureOpenAI': 'Azure OpenAI',
        'aiSettings.localOllama': 'Local Ollama',
        'aiSettings.baseURL': 'Base URL:',
        'aiSettings.apiKey': 'API Key:',
        'aiSettings.modelName': 'Model Name:',
        'aiSettings.displayName': 'Display Name (optional):',
        'aiSettings.endpoint': 'Endpoint:',
        'aiSettings.deploymentName': 'Deployment Name:',
        'aiSettings.apiVersion': 'API Version:',
        'aiSettings.serverURL': 'Server URL:',
        'aiSettings.disableReasoning': 'Disable Reasoning',
        'aiSettings.disableReasoningHelp': 'Skip model thinking/reasoning for faster responses',
        'aiSettings.testConnection': 'Test Connection',
        'aiSettings.registerModel': 'Register Model',
        'aiSettings.promptManagement': 'AI Companion Prompt Management:',
        'aiSettings.managePrompts': '🎨 Manage AI Prompts',

        // Multi-Language & Voice Controls (TTS/STT section)
        'speech.multiLanguage': '🌍 Multi-Language Support',
        'speech.autoDetectLang': 'Auto-detect language and switch voice',
        'speech.autoDetectLangHelp': 'Automatically detect the language of text and select appropriate voice for TTS',
        'speech.enableLangId': 'Enable speech language identification',
        'speech.enableLangIdHelp': 'Automatically identify the language of spoken input (Azure Speech only)',
        'speech.continuousDetection': 'Continuous language detection',
        'speech.continuousDetectionHelp': 'Continuously identify language during speech recognition (may impact performance)',
        'speech.expectedLanguages': 'Expected Languages:',
        'speech.expectedLanguagesHelp': 'Hold Ctrl/Cmd to select multiple languages. This improves accuracy for speech recognition and provides better voice matching for text-to-speech.',
        'speech.voiceControls': '🎛️ Voice Controls',
        'speech.speakingRate': 'Speaking Rate:',
        'speech.volume': 'Volume:',
        'speech.naturalness': 'Naturalness:',
        'speech.naturalnessHelp': 'Higher values provide more natural speech but may be slower',

        // AI Companion section
        'aiSettings.sectionTitle': 'AI Companion',
        'aiSettings.modelsHelp': 'Models registered for AI Companion. Click ⚡ to switch.',
        'aiSettings.addNewModel': 'Add New Model',
        'aiSettings.promptManagementLabel': 'AI Companion Prompt Management:',
        'aiSettings.promptDescription': 'Customize how the AI companion thinks and responds. Changes are saved automatically and only affect your experience.',
        'aiSettings.managePromptsBtn': '🎨 Manage AI Prompts',
        'aiSettings.promptReviewHelp': 'Review and customize AI companion thinking prompts, KPI explanations, and response generation templates',

        // Model registry table
        'models.model': 'Model',
        'models.provider': 'Provider',
        'models.tokens': 'Tokens',
        'models.perf': 'Perf',
        'models.actions': 'Actions',
        'models.empty': 'No models registered. Click "+ Add Model" to get started.',

        // Knowledge Hub dynamic text
        'knowledge.storageUsage': 'Storage Usage: ${size} / ~10MB (${percent}%)',
        'knowledge.noDocuments': 'No documents uploaded yet.',
        'knowledge.storageFull': 'Storage nearly full. Consider deleting old documents.',

        // Thinking indicator styles
        'thinking.bounce': 'Bounce',
        'thinking.pulse': 'Pulse',
        'thinking.wave': 'Wave',
        'thinking.elastic': 'Elastic',
        'thinking.ripple': 'Ripple',
    },
    zh: {
        // Home page
        'home.defaultTitle': 'Copilot Studio 智能体中心',
        'home.defaultSubtitle': '管理、测试和评估你的 Copilot Studio 智能体。',
        'home.loading': '加载中...',
        'home.footer': '由 Microsoft Copilot Studio 赋能',
        'home.addAgent': '添加新智能体',
        'home.ready': '就绪',
        'home.conversations': '对话数',
        'home.totalTime': '总时长',
        'home.messages': '消息数',
        'home.lastActive': '最后活跃',
        'home.params': '个参数',

        // Navigation & sidebar
        'nav.backToHome': '返回主页',
        'nav.appearance': '外观',
        'nav.documentation': '文档',
        'nav.knowledgeHub': '知识库',
        'nav.settings': '设置',

        // Appearance panel
        'appearance.title': '外观设置',
        'appearance.close': '关闭',
        'appearance.groupMessageDisplay': '消息显示',
        'appearance.groupThemeBackground': '主题与首页背景',
        'appearance.groupTypographyMotion': '字体与动画',
        'appearance.groupAgentBehavior': '智能体行为',
        'appearance.groupSystem': '系统',
        'appearance.showMessageIcons': '显示消息图标',
        'appearance.showMessageIconsHelp': '在消息旁显示用户和智能体头像',
        'appearance.showUserMessages': '显示用户消息',
        'appearance.showUserMessagesHelp': '仅查看智能体输出时可隐藏用户消息气泡',
        'appearance.showMetadata': '显示消息元数据',
        'appearance.showMetadataHelp': '在每条消息后显示元数据信息',
        'appearance.autoHideMetadata': '自动隐藏消息元数据',
        'appearance.autoHideMetadataHelp': '元数据默认隐藏，悬停时显示',
        'appearance.autoHideSidebar': '自动隐藏侧边栏',
        'appearance.autoHideSidebarHelp': '侧边栏收缩为细条，悬停时展开',
        'appearance.colorTheme': '颜色主题：',
        'appearance.colorThemeHelp': '选择背景颜色主题',
        'appearance.homeBgImage': '主页背景图片：',
        'appearance.noImage': '未选择图片',
        'appearance.uploadImage': '上传图片',
        'appearance.remove': '移除',
        'appearance.bgImageHelp': '图片将以虚化效果显示在智能体卡片后方',
        'appearance.homeTitle': '主页标题：',
        'appearance.homeSubtitle': '主页副标题：',
        'appearance.fontSizeSettings': '字体大小设置：',
        'appearance.agentChat': '智能体聊天：',
        'appearance.aiCompanion': 'AI 助手：',
        'appearance.streamingStyle': '消息流式风格：',
        'appearance.streamingStyleHelp': '智能体消息在屏幕上的显示方式',
        'appearance.smooth': '平滑（轻量渲染）',
        'appearance.typewriter': '打字机（逐字显示）',
        'appearance.wordByWord': '逐词显示',
        'appearance.sentenceBySentence': '逐句显示',
        'appearance.instant': '即时（无动画）',
        'appearance.streamingSpeed': '流式速度：',
        'appearance.streamingSpeedHelp': '流式动画的速度',
        'appearance.slow': '慢速',
        'appearance.normal': '正常',
        'appearance.fast': '快速',
        'appearance.ultraFast': '极速',
        'appearance.suggestedActionsPosition': '推荐操作位置：',
        'appearance.suggestedActionsHelp': '推荐操作按钮在聊天中的位置',
        'appearance.aboveInput': '输入框上方（固定）',
        'appearance.inlineAfterMessage': '消息后内联显示',
        'appearance.thinkingStyle': '思考指示器样式：',
        'appearance.thinkingStyleHelp': '输入指示器圆点的动画样式',
        'appearance.agentOptions': '智能体选项：',
        'appearance.enableStreaming': '启用流式响应（模拟模式）',
        'appearance.enableStreamingHelp': '模拟渐进式响应显示以改善体验',
        'appearance.openCitationsSideBrowser': '在侧边浏览器中打开引文',
        'appearance.openCitationsHelp': '在应用内查看引文来源，而非跳转外部浏览器',
        'appearance.autoOpenCitations': '自动在侧边浏览器中打开消息链接',
        'appearance.autoOpenCitationsHelp': '自动将智能体回复中的链接在分析面板中以标签页打开',
        'appearance.fullWidthMessages': '全宽显示智能体消息',
        'appearance.fullWidthMessagesHelp': '智能体回复跨越整个面板宽度',
        'appearance.language': '界面语言：',
        'appearance.languageHelp': '界面及 AI 助手输出语言',

        // Leave confirm overlay
        'leave.title': '离开当前会话？',
        'leave.message': '当前智能体会话将断开连接。你可以从主页开始新的会话。',
        'leave.cancel': '取消',
        'leave.confirm': '离开',

        // Delete agent overlay
        'delete.title': '删除智能体',
        'delete.message': '此操作不可撤销。请在下方输入智能体名称以确认：',
        'delete.placeholder': '输入智能体名称以确认',
        'delete.cancel': '取消',
        'delete.confirm': '删除',

        // Chat area
        'chat.title': '智能体对话',
        'chat.inputPlaceholder': '输入你的消息...',
        'chat.send': '发送消息',

        // Agent card stats
        'stats.never': '从未',
        'stats.justNow': '刚刚',
        'stats.minutesAgo': '${n}分钟前',
        'stats.hoursAgo': '${n}小时前',
        'stats.daysAgo': '${n}天前',

        // Theme names
        'theme.default': '默认',
        'theme.ocean': '海洋',
        'theme.sunset': '日落',
        'theme.forest': '森林',
        'theme.cosmic': '星空',
        'theme.aurora': '极光',
        'theme.minimal': '极简',
        'theme.dark': '暗夜',

        // AI Companion language instruction
        'ai.languageInstruction': '你必须使用中文回答。',

        // Chat area
        'chat.conversations': '历史对话',
        'chat.newChat': '新对话',
        'chat.clearAllHistory': '清除所有历史',
        'chat.loadingHistory': '加载对话历史...',
        'chat.welcomeTitle': '欢迎使用 Copilot Studio Companion',
        'chat.welcomeMessage': '连接你的 Copilot Studio 智能体来测试和改善用户交互体验，在设置中配置机器人或直接开始输入。',
        'chat.analyzeResponse': '分析回复',
        'chat.summarizeChat': '总结对话',
        'chat.abTest': 'A/B 测试',
        'chat.autoQA': '自动质检',
        'chat.analyzeTitle': '分析智能体回复',
        'chat.summarizeTitle': '总结对话内容',
        'chat.abTestTitle': '运行 A/B 测试：将智能体回复与通用知识对比',
        'chat.autoQATitle': '自动化质检：模拟用户交互并评估智能体质量',
        'chat.attachFile': '附加文件',
        'chat.voiceInput': '语音输入',
        'chat.uploading': '上传中...',
        'chat.agentMode': '智能体模式',
        'chat.companionMode': 'AI 助手模式',
        'chat.agentModeStatus': '智能体模式 — 消息发送至你的 Copilot Studio 智能体。',
        'chat.toggleRightPanel': '切换右侧面板',
        'chat.expandPanel': '展开面板至 50/50 布局',
        'chat.mobileTitle': 'Copilot Studio Companion',

        // KPI panel
        'kpi.agentPerformance': '智能体性能',
        'kpi.accuracy': '准确性',
        'kpi.helpfulness': '有用性',
        'kpi.completeness': '完整性',
        'kpi.efficiency': '效率',
        'kpi.changes': '变化',
        'kpi.aiConsumption': 'AI 消耗',
        'kpi.stable': '稳定',
        'kpi.ready': '就绪',
        'kpi.insightsPlaceholder': '智能体回复后，性能洞察将显示在此处。',
        'kpi.companionWelcome': 'AI 助手已就绪，可分析对话并提供洞察。',
        'kpi.scoreDetails': '评分详情',
        'kpi.currentScore': '当前评分：',
        'kpi.howCalculated': '评分计算方式：',
        'kpi.basedOnAnalysis': '基于对话分析：',

        // Analysis panel tabs
        'tabs.performance': '性能',


        // Side browser
        'browser.citationSource': '引文来源',
        'browser.closeBrowser': '关闭浏览器',
        'browser.loadingCitation': '加载引文来源...',
        'browser.loadFailed': '无法加载引文来源。此内容可能被安全策略阻止。',
        'browser.openExternal': '在外部浏览器中打开',

        // Knowledge Hub
        'knowledge.title': '知识库',
        'knowledge.uploadPdf': '上传 PDF 文档',
        'knowledge.dragDrop': '拖放 PDF 文件到此处或点击浏览',
        'knowledge.browseFiles': '浏览文件',
        'knowledge.processing': '处理中...',
        'knowledge.docPages': '文档页面',
        'knowledge.uploadNew': '上传新文档',
        'knowledge.deleteDoc': '删除文档',
        'knowledge.docLibrary': '文档库',

        // Settings modal
        'settings.title': '机器人配置',
        'settings.about': '关于',
        'settings.ttsSTT': '语音合成/识别',
        'settings.aiCompanion': 'AI 助手',

        // About section
        'about.title': '关于 MCSChat',
        'about.appName': 'Microsoft Copilot Studio Companion',
        'about.description': '一个功能丰富的聊天机器人测试界面，支持多智能体管理、AI 助手功能和实时流式传输。',
        'about.version': '版本',
        'about.buildDate': '构建日期',
        'about.moduleVersions': '模块版本：',
        'about.coreModules': '🔧 核心模块',
        'about.uiModules': '🎨 界面模块',
        'about.aiSpeech': '🤖 AI 与语音',
        'about.services': '📋 服务',
        'about.components': '🧩 组件',
        'about.utils': '🔨 工具',
        'about.systemInfo': '系统信息：',
        'about.browser': '浏览器：',
        'about.userAgent': '用户代理：',
        'about.screenResolution': '屏幕分辨率：',
        'about.language': '语言：',
        'about.viewOnGitHub': '在 GitHub 上查看',
        'about.copyVersionInfo': '复制版本信息',

        // Agent management
        'agent.management': '智能体管理',
        'agent.configuredAgents': '已配置智能体：',
        'agent.addNewAgent': '+ 添加新智能体',
        'agent.noAgents': '未配置任何智能体。点击 "+ 添加新智能体" 开始。',
        'agent.agentName': '智能体名称：',
        'agent.agentNameHelp': '一个方便识别此智能体的名称',
        'agent.agentNamePlaceholder': '例如：客户支持机器人',
        'agent.directLineSecret': 'DirectLine 密钥：',
        'agent.directLineSecretHelp': '此智能体的 Azure Bot Service DirectLine 密钥',
        'agent.directLineSecretPlaceholder': '输入 DirectLine 密钥',
        'agent.description': '描述：',
        'agent.descriptionPlaceholder': '描述此智能体的功能...',
        'agent.descriptionHelp': '可选，最多 200 字符',
        'agent.initParams': '初始化参数：',
        'agent.initParamsHelp': '定义开始对话时发送给机器人的参数。"键" 发送给机器人；"显示名称" 显示给用户。',
        'agent.addParam': '+ 添加参数',
        'agent.notConnected': '未连接',
        'agent.testConnection': '测试连接',
        'agent.saveAgent': '保存智能体',
        'agent.activeAgent': '当前活跃智能体：',
        'agent.noAgentSelected': '未选择智能体',
        'agent.disconnected': '已断开',
        'agent.startSession': '开始会话',
        'agent.cancel': '取消',
        'agent.connecting': '连接中...',

        // Speech settings
        'speech.title': '语音设置：',
        'speech.behavior': '⚙️ 语音行为',
        'speech.autoSpeak': '自动朗读智能体消息',
        'speech.autoSpeakHelp': '使用文字转语音自动朗读智能体回复',
        'speech.enableVoice': '启用语音输入（麦克风）',
        'speech.enableVoiceHelp': '允许通过语音指令发送消息',
        'speech.voiceProvider': '🎤 语音与提供者',
        'speech.provider': '语音提供者：',
        'speech.webSpeech': '增强型 Web Speech API（推荐）',
        'speech.azureSpeech': 'Azure 语音服务（高级）',
        'speech.voice': '声音：',
        'speech.loadingVoices': '加载声音...',
        'speech.testVoice': '🔊 测试声音',
        'speech.azureConfig': 'Azure 语音服务配置',
        'speech.subscriptionKey': '订阅密钥：',
        'speech.region': '区域：',
        'speech.azureVoice': 'Azure 声音：',
        'speech.multiLanguage': '🌍 多语言支持',
        'speech.autoDetect': '自动检测语言并切换声音',
        'speech.autoDetectHelp': '启用语音语言识别',
        'speech.continuousDetection': '持续语言检测',
        'speech.expectedLanguages': '预期语言：',
        'speech.voiceControls': '🎛️ 语音控制',
        'speech.speakingRate': '语速：',
        'speech.volume': '音量：',
        'speech.naturalness': '自然度：',

        // AI Companion settings
        'aiSettings.title': 'AI 助手设置：',
        'aiSettings.enableLLM': '启用 AI 助手（需要 API 密钥或本地 Ollama）',
        'aiSettings.enableLLMHelp': '用于对话分析和洞察的 AI 助手',
        'aiSettings.useThinking': '使用 AI 助手进行思考模拟',
        'aiSettings.useThinkingHelp': '启用后，AI 助手在等待智能体回复时生成上下文思考消息。禁用时显示简单的输入指示器。',
        'aiSettings.showModel': '在标题栏显示当值模型',
        'aiSettings.showModelHelp': '在面板标题栏显示当前 AI 助手模型名称',
        'aiSettings.registeredModels': '已注册模型：',
        'aiSettings.addModel': '+ 添加模型',
        'aiSettings.addNewModel': '添加新模型',
        'aiSettings.provider': '提供者：',
        'aiSettings.openaiCompatible': 'OpenAI 兼容',
        'aiSettings.openaiGPT': 'OpenAI GPT',
        'aiSettings.anthropicClaude': 'Anthropic Claude',
        'aiSettings.azureOpenAI': 'Azure OpenAI',
        'aiSettings.localOllama': '本地 Ollama',
        'aiSettings.baseURL': '基础 URL：',
        'aiSettings.apiKey': 'API 密钥：',
        'aiSettings.modelName': '模型名称：',
        'aiSettings.displayName': '显示名称（可选）：',
        'aiSettings.endpoint': '终结点：',
        'aiSettings.deploymentName': '部署名称：',
        'aiSettings.apiVersion': 'API 版本：',
        'aiSettings.serverURL': '服务器 URL：',
        'aiSettings.disableReasoning': '禁用推理',
        'aiSettings.disableReasoningHelp': '跳过模型思考/推理以获得更快响应',
        'aiSettings.testConnection': '测试连接',
        'aiSettings.registerModel': '注册模型',
        'aiSettings.promptManagement': 'AI 助手提示管理：',
        'aiSettings.managePrompts': '🎨 管理 AI 提示',

        // Multi-Language & Voice Controls (TTS/STT section)
        'speech.multiLanguage': '🌍 多语言支持',
        'speech.autoDetectLang': '自动检测语言并切换声音',
        'speech.autoDetectLangHelp': '自动检测文本语言并选择合适的语音进行朗读',
        'speech.enableLangId': '启用语音语言识别',
        'speech.enableLangIdHelp': '自动识别语音输入的语言（仅限 Azure Speech）',
        'speech.continuousDetection': '持续语言检测',
        'speech.continuousDetectionHelp': '在语音识别过程中持续检测语言（可能影响性能）',
        'speech.expectedLanguages': '预期语言：',
        'speech.expectedLanguagesHelp': '按住 Ctrl/Cmd 多选语言。可提高语音识别准确度和语音匹配效果。',
        'speech.voiceControls': '🎛️ 语音控制',
        'speech.speakingRate': '语速：',
        'speech.volume': '音量：',
        'speech.naturalness': '自然度：',
        'speech.naturalnessHelp': '数值越高声音越自然，但可能更慢',

        // AI Companion section
        'aiSettings.sectionTitle': 'AI 助手',
        'aiSettings.modelsHelp': '已注册的 AI 助手模型。点击 ⚡ 切换。',
        'aiSettings.addNewModel': '添加新模型',
        'aiSettings.promptManagementLabel': 'AI 助手提示管理：',
        'aiSettings.promptDescription': '自定义 AI 助手的思考和回答方式。更改会自动保存，仅影响你的体验。',
        'aiSettings.managePromptsBtn': '🎨 管理 AI 提示',
        'aiSettings.promptReviewHelp': '查看和自定义 AI 助手思考提示、KPI 解释和回复生成模板',

        // Model registry table
        'models.model': '模型',
        'models.provider': '提供者',
        'models.tokens': 'Token',
        'models.perf': '性能',
        'models.actions': '操作',
        'models.empty': '尚未注册模型。点击"+ 添加模型"开始。',

        // Knowledge Hub dynamic text
        'knowledge.storageUsage': '存储用量：${size} / ~10MB (${percent}%)',
        'knowledge.noDocuments': '暂无已上传的文档。',
        'knowledge.storageFull': '存储空间即将用满，请考虑删除旧文档。',

        // Thinking indicator styles
        'thinking.bounce': '弹跳',
        'thinking.pulse': '脉冲',
        'thinking.wave': '波浪',
        'thinking.elastic': '弹性',
        'thinking.ripple': '涟漪',
    }
};

class I18n {
    constructor() {
        this._lang = localStorage.getItem('appLanguage') || 'en';
    }

    get language() {
        return this._lang;
    }

    setLanguage(lang) {
        if (!locales[lang]) return;
        this._lang = lang;
        localStorage.setItem('appLanguage', lang);
        this.applyToDOM();
    }

    /**
     * Get translated string by key with optional interpolation
     * @param {string} key
     * @param {Object} [params] - e.g. { n: 5 }
     * @returns {string}
     */
    t(key, params) {
        const str = locales[this._lang]?.[key] ?? locales['en']?.[key] ?? key;
        if (!params) return str;
        return str.replace(/\$\{(\w+)\}/g, (_, k) => params[k] ?? '');
    }

    /**
     * Apply translations to all DOM elements with data-i18n attributes
     */
    applyToDOM() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });
        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });
        // Titles (tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });
        // Aria labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            el.setAttribute('aria-label', this.t(key));
        });
    }
}

export const i18n = new I18n();
