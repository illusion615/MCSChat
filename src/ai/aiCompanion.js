/**
 * AI Companion Module
 * Handles AI-powered conversation analysis, title generation, and companion features
 */

import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';
import { SecureStorage } from '../utils/secureStorage.js';
import { speechEngine } from '../services/speechEngine.js';
import { getSVGPath } from '../components/svg-icon-manager/index.js';
import { promptManager } from './promptManager.js';

/**
 * Helper function to update SVG path from centralized library
 * @param {HTMLElement} button - Button containing the SVG
 * @param {string} iconName - Name of the icon
 */
function updateButtonIcon(button, iconName) {
    if (!button) return;

    // Use global Icon manager for consistent styling
    const iconElement = window.Icon.create(iconName, {
        size: '18px',
        color: 'currentColor'
    });
    
    // Replace existing content with new icon
    button.innerHTML = '';
    button.appendChild(iconElement);
}

export class AICompanion {
    constructor() {
        console.log('[AICompanion] Constructor starting - isEnabled before loadSettings:', this.isEnabled);

        this.isEnabled = false;
        this.currentProvider = 'openai';
        this.titleUpdateTimeout = null;
        this.currentConversationTitle = 'Agent Conversation';
        this.conversationContext = [];

        // Current thinking message tracking for main chat
        this.currentThinkingMessage = null;

        // Thinking simulation state tracking
        this.isThinkingSimulationActive = false;
        this.shouldEndThinkingNaturally = false;

        // Promise-based thinking completion tracking
        this.thinkingCompletionPromise = null;
        this.thinkingCompletionResolve = null;

        // Continuous thinking content tracking
        this.currentThinkingDiv = null;
        this.currentThinkingContent = '';
        this.thinkingPromptIndex = 0;
        this.currentUserMessage = null; // Store current user message for contextual thinking

        // Store the actual context used for KPI analysis
        this.lastKPIAnalysisContext = '';

        // Flag to prevent multiple quick action requests
        this.isQuickActionInProgress = false;

        this.kpiData = {
            accuracy: 0,
            helpfulness: 0,
            completeness: 0,
            efficiency: 0,
            consumption: 0, // New consumption KPI
            changes: 0,
            trend: 'stable'
        };
        this.previousKpiData = { ...this.kpiData };

        // Store the last LLM evaluation for detailed modal display
        this.lastHLSEvaluation = null;

        // Time tracking for efficiency KPI
        this.timeTracking = {
            conversationStart: null,
            lastUserMessage: null,
            responseTime: null,
            totalConversationTime: 0,
            messageCount: 0,
            avgResponseTime: 0
        };

        // Token consumption tracking
        this.tokenTracking = {
            // Per-conversation tokens (reset when conversation changes)
            conversationTokens: 0,
            // Per-model tokens (persistent across sessions)
            modelTokens: this.loadModelTokens(),
            // Current conversation ID for tracking
            currentConversationId: null
        };

        // KPI calculation optimization
        this.kpiOptimization = {
            lastLLMCallTime: 0,
            debounceDelay: 2000, // 2 seconds minimum between LLM calls
            isLLMAnalysisInProgress: false,
            pendingAnalysis: null
        };

        // Enhanced Speech functionality with multiple providers and multi-language support
        this.speechSettings = {
            autoSpeak: false,
            voiceInput: false,
            provider: 'web_speech', // 'web_speech', 'local_ai', 'azure'
            selectedVoice: '',
            speechRate: 1.0,
            speechVolume: 1.0,
            naturalness: 0.8,

            // Multi-language settings
            autoDetectLanguage: false,
            enableLanguageDetection: false,
            continuousLanguageDetection: false,
            candidateLanguages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN'],

            azureSettings: {
                subscriptionKey: '',
                region: 'eastus',
                voiceName: 'en-US-JennyNeural'
            }
        };

        this.speechState = {
            isInitialized: false,
            currentProvider: null,
            availableVoices: [],
            capabilities: {},
            isProcessing: false,
            isRecording: false
        };

        this.initializeElements();
        this.loadSettings();
        this.setupRealTimeSync();
        this.initializeSpeech();

        console.log('[AICompanion] Constructor completed - isEnabled after loadSettings:', this.isEnabled, 'type:', typeof this.isEnabled);
    }

    /**
     * Initialize DOM elements
     * @private
     */
    initializeElements() {
        this.elements = {
            llmPanel: DOMUtils.getElementById('llmAnalysisPanel'),
            llmChatWindow: DOMUtils.getElementById('llmChatWindow'),
            chatWindow: DOMUtils.getElementById('chatWindow'), // Main chat window for output migration
            llmStatus: DOMUtils.getElementById('llmStatus'),
            llmModelName: DOMUtils.getElementById('llmModelName'),
            toggleButton: DOMUtils.getElementById('togglerightpanelbtn'),
            expandButton: DOMUtils.getElementById('expandAiCompanionBtn'),
            agentConversationTitle: DOMUtils.getElementById('agentConversationTitle'),
            // AI Companion notification area
            aiNotificationsArea: DOMUtils.getElementById('aiCompanionNotifications'),
            // KPI elements
            kpiAccuracy: DOMUtils.getElementById('kpiAccuracy'),
            kpiHelpfulness: DOMUtils.getElementById('kpiHelpfulness'),
            kpiCompleteness: DOMUtils.getElementById('kpiCompleteness'),
            kpiEfficiency: DOMUtils.getElementById('kpiEfficiency'),
            kpiChanges: DOMUtils.getElementById('kpiChanges'),
            kpiAccuracyBar: DOMUtils.getElementById('kpiAccuracyBar'),
            kpiHelpfulnessBar: DOMUtils.getElementById('kpiHelpfulnessBar'),
            kpiCompletenessBar: DOMUtils.getElementById('kpiCompletenessBar'),
            kpiEfficiencyBar: DOMUtils.getElementById('kpiEfficiencyBar'),
            kpiChangesTrend: DOMUtils.getElementById('kpiChangesTrend'),
            // Modal elements
            kpiModal: DOMUtils.getElementById('kpiModal'),
            kpiModalTitle: DOMUtils.getElementById('kpiModalTitle'),
            kpiModalScore: DOMUtils.getElementById('kpiModalScore'),
            kpiModalDetails: DOMUtils.getElementById('kpiModalDetails'),
            kpiModalMessages: DOMUtils.getElementById('kpiModalMessages'),
            kpiModalClose: DOMUtils.getElementById('kpiModalClose'),
            // KPI Explanation Area
            kpiExplanationArea: DOMUtils.getElementById('kpiExplanationArea'),
            kpiExplanationContent: DOMUtils.getElementById('kpiExplanationContent'),
            kpiExplanationToggle: DOMUtils.getElementById('kpiExplanationToggle'),
            // KPI elements
            kpiConsumption: DOMUtils.getElementById('kpiConsumption'),
            kpiConsumptionBar: DOMUtils.getElementById('kpiConsumptionBar'),
            // Model comparison view
            modelComparisonTable: DOMUtils.getElementById('modelComparisonTable'),
            refreshModelComparisonBtn: DOMUtils.getElementById('refreshModelComparisonBtn'),
            resetAllModelsBtn: DOMUtils.getElementById('resetAllModelsBtn'),
            // Prompt management
            managePromptsBtn: DOMUtils.getElementById('managePromptsBtn')
        };

        // Setup KPI click handlers
        this.setupKPIClickHandlers();
        
        // Initialize icons after the full icon collection is loaded
        this.initializeIconsWhenReady();
    }

    /**
     * Initialize icons after waiting for the full icon collection to load
     */
    async initializeIconsWhenReady() {
        try {
            // Wait for the full SVGIconCollection to be loaded
            if (window.Icon && window.Icon.waitForLoad) {
                await window.Icon.waitForLoad();
                console.log('[AICompanion] Full icon collection loaded, initializing icons...');
            }
            this.initializeIcons();
        } catch (error) {
            console.warn('[AICompanion] Error waiting for icon collection, using fallback icons:', error);
            // Initialize with fallback icons anyway
            this.initializeIcons();
        }
    }

    /**
     * Initialize icons for UI elements using the modern icon system
     */
    initializeIcons() {
        console.log('[AICompanion] Initializing icons...');
        console.log('[AICompanion] Available icons:', window.Icon ? window.Icon.list().slice(0, 10) : 'Icon manager not available');
        
        // Check if we have the correct aiCompanion icon
        if (window.Icon && window.Icon.has('aiCompanion')) {
            const iconSvg = window.Icon.icons.get('aiCompanion');
            console.log('[AICompanion] aiCompanion icon preview:', iconSvg ? iconSvg.substring(0, 100) + '...' : 'Not found');
        }
        
        // Initialize toggle button icon
        if (this.elements.toggleButton && this.elements.toggleButton.children.length === 0) {
            const toggleIcon = Icon.create('kpi', {
                size: '18px',
                color: '#333'  // Use consistent color with chat messages
            });
            console.log('[AICompanion] Created toggle button icon:', toggleIcon);
            this.elements.toggleButton.appendChild(toggleIcon);
        }

        // Initialize expand button icon
        if (this.elements.expandButton && this.elements.expandButton.children.length === 0) {
            const expandIcon = Icon.create('expandPanel', {
                size: '18px',
                color: '#333'  // Use consistent color
            });
            console.log('[AICompanion] Created expand button icon:', expandIcon);
            this.elements.expandButton.appendChild(expandIcon);
        }

        // Initialize companion icon
        const companionIconElement = DOMUtils.getElementById('companionIcon');
        if (companionIconElement && companionIconElement.children.length === 0) {
            const companionIcon = Icon.create('aiCompanion', {
                size: '32px',
                color: '#333'  // Use consistent color with chat messages
            });
            console.log('[AICompanion] Created companion icon:', companionIcon);
            companionIconElement.appendChild(companionIcon);
        }
        
        console.log('[AICompanion] Icon initialization completed');
    }

    /**
     * Load AI companion settings
     * @private
     */
    loadSettings() {
        const enableLLMValue = localStorage.getItem('enableLLM');
        this.isEnabled = enableLLMValue === 'true';
        this.currentProvider = localStorage.getItem('selectedApiProvider') || 'openai';

        console.log('[AICompanion] loadSettings() called:', {
            enableLLMValue: enableLLMValue,
            isEnabled: this.isEnabled,
            isEnabledType: typeof this.isEnabled
        });

        // Load enhanced speech settings
        this.speechSettings.autoSpeak = localStorage.getItem('speechAutoSpeak') === 'true';
        this.speechSettings.voiceInput = localStorage.getItem('speechVoiceInput') === 'true';
        this.speechSettings.provider = localStorage.getItem('speechProvider') || 'web_speech';
        this.speechSettings.selectedVoice = localStorage.getItem('speechSelectedVoice') || '';
        this.speechSettings.speechRate = parseFloat(localStorage.getItem('speechRate')) || 1.0;
        this.speechSettings.speechVolume = parseFloat(localStorage.getItem('speechVolume')) || 1.0;
        this.speechSettings.naturalness = parseFloat(localStorage.getItem('speechNaturalness')) || 0.8;

        // Load Azure settings
        const azureSettings = localStorage.getItem('speechAzureSettings');
        if (azureSettings) {
            try {
                this.speechSettings.azureSettings = { ...this.speechSettings.azureSettings, ...JSON.parse(azureSettings) };
            } catch (error) {
                console.warn('[AICompanion] Failed to parse Azure settings:', error);
            }
        }

        // Load multi-language settings
        this.speechSettings.autoDetectLanguage = localStorage.getItem('speechAutoDetectLanguage') === 'true';
        this.speechSettings.enableLanguageDetection = localStorage.getItem('speechEnableLanguageDetection') === 'true';
        this.speechSettings.continuousLanguageDetection = localStorage.getItem('speechContinuousLanguageDetection') === 'true';

        const candidateLanguages = localStorage.getItem('speechCandidateLanguages');
        if (candidateLanguages) {
            try {
                this.speechSettings.candidateLanguages = JSON.parse(candidateLanguages);
            } catch (error) {
                console.warn('[AICompanion] Failed to parse candidate languages:', error);
            }
        }

        // Sync Azure settings to speech engine on initialization
        if (speechEngine) {
            speechEngine.settings.azureSettings = { ...this.speechSettings.azureSettings };
            speechEngine.saveSettings();
            console.log('[AICompanion] Azure settings synced to speech engine during initialization');

            // Sync multi-language settings to speech engine
            speechEngine.setAutoDetectLanguage(this.speechSettings.autoDetectLanguage);
            speechEngine.setLanguageDetection(
                this.speechSettings.enableLanguageDetection,
                this.speechSettings.continuousLanguageDetection,
                this.speechSettings.candidateLanguages
            );
        }

        console.log('[AICompanion] Settings loaded:', {
            enabled: this.isEnabled,
            provider: this.currentProvider,
            speechSettings: this.speechSettings
        });
    }

    /**
     * Reload AI companion settings and update status
     * @public
     */
    reloadSettings() {
        console.log('Reloading AI companion settings...');
        this.loadSettings();
        this.updateStatus();

        // Update panel visibility based on new enabled state
        this.togglePanel(this.isEnabled);

        // Sync dropdown selection in case the model changed (async, don't await)
        this.syncModelDropdownSelection();

        // Update token displays and model comparison
        this.updateTokenDisplays();

        console.log('AI companion settings reloaded:', { enabled: this.isEnabled, provider: this.currentProvider });
    }

    /**
     * Setup real-time conversation synchronization
     * @private
     */
    setupRealTimeSync() {
        // Listen for new messages from the main application
        window.addEventListener('conversationUpdate', (e) => {
            this.updateConversationContext(e.detail);
        });

        // Listen for completed messages
        window.addEventListener('completeMessage', (e) => {
            this.updateConversationContext(e.detail);
        });

        // Listen for conversation updates
        window.addEventListener('conversationUpdate', (e) => {
            this.updateConversationContext(e.detail);
        });

        // Listen for event activities
        window.addEventListener('eventActivity', (e) => {
            this.updateConversationContext(e.detail);
        });

        // Listen for session changes to reset context
        window.addEventListener('sessionChanged', () => {
            this.resetConversationContext();
        });

        // Listen for conversation changes to track tokens per conversation
        window.addEventListener('conversationChanged', (event) => {
            if (event.detail && event.detail.conversationId) {
                this.setConversationId(event.detail.conversationId);
            }
        });

        console.log('Real-time sync setup completed');
    }

    /**
     * Update conversation context with new message
     * @param {Object} activity - New message activity
     * @private
     */
    updateConversationContext(activity) {
        if (!activity || !activity.from) return;

        // Extract message data
        const messageData = {
            role: activity.from.id === 'user' ? 'user' : 'assistant',
            content: activity.text || '',
            timestamp: activity.timestamp || new Date().toISOString(),
            attachments: activity.attachments || [],
            suggestedActions: activity.suggestedActions
        };

        // Add to conversation context
        this.conversationContext.push(messageData);

        // Keep a larger context window for better analysis (100 messages instead of 20)
        if (this.conversationContext.length > 100) {
            this.conversationContext = this.conversationContext.slice(-100);
        }

        // Update context indicator
        this.updateContextIndicator();

        // Analyze for KPIs if this is an assistant message
        if (messageData.role === 'assistant' && this.isEnabled) {
            // Run KPI analysis asynchronously (LLM-powered)
            this.analyzeMessageForKPIs(messageData).catch(error => {
                console.error('[AI Companion] Error in async KPI analysis:', error);
            });
        }

        console.log('Conversation context updated:', {
            totalMessages: this.conversationContext.length,
            messageCount: this.conversationContext.length,
            role: messageData.role,
            contentPreview: messageData.content.substring(0, 100) + '...'
        });
    }

    /**
     * Reset conversation context
     * @private
     */
    resetConversationContext() {
        this.conversationContext = [];
        this.lastKPIAnalysisContext = '';
        this.resetKPIs();
        this.updateContextIndicator();
        console.log('Conversation context reset');
    }

    /**
     * Manually refresh context for testing
     * @public
     */
    refreshContext() {
        console.log('[AI Companion] Manual context refresh triggered');
        const currentContext = this.getAdaptiveConversationContext('analysis');
        this.lastKPIAnalysisContext = currentContext;
        const messageCount = (currentContext.match(/\n(User|Agent):/g) || []).length;
        console.log(`[AI Companion] Refreshed context: ${messageCount} messages`);
        this.updateContextIndicator();
        return {
            contextLength: currentContext.length,
            messageCount: messageCount,
            preview: currentContext.substring(0, 200) + '...'
        };
    }

    /**
     * Manually refresh KPI analysis with current conversation context
     * @public
     */
    async refreshKPIAnalysis() {
        console.log('[AI Companion] Manual KPI analysis refresh triggered');

        try {
            // Get the latest conversation context
            const currentContext = this.getAdaptiveConversationContext('analysis');
            const messageCount = (currentContext.match(/\n(User|Agent):/g) || []).length;

            if (messageCount === 0) {
                console.log('[AI Companion] No messages available for KPI analysis');
                return { error: 'No conversation messages available' };
            }

            // Find the most recent assistant message to re-analyze
            const contextLines = currentContext.split('\n').filter(line =>
                line.startsWith('User:') || line.startsWith('Agent:')
            );

            const lastAgentMessage = contextLines.filter(line => line.startsWith('Agent:')).pop();

            if (!lastAgentMessage) {
                console.log('[AI Companion] No agent messages found for analysis');
                return { error: 'No agent messages found' };
            }

            // Create a mock message data object from the last agent message
            const messageData = {
                role: 'assistant',
                content: lastAgentMessage.substring(6), // Remove "Agent:" prefix
                timestamp: new Date().toISOString()
            };

            // Run the KPI analysis (now async with LLM evaluation)
            await this.analyzeMessageForKPIs(messageData);

            console.log('[AI Companion] KPI analysis refreshed with current context');
            return {
                contextLength: currentContext.length,
                messageCount: messageCount,
                lastAnalyzedMessage: messageData.content.substring(0, 100) + '...',
                kpiResults: { ...this.kpiData }
            };

        } catch (error) {
            console.error('[AI Companion] Error refreshing KPI analysis:', error);
            return { error: error.message };
        }
    }

    /**
     * Initialize AI companion panel
     */
    initialize() {
        this.initializePanelState();
        this.attachEventListeners();
        this.updateStatus();
        this.updateTokenDisplays(); // Initialize token displays
    }

    /**
     * Initialize panel state on page load
     * @private
     */
    initializePanelState() {
        console.log('Initializing AI companion panel state:', this.isEnabled);
        this.togglePanel(this.isEnabled);

        if (this.isEnabled) {
            this.updateStatus();
        }
    }

    /**
     * Attach event listeners
     * @private
     */
    attachEventListeners() {
        // Toggle panel button
        if (this.elements.toggleButton) {
            DOMUtils.addEventListener(this.elements.toggleButton, 'click', () => {
                const isVisible = !this.elements.llmPanel.classList.contains('collapsed');
                this.togglePanel(!isVisible);
            });
        }

        // Expand panel button
        if (this.elements.expandButton) {
            DOMUtils.addEventListener(this.elements.expandButton, 'click', () => {
                this.toggleExpandPanel();
            });
        }

        // Listen for conversation changes to update context
        window.addEventListener('messageRendered', () => {
            this.updateContextIndicator();
        });

        // Listen for session changes to schedule title updates
        window.addEventListener('messageRendered', (event) => {
            console.log('[AI Companion] Received messageRendered event:', event.detail);
            if (this.isEnabled) {
                console.log('[AI Companion] Scheduling title update...');
                // Re-enabled automatic title generation
                this.scheduleConversationTitleUpdate();
            } else {
                console.log('[AI Companion] Not enabled, skipping title update');
            }
        });

        // Listen for Ollama model changes
        const ollamaModelSelect = DOMUtils.getElementById('ollamaModelSelect');
        if (ollamaModelSelect) {
            DOMUtils.addEventListener(ollamaModelSelect, 'change', () => {
                this.handleModelChange();
            });
        }

        // Listen for provider changes (openai, azure, anthropic, ollama)
        window.addEventListener('providerChanged', () => {
            this.handleModelChange();
        });

        // Model comparison view buttons
        if (this.elements.refreshModelComparisonBtn) {
            DOMUtils.addEventListener(this.elements.refreshModelComparisonBtn, 'click', () => {
                this.updateModelComparisonView();
            });
        }

        if (this.elements.resetAllModelsBtn) {
            DOMUtils.addEventListener(this.elements.resetAllModelsBtn, 'click', () => {
                this.resetAllModelTokens();
            });
        }

        // Prompt management button
        if (this.elements.managePromptsBtn) {
            DOMUtils.addEventListener(this.elements.managePromptsBtn, 'click', () => {
                this.openPromptManagementModal();
            });
        }
    }

    /**
     * Open the prompt management modal
     * @private
     */
    openPromptManagementModal() {
        const modal = DOMUtils.createElement('div', {
            className: 'prompt-modal-overlay'
        });

        const modalContent = DOMUtils.createElement('div', {
            className: 'prompt-modal-content'
        });

        const header = DOMUtils.createElement('div', {
            className: 'prompt-modal-header'
        });

        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>AI Companion Prompt Management</h2>
                <button id="closePromptModal" class="prompt-modal-close">&times;</button>
            </div>
        `;

        const body = DOMUtils.createElement('div', {
            className: 'prompt-modal-body'
        });

        const promptManagerUI = promptManager.createPromptManagementUI();

        body.appendChild(promptManagerUI);

        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modal.appendChild(modalContent);

        // Close handlers
        const closeBtn = header.querySelector('#closePromptModal');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(modal);
    }

    /**
     * Handle model change events
     * @private
     */
    handleModelChange() {
        console.log('[AI Companion] Model change detected');

        // Update current provider from settings
        this.currentProvider = localStorage.getItem('selectedApiProvider') || 'openai';

        // Update UI elements immediately
        this.updateStatus();
        this.updateModelComparisonView();

        // Update AI Companion header model name
        if (this.elements.llmModelName) {
            this.elements.llmModelName.textContent = this.getCurrentModelName();
        }

        console.log('[AI Companion] Updated to model:', {
            provider: this.currentProvider,
            modelId: this.getCurrentModelId(),
            displayName: this.getCurrentModelName()
        });
    }

    /**
     * Toggle AI companion panel
     * @param {boolean} show - Whether to show the panel
     */
    togglePanel(show) {
        if (!this.elements.llmPanel) return;

        // Clear any inline display style that might override CSS
        this.elements.llmPanel.style.display = '';

        // Use the collapsed class instead of display style to match CSS
        if (show) {
            DOMUtils.removeClass(this.elements.llmPanel, 'collapsed');
        } else {
            DOMUtils.addClass(this.elements.llmPanel, 'collapsed');
        }

        // Update agent chat panel classes for proper layout
        const agentChatPanel = document.getElementById('agentChatPanel');
        if (agentChatPanel) {
            if (show) {
                DOMUtils.removeClass(agentChatPanel, 'companion-hidden');
            } else {
                DOMUtils.addClass(agentChatPanel, 'companion-hidden');
                // Also remove companion-expanded when hiding
                DOMUtils.removeClass(agentChatPanel, 'companion-expanded');
            }
        }

        // The toggle button visibility should only depend on whether LLM is enabled
        if (this.elements.toggleButton) {
            this.elements.toggleButton.style.display = this.isEnabled ? 'inline-flex' : 'none';
        }

        // Update status when showing panel
        if (show) {
            this.updateStatus();
            this.updateTokenDisplays(); // Update token displays when panel is shown

            // Sync dropdown with current model (async, don't await)
            this.syncModelDropdownSelection();

            // Also schedule a delayed sync in case models load after panel opening
            setTimeout(() => this.syncModelDropdownSelection(), 1000);
        }

        // Initialize panel if showing for first time
        if (show && !this.elements.llmPanel.hasAttribute('data-initialized')) {
            this.initializePanel();
            this.elements.llmPanel.setAttribute('data-initialized', 'true');
        }
    }

    /**
     * Toggle AI companion panel between default and expanded (50/50) layout
     */
    toggleExpandPanel() {
        if (!this.elements.llmPanel) return;

        const isExpanded = this.elements.llmPanel.classList.contains('expanded');
        const agentChatPanel = DOMUtils.getElementById('agentChatPanel');

        if (isExpanded) {
            // Collapse to default width
            DOMUtils.removeClass(this.elements.llmPanel, 'expanded');
            if (agentChatPanel) {
                DOMUtils.removeClass(agentChatPanel, 'companion-expanded');
            }

            // Update button title and ARIA label
            if (this.elements.expandButton) {
                this.elements.expandButton.title = 'Expand panel to 50/50 layout';
                this.elements.expandButton.setAttribute('aria-label', 'Expand AI Companion Panel');

                // Update icon to collapsed state (arrow pointing right)
                updateButtonIcon(this.elements.expandButton, 'arrowRight');
            }

            console.log('[AI Companion] Restored default layout');
        } else {
            // Expand to 50/50 layout
            DOMUtils.addClass(this.elements.llmPanel, 'expanded');
            if (agentChatPanel) {
                DOMUtils.addClass(agentChatPanel, 'companion-expanded');
                // Remove companion-hidden if it exists
                DOMUtils.removeClass(agentChatPanel, 'companion-hidden');
            }

            // Update button title and ARIA label
            if (this.elements.expandButton) {
                this.elements.expandButton.title = 'Restore default panel width';
                this.elements.expandButton.setAttribute('aria-label', 'Restore Default AI Companion Width');

                // Update icon to expanded state (arrow pointing left)
                updateButtonIcon(this.elements.expandButton, 'arrowLeft');
            }

            console.log('[AI Companion] Expanded to 50/50 layout');
        }

        // Store user preference
        localStorage.setItem('aiCompanionExpanded', (!isExpanded).toString());
    }

    /**
     * Initialize panel components
     * @private
     */
    initializePanel() {
        console.log('Initializing AI companion panel components');
        this.updateContextIndicator();

        // Restore user's expand preference
        const wasExpanded = localStorage.getItem('aiCompanionExpanded') === 'true';
        const agentChatPanel = DOMUtils.getElementById('agentChatPanel');

        if (wasExpanded && this.elements.llmPanel && !this.elements.llmPanel.classList.contains('expanded')) {
            // Apply expanded state without animation on initialization
            DOMUtils.addClass(this.elements.llmPanel, 'expanded');
            if (agentChatPanel) {
                DOMUtils.addClass(agentChatPanel, 'companion-expanded');
                DOMUtils.removeClass(agentChatPanel, 'companion-hidden');
            }

            // Update button title and ARIA label
            if (this.elements.expandButton) {
                this.elements.expandButton.title = 'Restore default panel width';
                this.elements.expandButton.setAttribute('aria-label', 'Restore Default AI Companion Width');

                // Update icon to expanded state (arrow pointing left)
                console.log('[AI Companion] Setting expanded expand button icon (arrowLeft)');
                updateButtonIcon(this.elements.expandButton, 'arrowLeft');
            }

            console.log('[AI Companion] Restored expanded layout from user preference');
        } else {
            // Set default state icon (arrow pointing right)
            if (this.elements.expandButton) {
                this.elements.expandButton.title = 'Expand panel to 50/50 layout';
                this.elements.expandButton.setAttribute('aria-label', 'Expand AI Companion Panel');

                // Update icon to default state (arrow pointing right)
                console.log('[AI Companion] Setting default expand button icon (arrowRight)');
                updateButtonIcon(this.elements.expandButton, 'arrowRight');
            }

            if (agentChatPanel) {
                // Ensure proper default state - remove any existing state classes
                DOMUtils.removeClass(agentChatPanel, 'companion-expanded');
                DOMUtils.removeClass(agentChatPanel, 'companion-hidden');
            }
        }
    }

    /**
     * Update AI companion status
     */
    updateStatus() {
        if (!this.elements.llmStatus) return;

        if (!this.isEnabled) {
            this.elements.llmStatus.className = 'status-indicator disabled';
            // Clear model name when disabled
            if (this.elements.llmModelName) {
                this.elements.llmModelName.textContent = '';
            }
            return;
        }

        if (this.currentProvider === 'ollama') {
            const ollamaModel = localStorage.getItem('ollamaSelectedModel') || 'No Model Selected';

            // Update model name display
            if (this.elements.llmModelName) {
                this.elements.llmModelName.textContent = ollamaModel !== 'No Model Selected' ? `Companion Model: ${ollamaModel}` : '';
            }

            // Test Ollama connection in real-time
            this.testOllamaConnectionRealTime();
        } else {
            // For other providers, check if API key exists and additional configuration for Azure
            SecureStorage.retrieve(`${this.currentProvider}ApiKey`).then(apiKey => {
                const providerName = this.currentProvider.charAt(0).toUpperCase() + this.currentProvider.slice(1);

                // Update model name display with provider name
                if (this.elements.llmModelName) {
                    if (this.currentProvider === 'azure') {
                        const deployment = localStorage.getItem('azureDeployment');
                        this.elements.llmModelName.textContent = deployment ? `Companion Model: Azure: ${deployment}` : 'Companion Model: Azure OpenAI';
                    } else {
                        this.elements.llmModelName.textContent = providerName ? `Companion Model: ${providerName}` : '';
                    }
                }

                // Check if provider is properly configured
                let isConfigured = false;
                if (this.currentProvider === 'azure') {
                    const endpoint = localStorage.getItem('azureEndpoint');
                    const deployment = localStorage.getItem('azureDeployment');
                    isConfigured = apiKey && endpoint && deployment;
                } else {
                    isConfigured = !!apiKey;
                }

                if (isConfigured) {
                    this.elements.llmStatus.className = 'status-indicator connected';
                } else {
                    this.elements.llmStatus.className = 'status-indicator';
                }
            });
        }
    }

    /**
     * Test Ollama connection in real-time and update status
     * @private
     */
    async testOllamaConnectionRealTime() {
        try {
            // Set connecting status
            this.elements.llmStatus.className = 'status-indicator connecting';

            const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';

            // Test connection with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`${ollamaUrl}/api/version`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                // Connection successful
                this.elements.llmStatus.className = 'status-indicator connected';
                localStorage.setItem('ollamaLastWorking', 'true');
            } else {
                // Connection failed
                this.elements.llmStatus.className = 'status-indicator';
                localStorage.setItem('ollamaLastWorking', 'false');
            }
        } catch (error) {
            // Connection failed (network error, timeout, etc.)
            this.elements.llmStatus.className = 'status-indicator';
            localStorage.setItem('ollamaLastWorking', 'false');
            console.log('Ollama connection test failed:', error.message);
        }
    }

    /**
     * Simulate AI companion thinking process while waiting for agent response
     * This method is called from the main application when users send messages to the agent,
     * not when users interact with the AI companion's own chat interface.
     * @param {string} userMessage - The user's message
     * @returns {Promise} Promise that resolves when thinking simulation is truly finished
     * @private
     */
    async simulateThinkingProcess(userMessage) {
        // If thinking is already active, don't restart - just continue
        if (this.isThinkingSimulationActive) {
            console.log('[AICompanion] Thinking simulation already active, continuing...');
            return this.thinkingCompletionPromise;
        }

        // Create completion promise
        this.thinkingCompletionPromise = new Promise(resolve => {
            this.thinkingCompletionResolve = resolve;
        });

        try {
            console.log('[AICompanion] Starting thinking simulation for user message:', userMessage.substring(0, 100));

            // Set simulation state
            this.isThinkingSimulationActive = true;
            this.shouldEndThinkingNaturally = false;
            this.currentThinkingContent = '';
            this.thinkingPromptIndex = 0;
            this.currentUserMessage = userMessage; // Store for contextual continuous thinking

            // Generate thinking thoughts about the user's question (now async)
            const thinkingPrompts = await this.generateThinkingPrompts(userMessage);
            console.log('[AICompanion] Generated thinking prompts:', thinkingPrompts.length, thinkingPrompts);

            // Ensure we have thinking prompts
            if (!thinkingPrompts || thinkingPrompts.length === 0) {
                console.error('[AICompanion] No thinking prompts generated!');
                return;
            }

            // Create thinking message in the main chat window only if it doesn't exist
            if (!this.currentThinkingDiv) {
                const thinkingActivity = this.createThinkingActivity(''); // Start with empty content
                const messageContainer = this.createMainChatMessageContainer(thinkingActivity);

                // Create content wrapper that will contain both message and metadata
                const contentWrapper = DOMUtils.createElement('div', {
                    className: 'message-content-wrapper'
                });

                this.currentThinkingDiv = this.createMainChatMessageDiv();

                // Build the message structure (thinking messages use bot style)
                const messageIcon = this.createMainChatMessageIcon(false); // false = bot message
                if (messageIcon) {
                    messageContainer.appendChild(messageIcon);
                }

                contentWrapper.appendChild(this.currentThinkingDiv);

                // Add metadata for thinking messages inside the content wrapper
                const metadata = this.createMessageMetadata('thinking');
                if (metadata) {
                    contentWrapper.appendChild(metadata);
                }

                messageContainer.appendChild(contentWrapper);

                // Add to main chat window
                const chatWindow = DOMUtils.getElementById('chatWindow');
                if (!chatWindow) {
                    console.error('[AICompanion] Chat window not found!');
                    return;
                }

                chatWindow.appendChild(messageContainer);
                this.scrollMainChatToBottom();
                console.log('[AICompanion] Thinking message added to chat window');
            }

            // Continue streaming thoughts from where we left off
            await this.continueThinkingStream(thinkingPrompts);

            console.log('[AICompanion] Thinking simulation finished');
        } catch (error) {
            console.error('[AICompanion] Error in thinking simulation:', error);
            // Note: Thinking messages are preserved even if there are errors
            // as they may contain valuable partial thoughts
        } finally {
            // Reset simulation state
            this.isThinkingSimulationActive = false;
            this.shouldEndThinkingNaturally = false;

            // Signal completion to waiting processes
            if (this.thinkingCompletionResolve) {
                console.log('[AICompanion] Resolving thinking completion promise');
                this.thinkingCompletionResolve();
                this.thinkingCompletionResolve = null;
                this.thinkingCompletionPromise = null;
            }

            // Reset tracking variables for next thinking session
            this.currentThinkingDiv = null;
            this.currentThinkingContent = '';
            this.thinkingPromptIndex = 0;
            this.currentUserMessage = null;
        }

        // Return the completion promise for external waiting
        return this.thinkingCompletionPromise;
    }

    /**
     * Continue streaming thinking content from where it left off
     * @param {Array<string>} thinkingPrompts - Initial thinking prompts
     * @private
     */
    async continueThinkingStream(thinkingPrompts) {
        // Continue from where we left off with initial prompts
        for (let i = this.thinkingPromptIndex; i < thinkingPrompts.length && this.isThinkingSimulationActive && !this.shouldEndThinkingNaturally; i++) {
            const thought = thinkingPrompts[i];

            // Add natural delays between thoughts (with interruption checks)
            if (i > this.thinkingPromptIndex) {
                await this.delayWithInterruption(300 + Math.random() * 400); // Faster: 0.3-0.7s between thoughts
            }

            if (!this.isThinkingSimulationActive || this.shouldEndThinkingNaturally) break;

            // Add separator for additional thoughts (but not for the very first thought)
            if (this.currentThinkingContent.length > 0) {
                this.currentThinkingContent += '\n\n';
            }

            // Append new thought to existing content
            const newContent = this.currentThinkingContent + thought;

            // Stream only the new part of the thought
            await this.streamNewThoughtContent(this.currentThinkingContent.length, newContent);

            // Update current content
            this.currentThinkingContent = newContent;
            this.thinkingPromptIndex = i + 1;

            // Shorter pause between complete thoughts
            if (i < thinkingPrompts.length - 1) {
                await this.delayWithInterruption(500); // Faster: 0.5s pause
            }
        }

        // After initial thoughts are done, keep generating new thoughts until agent responds
        if (this.isThinkingSimulationActive && !this.shouldEndThinkingNaturally) {
            console.log('[AICompanion] Initial thoughts completed, continuing with additional thoughts until agent responds...');
            await this.continuousThinkingLoop();
        }

        // Handle natural ending vs normal completion
        if (this.shouldEndThinkingNaturally) {
            console.log('[AICompanion] Ending thinking simulation naturally due to agent response');
            this.endThinkingNaturallyInMainChat(this.currentThinkingDiv, this.currentThinkingContent, null);

            // Add a brief delay for visual completion before allowing agent message rendering
            await this.delay(300); // Faster completion
        } else if (this.isThinkingSimulationActive) {
            // Normal completion (should rarely happen now since we loop continuously)
            console.log('[AICompanion] Thinking simulation completed normally');
            this.finalizeThinkingInMainChat(this.currentThinkingDiv, this.currentThinkingContent, null);

            // Brief pause before transitioning to agent response
            await this.delay(500); // Faster transition
        }
    }

    /**
     * Continuous thinking loop that generates new thoughts until agent responds
     * @private
     */
    async continuousThinkingLoop() {
        let continuousThoughtIndex = 0;

        // Check if AI is available for context-aware thinking generation
        const useAI = this.isEnabled && await this.isAIConfigured().catch(() => false);

        // Fallback template thoughts (only used when AI is not available)
        const fallbackThoughts = [
            "Let me search through more relevant information...",
            "I should also consider alternative approaches...",
            "Checking for any related context that might be helpful...",
            "Let me think about potential edge cases or considerations...",
            "Looking for the most comprehensive answer to provide...",
            "I want to make sure I cover all important aspects...",
            "Considering different perspectives on this topic...",
            "Let me gather some additional insights...",
            "Thinking about practical examples or use cases...",
            "Making sure I provide the most accurate information...",
            "Let me double-check my understanding of the question...",
            "Considering any recent developments or best practices...",
            "I want to ensure my response is clear and helpful...",
            "Reviewing the context to provide a targeted answer...",
            "Analyzing the knowledge base for relevant information...",
            "Cross-referencing with related topics and concepts...",
            "Preparing a well-structured and comprehensive response...",
            "Almost ready with a complete and helpful answer..."
        ];

        while (this.isThinkingSimulationActive && !this.shouldEndThinkingNaturally) {
            // Add a longer pause before generating additional thoughts
            console.log('[AICompanion] Starting delay before next continuous thought...');
            await this.delayWithInterruption(2000 + Math.random() * 3000); // 2-5 seconds between additional thoughts

            // Double-check flags after delay
            if (!this.isThinkingSimulationActive || this.shouldEndThinkingNaturally) {
                console.log('[AICompanion] Thinking simulation flags indicate stopping after delay:', {
                    isThinkingSimulationActive: this.isThinkingSimulationActive,
                    shouldEndThinkingNaturally: this.shouldEndThinkingNaturally
                });
                break;
            }

            let thought;

            // Prioritize AI-powered context-aware thoughts when available
            if (useAI) {
                try {
                    // Generate context-aware thinking based on the user's question and current thinking progress
                    thought = await this.generateContextualContinuousThought(continuousThoughtIndex);
                    console.log('[AICompanion] Generated AI-powered contextual continuous thought');
                } catch (error) {
                    console.log('[AICompanion] AI contextual thought generation failed, trying simple AI thought...', error.message);

                    // Fallback to simple AI thought generation
                    try {
                        thought = await this.generateSingleAIThought();
                        console.log('[AICompanion] Generated AI-powered simple continuous thought');
                    } catch (error2) {
                        console.log('[AICompanion] All AI thought generation failed, using template');
                        thought = fallbackThoughts[continuousThoughtIndex % fallbackThoughts.length];
                    }
                }
            } else {
                // Use template thoughts when AI is not available
                thought = fallbackThoughts[continuousThoughtIndex % fallbackThoughts.length];
                console.log('[AICompanion] AI not available, using template thought');
            }

            continuousThoughtIndex++;

            // Add separator and new thought
            if (this.currentThinkingContent.length > 0) {
                this.currentThinkingContent += '\n\n';
            }

            const newContent = this.currentThinkingContent + thought;

            // Stream the new thought
            await this.streamNewThoughtContent(this.currentThinkingContent.length, newContent);

            // Update current content
            this.currentThinkingContent = newContent;

            console.log(`[AICompanion] Added continuous thought ${continuousThoughtIndex}: ${thought.substring(0, 50)}...`);
        }

        console.log('[AICompanion] Continuous thinking loop ended');
    }

    /**
     * Generate a contextual AI-powered thought for continuous thinking based on user's question and progress
     * @param {number} thoughtIndex - Index of the current continuous thought
     * @returns {string} A contextual thinking thought
     * @private
     */
    async generateContextualContinuousThought(thoughtIndex) {
        // Use stored user message or try to extract from thinking content
        const userMessage = this.currentUserMessage || this.extractUserQuestion(this.currentThinkingContent) || 'the current question';

        // Get conversation context for richer thinking
        const conversationContext = this.getConversationContextForThinking();
        const contextPart = conversationContext ? ` Given our conversation about ${conversationContext}, ` : '';

        // Get current thinking progress to build upon
        const currentThoughts = this.currentThinkingContent.split('\n\n').filter(t => t.trim());
        const thinkingProgressSummary = currentThoughts.length > 0
            ? ` So far I've been thinking: ${currentThoughts.slice(-2).join(', ').substring(0, 100)}...`
            : '';

        // Detect the language of the user's question for consistent responses
        const isChineseQuestion = /[\u4e00-\u9fff]/.test(userMessage);
        const languageInstruction = isChineseQuestion
            ? `\n\n**IMPORTANT: Respond in Chinese since the user asked in Chinese.**`
            : `\n\n**IMPORTANT: Respond in the same language as the user's question.**`;

        // Create different types of contextual prompts based on thinking progress
        let thoughtPrompt;

        if (thoughtIndex === 0) {
            // First continuous thought - deeper analysis
            thoughtPrompt = promptManager.getFormattedPrompt('questionAnalysis', {
                userMessage: userMessage
            }) + languageInstruction;
        } else if (thoughtIndex % 4 === 1) {
            // Context-aware thinking
            thoughtPrompt = promptManager.getFormattedPrompt('contextualThinking', {
                userMessage: userMessage,
                contextPart: contextPart
            }) + languageInstruction;
        } else if (thoughtIndex % 4 === 2) {
            // Implementation/practical thinking
            thoughtPrompt = promptManager.getFormattedPrompt('practicalThinking', {
                userMessage: userMessage
            }) + languageInstruction;
        } else {
            // Comprehensive/synthesis thinking
            thoughtPrompt = promptManager.getFormattedPrompt('synthesisThinking', {
                userMessage: userMessage,
                thinkingProgressSummary: thinkingProgressSummary
            }) + languageInstruction;
        }

        try {
            let thought = '';

            if (this.currentProvider === 'ollama') {
                thought = await this.generateOllamaThinking(thoughtPrompt);
            } else {
                thought = await this.generateAPIThinking(thoughtPrompt);
            }

            // Clean up the response and ensure it's a single sentence
            thought = thought.trim()
                .split('\n')[0] // Take first line only
                .replace(/^["']|["']$/g, '') // Remove quotes
                .replace(/^- /, '') // Remove bullet points
                .trim();

            // Ensure it's not empty and not too long
            if (thought.length === 0) {
                throw new Error('Empty contextual thought generated');
            }

            if (thought.length > 200) {
                // Truncate if too long but preserve sentence structure
                thought = thought.substring(0, 197) + '...';
            }

            // Ensure it doesn't start with generic phrases - prefer contextual content
            const genericPrefixes = ['I think', 'I believe', 'I should', 'Let me'];
            const startsGeneric = genericPrefixes.some(prefix => thought.toLowerCase().startsWith(prefix.toLowerCase()));

            if (startsGeneric && (thought.includes('specific') || thought.includes(userMessage.split(' ')[0]))) {
                // It's using "specific" or references the question, which suggests it's contextual despite generic prefix
                return thought;
            } else if (startsGeneric) {
                // Try to make it more contextual
                thought = thought.replace(/^(I think|I believe|I should|Let me)\s*/i, '');
                thought = thought.charAt(0).toUpperCase() + thought.slice(1);
            }

            console.log(`[AICompanion] Generated contextual thought for ${userMessage.substring(0, 30)}...: ${thought.substring(0, 50)}...`);
            return thought;
        } catch (error) {
            console.error('[AICompanion] Error generating contextual continuous thought:', error);
            throw error;
        }
    }

    /**
     * Generate a single AI-powered thought for continuous thinking
     * @returns {string} A single thinking thought
     * @private
     */
    async generateSingleAIThought() {
        // Detect language for consistent response
        const userMessage = this.currentUserMessage || '';
        const isChineseQuestion = /[\u4e00-\u9fff]/.test(userMessage);
        const languageInstruction = isChineseQuestion
            ? `\n\nIMPORTANT: Respond in Chinese since the user asked in Chinese.`
            : `\n\nIMPORTANT: Respond in the same language as the user's question.`;

        const simpleThoughtPrompt = promptManager.getFormattedPrompt('simpleContinuation', {
            userMessage: userMessage
        }) + languageInstruction;

        try {
            let thought = '';

            if (this.currentProvider === 'ollama') {
                thought = await this.generateOllamaThinking(simpleThoughtPrompt);
            } else {
                thought = await this.generateAPIThinking(simpleThoughtPrompt);
            }

            // Clean up the response and ensure it's a single sentence
            thought = thought.trim()
                .split('\n')[0] // Take first line only
                .replace(/^["']|["']$/g, '') // Remove quotes
                .trim();

            // Ensure it's not empty and not too long
            if (thought.length === 0 || thought.length > 150) {
                throw new Error('Invalid AI thought generated');
            }

            return thought;
        } catch (error) {
            console.error('[AICompanion] Error generating single AI thought:', error);
            throw error;
        }
    }

    /**
     * Format thinking content for HTML display with proper paragraph structure
     * @param {string} content - Raw thinking content with \n\n separators
     * @returns {string} HTML formatted content
     * @private
     */
    formatThinkingContentForHTML(content) {
        if (!content) return '';

        // Split content into paragraphs and format each one
        const paragraphs = content.split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0);

        // Wrap each paragraph in a div with margin for proper spacing
        const formattedParagraphs = paragraphs.map(paragraph =>
            `<div style="margin-bottom: 0.8rem; line-height: 1.6;">${paragraph}</div>`
        );

        return formattedParagraphs.join('');
    }

    /**
     * Stream only new content that was added to the thinking message
     * @param {number} startIndex - Index to start streaming from
     * @param {string} fullContent - Complete content including new text
     * @private
     */
    async streamNewThoughtContent(startIndex, fullContent) {
        // Ensure we have a valid thinking div
        if (!this.currentThinkingDiv) {
            console.error('[AICompanion] No currentThinkingDiv available for streaming');
            return;
        }

        // Stream only the new characters from startIndex
        for (let i = startIndex; i < fullContent.length; i++) {
            if (!this.isThinkingSimulationActive || this.shouldEndThinkingNaturally) break;

            // Update display with current content, properly formatted
            const currentContent = fullContent.substring(0, i + 1);
            this.currentThinkingDiv.innerHTML = this.formatThinkingContentForHTML(currentContent);
            this.scrollMainChatToBottom();

            // Faster typing speed to match agent streaming (similar to real message streaming)
            const delay = 10 + Math.random() * 15; // 10-25ms per character (much faster)
            await this.delay(delay);
        }

        // Ensure final content is displayed with proper formatting
        if (this.currentThinkingDiv && this.isThinkingSimulationActive) {
            this.currentThinkingDiv.innerHTML = this.formatThinkingContentForHTML(fullContent);
            this.scrollMainChatToBottom();
        }
    }

    /**
     * End thinking simulation naturally when agent response arrives
     * @public
     */
    endThinkingSimulationNaturally() {
        console.log('[AICompanion] Received request to end thinking simulation naturally');
        console.log('[AICompanion] Current simulation state:', {
            isThinkingSimulationActive: this.isThinkingSimulationActive,
            shouldEndThinkingNaturally: this.shouldEndThinkingNaturally
        });

        this.shouldEndThinkingNaturally = true;

        // Also immediately stop the main simulation flag for faster interruption
        this.isThinkingSimulationActive = false;

        console.log('[AICompanion] Thinking simulation flags set to end naturally');
    }

    /**
     * Check if thinking simulation is currently active
     * @returns {boolean} Whether thinking simulation is active
     * @public
     */
    isThinkingActive() {
        return this.isThinkingSimulationActive;
    }

    /**
     * Get the thinking completion promise if thinking is active
     * @returns {Promise|null} Promise that resolves when thinking is complete, or null if not active
     * @public
     */
    getThinkingCompletionPromise() {
        return this.thinkingCompletionPromise;
    }

    /**
     * End thinking simulation naturally in main chat with a smooth transition
     * @param {HTMLElement} messageDiv - Message div
     * @param {string} currentText - Current thinking text
     * @param {HTMLElement} messageContainer - Message container (can be null)
     * @private
     */
    endThinkingNaturallyInMainChat(messageDiv, currentText, messageContainer) {
        if (!messageDiv) return;

        // Enhanced language detection - check both stored user message and existing thinking content
        const isChineseQuestion = (this.currentUserMessage && /[\u4e00-\u9fff]/.test(this.currentUserMessage)) ||
            (currentText && /[\u4e00-\u9fff]/.test(currentText));

        console.log('[AICompanion] Language detection for completion:', {
            currentUserMessage: this.currentUserMessage,
            hasChineseInUserMessage: this.currentUserMessage && /[\u4e00-\u9fff]/.test(this.currentUserMessage),
            hasChineseInThinkingContent: currentText && /[\u4e00-\u9fff]/.test(currentText),
            finalDetection: isChineseQuestion
        });

        const completionMessage = isChineseQuestion ?
            '💡 完美！我已经准备好回答了。' :
            '💡 Perfect! I have my thoughts ready for the response.';

        // Add a natural completion message with proper formatting
        const completionText = currentText + (currentText ? '\n\n' : '') + completionMessage;
        messageDiv.innerHTML = this.formatThinkingContentForHTML(completionText);
        this.scrollMainChatToBottom();

        // Thinking message remains as part of the conversation - no auto-clearing
        console.log('[AICompanion] Thinking simulation ended naturally, message preserved in conversation');
    }

    /**
     * Delay with interruption support for thinking simulation
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise that can be interrupted
     * @private
     */
    async delayWithInterruption(ms) {
        const checkInterval = 50; // Check every 50ms for faster interruption
        const iterations = Math.ceil(ms / checkInterval);

        for (let i = 0; i < iterations; i++) {
            if (!this.isThinkingSimulationActive || this.shouldEndThinkingNaturally) {
                console.log('[AICompanion] Delay interrupted by thinking simulation flags:', {
                    isThinkingSimulationActive: this.isThinkingSimulationActive,
                    shouldEndThinkingNaturally: this.shouldEndThinkingNaturally,
                    iteration: i,
                    totalIterations: iterations
                });
                break;
            }
            await this.delay(checkInterval);
        }
    }

    /**
     * Extract the actual user question from the message with context
     * @param {string} messageWithContext - Full message including context
     * @returns {string} The extracted user question
     * @private
     */
    extractUserQuestion(messageWithContext) {
        // Look for the "User Question:" prefix that's added in sendUserMessage
        const userQuestionMatch = messageWithContext.match(/User Question: (.+)$/s);
        if (userQuestionMatch) {
            return userQuestionMatch[1].trim();
        }

        // Fallback: return the last part after context
        const lines = messageWithContext.split('\n');
        return lines[lines.length - 1].trim() || messageWithContext.trim();
    }

    /**
     * Generate natural thinking prompts based on the user's question using LLM
     * @param {string} userMessage - The user's message
     * @returns {Array<string>} Array of thinking thoughts
     * @private
     */
    async generateThinkingPrompts(userMessage) {
        try {
            // Try to generate AI-powered thinking content if AI companion is enabled and configured
            if (this.isEnabled && await this.isAIConfigured()) {
                return await this.generateAIThinkingContent(userMessage);
            }
        } catch (error) {
            console.log('[AICompanion] AI thinking generation failed, falling back to templates:', error.message);
        }

        // Fallback to template-based thinking if AI generation fails or is not available
        return this.generateTemplateThinkingPrompts(userMessage);
    }

    /**
     * Generate AI-powered thinking content using LLM
     * @param {string} userMessage - The user's message
     * @returns {Array<string>} Array of thinking thoughts
     * @private
     */
    async generateAIThinkingContent(userMessage) {
        const conversationContext = this.getConversationContextForThinking();
        const contextPart = conversationContext ? ` The conversation context includes: ${conversationContext}.` : '';

        // Detect user question language for explicit instruction
        const isChineseQuestion = /[\u4e00-\u9fff]/.test(userMessage);
        const languageInstruction = isChineseQuestion
            ? 'CRITICAL: The user asked in Chinese, so ALL thinking content must be in Chinese only. Do not use any English, Italian, or other languages.'
            : 'CRITICAL: The user asked in English, so ALL thinking content must be in English only. Do not use any Chinese, Italian, or other languages.';

        // Use centralized prompt manager
        const thinkingPrompt = promptManager.getFormattedPrompt('thinkingGeneration', {
            userMessage: userMessage,
            contextPart: contextPart,
            languageInstruction: languageInstruction
        });

        try {
            let thinkingContent = '';

            if (this.currentProvider === 'ollama') {
                thinkingContent = await this.generateOllamaThinking(thinkingPrompt);
            } else {
                thinkingContent = await this.generateAPIThinking(thinkingPrompt);
            }

            // Parse the AI response into individual thoughts
            const thoughts = thinkingContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .slice(0, 4); // Limit to 4 thoughts max

            // Ensure we have at least one thought
            if (thoughts.length === 0) {
                throw new Error('No thinking content generated');
            }

            return thoughts;
        } catch (error) {
            console.error('[AICompanion] Error generating AI thinking content:', error);
            throw error;
        }
    }

    /**
     * Generate thinking content using Ollama
     * @param {string} prompt - The thinking prompt
     * @returns {string} Generated thinking content
     * @private
     */
    async generateOllamaThinking(prompt) {
        const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        const selectedModel = localStorage.getItem('ollamaSelectedModel');

        if (!selectedModel || selectedModel === 'No Model Selected') {
            throw new Error('No Ollama model selected');
        }

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    max_tokens: 200
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.response || '';
    }

    /**
     * Generate thinking content using API providers
     * @param {string} prompt - The thinking prompt
     * @returns {string} Generated thinking content
     * @private
     */
    async generateAPIThinking(prompt) {
        const apiKey = await SecureStorage.retrieve(`${this.currentProvider}ApiKey`);
        if (!apiKey) {
            throw new Error(`No API key found for ${this.currentProvider}`);
        }

        let requestBody, url, headers;

        switch (this.currentProvider) {
            case 'openai':
                url = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                };
                requestBody = {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 200,
                    temperature: 0.7
                };
                break;

            case 'anthropic':
                url = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                };
                requestBody = {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 200,
                    messages: [{ role: 'user', content: prompt }]
                };
                break;

            case 'azure':
                const endpoint = localStorage.getItem('azureEndpoint');
                const deployment = localStorage.getItem('azureDeployment');
                if (!endpoint || !deployment) {
                    throw new Error('Azure endpoint or deployment not configured');
                }
                url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;
                headers = {
                    'api-key': apiKey,
                    'Content-Type': 'application/json'
                };
                requestBody = {
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 200,
                    temperature: 0.7
                };
                break;

            default:
                throw new Error(`Unsupported provider: ${this.currentProvider}`);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        switch (this.currentProvider) {
            case 'openai':
            case 'azure':
                return data.choices?.[0]?.message?.content || '';
            case 'anthropic':
                return data.content?.[0]?.text || '';
            default:
                return '';
        }
    }

    /**
     * Check if AI is properly configured for thinking generation
     * @returns {boolean} Whether AI is configured
     * @private
     */
    async isAIConfigured() {
        try {
            if (this.currentProvider === 'ollama') {
                const selectedModel = localStorage.getItem('ollamaSelectedModel');
                return selectedModel && selectedModel !== 'No Model Selected';
            } else {
                const apiKey = await SecureStorage.retrieve(`${this.currentProvider}ApiKey`);
                if (this.currentProvider === 'azure') {
                    const endpoint = localStorage.getItem('azureEndpoint');
                    const deployment = localStorage.getItem('azureDeployment');
                    return !!(apiKey && endpoint && deployment);
                }
                return !!apiKey;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate template-based thinking prompts (fallback)
     * @param {string} userMessage - The user's message
     * @returns {Array<string>} Array of thinking thoughts
     * @private
     */
    generateTemplateThinkingPrompts(userMessage) {
        const thoughts = [];

        // Detect if the question is in Chinese to provide language-consistent thinking
        const isChineseQuestion = /[\u4e00-\u9fff]/.test(userMessage);

        // Analyze the question type and generate appropriate thoughts
        const questionType = this.analyzeQuestionType(userMessage);

        // Initial analysis thought (language-aware)
        if (isChineseQuestion) {
            thoughts.push(`🤔 让我思考一下这个问题："${userMessage}"`);
        } else {
            thoughts.push(`🤔 Let me think about this question: "${userMessage}"`);
        }

        // Question-specific thinking patterns (language-aware)
        if (isChineseQuestion) {
            switch (questionType) {
                case 'technical':
                    thoughts.push('这似乎是一个技术问题。我应该考虑技术细节和最佳实践...');
                    thoughts.push('让我想想如何最准确和有用地解释这个问题...');
                    break;
                case 'howto':
                    thoughts.push('这是一个"如何做"的问题。我应该提供逐步指导...');
                    thoughts.push('我要确保涵盖所有重要步骤和潜在问题...');
                    break;
                case 'troubleshooting':
                    thoughts.push('这看起来像是一个故障排除问题。让我考虑常见原因和解决方案...');
                    thoughts.push('我应该考虑诊断和解决这个问题的系统方法...');
                    break;
                case 'conceptual':
                    thoughts.push('这是在询问概念。我应该用例子清楚地解释...');
                    thoughts.push('让我想想如何以易于理解的方式分解这个问题...');
                    break;
                case 'comparison':
                    thoughts.push('这是要我比较选项。我应该考虑优缺点...');
                    thoughts.push('让我想想关键差异和用例...');
                    break;
                default:
                    thoughts.push('让我分析什么对这个问题最有帮助...');
                    thoughts.push('我想提供一个全面和有用的回答...');
            }
        } else {
            switch (questionType) {
                case 'technical':
                    thoughts.push('This seems like a technical question. I should consider the technical details and best practices...');
                    thoughts.push('Let me think about the most accurate and helpful way to explain this...');
                    break;
                case 'howto':
                    thoughts.push('This is a "how-to" question. I should provide step-by-step guidance...');
                    thoughts.push('I want to make sure I cover all the important steps and potential issues...');
                    break;
                case 'troubleshooting':
                    thoughts.push('This looks like a troubleshooting question. Let me consider common causes and solutions...');
                    thoughts.push('I should think about systematic approaches to diagnose and fix this...');
                    break;
                case 'conceptual':
                    thoughts.push('This is asking about concepts. I should explain clearly with examples...');
                    thoughts.push('Let me think about how to break this down in an understandable way...');
                    break;
                case 'comparison':
                    thoughts.push('This is asking me to compare options. I should consider pros and cons...');
                    thoughts.push('Let me think about the key differences and use cases...');
                    break;
                default:
                    thoughts.push('Let me analyze what would be most helpful for this question...');
                    thoughts.push('I want to provide a comprehensive and useful response...');
            }
        }

        // Add context-aware thoughts based on conversation history
        const conversationContext = this.getConversationContextForThinking();
        if (conversationContext) {
            thoughts.push(`Based on our previous conversation about ${conversationContext}, I should consider how this relates...`);
        }

        // Final preparation thought (language-aware)
        if (isChineseQuestion) {
            thoughts.push('好的，我想我有了一个很好的方法。让我制定我的回答...');
        } else {
            thoughts.push('Alright, I think I have a good approach. Let me formulate my response...');
        }

        // Randomly select 3-4 thoughts to keep it natural and not too long
        const selectedThoughts = this.selectRandomThoughts(thoughts, 3 + Math.floor(Math.random() * 2));

        return selectedThoughts;
    }

    /**
     * Analyze the type of question being asked
     * @param {string} question - The user's question
     * @returns {string} Question type
     * @private
     */
    analyzeQuestionType(question) {
        const lowerQuestion = question.toLowerCase();

        if (lowerQuestion.includes('how to') || lowerQuestion.includes('how do') || lowerQuestion.includes('how can')) {
            return 'howto';
        }
        if (lowerQuestion.includes('error') || lowerQuestion.includes('not working') || lowerQuestion.includes('problem') || lowerQuestion.includes('issue')) {
            return 'troubleshooting';
        }
        if (lowerQuestion.includes('vs') || lowerQuestion.includes('versus') || lowerQuestion.includes('difference between') || lowerQuestion.includes('compare')) {
            return 'comparison';
        }
        if (lowerQuestion.includes('what is') || lowerQuestion.includes('explain') || lowerQuestion.includes('why does') || lowerQuestion.includes('concept')) {
            return 'conceptual';
        }
        if (lowerQuestion.match(/\b(code|programming|api|function|method|class|variable|syntax)\b/)) {
            return 'technical';
        }

        return 'general';
    }

    /**
     * Get conversation context for thinking process
     * @returns {string|null} Brief context description
     * @private
     */
    getConversationContextForThinking() {
        try {
            const chatWindow = DOMUtils.getElementById('chatWindow');
            if (!chatWindow) return null;

            const messageContainers = Array.from(chatWindow.querySelectorAll('.messageContainer'));
            if (messageContainers.length < 2) return null;

            // Look at recent messages to identify topic
            const recentMessages = messageContainers.slice(-4); // Last 4 messages
            const topics = [];

            recentMessages.forEach(container => {
                const messageText = container.querySelector('.messageText, .messageContent, .messageDiv')?.textContent || '';
                const words = messageText.toLowerCase().split(/\s+/);

                // Extract potential topic keywords
                const topicKeywords = words.filter(word =>
                    word.length > 4 &&
                    !['about', 'could', 'would', 'should', 'there', 'where', 'when', 'what', 'this'].includes(word)
                );

                topics.push(...topicKeywords.slice(0, 2)); // Top 2 keywords per message
            });

            // Return most common topic
            if (topics.length > 0) {
                const topicCounts = {};
                topics.forEach(topic => topicCounts[topic] = (topicCounts[topic] || 0) + 1);
                const mostCommonTopic = Object.keys(topicCounts).reduce((a, b) => topicCounts[a] > topicCounts[b] ? a : b);
                return mostCommonTopic;
            }

            return null;
        } catch (error) {
            console.error('[AICompanion] Error getting conversation context for thinking:', error);
            return null;
        }
    }

    /**
     * Select random thoughts from the generated list
     * @param {Array<string>} thoughts - All available thoughts
     * @param {number} count - Number of thoughts to select
     * @returns {Array<string>} Selected thoughts
     * @private
     */
    selectRandomThoughts(thoughts, count) {
        // Always include the first thought (question analysis)
        const selected = [thoughts[0]];

        // Randomly select from the middle thoughts
        const middleThoughts = thoughts.slice(1, -1);
        const shuffled = middleThoughts.sort(() => 0.5 - Math.random());
        selected.push(...shuffled.slice(0, count - 2));

        // Always include the last thought (preparation)
        if (thoughts.length > 1) {
            selected.push(thoughts[thoughts.length - 1]);
        }

        return selected;
    }

    /**
     * Create thinking activity object for main chat
     * @param {string} initialThought - Initial thinking text
     * @returns {Object} Activity object
     * @private
     */
    createThinkingActivity(initialThought) {
        return {
            id: `thinking-${Date.now()}`,
            from: { id: 'ai-companion-thinking', name: 'AI Companion' },
            type: 'message',
            text: initialThought,
            timestamp: new Date().toISOString(),
            isThinking: true
        };
    }

    /**
     * Create main chat message container for thinking
     * @param {Object} activity - Activity object
     * @returns {HTMLElement} Message container
     * @private
     */
    createMainChatMessageContainer(activity) {
        const container = DOMUtils.createElement('div', {
            className: 'messageContainer botMessage thinking-message companion-response',
            dataset: {
                messageId: activity.id,
                timestamp: activity.timestamp,
                isThinking: 'true'
            }
        });

        return container;
    }

    /**
     * Create main chat message div
     * @returns {HTMLElement} Message div
     * @private
     */
    createMainChatMessageDiv() {
        return DOMUtils.createElement('div', {
            className: 'messageContent thinking-content'
        });
    }

    /**
     * Create main chat message icon
     * @param {boolean} isUser - Whether message is from user
     * @returns {HTMLElement|null} Message icon or null if icons disabled
     * @private
     */
    createMainChatMessageIcon(isUser) {
        // Check if message icons are enabled (follow agent message icon visibility rules)
        const messageIconsEnabled = localStorage.getItem('messageIconsEnabled') !== 'false';
        if (!messageIconsEnabled) {
            return null;
        }

        const icon = DOMUtils.createElement('div', {
            className: 'messageIcon'
        });

        // Use appropriate icons
        if (isUser) {
            icon.style.backgroundImage = 'url("images/carter_30k.png")';
            icon.style.backgroundSize = 'cover';
        } else {
            // Use AI companion icon for thinking and companion messages
            const aiCompanionIcon = window.Icon.create('aiCompanion', { color: '#333', size: '28px' });
            icon.appendChild(aiCompanionIcon);
        }

        return icon;
    }

    /**
     * Stream thinking text in main chat
     * @param {HTMLElement} messageDiv - Message div
     * @param {string} fullText - Complete text to display
     * @private
     */
    async streamThoughtInMainChat(messageDiv, fullText) {
        const thoughts = fullText.split('\n\n');
        let displayText = '';

        for (let i = 0; i < thoughts.length; i++) {
            if (i > 0) displayText += '\n\n';

            const thought = thoughts[i];
            const startLength = displayText.length;

            // Stream this thought character by character
            for (let j = 0; j < thought.length; j++) {
                displayText = fullText.substring(0, startLength + j + 1);

                messageDiv.innerHTML = displayText;
                this.scrollMainChatToBottom();

                // Natural typing speed variation
                const delay = 30 + Math.random() * 40; // 30-70ms per character
                await this.delay(delay);
            }

            displayText += thought;
        }
    }

    /**
     * Finalize thinking message in main chat
     * @param {HTMLElement} messageDiv - Message div
     * @param {string} fullText - Complete thinking text
     * @param {HTMLElement} messageContainer - Message container (can be null)
     * @private
     */
    finalizeThinkingInMainChat(messageDiv, fullText, messageContainer) {
        if (!messageDiv) return;

        // Update to final thinking state with completion indicator
        messageDiv.innerHTML = fullText + '<br><br><span style="color: #10b981; font-size: 0.9em; font-weight: 500;">✓ Analysis complete</span>';
        this.scrollMainChatToBottom();

        // No longer store reference for removal - thinking messages remain as part of conversation
        console.log('[AICompanion] Thinking message finalized and preserved in conversation');
    }

    /**
     * Clear thinking messages from main chat (manual cleanup only)
     * @private
     */
    clearThinkingMessages() {
        try {
            if (this.currentThinkingMessage && this.currentThinkingMessage.parentNode) {
                console.log('[AICompanion] Manually clearing thinking message from main chat');
                // Fade out the thinking message before removing
                this.currentThinkingMessage.style.transition = 'opacity 0.3s ease-out';
                this.currentThinkingMessage.style.opacity = '0';

                setTimeout(() => {
                    if (this.currentThinkingMessage && this.currentThinkingMessage.parentNode) {
                        this.currentThinkingMessage.parentNode.removeChild(this.currentThinkingMessage);
                        console.log('[AICompanion] Thinking message manually removed from DOM');
                    }
                    this.currentThinkingMessage = null;
                }, 300);
            } else {
                console.log('[AICompanion] No thinking message to clear');
            }
        } catch (error) {
            console.error('[AICompanion] Error clearing thinking messages:', error);
            this.currentThinkingMessage = null;
        }
    }

    /**
     * Scroll main chat to bottom
     * @private
     */
    scrollMainChatToBottom() {
        const chatWindow = DOMUtils.getElementById('chatWindow');
        if (chatWindow) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }

    /**
     * Utility method for delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle quick action processing for main chat panel
     * @param {string} action - The action type (analyze, summarize, benchmark)
     * @param {string} messageText - Optional custom message text
     * @returns {Promise} Promise that resolves when action is complete
     * @public
     */
    async handleQuickAction(action, messageText = null) {
        console.log('Quick action called from main chat:', action);

        // Check if any request is already in progress
        if (this.isQuickActionInProgress) {
            console.log('Quick action already in progress, ignoring request');
            return;
        }

        // Set flag to prevent multiple requests
        this.isQuickActionInProgress = true;

        try {
            let prompt = '';

            switch (action) {
                case 'analyze':
                    const analysisContext = this.getAdaptiveConversationContext('analysis');
                    prompt = `${analysisContext}\n\nPlease analyze the agent's responses in this conversation. Focus on:\n1. Response quality and accuracy\n2. Helpfulness and relevance\n3. Communication style\n4. Areas for improvement\n\nProvide a brief but insightful analysis.`;
                    break;
                case 'summarize':
                    const summaryContext = this.getAdaptiveConversationContext('summary');
                    prompt = `${summaryContext}\n\nPlease provide a concise summary of this conversation, highlighting:\n1. Main topics discussed\n2. Key information provided by the agent\n3. User's main questions or concerns\n4. Overall conversation outcome`;
                    break;
                case 'benchmark':
                    // Handle A/B test analysis separately due to its multi-step nature
                    await this.performBenchmarkAnalysis();
                    this.isQuickActionInProgress = false;
                    return;
                case 'custom':
                    if (messageText) {
                        const conversationContext = this.getAdaptiveConversationContext('general');
                        prompt = `${conversationContext}\n\nUser Question: ${messageText}`;
                    }
                    break;
            }

            if (prompt) {
                // Estimate input token usage for the prompt
                this.estimateTokenUsage(prompt, true);

                this.showTypingIndicator();
                await this.sendQuickActionRequest(prompt);
            }
        } catch (error) {
            console.error('Error processing quick action:', error);
            this.hideTypingIndicator();
            this.renderMessage('error', `Error: ${error.message}`);
        } finally {
            this.isQuickActionInProgress = false;
        }
    }

    /**
     * Send quick action request to AI
     * @param {string} messageWithContext - Message with conversation context
     * @public
     */
    async sendQuickActionRequest(messageWithContext) {
        if (this.currentProvider === 'ollama') {
            await this.handleOllamaStreaming(messageWithContext);
        } else {
            await this.handleAPIStreaming(messageWithContext);
        }
    }

    /**
     * Enable all quick action buttons (works with main chat panel buttons)
     * @public
     */
    enableAllQuickActionButtons() {
        const quickActionButtons = document.querySelectorAll('.quick-action-btn');
        quickActionButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
        });
        console.log('[AI Companion] All quick action buttons enabled');
    }

    /**
     * Disable all quick action buttons (works with main chat panel buttons) 
     * @public
     */
    disableAllQuickActionButtons() {
        const quickActionButtons = document.querySelectorAll('.quick-action-btn');
        quickActionButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        });
        console.log('[AI Companion] All quick action buttons disabled');
    }

    /**
     * Perform A/B test analysis comparing agent response (treatment) with general knowledge (control)
     * This implements a scientific A/B testing methodology to evaluate the effectiveness of contextual responses
     * @private
     */
    async performBenchmarkAnalysis() {
        console.log('[AI Companion] Starting A/B test analysis (Context vs General Knowledge)');

        // Try to get the most recent complete agent response using multiple methods
        let lastUserQuestion = null;
        let lastAgentResponse = null;

        // Method 1: Extract FULL content directly from DOM (bypassing context truncation)
        const chatWindow = DOMUtils.getElementById('chatWindow');
        if (chatWindow) {
            const messageContainers = Array.from(chatWindow.querySelectorAll('.messageContainer')).reverse();

            for (const container of messageContainers) {
                if (container.classList.contains('botMessage') && !lastAgentResponse) {
                    // Try multiple selectors to get the complete message content
                    const messageSelectors = [
                        '.messageText',
                        '.messageContent',
                        '.message-content',
                        '.messageDiv',
                        '.message'
                    ];

                    let messageElement = null;
                    for (const selector of messageSelectors) {
                        messageElement = container.querySelector(selector);
                        if (messageElement) break;
                    }

                    if (messageElement) {
                        // Get the COMPLETE content without any truncation
                        let fullContent = '';

                        // Method 1: Get all text nodes and preserve structure
                        const walker = document.createTreeWalker(
                            messageElement,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );

                        let textNodes = [];
                        let node;
                        while (node = walker.nextNode()) {
                            if (node.textContent.trim()) {
                                textNodes.push(node.textContent);
                            }
                        }

                        if (textNodes.length > 0) {
                            fullContent = textNodes.join(' ').trim();
                        }

                        // Method 2: Fallback to innerHTML processing if text nodes didn't work
                        if (!fullContent || fullContent.length < 20) {
                            const innerHTML = messageElement.innerHTML;
                            if (innerHTML) {
                                // Convert HTML to text while preserving structure
                                fullContent = innerHTML
                                    .replace(/<br\s*\/?>/gi, '\n')
                                    .replace(/<\/p>/gi, '\n\n')
                                    .replace(/<\/div>/gi, '\n')
                                    .replace(/<\/h[1-6]>/gi, '\n\n')
                                    .replace(/<[^>]*>/g, '')
                                    .replace(/&nbsp;/g, ' ')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&amp;/g, '&')
                                    .replace(/&lt;/g, '<')
                                    .replace(/&gt;/g, '>')
                                    .trim();
                            }
                        }

                        // Method 3: Final fallback to textContent/innerText
                        if (!fullContent || fullContent.length < 20) {
                            fullContent = messageElement.textContent || messageElement.innerText || '';
                        }

                        if (fullContent && fullContent.trim().length > 10) {
                            lastAgentResponse = fullContent.trim();
                            console.log('[AI Companion] DOM extraction successful (FULL CONTENT), length:', lastAgentResponse.length);
                            console.log('[AI Companion] DOM extracted preview:', lastAgentResponse.substring(0, 200) + '...');

                            // Now find the corresponding user question
                            let foundUser = false;
                            for (const prevContainer of messageContainers) {
                                if (prevContainer === container) {
                                    foundUser = true;
                                    continue;
                                }
                                if (foundUser && prevContainer.classList.contains('userMessage')) {
                                    const userSelectors = [
                                        '.messageText',
                                        '.messageContent',
                                        '.message-content',
                                        '.messageDiv',
                                        '.message'
                                    ];

                                    let userMessageElement = null;
                                    for (const selector of userSelectors) {
                                        userMessageElement = prevContainer.querySelector(selector);
                                        if (userMessageElement) break;
                                    }

                                    if (userMessageElement) {
                                        lastUserQuestion = userMessageElement.textContent || userMessageElement.innerText || '';
                                        if (lastUserQuestion) {
                                            lastUserQuestion = lastUserQuestion.trim();
                                            break;
                                        }
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }

        // Method 2: Fallback to session context if DOM extraction failed
        if (!lastAgentResponse || lastAgentResponse.length < 20) {
            console.log('[AI Companion] DOM extraction insufficient, trying session context');

            const conversationContext = this.getAdaptiveConversationContext('analysis');
            const contextLines = conversationContext.split('\n');

            if (contextLines.length >= 2) {
                let collectingAgentResponse = false;
                let agentResponseLines = [];

                // Parse backwards to find the most recent user-agent exchange
                for (let i = contextLines.length - 1; i >= 0; i--) {
                    const line = contextLines[i].trim();

                    if (line.startsWith('Agent:') && !lastAgentResponse) {
                        // Found the start of the agent response
                        collectingAgentResponse = true;
                        const agentContent = line.substring(6).trim();
                        if (agentContent) {
                            agentResponseLines.unshift(agentContent);
                        }
                    } else if (collectingAgentResponse && !line.startsWith('User:') && line.length > 0) {
                        // Continue collecting agent response lines (including empty lines for structure)
                        agentResponseLines.unshift(line);
                    } else if (line.startsWith('User:') && collectingAgentResponse) {
                        // Found the user question that prompted this agent response
                        lastUserQuestion = line.substring(5).trim();
                        lastAgentResponse = agentResponseLines.join('\n').trim();

                        // Clean up the response to remove any artifacts
                        lastAgentResponse = lastAgentResponse
                            .replace(/^\s*\n+/, '') // Remove leading newlines
                            .replace(/\n+\s*$/, '') // Remove trailing newlines
                            .trim();

                        console.log('[AI Companion] Session context extraction successful (but may be truncated)');
                        console.log('[AI Companion] Agent response length:', lastAgentResponse.length);
                        console.log('[AI Companion] Agent response preview:', lastAgentResponse.substring(0, 200) + '...');
                        break;
                    } else if (line.startsWith('User:') && !collectingAgentResponse) {
                        // Found a user question but no agent response yet, keep looking
                        continue;
                    }
                }
            }
        }

        if (!lastUserQuestion || !lastAgentResponse) {
            throw new Error('Could not find a complete user question and agent response pair to benchmark');
        }

        // Ensure we have meaningful content
        if (lastAgentResponse.length < 10) {
            throw new Error('Agent response is too short to provide meaningful benchmark analysis');
        }

        // Enhanced debugging for content extraction
        console.log('[AI Companion] === A/B TEST CONTENT EXTRACTION DEBUG ===');
        console.log('[AI Companion] Benchmarking question:', lastUserQuestion.substring(0, 150) + (lastUserQuestion.length > 150 ? '...' : ''));
        console.log('[AI Companion] Agent response length:', lastAgentResponse.length);
        console.log('[AI Companion] Agent response preview (first 300 chars):', lastAgentResponse.substring(0, 300) + (lastAgentResponse.length > 300 ? '...' : ''));
        console.log('[AI Companion] Agent response preview (last 100 chars):', lastAgentResponse.length > 100 ? '...' + lastAgentResponse.slice(-100) : lastAgentResponse);
        console.log('[AI Companion] ===============================================');

        // Note: Typing indicator disabled - using unified notification system for A/B test progress
        this.showTypingIndicator();

        try {
            // Initialize streaming container for progressive A/B test results
            const { messageContainer, messageDiv } = this.initializeStreamingMessage();
            let currentContent = '';

            // Step 1: Stream header immediately
            const header = `# 🧪 A/B Test Results Report

## 📝 **Research Question:**
> ${lastUserQuestion}

**Methodology**: Scientific A/B testing comparing control group vs treatment group

---`;

            currentContent += header;
            this.updateStreamingContent(messageDiv, currentContent);
            this.showNotification('progress', '🧪 A/B Test Step 1/3: Getting control group response (general knowledge)...', 0);

            // Step 2: Stream Option A (General Knowledge) with real streaming
            const optionAHeader = `

## 🤖 **Option A: Control Group (General Knowledge)**

`;
            currentContent += optionAHeader;
            this.updateStreamingContent(messageDiv, currentContent);

            // Get control group response with streaming
            const generalKnowledgeResponse = await this.getGeneralKnowledgeResponseStreaming(
                lastUserQuestion,
                messageDiv,
                currentContent
            );

            // Update content with completed Option A
            const processedGeneralResponse = this.formatResponseForDisplay(generalKnowledgeResponse);
            currentContent = currentContent.replace(optionAHeader, `

## 🤖 **Option A: Control Group (General Knowledge)**

${processedGeneralResponse}

---`);

            this.updateStreamingContent(messageDiv, currentContent);
            this.showNotification('progress', '🧪 A/B Test Step 2/3: Referencing treatment group response (agent with context)...', 0);

            // Step 3: Reference Option B (agent response) without duplicating it
            const optionB = `

## 💬 **Option B: Treatment Group (Agent with Conversational Context)**

*📌 **Note**: The agent's response is already displayed in the chat window above. This A/B test compares that contextual response against the general knowledge response shown in Option A.*

**Treatment Group Features:**
- ✅ Full conversation context awareness
- ✅ Domain-specific knowledge integration  
- ✅ Personalized response based on chat history
- ✅ Context-aware follow-up capabilities

---`;

            currentContent += optionB;
            this.updateStreamingContent(messageDiv, currentContent);
            this.showNotification('progress', '🧪 A/B Test Step 3/3: Analyzing control vs treatment groups...', 0);

            // Step 4: Get and stream analysis with real streaming
            const analysisHeader = `

`;
            currentContent += analysisHeader;
            this.updateStreamingContent(messageDiv, currentContent);

            const comparisonAnalysis = await this.getComparisonAnalysisStreaming(
                lastUserQuestion,
                generalKnowledgeResponse,
                lastAgentResponse,
                messageDiv,
                currentContent
            );

            // Update content with completed analysis
            currentContent = currentContent.replace(analysisHeader, `

${comparisonAnalysis}

---

*💡 **How to Read A/B Test Results**: Option A = Control group (general knowledge only) | Option B = Treatment group (agent response shown in chat above) | This scientific comparison evaluates the effectiveness of contextual vs. general knowledge responses.*`);

            this.finalizeMessage(messageDiv, currentContent);

            // Clear A/B test progress notifications
            this.clearAllNotifications();

        } finally {
            this.hideTypingIndicator();
        }
    }

    /**
     * Get general knowledge response from AI without conversation context
     * @param {string} question - User question
     * @returns {string} General knowledge response
     * @private
     */
    async getGeneralKnowledgeResponse(question) {
        const prompt = `Please answer this question using only your general knowledge. Do not reference any conversation context or previous messages. Provide a helpful, accurate response based solely on your training data.

Question: ${question}`;

        // Estimate and track token usage
        this.estimateTokenUsage(prompt, true);

        let response;
        if (this.currentProvider === 'ollama') {
            response = await this.getOllamaResponse(prompt);
        } else {
            response = await this.getAPIEvaluation(prompt);
        }

        return response;
    }

    /**
     * Get comparison analysis between general knowledge and agent response
     * @param {string} question - Original question
     * @param {string} generalResponse - General knowledge response
     * @param {string} agentResponse - Agent's contextualized response
     * @returns {string} Comparison analysis
     * @private
     */
    async getComparisonAnalysis(question, generalResponse, agentResponse) {
        const prompt = `You are an expert conversation analyst conducting a scientific A/B test evaluation. Compare these two responses and provide an objective, context-aware analysis.

**ORIGINAL QUESTION:**
${question}

**OPTION A: General Knowledge Response (Control Group)**
${generalResponse}

**OPTION B: Agent Response with Conversation Context (Treatment Group)**
${agentResponse}

**CRITICAL EVALUATION INSTRUCTIONS:**
Before scoring, first determine the QUESTION TYPE to apply appropriate evaluation criteria:

**QUESTION TYPE ANALYSIS:**
1. **Context-Specific Questions** (company processes, internal documents, specific environment):
   - Questions about specific companies, organizations, or environments
   - Questions referencing "our company", "this system", or specific internal processes
   - Questions requiring domain-specific or proprietary knowledge
   - For these: Agent with context should typically score higher on accuracy and relevance

2. **General Knowledge Questions** (broad topics, common facts):
   - Questions about general concepts, historical facts, or universal principles
   - Questions that can be answered from public knowledge
   - Questions not tied to specific organizations or contexts
   - For these: Both approaches may be equally valid

**EVALUATION CRITERIA:**
Analyze both responses considering the question type:

1. **Accuracy**: 
   - For context-specific questions: Prioritize responses with specific, contextual information
   - For general questions: Prioritize factual correctness from reliable sources

2. **Relevance**: 
   - Consider if the question requires specific context vs general knowledge
   - Score higher for responses that match the question's scope and context

3. **Completeness**: 
   - Evaluate coverage appropriate to the question type
   - Context-specific questions need context-specific completeness

4. **Practical Value**: 
   - For specific environments: Actionable, context-relevant advice scores higher
   - For general topics: Broad applicability may be more valuable

5. **Clarity**: 
   - Clear communication regardless of question type

**REQUIRED OUTPUT FORMAT:**
# 📊 Context-Aware A/B Test Analysis

## 🔍 Question Type Classification
**Question Type**: [Context-Specific / General Knowledge / Mixed]
**Reasoning**: [Brief explanation of why this classification applies]
**Optimal Response Type**: [Which approach should theoretically perform better and why]

## 🥇 Winner: [Option A: General Knowledge / Option B: Agent Context / Tie]

## 📈 Detailed Scoring (1-10 scale)
| Criteria | Option A (General) | Option B (Agent) | Winner | Context Consideration |
|----------|-------------------|------------------|---------|---------------------|
| Accuracy | X/10 | Y/10 | [A/B/Tie] | [How question type affects scoring] |
| Relevance | X/10 | Y/10 | [A/B/Tie] | [Context vs general applicability] |
| Completeness | X/10 | Y/10 | [A/B/Tie] | [Appropriate depth for question type] |
| Practical Value | X/10 | Y/10 | [A/B/Tie] | [Actionability in context] |
| Clarity | X/10 | Y/10 | [A/B/Tie] | [Communication effectiveness] |
| **Overall Score** | **X.X/10** | **Y.Y/10** | **[A/B/Tie]** | **[Final reasoning]** |

## 🎯 Key Findings
- **General Knowledge Strengths**: [Context-aware assessment of Option A]
- **Agent Context Strengths**: [Context-aware assessment of Option B]
- **Context Impact**: [How conversation context affected the quality of responses]

## 🚀 Improvement Recommendations
1. **For Context-Specific Questions**: [Targeted recommendations based on question type]
2. **For General Knowledge Questions**: [Broad applicability recommendations]
3. **Optimal Strategy**: [When to use each approach based on question characteristics]

## 💡 Takeaway
[Context-aware summary explaining which approach works better for THIS SPECIFIC TYPE of question, considering whether it requires general knowledge or specific contextual information]

**Important**: Be objective and context-aware. Don't default to favoring either approach - evaluate based on what the question actually requires.`;

        // Estimate and track token usage
        this.estimateTokenUsage(prompt, true);

        let analysis;
        if (this.currentProvider === 'ollama') {
            analysis = await this.getOllamaResponse(prompt);
        } else {
            analysis = await this.getAPIEvaluation(prompt);
        }

        return analysis;
    }

    /**
     * Format response content for proper display in A/B test results
     * Ensures markdown formatting is preserved and displayed correctly
     * @param {string} response - Raw response content
     * @returns {string} Formatted response ready for markdown rendering
     * @private
     */
    formatResponseForDisplay(response) {
        if (!response) return '*No response available*';

        // Clean up the response while preserving markdown structure
        let formatted = response
            .trim()
            // Normalize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove excessive whitespace but preserve paragraph breaks
            .replace(/\n{3,}/g, '\n\n')
            // Ensure proper spacing around headers
            .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
            .replace(/(#{1,6}[^\n]+)\n([^\n#])/g, '$1\n\n$2')
            // Ensure proper spacing around lists
            .replace(/([^\n])\n(\s*[-*+]\s)/g, '$1\n\n$2')
            .replace(/([^\n])\n(\s*\d+\.\s)/g, '$1\n\n$2')
            // Ensure proper spacing around code blocks
            .replace(/([^\n])\n(```)/g, '$1\n\n$2')
            .replace(/(```[^\n]*)\n([^\n`])/g, '$1\n\n$2');

        // If the content doesn't start with markdown formatting, ensure it's treated as regular text
        if (!formatted.match(/^(#{1,6}\s|>\s|\*\s|-\s|\+\s|\d+\.\s|```|\|)/)) {
            // For plain text responses, ensure proper paragraph formatting
            formatted = formatted.replace(/\n\n+/g, '\n\n');
        }

        return formatted;
    }

    /**
     * Get response from Ollama without streaming for benchmark analysis
     * @param {string} prompt - Prompt to send
     * @returns {string} Response content
     * @private
     */
    async getOllamaResponse(prompt) {
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        if (!selectedModel) {
            throw new Error('No Ollama model selected');
        }

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                stream: false, // Get complete response
                options: {
                    temperature: 0.3, // Lower temperature for more consistent analysis
                    top_p: 0.9
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    }

    /**
     * Handle Ollama streaming
     * @param {string} message - Message to send
     * @private
     */
    async handleOllamaStreaming(message) {
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        const modelStateKey = `ollama_${selectedModel}_firstUse`;
        const isFirstUse = !localStorage.getItem(modelStateKey);
        let retryCount = 0;
        const maxRetries = isFirstUse ? 2 : 1; // Allow more retries for first use

        while (retryCount <= maxRetries) {
            try {
                const response = await this.sendToOllama(message);
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                let fullResponse = '';
                let messageContainer = null;
                let messageDiv = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.response) {
                                fullResponse += data.response;

                                if (!messageContainer) {
                                    // Mark content streaming started - disables timeout notifications
                                    this.markContentStreamingStarted();

                                    // Show processing notification when first response chunk arrives
                                    this.showNotification('progress', `Processing response from ${localStorage.getItem('ollamaSelectedModel')}...`, 0);

                                    // Use unified streaming message initialization
                                    const streaming = this.initializeStreamingMessage();
                                    messageContainer = streaming.messageContainer;
                                    messageDiv = streaming.messageDiv;
                                }

                                // Use unified streaming content update with markdown support
                                this.updateStreamingContent(messageDiv, fullResponse);
                                this.scrollToBottom();
                            }

                            if (data.done) {
                                // Use unified message finalization with markdown processing
                                if (messageDiv) {
                                    this.finalizeMessage(messageDiv, fullResponse);
                                }

                                // Clear response time notifications on successful completion
                                this.clearResponseTimeNotifications();
                                this.clearAllNotifications(); // Clear all notifications on success

                                // Success - break out of retry loop
                                return;
                            }
                        } catch (e) {
                            console.warn('Error parsing JSON line:', line, e);
                        }
                    }
                }

                // If we get here, the stream completed successfully
                // Clear response time notifications on successful completion
                this.clearResponseTimeNotifications();
                this.clearAllNotifications(); // Clear all notifications on success
                return;

            } catch (error) {
                console.error(`Ollama streaming error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);

                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = isFirstUse ? 3000 : 1000; // Longer delay for first use retries
                    console.log(`[AI Companion] Retrying in ${delay}ms... (${retryCount}/${maxRetries})`);

                    // Update user with retry message
                    if (error.message.includes('timeout')) {
                        this.hideTypingIndicator();
                        this.showNotification('timeout', `Model loading timeout. Retrying... (${retryCount}/${maxRetries})`, 8000);
                        this.showTypingIndicator();
                    }

                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                } else {
                    // All retries exhausted
                    this.hideTypingIndicator();

                    // Provide helpful error message for first use
                    if (isFirstUse && error.message.includes('timeout')) {
                        throw new Error(`Model ${selectedModel} failed to load after ${maxRetries + 1} attempts. This can happen with large models on first use. Please try again or select a smaller model.`);
                    }

                    throw error;
                }
            }
        }
    }

    /**
     * Handle API streaming (OpenAI, Anthropic, Azure)
     * @param {string} message - Message to send
     * @param {string} provider - API provider
     * @private
     */
    async handleAPIStreaming(message, provider = this.currentProvider) {
        try {
            const apiKey = await SecureStorage.retrieve(`${provider}ApiKey`);
            if (!apiKey) {
                throw new Error(`${provider} API key not found. Please configure it in settings.`);
            }

            if (provider === 'azure') {
                await this.sendToAzureOpenAI(message, apiKey);
            } else if (provider === 'openai') {
                await this.sendToOpenAI(message, apiKey);
            } else if (provider === 'anthropic') {
                await this.sendToAnthropic(message, apiKey);
            } else {
                throw new Error(`${provider} API integration is not implemented yet.`);
            }
        } catch (error) {
            console.error(`${provider} API error:`, error);
            this.hideTypingIndicator();
            this.renderMessage('error', `${provider} API error: ${error.message}`);
        }
    }

    /**
     * Send message to Azure OpenAI
     * @param {string} message - Message to send
     * @param {string} apiKey - Azure API key
     * @private
     */
    async sendToAzureOpenAI(message, apiKey) {
        const endpoint = localStorage.getItem('azureEndpoint');
        const deployment = localStorage.getItem('azureDeployment');
        const apiVersion = localStorage.getItem('azureApiVersion') || '2024-02-01';

        if (!endpoint || !deployment) {
            throw new Error('Azure OpenAI configuration incomplete. Please set endpoint and deployment in settings.');
        }

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

        console.log('Sending to Azure OpenAI:', { endpoint, deployment, apiVersion });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Azure OpenAI request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        await this.processStreamingResponse(response);
    }

    /**
     * Send message to OpenAI
     * @param {string} message - Message to send
     * @param {string} apiKey - OpenAI API key
     * @private
     */
    async sendToOpenAI(message, apiKey) {
        const url = 'https://api.openai.com/v1/chat/completions';

        console.log('Sending to OpenAI API');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        await this.processStreamingResponse(response);
    }

    /**
     * Send message to Anthropic
     * @param {string} message - Message to send
     * @param {string} apiKey - Anthropic API key
     * @private
     */
    async sendToAnthropic(message, apiKey) {
        const url = 'https://api.anthropic.com/v1/messages';

        console.log('Sending to Anthropic API');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 2000,
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Anthropic request failed: ${response.status} ${errorData.error?.message || errorData.message || response.statusText}`);
        }

        await this.processAnthropicStreamingResponse(response);
    }

    /**
     * Process streaming response from OpenAI/Azure OpenAI APIs
     * @param {Response} response - Fetch response
     * @private
     */
    async processStreamingResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let messageContainer = null;
        let messageDiv = null;
        let fullResponse = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            // Finalize message with markdown processing
                            if (messageDiv && fullResponse) {
                                this.finalizeMessage(messageDiv, fullResponse);
                            }
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;

                            if (content) {
                                fullResponse += content;

                                if (!messageContainer) {
                                    // Mark content streaming started - disables timeout notifications
                                    this.markContentStreamingStarted();

                                    // Use unified streaming message initialization
                                    const streaming = this.initializeStreamingMessage();
                                    messageContainer = streaming.messageContainer;
                                    messageDiv = streaming.messageDiv;
                                }

                                // Use unified streaming content update with markdown support
                                this.updateStreamingContent(messageDiv, fullResponse);
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            console.warn('Error parsing chunk:', e);
                        }
                    }
                }
            }

            // Finalize message if stream ended without [DONE]
            if (messageDiv && fullResponse) {
                this.finalizeMessage(messageDiv, fullResponse);
            }
        } catch (error) {
            console.error('Streaming error:', error);
            this.hideTypingIndicator();
            throw error;
        }
    }

    /**
     * Process streaming response from Anthropic API
     * @param {Response} response - Fetch response
     * @private
     */
    async processAnthropicStreamingResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let messageContainer = null;
        let messageDiv = null;
        let fullResponse = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.type === 'content_block_delta') {
                                const content = parsed.delta?.text;

                                if (content) {
                                    fullResponse += content;

                                    if (!messageContainer) {
                                        // Mark content streaming started - disables timeout notifications
                                        this.markContentStreamingStarted();

                                        // Use unified streaming message initialization
                                        const streaming = this.initializeStreamingMessage();
                                        messageContainer = streaming.messageContainer;
                                        messageDiv = streaming.messageDiv;
                                    }

                                    // Use unified streaming content update with markdown support
                                    this.updateStreamingContent(messageDiv, fullResponse);
                                    this.scrollToBottom();
                                }
                            } else if (parsed.type === 'message_stop') {
                                // Finalize message with markdown processing
                                if (messageDiv && fullResponse) {
                                    this.finalizeMessage(messageDiv, fullResponse);
                                }
                                return;
                            }
                        } catch (e) {
                            console.warn('Error parsing chunk:', e);
                        }
                    }
                }
            }

            // Finalize message if stream ended without message_stop
            if (messageDiv && fullResponse) {
                this.finalizeMessage(messageDiv, fullResponse);
            }
        } catch (error) {
            console.error('Anthropic streaming error:', error);
            this.hideTypingIndicator();
            throw error;
        }
    }

    /**
     * Send message to Ollama
     * @param {string} message - Message to send
     * @returns {Promise<Response>} Fetch response
     * @private
     */
    async sendToOllama(message) {
        const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        const selectedModel = localStorage.getItem('ollamaSelectedModel');

        if (!selectedModel) {
            throw new Error('No Ollama model selected. Please select a model in settings.');
        }

        // Check if this is the first invocation for this model
        const modelStateKey = `ollama_${selectedModel}_firstUse`;
        const isFirstUse = !localStorage.getItem(modelStateKey);

        console.log('Sending to Ollama:', {
            url: ollamaUrl,
            model: selectedModel,
            isFirstUse: isFirstUse,
            messageType: 'AI Companion Chat'
        });

        // Start response time tracking for user notifications (no hard timeout)
        const startTime = Date.now();
        this.setupResponseTimeNotifications(startTime, selectedModel, isFirstUse);

        // Show initial progress notification
        this.showNotification('progress', `Sending request to ${selectedModel}...`, 5000);

        try {
            const response = await fetch(`${ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: message,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
            }

            // Mark model as successfully used on first successful response
            if (isFirstUse) {
                localStorage.setItem(modelStateKey, 'true');
                console.log(`[AI Companion] Model ${selectedModel} successfully initialized`);
            }

            return response;

        } catch (error) {
            // Clear any pending notifications
            this.clearResponseTimeNotifications();
            throw error;
        }
    }

    /**
     * Setup progressive user notifications for long response times
     * Only shows timeout notifications while waiting for LLM response
     * @param {number} startTime - Request start time
     * @param {string} modelName - Model name for notifications
     * @param {boolean} isFirstUse - Whether this is first use
     * @private
     */
    setupResponseTimeNotifications(startTime, modelName, isFirstUse) {
        // Clear any existing notifications
        this.clearResponseTimeNotifications();

        this.responseTimeNotifications = {
            startTime,
            modelName,
            isFirstUse,
            notificationTimeouts: [],
            isWaitingForResponse: true,  // Track if we're still waiting for LLM response
            hasReceivedContent: false    // Track if we've started receiving content
        };

        // Progressive notifications at different time intervals
        const notifications = [
            { delay: 15000, message: `${modelName} is processing... Deep thinking models may take longer.` },
            { delay: 30000, message: `Still working... Consider using a faster model like 'llama3.2' for quicker responses.` },
            { delay: 60000, message: `This is taking longer than usual. You may want to try a smaller, faster model.` },
            { delay: 120000, message: `Extended processing time detected. Consider switching to a lighter model for better performance.` }
        ];

        notifications.forEach(notification => {
            const timeoutId = setTimeout(() => {
                // Only show timeout notification if we're still waiting for response
                if (this.responseTimeNotifications && this.responseTimeNotifications.isWaitingForResponse) {
                    this.showResponseTimeNotification(notification.message, startTime);
                }
            }, notification.delay);

            this.responseTimeNotifications.notificationTimeouts.push(timeoutId);
        });
    }

    /**
     * Show a user-friendly response time notification
     * Only shows if still waiting for LLM response
     * @param {string} message - Notification message
     * @param {number} startTime - Original start time
     * @private
     */
    showResponseTimeNotification(message, startTime) {
        // Double-check we're still waiting for response
        if (!this.responseTimeNotifications || !this.responseTimeNotifications.isWaitingForResponse) {
            return; // Don't show timeout notification if we're already processing response
        }

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const fullMessage = `${message} (${elapsed}s elapsed)`;

        // Show in notification area instead of chat
        this.showNotification('timeout', fullMessage, 10000); // Auto-hide after 10 seconds

        console.log(`[AI Companion] Response time notification: ${fullMessage}`);
    }

    /**
     * Clear all pending response time notifications
     * @private
     */
    clearResponseTimeNotifications() {
        if (this.responseTimeNotifications) {
            this.responseTimeNotifications.notificationTimeouts.forEach(clearTimeout);
            this.responseTimeNotifications = null;
        }
    }

    /**
     * Mark that LLM content has started streaming - disables timeout notifications
     * @private
     */
    markContentStreamingStarted() {
        if (this.responseTimeNotifications) {
            this.responseTimeNotifications.isWaitingForResponse = false;
            this.responseTimeNotifications.hasReceivedContent = true;

            // Clear any existing timeout notifications since we're now processing
            this.clearTimeoutNotifications();

            console.log('[AI Companion] Content streaming started - timeout notifications disabled');
        }
    }

    /**
     * Clear only timeout-type notifications from the notification area
     * @private
     */
    clearTimeoutNotifications() {
        if (this.elements.aiNotificationsArea) {
            const timeoutNotifications = this.elements.aiNotificationsArea.querySelectorAll('.ai-notification.timeout');
            timeoutNotifications.forEach(notification => {
                const notificationId = notification.id;
                this.removeNotification(notificationId);
            });
        }
    }

    /**
     * Show notification in the dedicated AI companion notification area
     * @param {string} type - Notification type ('progress', 'timeout', 'system', 'error')
     * @param {string} message - Notification message
     * @param {number} duration - Auto-hide duration in ms (0 = manual close only)
     * @returns {string} Notification ID for removal
     */
    showNotification(type, message, duration = 0) {
        // Use unified notification system if available
        if (window.unifiedNotificationManager) {
            // Map AI companion notification types to unified system types
            const typeMapping = {
                'progress': 'loading',
                'timeout': 'warning',
                'system': 'info',
                'error': 'error',
                'success': 'success',
                'warning': 'warning',
                'info': 'info'
            };

            const unifiedType = typeMapping[type] || 'info';
            const notificationId = `ai-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const options = {
                id: notificationId,
                message: message,
                type: unifiedType,
                zone: 'ai-companion' // Use dedicated AI companion zone
            };

            // Set auto-hide or persistent based on duration
            if (duration > 0) {
                options.autoHide = duration;
            } else if (type === 'progress') {
                options.persistent = true; // Progress notifications persist until updated
            } else {
                options.autoHide = 5000; // Default auto-hide for other types
            }

            window.unifiedNotificationManager.show(options);
            console.log(`[AICompanion] Notification shown via unified system: ${type} - ${message}`);
            return notificationId;
        }

        // Fallback to legacy notification system if unified system not available
        console.warn('[AICompanion] Unified notification system not available, using fallback');

        if (!this.elements.aiNotificationsArea) {
            console.warn('[AICompanion] AI notifications area not found, notification not shown');
            return null;
        }

        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification = DOMUtils.createElement('div', {
            className: `ai-notification ${type}`,
            id: notificationId
        });

        // Create notification icon
        const icon = DOMUtils.createElement('div', {
            className: 'ai-notification-icon'
        });

        // Set icon content based on type
        const iconContent = {
            progress: '⟳',
            timeout: '⏱',
            system: 'ℹ',
            error: '⚠'
        };
        icon.textContent = iconContent[type] || 'ℹ';

        // Create notification content
        const content = DOMUtils.createElement('div', {
            className: 'ai-notification-content'
        });
        content.textContent = message;

        // Create timestamp
        const time = DOMUtils.createElement('div', {
            className: 'ai-notification-time'
        });
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Create close button
        const closeBtn = DOMUtils.createElement('button', {
            className: 'ai-notification-close'
        });
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notificationId);
        });

        // Assemble notification
        notification.appendChild(icon);
        notification.appendChild(content);
        notification.appendChild(time);
        notification.appendChild(closeBtn);

        // Add to notification area
        this.elements.aiNotificationsArea.appendChild(notification);
        this.elements.aiNotificationsArea.classList.add('has-notifications');

        // Auto-hide if duration is specified
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, duration);
        }

        return notificationId;
    }

    /**
     * Remove notification by ID
     * @param {string} notificationId - Notification ID to remove
     */
    removeNotification(notificationId) {
        // Try to remove from unified notification system first
        if (window.unifiedNotificationManager && notificationId.startsWith('ai-notification-')) {
            window.unifiedNotificationManager.hide(notificationId);
            console.log(`[AICompanion] Notification removed via unified system: ${notificationId}`);
            return;
        }

        // Fallback to legacy notification removal
        const notification = DOMUtils.getElementById(notificationId);
        if (notification) {
            notification.style.animation = 'slideOutNotification 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }

                // Hide notification area if no notifications remain
                if (this.elements.aiNotificationsArea && this.elements.aiNotificationsArea.children.length === 0) {
                    this.elements.aiNotificationsArea.classList.remove('has-notifications');
                }
            }, 300);
        }
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        // Clear from unified notification system if available
        if (window.unifiedNotificationManager) {
            window.unifiedNotificationManager.clearZone('ai-companion');
            console.log('[AICompanion] All notifications cleared via unified system');
        }

        // Also clear legacy notifications if notification area exists
        if (this.elements.aiNotificationsArea) {
            this.elements.aiNotificationsArea.innerHTML = '';
            this.elements.aiNotificationsArea.classList.remove('has-notifications');
            console.log('[AICompanion] Legacy notifications cleared');
        }
    }

    /**
     * Show response time notification in notification area instead of chat
     * @param {string} message - Notification message
     * @param {number} startTime - Original start time
     * @private
     */
    showResponseTimeNotification(message, startTime) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const fullMessage = `${message} (${elapsed}s elapsed)`;

        // Show in notification area instead of chat
        this.showNotification('timeout', fullMessage, 10000); // Auto-hide after 10 seconds

        console.log(`[AI Companion] Response time notification: ${fullMessage}`);
    }

    /**
     * Render message in AI companion chat
     * @param {string} sender - Message sender (user, assistant, error)
     * @param {string} message - Message content
     */
    renderMessage(sender, message) {
        // Check if unified message system is available
        const app = window.MCSChatApp;
        const unifiedMessageAPI = app && app.getUnifiedMessageAPI ? app.getUnifiedMessageAPI() : null;

        if (unifiedMessageAPI) {
            // Use unified message system
            let messageType;
            switch (sender) {
                case 'user':
                    messageType = 'user';
                    break;
                case 'assistant':
                    messageType = 'ai-companion';
                    break;
                case 'thinking':
                    messageType = 'ai-companion';
                    break;
                case 'error':
                    messageType = 'error';
                    break;
                default:
                    messageType = 'ai-companion';
            }

            const metadata = {
                timestamp: new Date(),
                model: this.currentProvider || 'ai-companion',
                container: 'ai-companion'
            };

            return unifiedMessageAPI.addMessage(messageType, message, metadata);
        }

        // Fallback to legacy system if unified system not available
        this.renderMessageLegacy(sender, message);
    }

    /**
     * Legacy message rendering (fallback)
     * @param {string} sender - Message sender
     * @param {string} message - Message content
     */
    renderMessageLegacy(sender, message) {
        // Output to main chat window instead of AI companion panel
        if (!this.elements.chatWindow) return;

        const messageContainer = this.createMessageContainer(sender);

        // Create content wrapper that will contain both message and metadata
        const contentWrapper = DOMUtils.createElement('div', {
            className: 'message-content-wrapper'
        });

        const messageDiv = DOMUtils.createElement('div', {
            className: 'messageContent'
        });

        // Use unified message creation with proper markdown processing
        this.createMessageElement(messageDiv, message, sender === 'error');

        contentWrapper.appendChild(messageDiv);

        // Add metadata for AI companion messages inside the content wrapper
        const metadata = this.createMessageMetadata(sender);
        if (metadata) {
            contentWrapper.appendChild(metadata);
        }

        messageContainer.appendChild(contentWrapper);
        this.elements.chatWindow.appendChild(messageContainer);

        // Scroll main chat window to bottom
        DOMUtils.scrollToBottom(this.elements.chatWindow);
    }

    /**
     * Create metadata element for AI companion messages
     * @param {string} sender - Message sender
     * @returns {HTMLElement|null} Metadata element or null if not needed
     * @private
     */
    createMessageMetadata(sender) {
        const isUser = sender === 'user';
        const isThinking = sender === 'thinking';

        // Create metadata element
        const metadata = DOMUtils.createElement('div', {
            className: 'message-metadata'
        });

        // Add timestamp
        const messageTime = new Date();
        const timeSpan = DOMUtils.createElement('span', {
            className: 'metadata-time'
        }, messageTime.toLocaleTimeString());

        metadata.appendChild(timeSpan);

        // Add source information for non-user messages
        if (!isUser) {
            const sourceSpan = DOMUtils.createElement('span', {
                className: 'metadata-source'
            }, isThinking ? 'AI Companion (Thinking)' : 'AI Companion');

            metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' • '));
            metadata.appendChild(sourceSpan);
        }

        return metadata;
    }

    /**
     * Create message container for AI companion
     * @param {string} sender - Message sender
     * @returns {HTMLElement} Message container
     * @private
     */
    createMessageContainer(sender) {
        const isUser = sender === 'user';
        const isThinking = sender === 'thinking';
        const isBot = !isUser && !isThinking;

        // Add companion-response class for bot messages to maintain AI companion styling
        let className = `messageContainer llmMessage ${sender}Message ${isThinking ? 'thinking-container' : ''}`;
        if (isBot) {
            className += ' companion-response botMessage';
        } else if (isUser) {
            className += ' userMessage';
        }

        const container = DOMUtils.createElement('div', {
            className: className,
            dataset: {
                sender,
                timestamp: new Date().toISOString()
            }
        });

        // Add icon for both user and bot messages to follow standard message style
        if (isUser || isBot) {
            const icon = DOMUtils.createElement('div', {
                className: 'messageIcon'
            });

            if (isUser) {
                // Set user icon background image to match agent chat
                icon.style.backgroundImage = 'url("images/carter_30k.png")';
                icon.style.backgroundSize = 'cover';
            } else if (isBot) {
                // Set AI companion icon for bot messages
                const aiCompanionIcon = window.Icon.create('aiCompanion', { color: '#333', size: '28px' });
                icon.appendChild(aiCompanionIcon);
            }

            container.appendChild(icon);
        }

        return container;
    }

    /**
     * Process and render markdown content safely
     * @param {string} content - Raw content to process
     * @param {boolean} isError - Whether this is an error message
     * @returns {string} Processed HTML content or text
     * @private
     */
    processMarkdownContent(content, isError = false) {
        if (isError || typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
            return { html: false, content: content };
        }

        try {
            const htmlContent = marked.parse(content);
            const sanitizedContent = DOMPurify.sanitize(htmlContent);
            return { html: true, content: sanitizedContent };
        } catch (error) {
            console.warn('Error processing markdown:', error);
            return { html: false, content: content };
        }
    }

    /**
     * Create and initialize a message element with proper content handling
     * @param {HTMLElement} parentDiv - Parent message div
     * @param {string} content - Message content
     * @param {boolean} isError - Whether this is an error message
     * @returns {HTMLElement} Message text element
     * @private
     */
    createMessageElement(parentDiv, content = '', isError = false) {
        // For the new structure, create content directly in the messageContent div
        if (content) {
            const processed = this.processMarkdownContent(content, isError);
            if (processed.html) {
                parentDiv.innerHTML = processed.content;
            } else {
                parentDiv.textContent = processed.content;
            }
        }

        return parentDiv;
    }

    /**
     * Initialize streaming message container (clears any thinking messages)
     * @returns {Object} Object containing messageContainer and messageDiv
     * @private
     */
    initializeStreamingMessage() {
        this.hideTypingIndicator();

        // Clear any existing thinking messages from main chat before starting real response
        this.clearThinkingMessages();

        const messageContainer = this.createMessageContainer('assistant');
        const messageDiv = DOMUtils.createElement('div', { className: 'messageContent' });

        messageContainer.appendChild(messageDiv);
        // Output to main chat window instead of AI companion panel
        this.elements.chatWindow.appendChild(messageContainer);

        return { messageContainer, messageDiv };
    }

    /**
     * Update streaming content with typing cursor
     * @param {HTMLElement} messageDiv - Message div
     * @param {string} content - Current content
     * @private
     */
    updateStreamingContent(messageDiv, content) {
        // With the new structure, messageDiv is already the messageContent
        // Process markdown and add typing cursor for streaming effect
        const processed = this.processMarkdownContent(content);

        if (processed.html) {
            // For HTML content, append typing cursor as HTML
            messageDiv.innerHTML = processed.content + '<span class="typing-cursor">|</span>';
        } else {
            // For plain text, append typing cursor as text
            messageDiv.innerHTML = processed.content + '<span class="typing-cursor">|</span>';
        }
    }

    /**
     * Finalize streaming message
     * @param {HTMLElement} messageDiv - Message div
     * @param {string} content - Final content
     * @private
     */
    finalizeMessage(messageDiv, content) {
        let textElement = messageDiv.querySelector('.messageText');
        if (!textElement) {
            textElement = this.createMessageElement(messageDiv);
        }

        // Process final markdown content without typing cursor
        const processed = this.processMarkdownContent(content);

        if (processed.html) {
            textElement.innerHTML = processed.content;
        } else {
            textElement.textContent = processed.content;
        }

        // Check for citations in the content and add them
        this.addCitationsIfPresent(messageDiv, content);

        // Estimate token usage for this response (rough approximation)
        this.estimateTokenUsage(content);

        // Re-enable quick action buttons when message is complete
        if (this.isQuickActionInProgress) {
            this.enableAllQuickActionButtons();
            this.isQuickActionInProgress = false;
            console.log('[AI Companion] Quick action completed, buttons re-enabled');
        }
    }

    /**
     * Check for and add citations if present in content
     * @param {HTMLElement} messageDiv - Message div element
     * @param {string} content - Message content
     * @private
     */
    addCitationsIfPresent(messageDiv, content) {
        try {
            // Look for JSON arrays in the content that might contain citation data
            const jsonMatch = content.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const firstItem = parsed[0];
                    if (firstItem.SourceDocument || firstItem.ReferencePath || firstItem.PageNum) {
                        this.renderCitations(messageDiv, parsed);
                    }
                }
            }
        } catch (e) {
            // Not valid JSON citation data, skip
        }
    }

    /**
     * Render citations in AI companion (reuse logic from MessageRenderer)
     * @param {HTMLElement} messageDiv - Message div element
     * @param {Array} citations - Array of citation objects
     * @private
     */
    renderCitations(messageDiv, citations) {
        const citationsContainer = DOMUtils.createElement('div', {
            className: 'citations-container'
        });

        const citationsHeader = DOMUtils.createElement('div', {
            className: 'citations-header'
        });

        const headerIcon = DOMUtils.createElement('span', {
            className: 'citations-icon'
        }, '📚');

        const headerText = DOMUtils.createElement('span', {
            className: 'citations-title'
        }, `References (${citations.length})`);

        const toggleButton = DOMUtils.createElement('button', {
            className: 'citations-toggle',
            type: 'button'
        }, '▼');

        citationsHeader.appendChild(headerIcon);
        citationsHeader.appendChild(headerText);
        citationsHeader.appendChild(toggleButton);

        const citationsList = DOMUtils.createElement('div', {
            className: 'citations-list'
        });

        // Group citations by source document
        const groupedCitations = this.groupCitationsBySource(citations);

        Object.entries(groupedCitations).forEach(([source, items], index) => {
            const citationItem = this.createCitationItem(source, items, index + 1);
            citationsList.appendChild(citationItem);
        });

        citationsContainer.appendChild(citationsHeader);
        citationsContainer.appendChild(citationsList);

        // Add toggle functionality
        DOMUtils.addEventListener(toggleButton, 'click', () => {
            const isExpanded = citationsList.style.display !== 'none';
            citationsList.style.display = isExpanded ? 'none' : 'block';
            toggleButton.textContent = isExpanded ? '▶' : '▼';
            toggleButton.setAttribute('aria-expanded', !isExpanded);
        });

        // Add to message
        messageDiv.appendChild(citationsContainer);
    }

    /**
     * Group citations by source document
     * @param {Array} citations - Array of citation objects
     * @returns {Object} Grouped citations
     * @private
     */
    groupCitationsBySource(citations) {
        const grouped = {};

        citations.forEach(citation => {
            const source = citation.SourceDocument || 'Unknown Source';
            if (!grouped[source]) {
                grouped[source] = [];
            }
            grouped[source].push(citation);
        });

        return grouped;
    }

    /**
     * Create citation item element
     * @param {string} source - Source document name
     * @param {Array} items - Citation items for this source
     * @param {number} index - Citation index number
     * @returns {HTMLElement} Citation item element
     * @private
     */
    createCitationItem(source, items, index) {
        const citationItem = DOMUtils.createElement('div', {
            className: 'citation-item'
        });

        const citationHeader = DOMUtils.createElement('div', {
            className: 'citation-header'
        });

        const citationNumber = DOMUtils.createElement('span', {
            className: 'citation-number'
        }, `[${index}]`);

        const citationSource = DOMUtils.createElement('span', {
            className: 'citation-source'
        }, source);

        citationHeader.appendChild(citationNumber);
        citationHeader.appendChild(citationSource);

        const citationDetails = DOMUtils.createElement('div', {
            className: 'citation-details'
        });

        // Add details for each item from this source
        items.forEach(item => {
            const detailItem = DOMUtils.createElement('div', {
                className: 'citation-detail-item'
            });

            if (item.PageNum) {
                const pageInfo = DOMUtils.createElement('span', {
                    className: 'citation-page'
                }, `Page ${item.PageNum}`);
                detailItem.appendChild(pageInfo);
            }

            if (item.content) {
                const content = DOMUtils.createElement('div', {
                    className: 'citation-content'
                }, this.truncateText(item.content, 200));
                detailItem.appendChild(content);
            }

            if (item.ReferencePath) {
                const linkButton = DOMUtils.createElement('button', {
                    className: 'citation-link',
                    type: 'button'
                }, '🔗 View Source');

                DOMUtils.addEventListener(linkButton, 'click', () => {
                    window.open(item.ReferencePath, '_blank', 'noopener,noreferrer');
                });

                detailItem.appendChild(linkButton);
            }

            citationDetails.appendChild(detailItem);
        });

        citationItem.appendChild(citationHeader);
        citationItem.appendChild(citationDetails);

        return citationItem;
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     * @private
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Show typing indicator (disabled - using unified notification system)
     */
    showTypingIndicator() {
        // Typing indicator disabled - now using unified notification system
        console.log('[AI Companion] Typing indicator disabled - using unified notification system');
    }

    /**
     * Hide typing indicator (disabled - using unified notification system)
     */
    hideTypingIndicator() {
        // Typing indicator disabled - now using unified notification system
        console.log('[AI Companion] Typing indicator disabled - using unified notification system');

        // Re-enable quick action buttons when typing ends (for error cases)
        if (this.isQuickActionInProgress) {
            this.enableAllQuickActionButtons();
            this.isQuickActionInProgress = false;
            console.log('[AI Companion] Quick action completed, buttons re-enabled');
        }
    }

    /**
     * Update context indicator
     */
    updateContextIndicator() {
        if (!this.elements.contextIndicator || this.elements.llmPanel.style.display === 'none') return;

        // Count messages in current conversation
        const chatWindow = DOMUtils.getElementById('chatWindow');
        const messageContainers = chatWindow?.querySelectorAll('.messageContainer') || [];
        const messageCount = messageContainers.length;

        if (messageCount === 0) {
            this.elements.contextIndicator.textContent = 'No conversation to analyze yet';
        } else {
            this.elements.contextIndicator.textContent = `Auto-including ${messageCount} messages from current conversation`;
        }
    }

    /**
     * Get conversation context for AI analysis
     * @param {number} maxMessages - Maximum messages to include
     * @returns {string} Conversation context
     */
    getConversationContext(maxMessages = 50) {
        console.log(`[AI Companion] Requesting conversation context with maxMessages: ${maxMessages}`);

        // Try to get context from session manager first
        const eventDetail = { maxMessages };
        const event = new CustomEvent('getConversationContext', {
            detail: eventDetail
        });
        window.dispatchEvent(event);

        // Check if session manager provided context
        if (eventDetail.context) {
            console.log(`[AI Companion] Got context from session manager:`, eventDetail.context.substring(0, 200) + '...');
            const messageCount = (eventDetail.context.match(/\n(User|Agent):/g) || []).length;
            console.log(`[AI Companion] Session manager provided ${messageCount} messages`);

            if (messageCount > 0) {
                return eventDetail.context;
            }
        }

        console.log(`[AI Companion] Session manager context insufficient, falling back to internal context and DOM extraction`);

        // Try internal conversation context first
        if (this.conversationContext && this.conversationContext.length > 0) {
            console.log(`[AI Companion] Using internal conversation context: ${this.conversationContext.length} messages`);
            let context = 'Recent conversation:\n';

            const recentMessages = this.conversationContext.slice(-maxMessages);
            recentMessages.forEach((message, index) => {
                const role = message.role === 'user' ? 'User' : 'Agent';
                context += `${role}: ${message.content}\n`;
            });

            console.log(`[AI Companion] Internal context generated: ${recentMessages.length} messages`);
            return context;
        }

        // Enhanced fallback: extract from DOM with better selectors
        const chatWindow = DOMUtils.getElementById('chatWindow');
        if (!chatWindow) {
            console.warn(`[AI Companion] No chatWindow found for DOM extraction`);
            return 'No conversation available.';
        }

        // Try multiple selectors to catch all message types
        const messageContainers = chatWindow.querySelectorAll('.messageContainer, .message, [data-message-id]');
        console.log(`[AI Companion] Found ${messageContainers.length} message containers in DOM`);

        const recentMessages = Array.from(messageContainers).slice(-maxMessages);

        let context = 'Recent conversation:\n';
        let messageCount = 0;

        recentMessages.forEach((container, index) => {
            const isUser = container.classList.contains('userMessage') ||
                container.querySelector('.userMessage') ||
                container.dataset.sender === 'user';

            // Try multiple selectors for message content
            let messageContent = container.querySelector('.messageContent') ||
                container.querySelector('.messageText') ||
                container.querySelector('.messageDiv') ||
                container.querySelector('[data-content]');

            // If no specific content element, try the container itself
            if (!messageContent) {
                messageContent = container;
            }

            let text = '[Unable to extract message]';
            if (messageContent) {
                // Try to get text content, excluding citations and metadata
                const clonedContent = messageContent.cloneNode(true);

                // Remove citations, metadata, and other non-essential elements
                const elementsToRemove = clonedContent.querySelectorAll(
                    '.citations-container, .simplified-citations, .message-metadata, .citation-tooltip, ' +
                    '.messageIcon, .timestamp, .typing-cursor, .streaming-progress'
                );
                elementsToRemove.forEach(el => el.remove());

                text = clonedContent.textContent?.trim() || '[Empty message]';

                // Limit message length for context
                if (text.length > 500) {
                    text = text.substring(0, 500) + '...';
                }
            }

            if (text && text !== '[Empty message]' && text !== '[Unable to extract message]') {
                const sender = isUser ? 'User' : 'Agent';
                context += `${sender}: ${text}\n`;
                messageCount++;
                console.log(`[AI Companion] Extracted message ${index + 1}: ${sender} - ${text.substring(0, 50)}...`);
            }
        });

        console.log(`[AI Companion] DOM extraction completed: ${messageCount} messages extracted`);
        return context || 'No conversation available.';
    }

    /**
     * Get adaptive conversation context based on total conversation length
     * @param {string} purpose - Purpose of the context ('analysis', 'summary', 'title', 'general')
     * @returns {string} Conversation context
     */
    getAdaptiveConversationContext(purpose = 'general') {
        console.log(`[AI Companion] Getting adaptive context for purpose: ${purpose}`);

        // Get total message count first by requesting a large number
        const eventDetail = { maxMessages: 1000 }; // Get a large number to count all messages
        const event = new CustomEvent('getConversationContext', {
            detail: eventDetail
        });
        window.dispatchEvent(event);

        const totalContext = eventDetail.context || '';
        const totalMessages = (totalContext.match(/\n(User|Agent):/g) || []).length;

        console.log(`[AI Companion] Total messages available: ${totalMessages}`);

        // Adaptive limits based on purpose and conversation length
        let maxMessages;
        switch (purpose) {
            case 'analysis':
                // For KPI analysis, ALWAYS use FULL conversation context for accurate completeness
                // This ensures all messages are considered for comprehensive analysis
                maxMessages = 999; // Request all messages for KPI analysis
                console.log(`[AI Companion] KPI Analysis: Requesting FULL conversation (${totalMessages} messages) for accurate completeness assessment`);
                break;
            case 'summary':
                // For summary, include more messages for longer conversations
                maxMessages = Math.min(Math.max(50, totalMessages), 200);
                break;
            case 'title':
                // For titles, focus on recent exchanges but include more for context
                maxMessages = Math.min(Math.max(15, Math.floor(totalMessages * 0.3)), 30);
                break;
            case 'general':
            default:
                // For general purposes, scale with conversation size
                maxMessages = Math.min(Math.max(50, Math.floor(totalMessages * 0.7)), 150);
                break;
        }

        console.log(`[AI Companion] Adaptive context: ${totalMessages} total messages, requesting ${maxMessages} for ${purpose}`);

        const finalContext = this.getConversationContext(maxMessages);
        const finalMessageCount = (finalContext.match(/\n(User|Agent):/g) || []).length;

        console.log(`[AI Companion] Final context delivered: ${finalMessageCount} messages for ${purpose} analysis`);

        if (purpose === 'analysis' && finalMessageCount < totalMessages * 0.8) {
            console.warn(`[AI Companion] KPI Analysis Warning: Only received ${finalMessageCount}/${totalMessages} messages (${Math.round(finalMessageCount / totalMessages * 100)}%). This may affect completeness accuracy.`);
        }
        return finalContext;
    }

    /**
     * Force refresh of conversation context and verify data integrity
     * @returns {Object} Debug information about context retrieval
     */
    debugConversationContext() {
        console.log('[AI Companion] === CONVERSATION CONTEXT DEBUG ===');

        // Test direct session manager access
        const testEvent = new CustomEvent('getConversationContext', {
            detail: { maxMessages: 1000 }
        });
        window.dispatchEvent(testEvent);

        const sessionContext = testEvent.detail.context || '';
        const sessionMessageCount = (sessionContext.match(/\n(User|Agent):/g) || []).length;

        // Test DOM extraction
        const chatWindow = DOMUtils.getElementById('chatWindow');
        const domMessageContainers = chatWindow ? chatWindow.querySelectorAll('.messageContainer, .message') : [];

        const debugInfo = {
            sessionManager: {
                available: !!testEvent.detail.context,
                messageCount: sessionMessageCount,
                contextLength: sessionContext.length,
                sample: sessionContext.substring(0, 200) + '...'
            },
            domExtraction: {
                chatWindowFound: !!chatWindow,
                messageContainers: domMessageContainers.length,
                containerTypes: Array.from(domMessageContainers).map(c => c.className).slice(0, 5)
            },
            combined: {
                totalMessagesFound: Math.max(sessionMessageCount, domMessageContainers.length)
            }
        };

        console.log('[AI Companion] Debug info:', debugInfo);
        return debugInfo;
    }

    /**
     * Analyze message for KPI updates
     * @param {Object} messageData - Message to analyze
     * @private
     */
    async analyzeMessageForKPIs(messageData) {
        if (!messageData.content || messageData.role !== 'assistant') return;

        console.log('[AI Companion] Starting optimized KPI analysis');

        // Check if this is a first-time model use to avoid overwhelming the first request
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        const modelStateKey = `ollama_${selectedModel}_firstUse`;
        const isFirstModelUse = !localStorage.getItem(modelStateKey);

        if (isFirstModelUse) {
            console.log('[AI Companion] Skipping heavy KPI analysis during first model invocation for better performance');
        }

        try {
            // Show calculating indicators
            this.showKPICalculatingIndicators();

            // Get conversation context
            const conversationContext = this.getAdaptiveConversationContext('analysis');
            this.lastKPIAnalysisContext = conversationContext;

            const contextMessageCount = (conversationContext.match(/\n(User|Agent):/g) || []).length;
            console.log(`[AI Companion] KPI Analysis using ${contextMessageCount} messages`);

            // PHASE 1: INSTANT - Calculate fast heuristic-based KPIs
            const fastResults = this.calculateFastKPIs(messageData, conversationContext);

            // Apply fast results immediately
            this.applyKPIResults(fastResults, false); // false = not final

            // Update efficiency and consumption immediately
            this.completeResponseTiming();
            this.kpiData.efficiency = Math.max(0, Math.min(10, this.calculateEfficiency()));
            this.updateKPIDisplay(); // Show immediate results

            console.log('[AI Companion] Fast KPI results applied:', fastResults);

            // PHASE 2: DEBOUNCED LLM - Enhanced analysis when appropriate
            // Skip heavy LLM analysis on first model use to improve performance
            if (!isFirstModelUse) {
                this.scheduleLLMAnalysis(messageData, conversationContext);
            } else {
                console.log('[AI Companion] Skipping LLM analysis for first model use - will use fast heuristics only');
                // Hide indicators since we won't do LLM analysis
                setTimeout(() => this.hideKPICalculatingIndicators(), 500);
            }

        } catch (error) {
            console.error('[AI Companion] Error during KPI analysis:', error);
        } finally {
            // Always hide calculating indicators for fast metrics if no LLM analysis
            if (isFirstModelUse) {
                setTimeout(() => {
                    this.hideKPICalculatingIndicators();
                }, 500);
            } else {
                // Only hide if LLM analysis is not in progress
                setTimeout(() => {
                    if (!this.kpiOptimization.isLLMAnalysisInProgress) {
                        this.hideKPICalculatingIndicators();
                    }
                }, 500);
            }
        }
    }

    /**
     * Calculate fast heuristic-based KPIs for immediate display
     * @param {Object} messageData - Message to analyze
     * @param {string} conversationContext - Conversation context
     * @returns {Object} Fast KPI results
     * @private
     */
    calculateFastKPIs(messageData, conversationContext) {
        const content = messageData.content.toLowerCase();
        const wordCount = content.split(' ').length;

        // Store word count for modal display
        this.lastWordCount = wordCount;

        // Parse context for analysis
        const contextMessages = conversationContext.split('\n').filter(line =>
            line.startsWith('User:') || line.startsWith('Agent:')
        );
        const userMessages = contextMessages.filter(line => line.startsWith('User:'));
        const agentMessages = contextMessages.filter(line => line.startsWith('Agent:'));

        // Fast Accuracy Calculation
        let accuracy = 7.0;
        if (userMessages.length > 0) {
            const lastUserMessage = userMessages[userMessages.length - 1].substring(5);
            accuracy += this.calculateRelevanceScore(content, lastUserMessage) * 2;
        }
        if (content.includes('error') || content.includes('mistake')) accuracy -= 1.5;
        if (content.includes('definitely') || content.includes('certainly')) accuracy += 1.0;

        // Fast Helpfulness Calculation
        let helpfulness = 6.5;
        if (content.includes('here\'s how') || content.includes('you can')) helpfulness += 1.5;
        if (content.includes('step') || content.includes('first')) helpfulness += 1.0;
        if (content.includes('sorry') || content.includes('can\'t help')) helpfulness -= 1.0;

        // Fast Completeness Calculation
        let completeness = Math.min(8.0, Math.max(3.0, wordCount * 0.15));
        if (content.includes('example') || content.includes('for instance')) completeness += 0.8;
        if (userMessages.length > 0) {
            const lastUserMessage = userMessages[userMessages.length - 1];
            const questionParts = (lastUserMessage.match(/\?/g) || []).length;
            if (questionParts > 1) {
                const addressedParts = this.countAddressedQuestionParts(content, lastUserMessage);
                completeness += (addressedParts / questionParts) * 2;
            }
        }

        return {
            accuracy: Math.max(0, Math.min(10, accuracy)),
            helpfulness: Math.max(0, Math.min(10, helpfulness)),
            completeness: Math.max(0, Math.min(10, completeness))
        };
    }

    /**
     * Schedule LLM analysis with debouncing to prevent excessive API calls
     * @param {Object} messageData - Message to analyze
     * @param {string} conversationContext - Conversation context
     * @private
     */
    scheduleLLMAnalysis(messageData, conversationContext) {
        const now = Date.now();

        // Cancel any pending analysis
        if (this.kpiOptimization.pendingAnalysis) {
            clearTimeout(this.kpiOptimization.pendingAnalysis);
        }

        // Check if we should debounce (too soon after last call)
        const timeSinceLastCall = now - this.kpiOptimization.lastLLMCallTime;
        const shouldDebounce = timeSinceLastCall < this.kpiOptimization.debounceDelay;

        const delay = shouldDebounce ? this.kpiOptimization.debounceDelay - timeSinceLastCall : 0;

        console.log(`[AI Companion] LLM analysis scheduled in ${delay}ms (debounce: ${shouldDebounce})`);

        this.kpiOptimization.pendingAnalysis = setTimeout(async () => {
            await this.performLLMAnalysis(messageData, conversationContext);
        }, delay);
    }

    /**
     * Perform comprehensive LLM analysis for accurate KPI refinement
     * @param {Object} messageData - Message to analyze
     * @param {string} conversationContext - Conversation context
     * @private
     */
    async performLLMAnalysis(messageData, conversationContext) {
        if (this.kpiOptimization.isLLMAnalysisInProgress) {
            console.log('[AI Companion] LLM analysis already in progress, skipping');
            return;
        }

        this.kpiOptimization.isLLMAnalysisInProgress = true;
        this.kpiOptimization.lastLLMCallTime = Date.now();

        try {
            console.log('[AI Companion] Starting comprehensive LLM analysis');

            // Create optimized prompt for all KPIs in single call
            const llmResults = await this.getBatchedKPIAnalysis(messageData, conversationContext);

            // Apply LLM results as final values
            this.applyKPIResults(llmResults, true); // true = final results

            console.log('[AI Companion] LLM KPI results applied:', llmResults);

        } catch (error) {
            console.error('[AI Companion] LLM analysis failed:', error);
            // Keep the fast heuristic results as fallback
        } finally {
            this.kpiOptimization.isLLMAnalysisInProgress = false;
            this.hideKPICalculatingIndicators();
            this.updateKPIDisplay();
        }
    }

    /**
     * Get batched KPI analysis from LLM in single call
     * @param {Object} messageData - Message to analyze 
     * @param {string} conversationContext - Conversation context
     * @returns {Object} LLM analysis results
     * @private
     */
    async getBatchedKPIAnalysis(messageData, conversationContext) {
        const prompt = this.buildBatchedKPIPrompt(messageData.content, conversationContext);
        const llmResponse = await this.getLLMEvaluation(prompt);
        return this.parseBatchedKPIResponse(llmResponse);
    }

    /**
     * Build optimized prompt for batched KPI analysis
     * @param {string} content - Agent response content
     * @param {string} conversationContext - Conversation context
     * @returns {string} Optimized prompt
     * @private
     */
    buildBatchedKPIPrompt(content, conversationContext) {
        return `You are an AI conversation quality analyst. Evaluate this agent response across 4 key metrics.

CONVERSATION CONTEXT:
${conversationContext.substring(0, 1500)}...

AGENT RESPONSE TO EVALUATE:
"${content}"

Provide scores (0-10) and brief explanations for:

1. ACCURACY: Factual correctness, relevance to user query
2. HELPFULNESS: Practical value, actionable guidance  
3. COMPLETENESS: Thoroughness, addresses all aspects

CRITICAL: Your response must be ONLY valid JSON in this exact format. Do not include any other text, explanations, or markdown formatting:

{
  "accuracy": {
    "score": 8,
    "reasoning": "Brief explanation here"
  },
  "helpfulness": {
    "score": 7,
    "reasoning": "Brief explanation here"
  },
  "completeness": {
    "score": 9,
    "reasoning": "Brief explanation here"
  }
}`;
    }

    /**
     * Parse batched KPI response from LLM
     * @param {string} llmResponse - LLM response
     * @returns {Object} Parsed KPI results
     * @private
     */
    parseBatchedKPIResponse(llmResponse) {
        try {
            console.log('[AI Companion] Raw LLM response for KPI parsing:', llmResponse.substring(0, 500) + '...');

            // Try multiple strategies to extract valid JSON
            let jsonString = null;
            let parsed = null;

            // Strategy 1: Look for JSON between code blocks
            const codeBlockMatch = llmResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
            if (codeBlockMatch) {
                jsonString = codeBlockMatch[1];
                console.log('[AI Companion] Found JSON in code block');
            }

            // Strategy 2: Look for the first complete JSON object
            if (!jsonString) {
                const jsonMatch = llmResponse.match(/\{[^}]*\}/);
                if (jsonMatch) {
                    // Find the opening brace and try to match it with closing brace
                    let braceCount = 0;
                    let startIndex = llmResponse.indexOf('{');
                    if (startIndex !== -1) {
                        for (let i = startIndex; i < llmResponse.length; i++) {
                            if (llmResponse[i] === '{') braceCount++;
                            else if (llmResponse[i] === '}') braceCount--;

                            if (braceCount === 0) {
                                jsonString = llmResponse.substring(startIndex, i + 1);
                                break;
                            }
                        }
                    }
                }
            }

            // Strategy 3: Fallback to simple regex match
            if (!jsonString) {
                const simpleMatch = llmResponse.match(/\{[\s\S]*\}/);
                if (simpleMatch) {
                    jsonString = simpleMatch[0];
                }
            }

            if (!jsonString) {
                throw new Error('No JSON found in LLM response');
            }

            console.log('[AI Companion] Attempting to parse JSON:', jsonString.substring(0, 200) + '...');

            // Clean the JSON string before parsing
            jsonString = jsonString
                .replace(/,\s*}/g, '}')  // Remove trailing commas
                .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
                .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')  // Quote unquoted keys
                .trim();

            parsed = JSON.parse(jsonString);

            return {
                accuracy: Math.max(0, Math.min(10, parsed.accuracy?.score || 7)),
                helpfulness: Math.max(0, Math.min(10, parsed.helpfulness?.score || 7)),
                completeness: Math.max(0, Math.min(10, parsed.completeness?.score || 7)),
                reasoning: {
                    accuracy: parsed.accuracy?.reasoning || '',
                    helpfulness: parsed.helpfulness?.reasoning || '',
                    completeness: parsed.completeness?.reasoning || ''
                }
            };
        } catch (error) {
            console.error('[AI Companion] Error parsing batched KPI response:', error);
            console.error('[AI Companion] Raw response that failed to parse:', llmResponse);

            // Return neutral scores as fallback
            return {
                accuracy: 7, helpfulness: 7, completeness: 7,
                reasoning: {
                    accuracy: 'Parse error - see console', helpfulness: 'Parse error - see console',
                    completeness: 'Parse error - see console'
                }
            };
        }
    }

    /**
     * Apply KPI results to the data structure
     * @param {Object} results - KPI results
     * @param {boolean} isFinal - Whether these are final results
     * @private
     */
    applyKPIResults(results, isFinal) {
        // Store previous values for trend calculation
        this.previousKpiData = { ...this.kpiData };

        // Apply results
        this.kpiData.accuracy = results.accuracy;
        this.kpiData.helpfulness = results.helpfulness;
        this.kpiData.completeness = results.completeness;

        // Store reasoning if available (for modal display)
        if (results.reasoning && isFinal) {
            this.lastLLMEvaluation = {
                reasoning: results.reasoning,
                isBatched: true
            };
        }

        // Calculate changes and trend
        this.kpiData.changes++;
        const avgCurrent = (this.kpiData.accuracy + this.kpiData.helpfulness +
            this.kpiData.completeness + this.kpiData.efficiency) / 4;
        const avgPrevious = (this.previousKpiData.accuracy + this.previousKpiData.helpfulness +
            this.previousKpiData.completeness + this.previousKpiData.efficiency) / 4;

        if (avgCurrent > avgPrevious + 0.3) {
            this.kpiData.trend = 'improving';
        } else if (avgCurrent < avgPrevious - 0.3) {
            this.kpiData.trend = 'declining';
        } else {
            this.kpiData.trend = 'stable';
        }

        console.log(`[AI Companion] KPI results applied (final: ${isFinal}):`, {
            accuracy: this.kpiData.accuracy.toFixed(1),
            helpfulness: this.kpiData.helpfulness.toFixed(1),
            completeness: this.kpiData.completeness.toFixed(1),
            humanlikeness: this.kpiData.humanlikeness.toFixed(1),
            efficiency: this.kpiData.efficiency.toFixed(1),
            trend: this.kpiData.trend
        });

        // Generate and display KPI explanation in chat when final results are available
        if (isFinal && results.reasoning) {
            this.generateAndDisplayKPIExplanation(results);
        }
    }

    /**
     * Helper method to count addressed question parts
     * @param {string} content - Response content
     * @param {string} userMessage - User message with questions
     * @returns {number} Number of addressed question parts
     * @private
     */
    countAddressedQuestionParts(content, userMessage) {
        // Simple heuristic: count question keywords addressed
        const questionKeywords = userMessage.toLowerCase().match(/\b(how|what|when|where|why|which|who)\b/g) || [];
        const uniqueKeywords = [...new Set(questionKeywords)];

        let addressedCount = 0;
        for (const keyword of uniqueKeywords) {
            if (content.includes(keyword) || this.getResponsePatternForKeyword(keyword, content)) {
                addressedCount++;
            }
        }

        return Math.min(addressedCount, uniqueKeywords.length);
    }

    /**
     * Helper method to check if response patterns match question keywords
     * @param {string} keyword - Question keyword
     * @param {string} content - Response content
     * @returns {boolean} Whether response pattern matches
     * @private
     */
    getResponsePatternForKeyword(keyword, content) {
        const patterns = {
            'how': ['step', 'process', 'method', 'way'],
            'what': ['definition', 'meaning', 'explanation'],
            'when': ['time', 'date', 'schedule'],
            'where': ['location', 'place', 'position'],
            'why': ['reason', 'because', 'purpose'],
            'which': ['option', 'choice', 'alternative'],
            'who': ['person', 'individual', 'team']
        };

        const keywordPatterns = patterns[keyword] || [];
        return keywordPatterns.some(pattern => content.includes(pattern));
    }

    /**
     * Analyze message with conversation context for enhanced KPI accuracy
     * @param {Object} messageData - Message to analyze
     * @param {string} conversationContext - Full conversation context
     * @returns {Object} Analysis results with accuracy, helpfulness, completeness, humanlikeness scores
     * @private
     */
    async analyzeWithContext(messageData, conversationContext) {
        const content = messageData.content.toLowerCase();
        const wordCount = content.split(' ').length;

        // Parse conversation context for contextual understanding
        const contextMessages = conversationContext.split('\n').filter(line =>
            line.startsWith('User:') || line.startsWith('Agent:')
        );

        const userMessages = contextMessages.filter(line => line.startsWith('User:'));
        const agentMessages = contextMessages.filter(line => line.startsWith('Agent:'));
        const conversationLength = contextMessages.length;

        console.log(`[AI Companion] Analyzing with context: ${conversationLength} messages, ${userMessages.length} user, ${agentMessages.length} agent`);

        // Enhanced accuracy analysis with conversation context
        let accuracy = 7.0;

        // Check for consistency with previous agent responses
        if (agentMessages.length > 1) {
            const previousResponses = agentMessages.slice(-3); // Last 3 responses
            const hasConsistentTone = this.checkResponseConsistency(content, previousResponses);
            if (hasConsistentTone) accuracy += 0.5;
        }

        // Analyze response relevance to recent user questions
        if (userMessages.length > 0) {
            const recentUserMessage = userMessages[userMessages.length - 1].substring(5); // Remove "User:"
            const relevanceScore = this.calculateRelevanceScore(content, recentUserMessage);
            accuracy += relevanceScore * 2; // Scale relevance to accuracy
        }

        // Traditional accuracy indicators
        if (content.includes('i think') || content.includes('maybe') || content.includes('probably')) {
            accuracy -= 1.0;
        }
        if (content.includes('definitely') || content.includes('certainly') || content.includes('specifically')) {
            accuracy += 1.0;
        }
        if (content.includes('error') || content.includes('mistake') || content.includes('incorrect')) {
            accuracy -= 1.5;
        }

        // Enhanced helpfulness analysis
        let helpfulness = 6.5;

        // Check if response builds on conversation history
        if (conversationLength > 2) {
            const buildsOnHistory = this.checkIfBuildsOnHistory(content, contextMessages);
            if (buildsOnHistory) helpfulness += 1.5;
        }

        // Analyze actionable content
        if (content.includes('here\'s how') || content.includes('you can') || content.includes('try this')) {
            helpfulness += 1.5;
        }
        if (content.includes('step') || content.includes('first') || content.includes('next')) {
            helpfulness += 1.0;
        }
        if (content.includes('sorry') || content.includes('can\'t help') || content.includes('don\'t know')) {
            helpfulness -= 1.0;
        }

        // Enhanced completeness analysis
        let completeness = Math.min(8.0, Math.max(3.0, wordCount * 0.15));

        // Check if response addresses all parts of multi-part questions
        if (userMessages.length > 0) {
            const lastUserMessage = userMessages[userMessages.length - 1];
            const questionParts = (lastUserMessage.match(/\?/g) || []).length;
            if (questionParts > 1) {
                const addressedParts = this.countAddressedQuestionParts(content, lastUserMessage);
                completeness += (addressedParts / questionParts) * 2;
            }
        }

        if (content.includes('example') || content.includes('for instance')) {
            completeness += 0.8;
        }
        if (content.includes('brief') || content.includes('quick') || wordCount < 10) {
            completeness -= 1.0;
        }

        // Enhanced human-likeness with LLM-powered context analysis
        const humanlikeness = await this.calculateHumanLikenessWithContext(messageData.content, conversationContext);

        return {
            accuracy: Math.max(0, Math.min(10, accuracy)),
            helpfulness: Math.max(0, Math.min(10, helpfulness)),
            completeness: Math.max(0, Math.min(10, completeness)),
            humanlikeness: Math.max(0, Math.min(10, humanlikeness))
        };
    }

    /**
     * Calculate conversation efficiency based on response times and industry standards
     * @returns {number} Efficiency score (0-10)
     * @private
     */
    calculateEfficiency() {
        const now = Date.now();

        // If no conversation has started yet
        if (!this.timeTracking.conversationStart) {
            return 8.0; // Default score for fresh conversation
        }

        // Calculate current response time if we're timing a response
        let currentResponseTime = 0;
        if (this.timeTracking.lastUserMessage) {
            currentResponseTime = now - this.timeTracking.lastUserMessage;
        }

        // Update average response time
        if (currentResponseTime > 0) {
            this.timeTracking.responseTime = currentResponseTime;
            this.timeTracking.totalConversationTime = now - this.timeTracking.conversationStart;
            this.timeTracking.messageCount++;

            // Calculate rolling average
            if (this.timeTracking.avgResponseTime === 0) {
                this.timeTracking.avgResponseTime = currentResponseTime;
            } else {
                this.timeTracking.avgResponseTime =
                    (this.timeTracking.avgResponseTime * (this.timeTracking.messageCount - 1) + currentResponseTime) /
                    this.timeTracking.messageCount;
            }
        }

        // Industry standards for human-agent interaction (in milliseconds):
        // - Acknowledgment: < 2 seconds (2000ms) = excellent
        // - Simple queries: 3-10 seconds (3000-10000ms) = good
        // - Complex queries: 10-30 seconds (10000-30000ms) = acceptable
        // - Very complex: 30-60 seconds (30000-60000ms) = slow but acceptable

        let efficiencyScore = 10.0;
        const avgResponse = this.timeTracking.avgResponseTime;

        if (avgResponse > 0) {
            if (avgResponse <= 2000) {
                efficiencyScore = 10.0; // Excellent response time
            } else if (avgResponse <= 5000) {
                efficiencyScore = 9.0; // Very good
            } else if (avgResponse <= 10000) {
                efficiencyScore = 8.0; // Good
            } else if (avgResponse <= 20000) {
                efficiencyScore = 6.5; // Acceptable
            } else if (avgResponse <= 30000) {
                efficiencyScore = 5.0; // Slow but acceptable
            } else if (avgResponse <= 45000) {
                efficiencyScore = 3.0; // Quite slow
            } else {
                efficiencyScore = 1.0; // Very slow
            }

            // Bonus for consistent response times (low variance)
            if (this.timeTracking.messageCount >= 3) {
                const consistency = this.calculateResponseTimeConsistency();
                efficiencyScore += consistency * 0.5; // Up to 0.5 bonus points
            }

            // Penalty for very long total conversation time without progress
            const totalMinutes = this.timeTracking.totalConversationTime / 60000;
            if (totalMinutes > 10 && this.timeTracking.messageCount < 5) {
                efficiencyScore -= 1.0; // Penalty for unproductive long conversations
            }
        }

        return Math.max(0, Math.min(10, efficiencyScore));
    }

    /**
     * Calculate response time consistency (lower variance = better)
     * @returns {number} Consistency score (0-1)
     * @private
     */
    calculateResponseTimeConsistency() {
        // This is a simplified consistency measure
        // In a full implementation, you'd track all response times and calculate variance
        return 0.8; // Default good consistency score
    }

    /**
     * Start timing user message for efficiency tracking
     * @private
     */
    startUserMessageTiming() {
        this.timeTracking.lastUserMessage = Date.now();

        // Initialize conversation start time if this is the first message
        if (!this.timeTracking.conversationStart) {
            this.timeTracking.conversationStart = Date.now();
        }

        console.log(`[AI Companion] Started timing user message at ${this.timeTracking.lastUserMessage}`);
    }

    /**
     * Complete timing cycle when agent responds
     * @private
     */
    completeResponseTiming() {
        if (this.timeTracking.lastUserMessage) {
            // Calculate the response time from user message to completion
            this.timeTracking.responseTime = Date.now() - this.timeTracking.lastUserMessage;

            // Update message count and average
            this.timeTracking.messageCount++;
            this.timeTracking.avgResponseTime = (
                (this.timeTracking.avgResponseTime * (this.timeTracking.messageCount - 1)) +
                this.timeTracking.responseTime
            ) / this.timeTracking.messageCount;

            console.log(`[AI Companion] Response completed in ${this.timeTracking.responseTime}ms, average: ${this.timeTracking.avgResponseTime.toFixed(0)}ms`);

            // Reset for next cycle
            this.timeTracking.lastUserMessage = null;
        }
    }

    /**
     * Check response consistency with previous agent messages
     * @param {string} currentResponse - Current response content (lowercase)
     * @param {Array} previousResponses - Array of previous agent responses
     * @returns {boolean} True if response is consistent
     * @private
     */
    checkResponseConsistency(currentResponse, previousResponses) {
        if (!previousResponses || previousResponses.length === 0) return true;

        // Check for consistent tone and style indicators
        const currentHasPersonal = /\b(i\s|my\s|me\s)/g.test(currentResponse);
        const currentHasFormal = /\b(furthermore|therefore|additionally|consequently)\b/g.test(currentResponse);

        const previousResponses_text = previousResponses.join(' ').toLowerCase();
        const previousHasPersonal = /\b(i\s|my\s|me\s)/g.test(previousResponses_text);
        const previousHasFormal = /\b(furthermore|therefore|additionally|consequently)\b/g.test(previousResponses_text);

        // Consistency check: similar tone patterns
        return (currentHasPersonal === previousHasPersonal) || (currentHasFormal === previousHasFormal);
    }

    /**
     * Calculate relevance score between response and user question
     * @param {string} response - Agent response content (lowercase)
     * @param {string} userMessage - User message content
     * @returns {number} Relevance score (0-1)
     * @private
     */
    calculateRelevanceScore(response, userMessage) {
        if (!userMessage) return 0.5;

        const userWords = userMessage.toLowerCase().split(/\W+/).filter(word =>
            word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word)
        );

        if (userWords.length === 0) return 0.5;

        let matches = 0;
        userWords.forEach(word => {
            if (response.includes(word)) matches++;
        });

        return Math.min(1, matches / userWords.length);
    }

    /**
     * Check if response builds on conversation history
     * @param {string} response - Agent response content (lowercase)
     * @param {Array} contextMessages - All conversation messages
     * @returns {boolean} True if response builds on history
     * @private
     */
    checkIfBuildsOnHistory(response, contextMessages) {
        const historyIndicators = [
            'as mentioned', 'as discussed', 'earlier', 'previously', 'before',
            'following up', 'continuing', 'building on', 'expanding on'
        ];

        return historyIndicators.some(indicator => response.includes(indicator));
    }

    /**
     * Count how many parts of a multi-part question are addressed
     * @param {string} response - Agent response content (lowercase)
     * @param {string} userMessage - User message with questions
     * @returns {number} Number of question parts addressed
     * @private
     */
    countAddressedQuestionParts(response, userMessage) {
        const questionParts = userMessage.split('?').filter(part => part.trim().length > 0);
        if (questionParts.length <= 1) return 1;

        let addressedParts = 0;
        questionParts.forEach(part => {
            const keywords = part.toLowerCase().split(/\W+/).filter(word =>
                word.length > 3 && !['what', 'how', 'why', 'when', 'where', 'which'].includes(word)
            );

            const hasMatch = keywords.some(keyword => response.includes(keyword));
            if (hasMatch) addressedParts++;
        });

        return Math.max(1, addressedParts);
    }

    /**
     * Calculate Human-Likeness Score (HLS) for AGENT RESPONSE using LLM-powered evaluation
     * Leverages the AI companion's LLM model to perform sophisticated human-likeness analysis
     * with structured breakdown and detailed explanations
     * 
     * @param {string} content - AGENT response content to evaluate for human-likeness
     * @param {string} conversationContext - User messages and conversation history for context reference
     * @returns {number} Human-likeness score (0-10) with LLM-generated analysis
     * @private
     */
    async calculateHumanLikenessWithContext(content, conversationContext) {
        if (!content) return 5.0;

        console.log(`[AI Companion] Starting LLM-powered Human-Likeness Score (HLS) evaluation`);

        try {
            // Prepare the evaluation prompt for the LLM
            const evaluationPrompt = this.buildHLSEvaluationPrompt(content, conversationContext);

            // Get LLM evaluation
            const llmEvaluation = await this.getLLMEvaluation(evaluationPrompt);

            // Parse and validate the LLM response
            const evaluation = this.parseHLSEvaluation(llmEvaluation);

            // Store evaluation for modal display
            this.lastHLSEvaluation = evaluation;

            // Log detailed breakdown
            this.logHLSBreakdown(evaluation);

            return Math.max(0, Math.min(10, evaluation.finalScore));

        } catch (error) {
            console.error('[AI Companion] Error in LLM-powered HLS evaluation:', error);
            // Fallback to basic scoring if LLM evaluation fails
            return this.calculateBasicHumanLikeness(content);
        }
    }

    /**
     * Build comprehensive evaluation prompt for LLM HLS analysis
     * @param {string} content - Agent response to evaluate
     * @param {string} conversationContext - Full conversation context
     * @returns {string} Structured evaluation prompt
     * @private
     */
    buildHLSEvaluationPrompt(content, conversationContext) {
        return `You are a conversation quality analyst specializing in Human-Likeness Score (HLS) evaluation. 

TASK: Evaluate how human-like this AI agent response appears, using the conversation context for reference.

CONVERSATION CONTEXT:
${conversationContext}

AGENT RESPONSE TO EVALUATE:
"${content}"

EVALUATION FRAMEWORK:
Analyze the agent response across these 5 dimensions and provide scores (0-100):

1. RELEVANCE & COHERENCE (30% weight)
- Does it directly address the user's question/request?
- Is the response logically structured and easy to follow?
- Does it stay on topic without tangential digressions?

2. DEPTH OF UNDERSTANDING & NUANCE (25% weight)
- Goes beyond simple factual information?
- Shows contextual understanding of implications?
- Demonstrates nuanced thinking and avoids oversimplification?
- References conversation history appropriately?

3. ADAPTABILITY & ITERATION (20% weight)
- Adapts to the conversation flow and user's communication style?
- Builds on previous exchanges showing conversational memory?
- Shows learning or refinement from the interaction?

4. EXPRESSIVENESS & NATURAL LANGUAGE (15% weight)
- Uses natural, fluid language patterns?
- Appropriate tone for the context?
- Avoids robotic or overly formal phrasing?
- Shows personality and warmth?

5. ENGAGEMENT & RESPONSIVENESS (10% weight)
- Demonstrates active engagement with the user?
- Responsive to user's emotional tone and communication style?
- Shows genuine helpfulness and support?

REQUIRED OUTPUT FORMAT (JSON):
{
  "relevanceCoherence": {
    "score": [0-100],
    "explanation": "Detailed analysis of how well the response addresses the user's needs and maintains logical flow",
    "strengths": ["specific strength 1", "specific strength 2"],
    "improvements": ["specific improvement 1", "specific improvement 2"]
  },
  "depthUnderstanding": {
    "score": [0-100],
    "explanation": "Analysis of contextual understanding and nuanced thinking",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"]
  },
  "adaptability": {
    "score": [0-100],
    "explanation": "Evaluation of conversation flow adaptation and learning",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"]
  },
  "expressiveness": {
    "score": [0-100],
    "explanation": "Assessment of natural language use and tone",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"]
  },
  "engagement": {
    "score": [0-100],
    "explanation": "Analysis of user engagement and responsiveness",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"]
  },
  "overallAssessment": {
    "finalScore": [0-100],
    "summary": "Overall human-likeness assessment with key insights",
    "standoutQualities": ["notable human-like quality 1", "quality 2"],
    "mainWeaknesses": ["main weakness 1", "weakness 2"],
    "recommendations": ["specific recommendation 1", "recommendation 2"]
  }
}

Provide your analysis in the exact JSON format above. Be thorough but concise in explanations.`;
    }

    /**
     * Get LLM evaluation using the current provider
     * @param {string} prompt - Evaluation prompt
     * @returns {string} LLM response with evaluation
     * @private
     */
    async getLLMEvaluation(prompt) {
        console.log('[AI Companion] Sending HLS evaluation request to LLM');

        try {
            if (this.currentProvider === 'ollama') {
                return await this.getOllamaEvaluation(prompt);
            } else {
                return await this.getAPIEvaluation(prompt);
            }
        } catch (error) {
            console.error('[AI Companion] LLM evaluation request failed:', error);
            throw error;
        }
    }

    /**
     * Get evaluation from Ollama
     * @param {string} prompt - Evaluation prompt
     * @returns {string} Ollama response
     * @private
     */
    async getOllamaEvaluation(prompt) {
        const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        const selectedModel = localStorage.getItem('ollamaSelectedModel');

        if (!selectedModel) {
            throw new Error('No Ollama model selected for HLS evaluation');
        }

        try {
            const response = await fetch(`${ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.3, // Lower temperature for more consistent analysis
                        top_p: 0.9
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama HLS evaluation failed: ${response.status}`);
            }

            const data = await response.json();
            return data.response;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Get evaluation from API providers (OpenAI, Anthropic, Azure)
     * @param {string} prompt - Evaluation prompt
     * @returns {string} API response
     * @private
     */
    async getAPIEvaluation(prompt) {
        const apiKey = await SecureStorage.retrieve(`${this.currentProvider}ApiKey`);
        if (!apiKey) {
            throw new Error(`No API key found for ${this.currentProvider}`);
        }

        let requestBody, url, headers;

        if (this.currentProvider === 'azure') {
            const endpoint = localStorage.getItem('azureEndpoint');
            const deployment = localStorage.getItem('azureDeployment');
            const apiVersion = localStorage.getItem('azureApiVersion') || '2024-02-01';

            url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
            headers = {
                'Content-Type': 'application/json',
                'api-key': apiKey
            };
            requestBody = {
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000,
                temperature: 0.3
            };
        } else if (this.currentProvider === 'openai') {
            url = 'https://api.openai.com/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            requestBody = {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000,
                temperature: 0.3
            };
        } else if (this.currentProvider === 'anthropic') {
            url = 'https://api.anthropic.com/v1/messages';
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            };
            requestBody = {
                model: 'claude-3-haiku-20240307',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`${this.currentProvider} HLS evaluation failed: ${response.status}`);
        }

        const data = await response.json();

        // Track token usage from API response
        if (data.usage) {
            this.trackTokenUsage(data.usage);
        }

        if (this.currentProvider === 'anthropic') {
            return data.content[0].text;
        } else {
            return data.choices[0].message.content;
        }
    }

    /**
     * Parse and validate LLM evaluation response
     * @param {string} llmResponse - Raw LLM response
     * @returns {Object} Parsed evaluation object
     * @private
     */
    parseHLSEvaluation(llmResponse) {
        try {
            // Extract JSON from response (LLM might include extra text)
            const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }

            let jsonString = jsonMatch[0];

            // Clean up common JSON issues in LLM responses
            jsonString = this.cleanupLLMJson(jsonString);

            let evaluation;
            try {
                evaluation = JSON.parse(jsonString);
            } catch (parseError) {
                // Enhanced error logging for debugging
                console.error('[AI Companion] JSON Parse Error:', parseError.message);
                console.error('[AI Companion] Raw LLM Response:', llmResponse);
                console.error('[AI Companion] Extracted JSON String:', jsonString);

                // Try to identify the problematic part
                const lines = jsonString.split('\n');
                const errorMatch = parseError.message.match(/line (\d+)/);
                if (errorMatch) {
                    const lineNum = parseInt(errorMatch[1]) - 1;
                    if (lines[lineNum]) {
                        console.error(`[AI Companion] Problematic line ${lineNum + 1}:`, lines[lineNum]);
                        if (lines[lineNum - 1]) console.error(`[AI Companion] Previous line:`, lines[lineNum - 1]);
                        if (lines[lineNum + 1]) console.error(`[AI Companion] Next line:`, lines[lineNum + 1]);
                    }
                }

                // Attempt to repair the JSON and try again
                console.warn('[AI Companion] Attempting JSON repair...');
                const repairedJson = this.attemptJsonRepair(jsonString);

                try {
                    evaluation = JSON.parse(repairedJson);
                    console.log('[AI Companion] JSON repair successful!');
                } catch (repairError) {
                    console.error('[AI Companion] JSON repair failed:', repairError.message);
                    console.error('[AI Companion] Repaired JSON String:', repairedJson);
                    throw parseError; // Throw original error
                }
            }

            // Validate required structure
            const requiredDimensions = ['relevanceCoherence', 'depthUnderstanding', 'adaptability', 'expressiveness', 'engagement'];
            for (const dimension of requiredDimensions) {
                if (!evaluation[dimension] || typeof evaluation[dimension].score !== 'number') {
                    throw new Error(`Missing or invalid ${dimension} in evaluation`);
                }
            }

            // Calculate weighted final score
            const weightedScore = (evaluation.relevanceCoherence.score * 0.30) +
                (evaluation.depthUnderstanding.score * 0.25) +
                (evaluation.adaptability.score * 0.20) +
                (evaluation.expressiveness.score * 0.15) +
                (evaluation.engagement.score * 0.10);

            // Convert from 0-100 to 0-10 scale
            evaluation.finalScore = weightedScore / 10;

            // Store individual scores for display
            evaluation.breakdown = {
                relevance: evaluation.relevanceCoherence.score,
                depth: evaluation.depthUnderstanding.score,
                adaptability: evaluation.adaptability.score,
                expressiveness: evaluation.expressiveness.score,
                engagement: evaluation.engagement.score
            };

            return evaluation;

        } catch (error) {
            console.error('[AI Companion] Failed to parse LLM evaluation:', error);
            throw new Error(`Invalid LLM evaluation format: ${error.message}`);
        }
    }

    /**
     * Clean up common JSON formatting issues in LLM responses
     * @param {string} jsonString - Raw JSON string from LLM
     * @returns {string} Cleaned JSON string
     * @private
     */
    cleanupLLMJson(jsonString) {
        // Remove any trailing text after the last closing brace
        const lastBrace = jsonString.lastIndexOf('}');
        if (lastBrace !== -1) {
            jsonString = jsonString.substring(0, lastBrace + 1);
        }

        // Fix common trailing comma issues
        jsonString = jsonString
            // Remove trailing commas before closing brackets/braces
            .replace(/,\s*([}\]])/g, '$1')
            // Fix missing commas between array elements (common LLM error)
            .replace(/"\s*\n\s*"/g, '",\n"')
            // Fix missing commas between object properties
            .replace(/}\s*\n\s*"/g, '},\n"')
            // Fix missing commas after string values before next property
            .replace(/"\s*\n\s*[a-zA-Z]/g, (match) => {
                return match.replace(/"\s*\n\s*/, '",\n');
            })
            // Remove any control characters that might cause parsing issues
            .replace(/[\x00-\x1F\x7F]/g, '')
            // Normalize line endings
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        return jsonString;
    }

    /**
     * Attempt to repair malformed JSON with more aggressive fixes
     * @param {string} jsonString - Malformed JSON string
     * @returns {string} Potentially repaired JSON string
     * @private
     */
    attemptJsonRepair(jsonString) {
        try {
            // More aggressive cleanup for badly formatted JSON
            let repaired = jsonString;

            // Find and fix common array/object structure issues
            repaired = repaired
                // Fix array elements without proper commas
                .replace(/(\]|\})\s*\n\s*(\{|\[)/g, '$1,\n$2')
                // Fix object properties without commas
                .replace(/([0-9])\s*\n\s*"/g, '$1,\n"')
                // Fix string values without commas
                .replace(/(")\s*\n\s*"/g, '$1,\n"')
                // Ensure proper closing of incomplete objects/arrays
                .replace(/,\s*$/, '');

            // Try to balance braces and brackets if needed
            const openBraces = (repaired.match(/\{/g) || []).length;
            const closeBraces = (repaired.match(/\}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/\]/g) || []).length;

            // Add missing closing braces
            while (closeBraces < openBraces) {
                repaired += '}';
                closeBraces++;
            }

            // Add missing closing brackets
            while (closeBrackets < openBrackets) {
                repaired += ']';
                closeBrackets++;
            }

            return repaired;
        } catch (error) {
            console.warn('[AI Companion] JSON repair attempt failed:', error);
            return jsonString; // Return original if repair fails
        }
    }

    /**
     * Log detailed HLS breakdown from LLM evaluation
     * @param {Object} evaluation - Parsed evaluation object
     * @private
     */
    logHLSBreakdown(evaluation) {
        console.log(`[AI Companion] LLM-Powered HLS Analysis Complete:`);
        console.log(`  🎯 Relevance & Coherence (30%): ${evaluation.breakdown.relevance.toFixed(1)}/100`);
        console.log(`     ${evaluation.relevanceCoherence.explanation}`);
        console.log(`  🧠 Depth & Understanding (25%): ${evaluation.breakdown.depth.toFixed(1)}/100`);
        console.log(`     ${evaluation.depthUnderstanding.explanation}`);
        console.log(`  🔄 Adaptability & Iteration (20%): ${evaluation.breakdown.adaptability.toFixed(1)}/100`);
        console.log(`     ${evaluation.adaptability.explanation}`);
        console.log(`  💬 Expressiveness & Natural Language (15%): ${evaluation.breakdown.expressiveness.toFixed(1)}/100`);
        console.log(`     ${evaluation.expressiveness.explanation}`);
        console.log(`  🤝 Engagement & Responsiveness (10%): ${evaluation.breakdown.engagement.toFixed(1)}/100`);
        console.log(`     ${evaluation.engagement.explanation}`);
        console.log(`  📊 Final HLS Score: ${evaluation.finalScore.toFixed(1)}/10`);

        if (evaluation.overallAssessment) {
            console.log(`  📝 Overall Assessment: ${evaluation.overallAssessment.summary}`);
            if (evaluation.overallAssessment.standoutQualities?.length > 0) {
                console.log(`  ✨ Standout Qualities: ${evaluation.overallAssessment.standoutQualities.join(', ')}`);
            }
            if (evaluation.overallAssessment.recommendations?.length > 0) {
                console.log(`  💡 Recommendations: ${evaluation.overallAssessment.recommendations.join(', ')}`);
            }
        }

        // Store detailed evaluation for modal display
        this.lastHLSEvaluation = evaluation;
    }

    /**
     * Fallback basic human-likeness calculation when LLM evaluation fails
     * @param {string} content - Agent response content
     * @returns {number} Basic human-likeness score (0-10)
     * @private
     */
    calculateBasicHumanLikeness(content) {
        console.log('[AI Companion] Using fallback basic human-likeness calculation');

        let score = 6.0; // Default baseline
        const lowerContent = content.toLowerCase();
        const wordCount = content.split(' ').length;

        // Basic natural language indicators
        if (/\b(i\s|you\s|we\s)/g.test(lowerContent)) score += 0.5;
        if (/[.!?]+/.test(content)) score += 0.3;
        if (wordCount > 10 && wordCount < 150) score += 0.5;

        // Penalties for obvious AI patterns
        if (lowerContent.includes('as an ai') || lowerContent.includes('i am programmed')) score -= 2.0;
        if (lowerContent.includes('i cannot') && lowerContent.includes('feel')) score -= 1.0;

        return Math.max(0, Math.min(10, score));
    }

    /**
     * Check if response shows good conversation flow
     * @param {string} content - Current response content
     * @param {string} conversationContext - Full conversation context
     * @returns {boolean} True if shows good flow
     * @private
     */
    checkConversationFlow(content, conversationContext) {
        const lowerContent = content.toLowerCase();

        // Look for transitional phrases
        const transitions = [
            'also', 'additionally', 'furthermore', 'moreover',
            'however', 'on the other hand', 'nevertheless',
            'by the way', 'speaking of', 'that reminds me'
        ];

        return transitions.some(transition => lowerContent.includes(transition));
    }

    /**
     * Detect the tone/style of user message for human-likeness evaluation
     * @param {string} userMessage - User's message content
     * @returns {string} Detected tone (formal, casual, technical, emotional, etc.)
     * @private
     */
    detectUserTone(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        // Emotional/urgent
        if (lowerMessage.includes('!') || lowerMessage.includes('urgent') || lowerMessage.includes('asap')) {
            return 'urgent';
        }

        // Technical/formal
        if (lowerMessage.includes('implement') || lowerMessage.includes('configure') ||
            lowerMessage.includes('documentation') || lowerMessage.includes('api')) {
            return 'technical';
        }

        // Casual/friendly
        if (lowerMessage.includes('hey') || lowerMessage.includes('thanks') ||
            lowerMessage.includes('please') || lowerMessage.includes('could you')) {
            return 'casual';
        }

        // Question-seeking
        if (lowerMessage.includes('?') || lowerMessage.includes('how') ||
            lowerMessage.includes('what') || lowerMessage.includes('why')) {
            return 'inquisitive';
        }

        return 'neutral';
    }

    /**
     * Evaluate if agent response appropriately matches user's communication tone
     * @param {string} agentResponse - Agent's response content
     * @param {string} userTone - Detected user tone
     * @returns {boolean} True if response tone is appropriate
     * @private
     */
    evaluateResponseAppropriatenessToUserTone(agentResponse, userTone) {
        const lowerResponse = agentResponse.toLowerCase();

        switch (userTone) {
            case 'urgent':
                // Should be direct and acknowledge urgency
                return lowerResponse.includes('right away') || lowerResponse.includes('immediately') ||
                    lowerResponse.includes('urgent') || lowerResponse.length < 200; // Concise for urgency

            case 'technical':
                // Should use technical language and be detailed
                return lowerResponse.includes('implement') || lowerResponse.includes('configure') ||
                    lowerResponse.includes('code') || lowerResponse.includes('system');

            case 'casual':
                // Should be friendly and approachable
                return lowerResponse.includes('sure') || lowerResponse.includes('of course') ||
                    lowerResponse.includes('happy to') || lowerResponse.includes('glad to');

            case 'inquisitive':
                // Should be informative and educational
                return lowerResponse.includes('here\'s how') || lowerResponse.includes('here\'s what') ||
                    lowerResponse.includes('let me explain') || lowerResponse.includes('to answer');

            default:
                return true; // Neutral tone is generally appropriate
        }
    }

    /**
     * Update KPI display in real-time
     * @private
     */
    updateKPIDisplay() {
        if (!this.elements.kpiAccuracy) return;

        // Update values with 10-point scoring
        this.elements.kpiAccuracy.textContent = this.kpiData.accuracy.toFixed(1) + '/10';
        this.elements.kpiHelpfulness.textContent = this.kpiData.helpfulness.toFixed(1) + '/10';
        this.elements.kpiCompleteness.textContent = this.kpiData.completeness.toFixed(1) + '/10';
        this.elements.kpiEfficiency.textContent = this.kpiData.efficiency.toFixed(1) + '/10';
        this.elements.kpiChanges.textContent = this.kpiData.changes;

        // Update progress bars
        this.updateProgressBar(this.elements.kpiAccuracyBar, this.kpiData.accuracy);
        this.updateProgressBar(this.elements.kpiHelpfulnessBar, this.kpiData.helpfulness);
        this.updateProgressBar(this.elements.kpiCompletenessBar, this.kpiData.completeness);
        this.updateProgressBar(this.elements.kpiEfficiencyBar, this.kpiData.efficiency);

        // Update consumption KPI (handled separately in updateKPIConsumption)
        this.updateKPIConsumption();

        // Update trend indicator
        this.updateTrendIndicator();

        // Add pulse animation to show updates
        this.addUpdateAnimation();
    }

    /**
     * Update progress bar with color coding
     * @param {HTMLElement} bar - Progress bar element
     * @param {number} value - Value (0-10)
     * @private
     */
    updateProgressBar(bar, value) {
        if (!bar) return;

        // Convert 10-point scale to percentage for visual display
        const percentage = (value / 10) * 100;
        bar.style.width = percentage + '%';

        // Remove existing classes
        bar.classList.remove('excellent', 'good', 'fair', 'poor');

        // Add color class based on 10-point value
        if (value >= 8.0) {
            bar.classList.add('excellent');
        } else if (value >= 6.0) {
            bar.classList.add('good');
        } else if (value >= 4.0) {
            bar.classList.add('fair');
        } else {
            bar.classList.add('poor');
        }
    }

    /**
     * Update trend indicator
     * @private
     */
    updateTrendIndicator() {
        if (!this.elements.kpiChangesTrend) return;

        const arrow = this.elements.kpiChangesTrend.querySelector('.trend-arrow');
        const text = this.elements.kpiChangesTrend.querySelector('.trend-text');

        if (arrow && text) {
            // Remove existing classes
            arrow.classList.remove('up', 'down', 'stable');

            // Update based on trend
            switch (this.kpiData.trend) {
                case 'up':
                    arrow.textContent = '↗';
                    arrow.classList.add('up');
                    text.textContent = 'Improving';
                    break;
                case 'down':
                    arrow.textContent = '↘';
                    arrow.classList.add('down');
                    text.textContent = 'Declining';
                    break;
                default:
                    arrow.textContent = '→';
                    arrow.classList.add('stable');
                    text.textContent = 'Stable';
            }
        }
    }

    /**
     * Add update animation to KPI items
     * @private
     */
    addUpdateAnimation() {
        const kpiItems = document.querySelectorAll('.kpi-item');
        kpiItems.forEach(item => {
            item.classList.remove('updated');
            // Trigger reflow
            item.offsetHeight;
            item.classList.add('updated');
        });
    }

    /**
     * Show calculating indicators for KPI items
     * @private
     */
    showKPICalculatingIndicators() {
        const kpiItems = [
            { element: this.elements.kpiAccuracy, name: 'accuracy' },
            { element: this.elements.kpiHelpfulness, name: 'helpfulness' },
            { element: this.elements.kpiCompleteness, name: 'completeness' },
            { element: this.elements.kpiHumanlikeness, name: 'humanlikeness' },
            { element: this.elements.kpiEfficiency, name: 'efficiency' }
        ];

        kpiItems.forEach(({ element, name }) => {
            if (element) {
                // Store original value
                element.dataset.originalValue = element.textContent;

                // Show calculating indicator
                element.innerHTML = '<span class="calculating-indicator">⟳</span> Calculating...';
                element.classList.add('calculating');

                // Add calculating animation to parent container
                const kpiItem = element.closest('.kpi-item');
                if (kpiItem) {
                    kpiItem.classList.add('calculating');
                }
            }
        });

        console.log('[AI Companion] Showing KPI calculating indicators');
    }

    /**
     * Hide calculating indicators for KPI items
     * @private
     */
    hideKPICalculatingIndicators() {
        const kpiItems = document.querySelectorAll('.kpi-item');
        kpiItems.forEach(item => {
            item.classList.remove('calculating');
        });

        // Remove calculating class from value elements
        const valueElements = [
            this.elements.kpiAccuracy,
            this.elements.kpiHelpfulness,
            this.elements.kpiCompleteness,
            this.elements.kpiHumanlikeness,
            this.elements.kpiEfficiency
        ];

        valueElements.forEach(element => {
            if (element) {
                element.classList.remove('calculating');
                // The actual values will be updated by updateKPIDisplay()
            }
        });

        console.log('[AI Companion] Hiding KPI calculating indicators');
    }

    /**
     * Reset KPI values
     * @private
     */
    resetKPIs() {
        this.kpiData = {
            accuracy: 0,
            helpfulness: 0,
            completeness: 0,
            humanlikeness: 0,
            efficiency: 0,
            changes: 0,
            trend: 'stable'
        };
        this.previousKpiData = { ...this.kpiData };

        // Reset time tracking
        this.timeTracking = {
            conversationStart: null,
            lastUserMessage: null,
            responseTime: 0,
            totalConversationTime: 0,
            messageCount: 0,
            avgResponseTime: 0
        };

        this.updateKPIDisplay();
    }

    /**
     * Update context indicator (enhanced with real-time context)
     */
    updateContextIndicator() {
        if (!this.elements.contextIndicator || this.elements.llmPanel.style.display === 'none') return;

        // Get the actual context that would be used for analysis
        const analysisContext = this.getAdaptiveConversationContext('analysis');
        const messageCount = (analysisContext.match(/\n(User|Agent):/g) || []).length;

        if (messageCount === 0) {
            this.elements.contextIndicator.textContent = 'No conversation to analyze yet';
        } else {
            this.elements.contextIndicator.textContent = `Auto-including ${messageCount} messages from current conversation`;
        }
    }

    /**
     * Schedule conversation title update with debouncing
     * Re-enabled to provide automatic title generation based on conversation content
     */
    scheduleConversationTitleUpdate() {
        console.log('[AI Companion] Scheduling conversation title update...');

        if (this.titleUpdateTimeout) {
            clearTimeout(this.titleUpdateTimeout);
        }

        this.titleUpdateTimeout = setTimeout(() => {
            this.updateConversationTitle();
        }, 3000); // Wait 3 seconds after last message
    }

    /**
     * Update conversation title using AI
     * @private
     */
    async updateConversationTitle() {
        if (!this.isEnabled) {
            console.log('[AI Companion] AI Companion not enabled, skipping title update. Enable AI Companion in settings to use automatic title generation.');
            return;
        }

        try {
            const conversationContext = this.getAdaptiveConversationContext('title');
            console.log('Title generation - conversation context:', conversationContext);

            if (!conversationContext || conversationContext === 'No conversation available.') {
                console.log('[AI Companion] No conversation context available for title generation');
                return;
            }

            const prompt = `${conversationContext}\n\nGenerate a concise, descriptive title for this conversation that clearly summarizes the main topic. 

STRICT REQUIREMENTS:
- MAXIMUM 20 words (this is a hard limit)
- Minimum 4 words for clarity
- Return ONLY the title, no quotes, no explanations
- Focus on the main topic or question discussed

Example good titles:
- "Setting up Docker containers for web development"
- "Troubleshooting network connection issues"
- "Planning budget for quarterly marketing campaign"`;

            let title = '';
            if (this.currentProvider === 'ollama') {
                title = await this.generateTitleWithOllama(prompt);
            } else {
                title = await this.generateTitleWithAPI(prompt, this.currentProvider);
            }

            if (title && title.trim()) {
                const processedTitle = this.validateAndLimitTitle(title.trim());
                this.updateConversationTitleDisplay(processedTitle);
            }
        } catch (error) {
            console.error('Error updating conversation title:', error);
        }
    }

    /**
     * Validate and enforce word limit on generated titles
     * @param {string} title - Raw title from AI
     * @returns {string} Processed title within word limits
     * @private
     */
    validateAndLimitTitle(title) {
        if (!title || !title.trim()) {
            return 'Agent Conversation';
        }

        // Clean the title first
        let cleanTitle = title.trim()
            .replace(/^["'`]|["'`]$/g, '') // Remove quotes
            .replace(/^\*+|\*+$/g, '') // Remove markdown formatting
            .replace(/^#+\s*/, '') // Remove markdown headers
            .trim();

        // Split into words and check count
        const words = cleanTitle.split(/\s+/).filter(word => word.length > 0);

        if (words.length === 0) {
            return 'Agent Conversation';
        }

        // Enforce 20-word maximum limit
        if (words.length > 20) {
            console.log(`[AI Companion] Title too long (${words.length} words), truncating to 20 words`);
            cleanTitle = words.slice(0, 20).join(' ');
        }

        // Ensure minimum length (4 words) for meaningful titles
        if (words.length < 4) {
            console.log(`[AI Companion] Title too short (${words.length} words), keeping as is`);
        }

        // Ensure title ends properly (no trailing punctuation except periods)
        cleanTitle = cleanTitle.replace(/[,;:\-]+$/, '');

        console.log(`[AI Companion] Title validation: ${words.length} words -> "${cleanTitle}"`);
        return cleanTitle;
    }

    /**
     * Send message to Ollama for title generation (with reasonable timeout)
     * @param {string} message - Message to send
     * @returns {Promise<Response>} Fetch response
     * @private
     */
    async sendToOllamaForTitle(message) {
        const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        const selectedModel = localStorage.getItem('ollamaSelectedModel');

        if (!selectedModel) {
            throw new Error('No Ollama model selected. Please select a model in settings.');
        }

        console.log('Sending title generation request to Ollama:', { url: ollamaUrl, model: selectedModel });

        try {
            const response = await fetch(`${ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: message,
                    stream: false, // Use non-streaming for titles for simplicity
                    options: {
                        temperature: 0.3, // Lower temperature for more focused title generation
                        max_tokens: 80, // Increased slightly to allow for better titles but still reasonable
                        top_p: 0.9
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama title request failed: ${response.status} ${response.statusText}`);
            }

            return response;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Generate title using Ollama
     * @param {string} prompt - Title generation prompt
     * @returns {Promise<string>} Generated title
     * @private
     */
    async generateTitleWithOllama(prompt) {
        try {
            const response = await this.sendToOllamaForTitle(prompt);

            // Handle non-streaming response
            const data = await response.json();
            return data.response ? data.response.trim() : '';

        } catch (error) {
            console.error('Error generating title with Ollama:', error);
            return '';
        }
    }

    /**
     * Generate title using API providers
     * @param {string} prompt - Title generation prompt
     * @param {string} provider - API provider
     * @returns {Promise<string>} Generated title
     * @private
     */
    async generateTitleWithAPI(prompt, provider) {
        try {
            const apiKey = await SecureStorage.retrieve(`${provider}ApiKey`);
            if (!apiKey) {
                console.log(`[AI Companion] No API key for ${provider}, skipping title generation`);
                return '';
            }

            if (provider === 'azure') {
                return await this.generateTitleWithAzure(prompt, apiKey);
            } else if (provider === 'openai') {
                return await this.generateTitleWithOpenAI(prompt, apiKey);
            } else if (provider === 'anthropic') {
                return await this.generateTitleWithAnthropic(prompt, apiKey);
            }

            return '';
        } catch (error) {
            console.error(`[AI Companion] Error generating title with ${provider}:`, error);
            return '';
        }
    }

    /**
     * Generate title using Azure OpenAI
     * @param {string} prompt - Title generation prompt
     * @param {string} apiKey - Azure API key
     * @returns {Promise<string>} Generated title
     * @private
     */
    async generateTitleWithAzure(prompt, apiKey) {
        const endpoint = localStorage.getItem('azureEndpoint');
        const deployment = localStorage.getItem('azureDeployment');
        const apiVersion = localStorage.getItem('azureApiVersion') || '2024-02-01';

        if (!endpoint || !deployment) {
            throw new Error('Azure OpenAI configuration incomplete');
        }

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 80,
                temperature: 0.3,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Azure OpenAI title request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    }

    /**
     * Generate title using OpenAI
     * @param {string} prompt - Title generation prompt
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise<string>} Generated title
     * @private
     */
    async generateTitleWithOpenAI(prompt, apiKey) {
        const url = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 80,
                temperature: 0.3,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI title request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    }

    /**
     * Generate title using Anthropic
     * @param {string} prompt - Title generation prompt
     * @param {string} apiKey - Anthropic API key
     * @returns {Promise<string>} Generated title
     * @private
     */
    async generateTitleWithAnthropic(prompt, apiKey) {
        const url = 'https://api.anthropic.com/v1/messages';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 80,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic title request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text?.trim() || '';
    }

    /**
     * Update conversation title display
     * @param {string} title - New title
     */
    updateConversationTitleDisplay(title) {
        console.log('updateConversationTitleDisplay called with title:', title);
        console.log('agentConversationTitle element:', this.elements.agentConversationTitle);

        if (this.elements.agentConversationTitle) {
            // Strip markdown formatting from the title before displaying
            const cleanTitle = Utils.stripMarkdown(title);
            this.currentConversationTitle = cleanTitle;
            this.elements.agentConversationTitle.textContent = cleanTitle;
            console.log('Successfully updated conversation title to:', cleanTitle);

            // Notify session manager to save the title
            const titleUpdateEvent = new CustomEvent('updateSessionTitle', {
                detail: { title: cleanTitle }
            });
            window.dispatchEvent(titleUpdateEvent);
            console.log('Dispatched updateSessionTitle event with title:', cleanTitle);
        } else {
            console.warn('agentConversationTitle element not found');
        }
    }

    /**
     * Scroll AI chat to bottom
     * @private
     */
    scrollToBottom() {
        // Scroll main chat window instead of AI companion panel
        DOMUtils.scrollToBottom(this.elements.chatWindow);
    }

    /**
     * Enable AI companion
     */
    enable() {
        this.isEnabled = true;
        localStorage.setItem('enableLLM', 'true');
        this.togglePanel(true);
        this.updateStatus();
        console.log('AI Companion enabled');
    }

    /**
     * Disable AI companion
     */
    disable() {
        this.isEnabled = false;
        localStorage.setItem('enableLLM', 'false');
        this.togglePanel(false);
        this.updateStatus();
        console.log('AI Companion disabled');
    }

    /**
     * Set AI provider
     * @param {string} provider - Provider name
     */
    setProvider(provider) {
        this.currentProvider = provider;
        localStorage.setItem('selectedApiProvider', provider);
        this.updateStatus();
        this.updateTokenDisplays(); // Update displays when provider changes

        // Sync dropdown if switching to Ollama
        if (provider === 'ollama') {
            setTimeout(() => this.syncModelDropdownSelection(), 500);
        }

        console.log('AI provider set to:', provider);
    }

    /**
     * Check if AI companion is enabled
     * @returns {boolean} Enabled status
     */
    isAIEnabled() {
        return this.isEnabled;
    }

    /**
     * Get current provider
     * @returns {string} Current provider
     */
    getCurrentProvider() {
        return this.currentProvider;
    }

    /**
     * Setup KPI click handlers for modal display
     * @private
     */
    setupKPIClickHandlers() {
        // Add click handlers to KPI items
        const kpiItems = document.querySelectorAll('.kpi-item');
        kpiItems.forEach((item, index) => {
            DOMUtils.addEventListener(item, 'click', () => {
                const kpiTypes = ['accuracy', 'helpfulness', 'completeness', 'humanlikeness', 'efficiency', 'changes'];
                this.showKPIModal(kpiTypes[index]);
            });
        });

        // Modal close handlers
        if (this.elements.kpiModalClose) {
            DOMUtils.addEventListener(this.elements.kpiModalClose, 'click', () => {
                this.hideKPIModal();
            });
        }

        if (this.elements.kpiModal) {
            DOMUtils.addEventListener(this.elements.kpiModal, 'click', (e) => {
                if (e.target === this.elements.kpiModal) {
                    this.hideKPIModal();
                }
            });
        }

        // KPI Explanation toggle handler
        if (this.elements.kpiExplanationToggle) {
            DOMUtils.addEventListener(this.elements.kpiExplanationToggle, 'click', () => {
                this.toggleKPIExplanation();
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.kpiModal.classList.contains('show')) {
                this.hideKPIModal();
            }
        });
    }

    /**
     * Show KPI detail modal
     * @param {string} kpiType - Type of KPI (accuracy, helpfulness, completeness, changes)
     * @private
     */
    showKPIModal(kpiType) {
        if (!this.elements.kpiModal) return;

        console.log('[AI Companion] Opening KPI modal for type:', kpiType);

        const kpiData = this.getKPIDetails(kpiType);
        console.log('[AI Companion] KPI data retrieved:', kpiData);

        // Update modal content
        this.elements.kpiModalTitle.textContent = `${kpiData.title} Score Details`;
        this.elements.kpiModalScore.textContent = kpiData.score;

        // Update calculation details
        this.elements.kpiModalDetails.innerHTML = this.generateCalculationHTML(kpiData);

        // Update conversation context
        this.elements.kpiModalMessages.innerHTML = this.generateContextHTML(kpiType);

        // Show modal
        this.elements.kpiModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide KPI detail modal
     * @private
     */
    hideKPIModal() {
        if (!this.elements.kpiModal) return;

        this.elements.kpiModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    /**
     * Toggle KPI explanation area visibility
     * @private
     */
    toggleKPIExplanation() {
        if (!this.elements.kpiExplanationArea || !this.elements.kpiExplanationToggle) return;

        const isVisible = this.elements.kpiExplanationArea.style.display !== 'none';
        const toggleIcon = this.elements.kpiExplanationToggle.querySelector('span');

        if (isVisible) {
            // Hide explanation
            this.elements.kpiExplanationArea.style.display = 'none';
            if (toggleIcon) toggleIcon.textContent = '▼';
        } else {
            // Show explanation
            this.elements.kpiExplanationArea.style.display = 'block';
            if (toggleIcon) toggleIcon.textContent = '▲';
        }
    }



    /**
     * Get KPI details for modal display
     * @param {string} kpiType - Type of KPI
     * @returns {Object} KPI details
     * @private
     */
    getKPIDetails(kpiType) {
        const titles = {
            accuracy: 'Accuracy',
            helpfulness: 'Helpfulness',
            completeness: 'Completeness',
            humanlikeness: 'Human-Likeness',
            efficiency: 'Efficiency',
            changes: 'Changes'
        };

        const scores = {
            accuracy: `${this.kpiData.accuracy.toFixed(1)}/10`,
            helpfulness: `${this.kpiData.helpfulness.toFixed(1)}/10`,
            completeness: `${this.kpiData.completeness.toFixed(1)}/10`,
            humanlikeness: `${this.kpiData.humanlikeness.toFixed(1)}/10`,
            efficiency: `${this.kpiData.efficiency.toFixed(1)}/10`,
            changes: this.kpiData.changes.toString()
        };

        return {
            title: titles[kpiType],
            score: scores[kpiType],
            type: kpiType
        };
    }

    /**
     * Generate calculation details HTML
     * @param {Object} kpiData - KPI data object
     * @returns {string} HTML string
     * @private
     */
    generateCalculationHTML(kpiData) {
        const type = kpiData.type;
        let html = '';

        if (type === 'accuracy') {
            html = `
                <div class="calculation-item">
                    <span class="calculation-label">🎯 Evaluation Method:</span>
                    <span class="calculation-value">LLM-powered intelligent analysis</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📊 Analysis Criteria:</span>
                    <span class="calculation-value">Factual correctness, source reliability, information precision</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">🤖 AI Provider:</span>
                    <span class="calculation-value">${this.currentProvider} (${this.isEnabled ? 'Active' : 'Inactive'})</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📝 Context Window:</span>
                    <span class="calculation-value">Full conversation history for comprehensive assessment</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>🏆 Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.accuracy.toFixed(1)}/10</strong></span>
                </div>
            `;
        } else if (type === 'helpfulness') {
            html = `
                <div class="calculation-item">
                    <span class="calculation-label">🎯 Evaluation Method:</span>
                    <span class="calculation-value">LLM-powered intelligent analysis</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📊 Analysis Criteria:</span>
                    <span class="calculation-value">Actionable insights, practical guidance, problem-solving value</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">🤖 AI Provider:</span>
                    <span class="calculation-value">${this.currentProvider} (${this.isEnabled ? 'Active' : 'Inactive'})</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📝 Context Window:</span>
                    <span class="calculation-value">User needs analysis with conversation context</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>🏆 Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.helpfulness.toFixed(1)}/10</strong></span>
                </div>
            `;
        } else if (type === 'completeness') {
            html = `
                <div class="calculation-item">
                    <span class="calculation-label">🎯 Evaluation Method:</span>
                    <span class="calculation-value">LLM-powered intelligent analysis</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📊 Analysis Criteria:</span>
                    <span class="calculation-value">Comprehensive coverage, depth of information, thoroughness</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">🤖 AI Provider:</span>
                    <span class="calculation-value">${this.currentProvider} (${this.isEnabled ? 'Active' : 'Inactive'})</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📝 Context Window:</span>
                    <span class="calculation-value">Topic scope assessment with conversation history</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>🏆 Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.completeness.toFixed(1)}/10</strong></span>
                </div>
            `;
        } else if (type === 'humanlikeness') {
            // Show detailed LLM evaluation breakdown if available
            const hasLLMEvaluation = this.lastHLSEvaluation && typeof this.lastHLSEvaluation === 'object';

            if (hasLLMEvaluation) {
                html = `
                    <div class="calculation-item">
                        <span class="calculation-label">🎯 Evaluation Method:</span>
                        <span class="calculation-value">Advanced LLM-powered 5-dimension analysis</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">📊 Relevance & Coherence (30%):</span>
                        <span class="calculation-value">${this.lastHLSEvaluation.breakdown?.relevance || 'N/A'}/100</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">🧠 Depth & Understanding (25%):</span>
                        <span class="calculation-value">${this.lastHLSEvaluation.breakdown?.depth || 'N/A'}/100</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">🔄 Adaptability & Iteration (20%):</span>
                        <span class="calculation-value">${this.lastHLSEvaluation.breakdown?.adaptability || 'N/A'}/100</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">💬 Expressiveness & Natural Language (15%):</span>
                        <span class="calculation-value">${this.lastHLSEvaluation.breakdown?.expressiveness || 'N/A'}/100</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">🤝 Engagement & Responsiveness (10%):</span>
                        <span class="calculation-value">${this.lastHLSEvaluation.breakdown?.engagement || 'N/A'}/100</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">🤖 AI Provider:</span>
                        <span class="calculation-value">${this.currentProvider} (${this.isEnabled ? 'Active' : 'Inactive'})</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">📝 LLM Explanation:</span>
                        <span class="calculation-value" style="font-size: 0.9em; line-height: 1.4;">${this.lastHLSEvaluation.overallAssessment?.summary?.substring(0, 200) || 'No detailed explanation available'}${this.lastHLSEvaluation.overallAssessment?.summary?.length > 200 ? '...' : ''}</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label"><strong>🏆 Weighted Final Score:</strong></span>
                        <span class="calculation-value"><strong>${this.kpiData.humanlikeness.toFixed(1)}/10</strong></span>
                    </div>
                `;
            } else {
                html = `
                    <div class="calculation-item">
                        <span class="calculation-label">🎯 Evaluation Method:</span>
                        <span class="calculation-value">LLM-powered 5-dimension human-likeness analysis</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">📊 Analysis Dimensions:</span>
                        <span class="calculation-value">Relevance, Depth, Adaptability, Expressiveness, Engagement</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">⚖️ Weighted Scoring:</span>
                        <span class="calculation-value">25% + 25% + 20% + 20% + 10% = 100%</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">🤖 AI Provider:</span>
                        <span class="calculation-value">${this.currentProvider} (${this.isEnabled ? 'Active' : 'Inactive'})</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label">📝 Context Window:</span>
                        <span class="calculation-value">Full conversation for contextual human-like assessment</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calculation-label"><strong>🏆 Final Score:</strong></span>
                        <span class="calculation-value"><strong>${this.kpiData.humanlikeness.toFixed(1)}/10</strong></span>
                    </div>
                `;
            }
        } else if (type === 'efficiency') {
            const avgResponseTimeFormatted = this.timeTracking.avgResponseTime > 0 ?
                `${(this.timeTracking.avgResponseTime / 1000).toFixed(1)}s` : 'N/A';
            const totalConversationTimeFormatted = this.timeTracking.totalConversationTime > 0 ?
                `${(this.timeTracking.totalConversationTime / 60000).toFixed(1)}m` : 'N/A';

            html = `
                <div class="calculation-item">
                    <span class="calculation-label">Average Response Time:</span>
                    <span class="calculation-value">${avgResponseTimeFormatted}</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Total Conversation Time:</span>
                    <span class="calculation-value">${totalConversationTimeFormatted}</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Message Count:</span>
                    <span class="calculation-value">${this.timeTracking.messageCount}</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Industry Standards:</span>
                    <span class="calculation-value">≤2s: Excellent, ≤10s: Good, ≤30s: Acceptable</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Scoring Factors:</span>
                    <span class="calculation-value positive">Response speed, consistency, conversation flow</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.efficiency.toFixed(1)}/10</strong></span>
                </div>
            `;
        } else if (type === 'changes') {
            html = `
                <div class="calculation-item kpi-explanation-header">
                    <span class="calculation-label">🔄 What is "Changes"?</span>
                    <span class="calculation-value">Conversation Evolution Tracker</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📊 Current Count:</span>
                    <span class="calculation-value">${this.kpiData.changes} AI responses analyzed</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📈 Performance Trend:</span>
                    <span class="calculation-value">${this.kpiData.trend === 'improving' ? '↗ Improving' : this.kpiData.trend === 'declining' ? '↘ Declining' : '→ Stable'}</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">⚖️ Average Score (5 metrics):</span>
                    <span class="calculation-value">${((this.kpiData.accuracy + this.kpiData.helpfulness + this.kpiData.completeness + this.kpiData.humanlikeness + this.kpiData.efficiency) / 5).toFixed(1)}/10</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">🎯 How It Works:</span>
                    <span class="calculation-value">Increments +1 each time AI Companion analyzes an agent response</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">💡 User Benefits:</span>
                    <span class="calculation-value">
                        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.6;">
                            <li><strong>Conversation Health:</strong> Track how actively you're engaging with AI</li>
                            <li><strong>Quality Monitoring:</strong> See if responses improve over time</li>
                            <li><strong>Session Comparison:</strong> Compare productivity across different conversations</li>
                            <li><strong>Learning Insights:</strong> Identify when conversations become more effective</li>
                        </ul>
                    </span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">📋 Practical Use Cases:</span>
                    <span class="calculation-value">
                        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.6;">
                            <li><strong>Low Changes (1-5):</strong> Quick questions or single-response needs</li>
                            <li><strong>Medium Changes (6-15):</strong> Problem-solving sessions or exploratory conversations</li>
                            <li><strong>High Changes (16+):</strong> Deep collaboration, complex projects, or learning sessions</li>
                        </ul>
                    </span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">🚀 Optimization Tips:</span>
                    <span class="calculation-value">
                        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.6;">
                            <li>Higher change counts often indicate more interactive, productive conversations</li>
                            <li>Declining trends suggest you may need to adjust your prompting strategy</li>
                            <li>Stable improving trends show effective collaboration patterns</li>
                        </ul>
                    </span>
                </div>
            `;
        }

        return html;
    }

    /**
     * Generate conversation context HTML
     * @param {string} kpiType - Type of KPI
     * @returns {string} HTML string
     * @private
     */
    generateContextHTML(kpiType) {
        // Get the current analysis context to ensure we show what's actually being used
        const currentAnalysisContext = this.getAdaptiveConversationContext('analysis');
        const analysisContextToUse = this.lastKPIAnalysisContext || currentAnalysisContext;

        console.log(`[AI Companion] Generating context HTML - stored context length: ${this.lastKPIAnalysisContext?.length || 0}, current context length: ${currentAnalysisContext.length}`);

        if (!analysisContextToUse || analysisContextToUse === 'No conversation available.') {
            return '<p>No conversation context available for analysis. The KPI analysis uses conversation context from the session manager.</p>';
        }

        // Parse the context string that was actually used for analysis
        const contextLines = analysisContextToUse.split('\n').filter(line =>
            line.startsWith('User:') || line.startsWith('Agent:')
        );

        console.log(`[AI Companion] Context HTML: Found ${contextLines.length} messages in analysis context`);

        if (contextLines.length === 0) {
            return '<p>No parsed messages found in conversation context. Debug info: Context preview: ' + analysisContextToUse.substring(0, 200) + '...</p>';
        }

        let html = `<div class="context-summary">
            <strong>KPI Analysis Context: </strong> ${contextLines.length} messages used for ${kpiType} analysis
            <br><small>Last analysis: ${new Date().toLocaleTimeString()}</small>
        </div>`;

        // Show recent messages from the actual analysis context, ordered chronologically (old to new)
        const recentMessages = contextLines.slice(-10); // Show last 10 messages

        // Ensure chronological order from oldest to newest
        recentMessages.forEach((line, index) => {
            const isUser = line.startsWith('User:');
            const role = isUser ? 'user' : 'assistant';
            const content = line.substring(isUser ? 5 : 6); // Remove "User:" or "Agent:"

            const analysis = !isUser ? this.getContextualMessageAnalysis(content, kpiType) : 'User message - provides context for agent analysis';

            // Calculate message number (chronological from start of context window)
            const messageNumber = contextLines.length - 10 + index + 1;
            const messageIndex = messageNumber > 0 ? messageNumber : index + 1;

            html += `
                <div class="context-message ${role}">
                    <div class="message-role">#${messageIndex} ${isUser ? 'User' : 'Agent'}</div>
                    <div class="message-content">${content.substring(0, 200)}${content.length > 200 ? '...' : ''}</div>
                    <div class="message-analysis">${analysis}</div>
                </div>
            `;
        });

        return html;
    }

    /**
     * Get analysis for a specific message based on KPI type
     * @param {Object} message - Message object
     * @param {string} kpiType - Type of KPI
     * @returns {string} Analysis text
     * @private
     */
    getMessageAnalysis(message, kpiType) {
        if (message.role !== 'assistant') {
            return 'User message - not analyzed for scoring';
        }

        const content = message.content.toLowerCase();
        return this.getContextualMessageAnalysis(content, kpiType);
    }

    /**
     * Get contextual analysis for message content based on KPI type
     * @param {string} content - Message content (can be string from context)
     * @param {string} kpiType - Type of KPI
     * @returns {string} Analysis text
     * @private
     */
    getContextualMessageAnalysis(content, kpiType) {
        const lowerContent = typeof content === 'string' ? content.toLowerCase() : '';

        switch (kpiType) {
            case 'accuracy':
                return '🎯 Evaluated by LLM for factual correctness and information precision';

            case 'helpfulness':
                return '🤝 Analyzed for actionable guidance and practical problem-solving value';

            case 'completeness':
                return '📋 Assessed for comprehensive coverage and thoroughness by AI analysis';

            case 'humanlikeness':
                if (this.lastHLSEvaluation && this.lastHLSEvaluation.overallAssessment) {
                    const standoutQualities = this.lastHLSEvaluation.overallAssessment.standoutQualities || [];
                    const mainWeaknesses = this.lastHLSEvaluation.overallAssessment.mainWeaknesses || [];

                    let analysis = '🤖 LLM-evaluated human-likeness: ';
                    if (standoutQualities.length > 0) {
                        analysis += `Strengths: ${standoutQualities.slice(0, 2).join(', ')}`;
                    }
                    if (mainWeaknesses.length > 0) {
                        analysis += standoutQualities.length > 0 ? ` | Improvements: ${mainWeaknesses[0]}` : `Areas for improvement: ${mainWeaknesses[0]}`;
                    }
                    return analysis || '🤖 Comprehensive 5-dimension human-likeness analysis';
                }
                return '🤖 LLM-powered human-likeness analysis across 5 dimensions';

            case 'efficiency':
                return '⚡ Response timing and conversation flow analysis';

            default:
                return '📊 LLM-powered intelligent analysis';
        }
    }

    /**
     * Load model-specific token data from localStorage
     * @returns {Object} Model token data
     * @private
     */
    loadModelTokens() {
        const stored = localStorage.getItem('aiCompanion_modelTokens');
        return stored ? JSON.parse(stored) : {};
    }

    /**
     * Save model-specific token data to localStorage
     * @private
     */
    saveModelTokens() {
        localStorage.setItem('aiCompanion_modelTokens', JSON.stringify(this.tokenTracking.modelTokens));
    }

    /**
     * Get current model identifier
     * @returns {string} Model identifier
     * @private
     */
    getCurrentModelId() {
        if (this.currentProvider === 'ollama') {
            const model = localStorage.getItem('ollamaSelectedModel') || 'unknown';
            return `ollama_${model}`;
        } else if (this.currentProvider === 'azure') {
            const deployment = localStorage.getItem('azureDeployment') || 'unknown';
            return `azure_${deployment}`;
        } else {
            return this.currentProvider || 'unknown';
        }
    }

    /**
     * Get current model display name
     * @returns {string} Model display name
     * @private
     */
    getCurrentModelName() {
        if (this.currentProvider === 'ollama') {
            const modelName = localStorage.getItem('ollamaSelectedModel') || 'No Model Selected';
            return modelName !== 'No Model Selected' ? `Companion Model: ${modelName}` : 'No Model Selected';
        } else if (this.currentProvider === 'azure') {
            const deployment = localStorage.getItem('azureDeployment');
            return deployment ? `Companion Model: Azure: ${deployment}` : 'Companion Model: Azure OpenAI';
        } else if (this.currentProvider === 'openai') {
            return 'Companion Model: OpenAI GPT';
        } else if (this.currentProvider === 'anthropic') {
            return 'Companion Model: Anthropic Claude';
        }
        return 'Companion Model: Unknown Model';
    }

    /**
     * Load conversation tokens for current conversation
     * @param {string} conversationId - Conversation ID
     * @private
     */
    loadConversationTokens(conversationId) {
        if (!conversationId) return;

        const stored = localStorage.getItem(`aiCompanion_conversationTokens_${conversationId}`);
        if (stored) {
            this.tokenTracking.conversationTokens = parseInt(stored);
        } else {
            this.tokenTracking.conversationTokens = 0;
        }
        this.tokenTracking.currentConversationId = conversationId;
    }

    /**
     * Save conversation tokens for current conversation
     * @private
     */
    saveConversationTokens() {
        if (!this.tokenTracking.currentConversationId) return;

        localStorage.setItem(
            `aiCompanion_conversationTokens_${this.tokenTracking.currentConversationId}`,
            this.tokenTracking.conversationTokens.toString()
        );
    }

    /**
     * Estimate token usage for content (rough approximation)
     * @param {string} content - Content to estimate tokens for
     * @param {boolean} isInput - Whether this is input (user) or output (assistant) content
     * @private
     */
    estimateTokenUsage(content, isInput = false) {
        if (!content) return;

        // Rough token estimation: ~4 characters per token for English text
        const estimatedTokens = Math.ceil(content.length / 4);

        const usage = isInput ?
            { prompt_tokens: estimatedTokens, completion_tokens: 0 } :
            { prompt_tokens: 0, completion_tokens: estimatedTokens };

        this.trackTokenUsage(usage);
    }

    /**
     * Track token consumption from API response
     * @param {Object} usage - Usage information from API response
     * @public
     */
    trackTokenUsage(usage) {
        if (!usage) return;

        const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
        const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;

        // Update conversation tokens
        this.tokenTracking.conversationTokens += totalTokens;
        this.saveConversationTokens();

        // Update model-specific tokens
        const modelId = this.getCurrentModelId();
        if (!this.tokenTracking.modelTokens[modelId]) {
            this.tokenTracking.modelTokens[modelId] = {
                total: 0,
                input: 0,
                output: 0
            };
        }

        this.tokenTracking.modelTokens[modelId].total += totalTokens;
        this.tokenTracking.modelTokens[modelId].input += inputTokens;
        this.tokenTracking.modelTokens[modelId].output += outputTokens;
        this.saveModelTokens();

        // Update displays
        this.updateTokenDisplays();

        console.log('[AI Companion] Token usage tracked:', {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
            conversationTotal: this.tokenTracking.conversationTokens,
            modelId: modelId,
            modelTotal: this.tokenTracking.modelTokens[modelId].total
        });
    }

    /**
     * Update all token displays
     * @private
     */
    updateTokenDisplays() {
        this.updateKPIConsumption();
        this.updateModelComparisonView();
    }

    /**
     * Sync the model dropdown selection with the current model
     * @private
     */
    async syncModelDropdownSelection() {
        // Only sync for Ollama provider since that's the only one with a model dropdown
        if (this.currentProvider !== 'ollama') {
            console.log('[AI Companion] Skipping dropdown sync - not using Ollama provider');
            return;
        }

        const ollamaModelSelect = DOMUtils.getElementById('ollamaModelSelect');
        if (!ollamaModelSelect) {
            console.log('[AI Companion] Model dropdown not found');
            return;
        }

        const currentModel = localStorage.getItem('ollamaSelectedModel');
        if (!currentModel) {
            console.log('[AI Companion] No current model saved');
            return;
        }

        console.log('[AI Companion] Attempting to sync dropdown to model:', currentModel);
        console.log('[AI Companion] Dropdown options count:', ollamaModelSelect.options.length);

        // Log all available options for debugging
        const availableOptions = Array.from(ollamaModelSelect.options).map(opt => opt.value).filter(v => v);
        console.log('[AI Companion] Available model options:', availableOptions);

        // Check if dropdown is empty or only has placeholder
        const hasModels = ollamaModelSelect.options.length > 1 &&
            Array.from(ollamaModelSelect.options).some(option => option.value && option.value !== '');

        if (!hasModels) {
            console.log('[AI Companion] No models loaded in dropdown, attempting to refresh models');

            // Try to trigger model refresh if application is available
            if (window.MCSChatApp && window.MCSChatApp.refreshOllamaModels) {
                try {
                    await window.MCSChatApp.refreshOllamaModels();
                    console.log('[AI Companion] Models refreshed, retrying sync');

                    // Retry sync after refresh
                    setTimeout(() => this.syncModelDropdownSelection(), 500);
                    return;
                } catch (error) {
                    console.error('[AI Companion] Failed to refresh models:', error);
                }
            }
        }

        // Check if the current model exists in the dropdown options
        const modelExists = Array.from(ollamaModelSelect.options).some(option => option.value === currentModel);

        if (modelExists) {
            // Set the dropdown to show the current model
            ollamaModelSelect.value = currentModel;
            console.log('[AI Companion] ✅ Successfully synced dropdown to model:', currentModel);
        } else {
            // If model doesn't exist in dropdown, log detailed info for debugging
            console.log('[AI Companion] ❌ Current model not found in dropdown:', {
                currentModel,
                availableOptions,
                dropdownOptionsCount: ollamaModelSelect.options.length
            });
        }
    }

    /**
     * Update KPI consumption display
     * @private
     */
    updateKPIConsumption() {
        if (!this.elements.kpiConsumption) return;

        const tokens = this.tokenTracking.conversationTokens;
        this.elements.kpiConsumption.textContent = this.formatTokenCount(tokens);

        // Update progress bar (scale to a reasonable max, e.g., 10K tokens)
        const maxTokens = 10000;
        const percentage = Math.min((tokens / maxTokens) * 100, 100);
        if (this.elements.kpiConsumptionBar) {
            this.elements.kpiConsumptionBar.style.width = `${percentage}%`;

            // Color coding based on usage
            let color = '#10b981'; // Green
            if (percentage > 75) color = '#ef4444'; // Red
            else if (percentage > 50) color = '#f59e0b'; // Yellow

            this.elements.kpiConsumptionBar.style.background = color;
        }
    }

    /**
     * Format token count for display
     * @param {number} count - Token count
     * @returns {string} Formatted count
     * @private
     */
    formatTokenCount(count) {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    /**
     * Reset current model token metrics
     * @public
     */
    resetModelTokens() {
        const modelId = this.getCurrentModelId();
        if (this.tokenTracking.modelTokens[modelId]) {
            delete this.tokenTracking.modelTokens[modelId];
            this.saveModelTokens();
            this.updateModelComparisonView();
            console.log(`[AI Companion] Reset token metrics for model: ${modelId}`);
        }
    }

    /**
     * Reset all model token metrics
     * @public
     */
    resetAllModelTokens() {
        if (confirm('Are you sure you want to reset token metrics for ALL models? This action cannot be undone.')) {
            this.tokenTracking.modelTokens = {};
            this.saveModelTokens();
            this.updateModelComparisonView();
            console.log('[AI Companion] Reset token metrics for all models');
        }
    }

    /**
     * Update the model comparison view in settings
     * @public
     */
    updateModelComparisonView() {
        if (!this.elements.modelComparisonTable) return;

        const currentModelId = this.getCurrentModelId();
        const modelTokens = this.tokenTracking.modelTokens;
        const modelEntries = Object.entries(modelTokens);

        if (modelEntries.length === 0) {
            this.elements.modelComparisonTable.innerHTML = `
                <div class="model-comparison-empty">
                    No token usage data available yet.<br>
                    Start using AI models to see comparison data here.
                </div>
            `;
            return;
        }

        // Sort models by total token usage (descending)
        modelEntries.sort((a, b) => b[1].total - a[1].total);

        let html = `
            <div class="model-comparison-header-row">
                <div>Model Name</div>
                <div>Total Tokens</div>
                <div>Input Tokens</div>
                <div>Output Tokens</div>
                <div>Actions</div>
            </div>
        `;

        modelEntries.forEach(([modelId, tokens]) => {
            const displayName = this.getModelDisplayName(modelId);
            const isCurrent = modelId === currentModelId;
            const provider = this.getProviderFromModelId(modelId);

            html += `
                <div class="model-comparison-row ${isCurrent ? 'current-model' : ''}">
                    <div class="model-name ${isCurrent ? 'current' : ''}">
                        ${displayName}
                        <span class="provider-tag">${provider}</span>
                        ${isCurrent ? ' (current)' : ''}
                    </div>
                    <div class="token-stat total">${this.formatTokenCount(tokens.total)}</div>
                    <div class="token-stat">${this.formatTokenCount(tokens.input)}</div>
                    <div class="token-stat">${this.formatTokenCount(tokens.output)}</div>
                    <div class="model-actions">
                        <button type="button" class="model-action-btn reset-model-btn" 
                                onclick="aiCompanion.resetSpecificModelTokens('${modelId}')"
                                title="Reset this model's tokens">
                            Reset
                        </button>
                    </div>
                </div>
            `;
        });

        this.elements.modelComparisonTable.innerHTML = html;
    }

    /**
     * Get display name for a model ID
     * @param {string} modelId - Model ID
     * @returns {string} Display name
     * @private
     */
    getModelDisplayName(modelId) {
        if (modelId.startsWith('ollama_')) {
            return modelId.substring(7); // Remove 'ollama_' prefix
        } else if (modelId.startsWith('azure_')) {
            return modelId.substring(6); // Remove 'azure_' prefix
        } else if (modelId === 'openai') {
            return 'OpenAI GPT';
        } else if (modelId === 'anthropic') {
            return 'Anthropic Claude';
        }
        return modelId;
    }

    /**
     * Get provider name from model ID
     * @param {string} modelId - Model ID
     * @returns {string} Provider name
     * @private
     */
    getProviderFromModelId(modelId) {
        if (modelId.startsWith('ollama_')) {
            return 'Ollama';
        } else if (modelId.startsWith('azure_')) {
            return 'Azure';
        } else if (modelId === 'openai') {
            return 'OpenAI';
        } else if (modelId === 'anthropic') {
            return 'Anthropic';
        }
        return 'Unknown';
    }

    /**
     * Reset tokens for a specific model
     * @param {string} modelId - Model ID to reset
     * @public
     */
    resetSpecificModelTokens(modelId) {
        const displayName = this.getModelDisplayName(modelId);
        if (confirm(`Reset token metrics for "${displayName}"?`)) {
            delete this.tokenTracking.modelTokens[modelId];
            this.saveModelTokens();
            this.updateModelComparisonView();

            console.log(`[AI Companion] Reset token metrics for model: ${modelId}`);
        }
    }

    /**
     * Reset first-use flag for current model (for troubleshooting performance issues)
     * @public
     */
    resetModelFirstUseFlag() {
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        if (selectedModel) {
            const modelStateKey = `ollama_${selectedModel}_firstUse`;
            localStorage.removeItem(modelStateKey);
            console.log(`[AI Companion] First-use flag reset for model: ${selectedModel}. Next invocation will use extended timeout.`);
            return true;
        }
        return false;
    }

    /**
     * Get model performance state information
     * @returns {Object} Model state info
     * @public
     */
    getModelPerformanceState() {
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        if (!selectedModel) {
            return { error: 'No model selected' };
        }

        const modelStateKey = `ollama_${selectedModel}_firstUse`;
        const hasBeenUsed = !!localStorage.getItem(modelStateKey);

        return {
            model: selectedModel,
            hasBeenUsed: hasBeenUsed,
            nextInvocation: hasBeenUsed ? 'Standard response time expected' : 'First use - may take longer for model loading',
            notificationsEnabled: true,
            approachType: 'User-friendly notifications (no hard timeouts)'
        };
    }

    /**
     * Set current conversation ID and load its tokens
     * @param {string} conversationId - Conversation ID
     * @public
     */
    setConversationId(conversationId) {
        this.loadConversationTokens(conversationId);
        this.updateKPIConsumption();
    }

    // ================================
    // Speech Functionality
    // ================================

    /**
     * Initialize enhanced speech functionality with multiple providers
     * @private
     */
    async initializeSpeech() {
        console.log('[AICompanion] Initializing enhanced speech functionality...');

        try {
            // Initialize the speech engine with current settings
            await speechEngine.initialize();

            // Sync settings from aiCompanion to speechEngine
            speechEngine.settings = { ...speechEngine.settings, ...this.speechSettings };

            // Switch to the preferred provider
            await speechEngine.switchProvider(this.speechSettings.provider);

            // Update state
            this.speechState.isInitialized = true;
            this.speechState.currentProvider = speechEngine.state.currentProvider;
            this.speechState.capabilities = speechEngine.getCapabilities();
            this.speechState.availableVoices = await speechEngine.getAvailableVoices();

            // Setup UI controls
            this.setupSpeechControls();

            // Listen for speech provider fallback notifications
            window.addEventListener('speechProviderFallback', async (event) => {
                const { message } = event.detail;
                console.warn('[AICompanion] Speech provider fallback:', message);

                // Show user-friendly notification
                this.showNotification('system', message, 5000);

                // Update UI to reflect the fallback
                await this.updateSpeechProviderUI();
            });

            console.log('[AICompanion] Enhanced speech functionality initialized successfully');
            console.log('[AICompanion] Current provider:', this.speechSettings.provider);
            console.log('[AICompanion] Capabilities:', this.speechState.capabilities);

        } catch (error) {
            console.error('[AICompanion] Failed to initialize speech functionality:', error);
            this.speechState.isInitialized = false;
        }
    }

    /**
     * Test speech recognition compatibility
     * @private
     */
    testSpeechRecognitionCompatibility() {
        if (!this.speechState.recognition) {
            console.log('[AICompanion] Speech recognition not available for testing');
            return;
        }

        console.log('[AICompanion] Testing speech recognition compatibility...');

        // Set up a temporary error handler for testing
        const originalErrorHandler = this.speechState.recognition.onerror;
        let testCompleted = false;

        this.speechState.recognition.onerror = (event) => {
            if (!testCompleted) {
                testCompleted = true;
                console.warn('[AICompanion] Speech recognition test failed:', event.error);

                if (event.error === 'language-not-supported') {
                    console.log('[AICompanion] Language not supported during test, reinitializing...');
                    this.handleLanguageNotSupported();
                }

                // Restore original error handler
                if (this.speechState.recognition) {
                    this.speechState.recognition.onerror = originalErrorHandler;
                }
            }
        };

        // Test with a very short timeout
        try {
            // Don't actually start recognition, just test if the current settings are valid
            console.log('[AICompanion] Speech recognition appears to be configured correctly');

            // Restore original error handler after a short delay
            setTimeout(() => {
                if (this.speechState.recognition && !testCompleted) {
                    this.speechState.recognition.onerror = originalErrorHandler;
                    console.log('[AICompanion] Speech recognition test completed successfully');
                }
            }, 100);

        } catch (error) {
            testCompleted = true;
            console.warn('[AICompanion] Speech recognition test error:', error);

            // Restore original error handler
            if (this.speechState.recognition) {
                this.speechState.recognition.onerror = originalErrorHandler;
            }
        }
    }

    /**
     * Load available speech synthesis voices
     * @private
     */
    loadVoices() {
        this.speechState.availableVoices = speechSynthesis.getVoices();
        this.populateVoiceDropdown();
    }

    /**
     * Populate the voice selection dropdown
     * @private
     */
    populateVoiceDropdown() {
        const voiceSelect = document.getElementById('speechVoiceSelect');
        if (!voiceSelect) return;

        // Clear existing options
        voiceSelect.innerHTML = '<option value="">Default Voice</option>';

        // Add available voices
        this.speechState.availableVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.name === this.speechSettings.selectedVoice) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });
    }

    /**
     * Set speech recognition language with fallback options
     * @private
     */
    setSpeechRecognitionLanguage() {
        if (!this.speechState.recognition) return;

        // Get browser/system language
        const browserLang = navigator.language || navigator.userLanguage || 'en-US';
        console.log('[AICompanion] Browser language detected:', browserLang);

        // Define supported languages with fallbacks (more conservative approach)
        const supportedLanguages = [
            'en',                 // Generic English (most widely supported)
            '',                   // Browser default (let browser decide)
            'en-US',              // Standard English
            browserLang,          // Try browser language
            browserLang.split('-')[0], // Try language without region
            'en-GB'               // British English as last resort
        ];

        // Test each language until one works
        for (const lang of supportedLanguages) {
            try {
                this.speechState.recognition.lang = lang;
                console.log('[AICompanion] Set speech recognition language to:', lang || 'browser default');

                // Test if the language is actually supported by attempting a quick validation
                // Note: This doesn't guarantee it will work, but it's better than nothing
                return;
            } catch (error) {
                console.warn('[AICompanion] Language not supported during setup:', lang, error);
                continue;
            }
        }

        // If no language worked during setup, default to empty string
        this.speechState.recognition.lang = '';
        console.log('[AICompanion] Using browser default language as fallback');
    }

    /**
     * Setup speech recognition event handlers
     * @private
     */
    setupSpeechRecognition() {
        if (!this.speechState.recognition) return;

        this.speechState.recognition.onstart = () => {
            this.speechState.isRecording = true;
            this.updateVoiceInputButton();
        };

        this.speechState.recognition.onend = () => {
            this.speechState.isRecording = false;
            this.updateVoiceInputButton();
        };

        this.speechState.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.handleSpeechInput(transcript);
        };

        this.speechState.recognition.onerror = (event) => {
            console.error('[AICompanion] Speech recognition error:', event.error);
            this.speechState.isRecording = false;
            this.updateVoiceInputButton();

            // Handle specific error types
            if (event.error === 'language-not-supported') {
                console.warn('[AICompanion] Language not supported, trying fallback language');
                this.handleLanguageNotSupported();
            } else if (event.error === 'network') {
                console.warn('[AICompanion] Network error during speech recognition');
                this.showSpeechError('Network error. Please check your internet connection.');
            } else if (event.error === 'not-allowed') {
                console.warn('[AICompanion] Microphone access denied');
                this.showSpeechError('Microphone access denied. Please allow microphone access and try again.');
            } else if (event.error === 'no-speech') {
                console.log('[AICompanion] No speech detected');
                // Don't show error for no speech - this is normal
            } else {
                this.showSpeechError(`Speech recognition error: ${event.error}`);
            }
        };
    }

    /**
     * Handle language not supported error by trying fallback languages
     * @private
     */
    handleLanguageNotSupported() {
        console.log('[AICompanion] Attempting to reinitialize speech recognition with fallback language');

        // Try to reinitialize with fallback languages
        const fallbackLanguages = ['en', '', 'en-GB', 'en-AU'];

        for (const lang of fallbackLanguages) {
            try {
                // Reinitialize speech recognition with fallback language
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    this.speechState.recognition = new SpeechRecognition();
                    this.speechState.recognition.continuous = false;
                    this.speechState.recognition.interimResults = false;
                    this.speechState.recognition.lang = lang;

                    // Re-setup event handlers
                    this.setupSpeechRecognition();

                    console.log('[AICompanion] Successfully reinitialized speech recognition with language:', lang || 'browser default');
                    return; // Success, exit the loop
                }
            } catch (error) {
                console.warn('[AICompanion] Failed to reinitialize with language:', lang, error);
                continue;
            }
        }

        // If all fallbacks failed, disable speech recognition
        console.error('[AICompanion] All language fallbacks failed, disabling speech recognition');
        this.speechState.recognition = null;
        this.showSpeechError('Speech recognition is not available in your browser language.');

        // Hide voice input button since it won't work
        const voiceButton = document.getElementById('voiceInputBtn');
        if (voiceButton) {
            voiceButton.style.display = 'none';
        }
    }

    /**
     * Show speech error message to user
     * @param {string} message - Error message
     * @private
     */
    showSpeechError(message) {
        // Create a temporary error indicator
        const voiceButton = document.getElementById('voiceInputBtn');
        if (voiceButton) {
            const originalTitle = voiceButton.title;
            voiceButton.title = message;
            voiceButton.style.background = '#ef4444';

            // Reset after 3 seconds
            setTimeout(() => {
                voiceButton.title = originalTitle;
                voiceButton.style.background = '';
            }, 3000);
        }

        console.warn('[AICompanion] Speech error shown to user:', message);
    }

    /**
     * Setup enhanced speech control event handlers with multiple providers
     * @private
     */
    setupSpeechControls() {
        console.log('[AICompanion] Setting up enhanced speech controls...');

        // Provider selection dropdown
        const providerSelect = document.getElementById('speechProvider');
        if (providerSelect) {
            providerSelect.value = this.speechSettings.provider;
            providerSelect.addEventListener('change', async (e) => {
                const newProvider = e.target.value;
                console.log('[AICompanion] Switching speech provider to:', newProvider);

                this.speechSettings.provider = newProvider;
                localStorage.setItem('speechProvider', newProvider);

                // Switch provider in speech engine
                try {
                    // If switching to Azure, sync Azure settings first
                    if (newProvider === 'azure') {
                        speechEngine.settings.azureSettings = { ...this.speechSettings.azureSettings };
                        speechEngine.saveSettings();
                        console.log('[AICompanion] Azure settings synced to speech engine:', this.speechSettings.azureSettings);
                    }

                    await speechEngine.switchProvider(newProvider);
                    this.speechState.currentProvider = speechEngine.state.currentProvider;
                    this.speechState.capabilities = speechEngine.getCapabilities();
                    this.speechState.availableVoices = await speechEngine.getAvailableVoices();

                    // Update UI based on new capabilities
                    this.updateVoiceOptions();
                    this.toggleVoiceInputButton();
                    this.toggleAzureSettings();

                    // Validate selected voice is compatible with new provider
                    // If not, reset to default for the new provider
                    if (this.speechSettings.selectedVoice && Array.isArray(this.speechState.availableVoices)) {
                        const selectedVoiceExists = this.speechState.availableVoices.some(voice => {
                            const voiceValue = (newProvider === 'local_ai' && voice.localUri) ? voice.localUri : (voice.name || voice.voiceURI);
                            return voiceValue === this.speechSettings.selectedVoice;
                        });

                        if (!selectedVoiceExists) {
                            console.log(`[AICompanion] Selected voice "${this.speechSettings.selectedVoice}" not available in ${newProvider}, resetting to default`);
                            this.speechSettings.selectedVoice = '';
                            localStorage.setItem('speechSelectedVoice', '');
                        }
                    }

                    console.log('[AICompanion] Speech provider switched successfully to:', newProvider);
                    console.log('[AICompanion] Current provider in engine:', speechEngine.state.currentProvider);
                } catch (error) {
                    console.error('[AICompanion] Failed to switch speech provider:', error);
                    // Revert selection on error
                    providerSelect.value = this.speechSettings.provider;
                }
            });
        }

        // Auto-speak checkbox
        const autoSpeakCheckbox = document.getElementById('speechAutoSpeak');
        if (autoSpeakCheckbox) {
            autoSpeakCheckbox.checked = this.speechSettings.autoSpeak;
            console.log('[AICompanion] Auto-speak checkbox set to:', this.speechSettings.autoSpeak);
            autoSpeakCheckbox.addEventListener('change', (e) => {
                this.speechSettings.autoSpeak = e.target.checked;
                localStorage.setItem('speechAutoSpeak', e.target.checked.toString());
                console.log('[AICompanion] Auto-speak setting changed to:', e.target.checked);
            });
        } else {
            console.warn('[AICompanion] Auto-speak checkbox not found in DOM');
        }

        // Voice input checkbox
        const voiceInputCheckbox = document.getElementById('speechVoiceInput');
        if (voiceInputCheckbox) {
            voiceInputCheckbox.checked = this.speechSettings.voiceInput;
            voiceInputCheckbox.addEventListener('change', (e) => {
                this.speechSettings.voiceInput = e.target.checked;
                localStorage.setItem('speechVoiceInput', e.target.checked.toString());
                this.toggleVoiceInputButton();
            });
        }

        // Voice selection dropdown
        const voiceSelect = document.getElementById('speechVoiceSelect');
        if (voiceSelect) {
            voiceSelect.addEventListener('change', (e) => {
                this.speechSettings.selectedVoice = e.target.value;
                localStorage.setItem('speechSelectedVoice', e.target.value);

                // Update speech engine settings
                speechEngine.settings.selectedVoice = e.target.value;
                speechEngine.saveSettings();
            });
        }

        // Speech rate slider
        const rateSlider = document.getElementById('speechRate');
        const rateValue = document.getElementById('speechRateValue');
        if (rateSlider && rateValue) {
            rateSlider.value = this.speechSettings.speechRate;
            rateValue.textContent = `${this.speechSettings.speechRate}x`;
            rateSlider.addEventListener('input', (e) => {
                this.speechSettings.speechRate = parseFloat(e.target.value);
                rateValue.textContent = `${this.speechSettings.speechRate}x`;
                localStorage.setItem('speechRate', this.speechSettings.speechRate.toString());

                // Update speech engine settings
                speechEngine.settings.speechRate = this.speechSettings.speechRate;
                speechEngine.saveSettings();
            });
        }

        // Volume slider
        const volumeSlider = document.getElementById('speechVolume');
        const volumeValue = document.getElementById('speechVolumeValue');
        if (volumeSlider && volumeValue) {
            volumeSlider.value = this.speechSettings.speechVolume * 100;
            volumeValue.textContent = `${Math.round(this.speechSettings.speechVolume * 100)}%`;
            volumeSlider.addEventListener('input', (e) => {
                this.speechSettings.speechVolume = parseFloat(e.target.value) / 100;
                volumeValue.textContent = `${Math.round(this.speechSettings.speechVolume * 100)}%`;
                localStorage.setItem('speechVolume', this.speechSettings.speechVolume.toString());

                // Update speech engine settings
                speechEngine.settings.speechVolume = this.speechSettings.speechVolume;
                speechEngine.saveSettings();
            });
        }

        // Naturalness slider
        const naturalnessSlider = document.getElementById('speechNaturalness');
        const naturalnessValue = document.getElementById('speechNaturalnessValue');
        if (naturalnessSlider && naturalnessValue) {
            naturalnessSlider.value = this.speechSettings.naturalness * 100;
            naturalnessValue.textContent = `${Math.round(this.speechSettings.naturalness * 100)}%`;
            naturalnessSlider.addEventListener('input', (e) => {
                this.speechSettings.naturalness = parseFloat(e.target.value) / 100;
                naturalnessValue.textContent = `${Math.round(this.speechSettings.naturalness * 100)}%`;
                localStorage.setItem('speechNaturalness', this.speechSettings.naturalness.toString());

                // Update speech engine settings
                speechEngine.settings.naturalness = this.speechSettings.naturalness;
                speechEngine.saveSettings();
            });
        }

        // Azure settings controls
        this.setupAzureControls();

        // Test speech button
        const testButton = document.getElementById('testSpeechBtn');
        if (testButton) {
            testButton.addEventListener('click', () => {
                this.testSpeech();
            });
        }

        // Multi-language settings
        this.setupMultiLanguageControls();

        // Initial setup
        this.updateVoiceOptions();
        this.toggleVoiceInputButton();
        this.toggleAzureSettings();
    }

    /**
     * Setup Azure Speech Services controls
     * @private
     */
    setupAzureControls() {
        // Azure subscription key
        const azureKeyInput = document.getElementById('azureSubscriptionKey');
        if (azureKeyInput) {
            azureKeyInput.value = this.speechSettings.azureSettings.subscriptionKey;
            azureKeyInput.addEventListener('input', (e) => {
                this.speechSettings.azureSettings.subscriptionKey = e.target.value;
                this.saveAzureSettings();
            });
        }

        // Azure region
        const azureRegionSelect = document.getElementById('azureRegion');
        if (azureRegionSelect) {
            azureRegionSelect.value = this.speechSettings.azureSettings.region;
            azureRegionSelect.addEventListener('change', (e) => {
                this.speechSettings.azureSettings.region = e.target.value;
                this.saveAzureSettings();
            });
        }

        // Azure voice name
        const azureVoiceSelect = document.getElementById('azureVoiceName');
        if (azureVoiceSelect) {
            azureVoiceSelect.value = this.speechSettings.azureSettings.voiceName;
            azureVoiceSelect.addEventListener('change', (e) => {
                this.speechSettings.azureSettings.voiceName = e.target.value;
                this.saveAzureSettings();
            });
        }
    }

    /**
     * Save Azure settings to storage
     * @private
     */
    saveAzureSettings() {
        localStorage.setItem('speechAzureSettings', JSON.stringify(this.speechSettings.azureSettings));

        // Always update speech engine settings so they're available when switching to Azure
        speechEngine.settings.azureSettings = { ...this.speechSettings.azureSettings };
        speechEngine.saveSettings();

        console.log('[AICompanion] Azure settings saved and synced to speech engine:', this.speechSettings.azureSettings);
    }

    /**
     * Setup multi-language controls
     * @private
     */
    setupMultiLanguageControls() {
        // Auto-detect language checkbox
        const autoDetectCheckbox = document.getElementById('autoDetectLanguage');
        if (autoDetectCheckbox) {
            autoDetectCheckbox.checked = this.speechSettings.autoDetectLanguage;
            autoDetectCheckbox.addEventListener('change', (e) => {
                this.speechSettings.autoDetectLanguage = e.target.checked;
                localStorage.setItem('speechAutoDetectLanguage', e.target.checked.toString());
                this.updateSpeechEngineLanguageSettings();
                console.log('[AICompanion] Auto-detect language setting changed to:', e.target.checked);
            });
        }

        // Enable language detection checkbox
        const enableDetectionCheckbox = document.getElementById('enableLanguageDetection');
        if (enableDetectionCheckbox) {
            enableDetectionCheckbox.checked = this.speechSettings.enableLanguageDetection;
            enableDetectionCheckbox.addEventListener('change', (e) => {
                this.speechSettings.enableLanguageDetection = e.target.checked;
                localStorage.setItem('speechEnableLanguageDetection', e.target.checked.toString());
                this.updateSpeechEngineLanguageSettings();
                console.log('[AICompanion] Enable language detection setting changed to:', e.target.checked);
            });
        }

        // Continuous language detection checkbox
        const continuousDetectionCheckbox = document.getElementById('continuousLanguageDetection');
        if (continuousDetectionCheckbox) {
            continuousDetectionCheckbox.checked = this.speechSettings.continuousLanguageDetection;
            continuousDetectionCheckbox.addEventListener('change', (e) => {
                this.speechSettings.continuousLanguageDetection = e.target.checked;
                localStorage.setItem('speechContinuousLanguageDetection', e.target.checked.toString());
                this.updateSpeechEngineLanguageSettings();
                console.log('[AICompanion] Continuous language detection setting changed to:', e.target.checked);
            });
        }

        // Candidate languages multi-select
        const candidateLanguagesSelect = document.getElementById('candidateLanguages');
        if (candidateLanguagesSelect) {
            // Set initial selection based on saved settings
            this.updateCandidateLanguagesSelection(candidateLanguagesSelect);

            candidateLanguagesSelect.addEventListener('change', (e) => {
                const selectedLanguages = Array.from(e.target.selectedOptions).map(option => option.value);
                this.speechSettings.candidateLanguages = selectedLanguages;
                localStorage.setItem('speechCandidateLanguages', JSON.stringify(selectedLanguages));
                this.updateSpeechEngineLanguageSettings();
                console.log('[AICompanion] Candidate languages changed to:', selectedLanguages);
            });
        }
    }

    /**
     * Update candidate languages selection in UI
     * @private
     */
    updateCandidateLanguagesSelection(selectElement) {
        if (!selectElement) return;

        // Clear current selection
        Array.from(selectElement.options).forEach(option => {
            option.selected = false;
        });

        // Set selection based on saved candidate languages
        this.speechSettings.candidateLanguages.forEach(langCode => {
            const option = selectElement.querySelector(`option[value="${langCode}"]`);
            if (option) {
                option.selected = true;
            }
        });
    }

    /**
     * Update speech engine with current language settings
     * @private
     */
    updateSpeechEngineLanguageSettings() {
        if (speechEngine) {
            speechEngine.setAutoDetectLanguage(this.speechSettings.autoDetectLanguage);
            speechEngine.setLanguageDetection(
                this.speechSettings.enableLanguageDetection,
                this.speechSettings.continuousLanguageDetection,
                this.speechSettings.candidateLanguages
            );
            speechEngine.saveSettings();
        }
    }

    /**
     * Toggle Azure settings panel visibility
     * @private
     */
    toggleAzureSettings() {
        const azureSettings = document.getElementById('azureSpeechSettings');
        if (azureSettings) {
            azureSettings.style.display = this.speechSettings.provider === 'azure' ? 'block' : 'none';
        }
    }

    /**
     * Update voice options based on current provider
     * @private
     */
    updateVoiceOptions() {
        const voiceSelect = document.getElementById('speechVoiceSelect');
        if (voiceSelect && this.speechState.availableVoices && Array.isArray(this.speechState.availableVoices)) {
            voiceSelect.innerHTML = '<option value="">Default</option>';

            this.speechState.availableVoices.forEach(voice => {
                const option = document.createElement('option');

                // For Local AI models, use localUri as the value (voice ID like "neutral", "warm", etc.)
                // For other providers, use the voice name or voiceURI
                if (voice.localUri && this.speechSettings.provider === 'local_ai') {
                    option.value = voice.localUri;
                } else {
                    option.value = voice.name || voice.voiceURI;
                }

                option.textContent = `${voice.name} (${voice.lang})`;
                if (voice.naturalness) {
                    option.textContent += ` - ${Math.round(voice.naturalness * 100)}% natural`;
                }
                voiceSelect.appendChild(option);
            });

            // Restore selected voice
            if (this.speechSettings.selectedVoice) {
                voiceSelect.value = this.speechSettings.selectedVoice;
            }
        }
    }

    /**
     * Update speech provider UI after fallback
     * @private
     */
    async updateSpeechProviderUI() {
        // Update provider selection dropdown to reflect actual provider
        const providerSelect = document.getElementById('speechProvider');
        if (providerSelect && speechEngine) {
            this.speechSettings.provider = speechEngine.settings.provider;
            providerSelect.value = this.speechSettings.provider;

            // Update capabilities and voices
            this.speechState.capabilities = speechEngine.getCapabilities();
            this.speechState.availableVoices = await speechEngine.getAvailableVoices();

            // Update UI components
            this.updateVoiceOptions();
            this.toggleVoiceInputButton();
            this.toggleAzureSettings();
        }
    }

    /**
     * Speak text using the enhanced speech engine
     * @param {string} text - Text to speak
     * @param {boolean} forceSpeak - Force speaking even if auto-speak is disabled
     * @public
     */
    async speakText(text, options = {}) {
        // Handle legacy boolean parameter for backward compatibility
        const forceSpeak = typeof options === 'boolean' ? options : options.forceSpeak || false;
        const actualOptions = typeof options === 'object' ? options : {};

        console.log('[AICompanion] speakText called:', {
            text: text?.substring(0, 50) + '...',
            forceSpeak,
            autoDetectLanguage: actualOptions.autoDetectLanguage,
            autoSpeak: this.speechSettings.autoSpeak,
            isInitialized: this.speechState.isInitialized,
            provider: this.speechSettings.provider
        });

        if (!this.speechState.isInitialized) {
            console.warn('[AICompanion] Speech not initialized');
            return false;
        }

        if (!forceSpeak && !this.speechSettings.autoSpeak) {
            console.log('[AICompanion] Auto-speak disabled, skipping speech');
            return false;
        }

        if (!text?.trim()) {
            console.warn('[AICompanion] No text to speak');
            return false;
        }

        try {
            // Use the enhanced speech engine with multi-language support
            const success = await speechEngine.speakText(text, {
                forceSpeak,
                rate: this.speechSettings.speechRate,
                volume: this.speechSettings.speechVolume,
                voice: this.speechSettings.selectedVoice,
                naturalness: this.speechSettings.naturalness,
                autoDetectLanguage: actualOptions?.autoDetectLanguage || false,
                ...actualOptions
            });

            if (success) {
                console.log('[AICompanion] Speech synthesis successful');
                this.updateSpeakerButtons();
            } else {
                console.warn('[AICompanion] Speech synthesis failed');

                // Show user-friendly message for Local AI audio issues
                if (this.speechSettings.provider === 'local_ai') {
                    this.showNotification('system', 'Speech synthesis failed. If using Local AI, please ensure you\'ve clicked somewhere on the page first to enable audio.', 4000);
                }
            }

            return success;
        } catch (error) {
            console.error('[AICompanion] Speech synthesis error:', error);

            // Handle AudioContext errors specifically
            if (error.message && error.message.includes('user interaction')) {
                this.showNotification('system', 'Audio requires user interaction. Please click anywhere on the page and try speaking again.', 5000);
            } else if (error.message && error.message.includes('AudioContext')) {
                this.showNotification('system', 'Audio initialization failed. Please refresh the page and try again.', 5000);
            } else {
                this.showNotification('system', 'Speech synthesis failed. Please try again.', 3000);
            }

            return false;
        }
    }

    /**
     * Stop current speech using enhanced speech engine
     * @public
     */
    stopSpeaking() {
        if (this.speechState.isInitialized) {
            speechEngine.stopSpeaking();
            this.updateSpeakerButtons();
        }
        this.speechState.currentUtterance = null;
        this.updateSpeakerButtons();
    }

    /**
     * Speak text with progress tracking for UI progress bars
     * @param {string} text - Text to speak
     * @param {Object} options - Speech options with progress callbacks
     * @param {Function} options.onProgress - Progress callback (0-100)
     * @param {Function} options.onComplete - Completion callback
     * @param {Function} options.onError - Error callback
     * @param {boolean} options.forceSpeak - Force speaking even if auto-speak is disabled
     * @public
     */
    async speakTextWithProgress(text, options = {}) {
        console.log('[AICompanion] speakTextWithProgress called:', {
            text: text?.substring(0, 50) + '...',
            hasProgressCallback: !!options.onProgress,
            provider: this.speechSettings.provider
        });

        const { onProgress, onComplete, onError, forceSpeak = false } = options;

        if (!this.speechState.isInitialized) {
            console.warn('[AICompanion] Speech not initialized');
            onError?.(new Error('Speech not initialized'));
            return false;
        }

        if (!forceSpeak && !this.speechSettings.autoSpeak) {
            console.log('[AICompanion] Auto-speak disabled, skipping speech');
            onComplete?.();
            return false;
        }

        if (!text?.trim()) {
            console.warn('[AICompanion] No text to speak');
            onError?.(new Error('No text to speak'));
            return false;
        }

        try {
            console.log('[AICompanion] Starting speech with real progress tracking from speech engine');

            // Use the enhanced speech engine with real progress callbacks
            const success = await speechEngine.speakText(text, {
                forceSpeak,
                rate: this.speechSettings.speechRate,
                volume: this.speechSettings.speechVolume,
                voice: this.speechSettings.selectedVoice,
                naturalness: this.speechSettings.naturalness,

                // Pass through the real progress callbacks from speech engine
                onProgress: (progress) => {
                    console.log(`[AICompanion] Real progress from speech engine: ${Math.round(progress * 100)}%`);
                    onProgress?.(progress);
                },
                onComplete: () => {
                    console.log('[AICompanion] Speech synthesis completed via speech engine');
                    this.updateSpeakerButtons();
                    onComplete?.();
                },
                onError: (error) => {
                    console.error('[AICompanion] Speech engine error:', error);
                    onError?.(error);
                }
            });

            return success;
        } catch (error) {
            console.error('[AICompanion] Speech synthesis with progress error:', error);
            onError?.(error);
            return false;
        }
    }

    /**
     * Clean text for speech synthesis
     * @param {string} text - Raw text
     * @returns {string} Cleaned text
     * @private
     */
    cleanTextForSpeech(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
            .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
            .replace(/`(.*?)`/g, '$1')       // Remove code markdown
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
            .replace(/#{1,6}\s*/g, '')       // Remove heading markers
            .replace(/^\s*[-*+]\s+/gm, '')   // Remove list markers
            .replace(/^\s*\d+\.\s+/gm, '')   // Remove numbered list markers
            // Remove standalone URLs (http/https/ftp)
            .replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '')
            .replace(/ftp:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '')
            // Remove www URLs
            .replace(/www\.[^\s<>"{}|\\^`\[\]]+/gi, '')
            // Remove email addresses
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '')
            // Remove HTML tags
            .replace(/<[^>]*>/g, '')
            .replace(/\n{2,}/g, '. ')        // Convert multiple newlines to periods
            .replace(/\n/g, ' ')             // Convert single newlines to spaces
            .replace(/\s{2,}/g, ' ')         // Normalize multiple spaces
            .trim();
    }

    /**
     * Test speech with current settings
     * @private
     */
    async testSpeech() {
        const testText = "This is a test of the enhanced speech synthesis settings. The current provider and voice configuration have been optimized for natural speech delivery.";
        await this.speakText(testText, true);
    }

    /**
     * Start voice input using enhanced speech engine
     * @public
     */
    async startVoiceInput() {
        if (!this.speechState.isInitialized) {
            this.showSpeechError('Speech engine is not initialized.');
            return;
        }

        if (!this.speechState.capabilities.supportsSpeechRecognition) {
            this.showSpeechError('Speech recognition is not supported by the current provider.');
            return;
        }

        if (this.speechState.isRecording) {
            console.log('[AICompanion] Speech recognition already in progress');
            return;
        }

        try {
            console.log('[AICompanion] Starting enhanced speech recognition...');
            this.speechState.isRecording = true;
            this.updateVoiceInputButton();

            const transcript = await speechEngine.startSpeechRecognition({
                language: navigator.language || 'en-US',
                interimResults: false
            });

            if (transcript) {
                this.handleSpeechInput(transcript);
            }

        } catch (error) {
            console.error('[AICompanion] Enhanced speech recognition failed:', error);

            if (error.message.includes('permission')) {
                this.showSpeechError('Microphone access denied. Please allow microphone access.');
            } else if (error.message.includes('network')) {
                this.showSpeechError('Network error during speech recognition. Please check your connection.');
            } else {
                this.showSpeechError('Failed to start voice input. Please try again.');
            }
        } finally {
            this.speechState.isRecording = false;
            this.updateVoiceInputButton();
        }
    }

    /**
     * Handle speech input result
     * @param {string} transcript - Recognized speech
     * @private
     */
    handleSpeechInput(transcript) {
        const messageInput = document.getElementById('userInput');

        // Ensure transcript is a valid string
        let transcriptText = '';
        if (typeof transcript === 'string') {
            transcriptText = transcript.trim();
        } else if (transcript && typeof transcript === 'object') {
            // Handle case where transcript might be an object with text property
            transcriptText = (transcript.text || transcript.transcript || String(transcript)).trim();
        } else if (transcript) {
            // Convert other types to string
            transcriptText = String(transcript).trim();
        }

        if (messageInput && transcriptText) {
            messageInput.value = transcriptText;
            messageInput.focus();
        }
    }

    /**
     * Toggle voice input button visibility based on enhanced capabilities
     * @private
     */
    toggleVoiceInputButton() {
        const voiceButton = document.getElementById('voiceInputBtn');
        if (voiceButton) {
            // Check if voice input is enabled and supported by current provider
            const shouldShow = this.speechSettings.voiceInput &&
                this.speechState.isInitialized &&
                this.speechState.capabilities.supportsSpeechRecognition;

            voiceButton.style.display = shouldShow ? 'flex' : 'none';

            if (!shouldShow && this.speechSettings.voiceInput) {
                console.log('[AICompanion] Voice input disabled - not supported by current provider:', this.speechSettings.provider);
            }
        }
    }

    /**
     * Update voice input button state
     * @private
     */
    updateVoiceInputButton() {
        const voiceButton = document.getElementById('voiceInputBtn');
        if (voiceButton) {
            voiceButton.classList.toggle('recording', this.speechState.isRecording);
        }
    }

    /**
     * Update speaker button states
     * @private
     */
    updateSpeakerButtons() {
        const speakerButtons = document.querySelectorAll('.message-speaker-btn');
        speakerButtons.forEach(button => {
            button.classList.toggle('speaking', this.speechState.isProcessing);
        });
    }

    /**
     * Handle agent message for potential auto-speaking
     * @param {string} messageText - Agent message text
     * @public
     */
    handleAgentMessage(messageText) {
        console.log('[AICompanion] handleAgentMessage called:', {
            messageText: messageText?.substring(0, 50) + '...',
            autoSpeak: this.speechSettings.autoSpeak,
            isInitialized: this.speechState.isInitialized
        });

        if (this.speechSettings.autoSpeak) {
            // Small delay to ensure message is rendered
            setTimeout(() => {
                console.log('[AICompanion] Attempting to speak agent message');
                this.speakText(messageText);
            }, 100);
        }
    }

    /**
     * Get general knowledge response with streaming for A/B test
     * @param {string} question - User question
     * @param {HTMLElement} messageDiv - Message div for streaming updates
     * @param {string} currentContent - Current content to append to
     * @returns {string} Complete general knowledge response
     * @private
     */
    async getGeneralKnowledgeResponseStreaming(question, messageDiv, currentContent) {
        const prompt = `Please answer this question using only your general knowledge. Do not reference any conversation context or previous messages. Provide a helpful, accurate response based solely on your training data.

Question: ${question}`;

        // Estimate and track token usage
        this.estimateTokenUsage(prompt, true);

        let fullResponse = '';

        if (this.currentProvider === 'ollama') {
            // Stream from Ollama
            fullResponse = await this.streamOllamaResponse(prompt, messageDiv, currentContent, '');
        } else {
            // For API providers, get response and simulate streaming
            const response = await this.getAPIEvaluation(prompt);
            fullResponse = await this.simulateStreamingForAPI(response, messageDiv, currentContent, '');
        }

        return fullResponse;
    }

    /**
     * Get comparison analysis with streaming for A/B test
     * @param {string} question - Original question
     * @param {string} generalResponse - General knowledge response
     * @param {string} agentResponse - Agent response
     * @param {HTMLElement} messageDiv - Message div for streaming updates
     * @param {string} currentContent - Current content to append to
     * @returns {string} Complete comparison analysis
     * @private
     */
    async getComparisonAnalysisStreaming(question, generalResponse, agentResponse, messageDiv, currentContent) {
        const prompt = `You are an expert conversation analyst conducting a scientific A/B test evaluation. Compare these two responses and provide an objective, context-aware analysis.

**ORIGINAL QUESTION:**
${question}

**OPTION A: General Knowledge Response (Control Group)**
${generalResponse}

**OPTION B: Agent Response with Conversation Context (Treatment Group)**
${agentResponse}

**CRITICAL EVALUATION INSTRUCTIONS:**
Before scoring, first determine the QUESTION TYPE to apply appropriate evaluation criteria:

**QUESTION TYPE ANALYSIS:**
1. **Context-Specific Questions** (company processes, internal documents, specific environment):
   - Questions about specific companies, organizations, or environments
   - Questions referencing "our company", "this system", or specific internal processes
   - Questions requiring domain-specific or proprietary knowledge
   - For these: Agent with context should typically score higher on accuracy and relevance

2. **General Knowledge Questions** (broad topics, common facts):
   - Questions about general concepts, historical facts, or universal principles
   - Questions that can be answered from public knowledge
   - Questions not tied to specific organizations or contexts
   - For these: Both approaches may be equally valid

**EVALUATION CRITERIA:**
Analyze both responses considering the question type:

1. **Accuracy**: 
   - For context-specific questions: Prioritize responses with specific, contextual information
   - For general questions: Prioritize factual correctness from reliable sources

2. **Relevance**: 
   - Consider if the question requires specific context vs general knowledge
   - Score higher for responses that match the question's scope and context

3. **Completeness**: 
   - Evaluate coverage appropriate to the question type
   - Context-specific questions need context-specific completeness

4. **Practical Value**: 
   - For specific environments: Actionable, context-relevant advice scores higher
   - For general topics: Broad applicability may be more valuable

5. **Clarity**: 
   - Clear communication regardless of question type

**REQUIRED OUTPUT FORMAT:**
# 📊 Context-Aware A/B Test Analysis

## 🔍 Question Type Classification
**Question Type**: [Context-Specific / General Knowledge / Mixed]
**Reasoning**: [Brief explanation of why this classification applies]
**Optimal Response Type**: [Which approach should theoretically perform better and why]

## 🥇 Winner: [Option A: General Knowledge / Option B: Agent Context / Tie]

## 📈 Detailed Scoring (1-10 scale)
| Criteria | Option A (General) | Option B (Agent) | Winner | Context Consideration |
|----------|-------------------|------------------|---------|---------------------|
| Accuracy | X/10 | Y/10 | [A/B/Tie] | [How question type affects scoring] |
| Relevance | X/10 | Y/10 | [A/B/Tie] | [Context vs general applicability] |
| Completeness | X/10 | Y/10 | [A/B/Tie] | [Appropriate depth for question type] |
| Practical Value | X/10 | Y/10 | [A/B/Tie] | [Actionability in context] |
| Clarity | X/10 | Y/10 | [A/B/Tie] | [Communication effectiveness] |
| **Overall Score** | **X.X/10** | **Y.Y/10** | **[A/B/Tie]** | **[Final reasoning]** |

## 🎯 Key Findings
- **General Knowledge Strengths**: [Context-aware assessment of Option A]
- **Agent Context Strengths**: [Context-aware assessment of Option B]
- **Context Impact**: [How conversation context affected the quality of responses]

## 🚀 Improvement Recommendations
1. **For Context-Specific Questions**: [Targeted recommendations based on question type]
2. **For General Knowledge Questions**: [Broad applicability recommendations]
3. **Optimal Strategy**: [When to use each approach based on question characteristics]

## 💡 Takeaway
[Context-aware summary explaining which approach works better for THIS SPECIFIC TYPE of question, considering whether it requires general knowledge or specific contextual information]

**Important**: Be objective and context-aware. Don't default to favoring either approach - evaluate based on what the question actually requires.`;

        // Estimate and track token usage
        this.estimateTokenUsage(prompt, true);

        let fullResponse = '';

        if (this.currentProvider === 'ollama') {
            // Stream from Ollama
            fullResponse = await this.streamOllamaResponse(prompt, messageDiv, currentContent, '');
        } else {
            // For API providers, get response and simulate streaming
            const response = await this.getAPIEvaluation(prompt);
            fullResponse = await this.simulateStreamingForAPI(response, messageDiv, currentContent, '');
        }

        return fullResponse;
    }

    /**
     * Stream response from Ollama for A/B test components
     * @param {string} prompt - Prompt to send
     * @param {HTMLElement} messageDiv - Message div for streaming
     * @param {string} baseContent - Base content to append to
     * @param {string} sectionContent - Initial section content
     * @returns {string} Complete response
     * @private
     */
    async streamOllamaResponse(prompt, messageDiv, baseContent, sectionContent) {
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        if (!selectedModel) {
            throw new Error('No Ollama model selected');
        }

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                stream: true,
                options: {
                    temperature: 0.3,
                    top_p: 0.9
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        fullResponse += data.response;
                        // Update streaming content in real-time
                        this.updateStreamingContent(messageDiv, baseContent + sectionContent + fullResponse);

                        // Scroll to bottom to show new content
                        this.scrollToBottom();

                        // Small delay to make streaming visible
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                } catch (e) {
                    // Ignore invalid JSON lines
                }
            }
        }

        return fullResponse;
    }

    /**
     * Simulate streaming for API providers that don't support streaming
     * @param {string} response - Complete response
     * @param {HTMLElement} messageDiv - Message div for streaming
     * @param {string} baseContent - Base content to append to
     * @param {string} sectionContent - Initial section content
     * @returns {string} Complete response
     * @private
     */
    async simulateStreamingForAPI(response, messageDiv, baseContent, sectionContent) {
        const words = response.split(' ');
        let streamedContent = '';

        for (let i = 0; i < words.length; i++) {
            streamedContent += words[i] + (i < words.length - 1 ? ' ' : '');

            // Update streaming content
            this.updateStreamingContent(messageDiv, baseContent + sectionContent + streamedContent);

            // Scroll to bottom to show new content
            this.scrollToBottom();

            // Delay between words for streaming effect
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        return response;
    }

    /**
     * Generate and display KPI explanation in the right panel
     * @param {Object} results - KPI analysis results
     * @private
     */
    async generateAndDisplayKPIExplanation(results) {
        try {
            console.log('[AI Companion] Generating KPI explanation for right panel...');

            // Show the KPI explanation area if it's hidden
            this.showKPIExplanationArea();

            // Show loading indicator in the explanation area
            this.showKPIExplanationLoading();

            // Create a prompt to explain the KPI values
            const kpiExplanationPrompt = this.buildKPIExplanationPrompt(results);

            // Get explanation from LLM
            const explanation = await this.getLLMEvaluation(kpiExplanationPrompt);

            if (explanation && explanation.trim()) {
                // Display the explanation in the KPI explanation area
                this.displayKPIExplanation(explanation);
                console.log('[AI Companion] KPI explanation displayed in right panel');
            } else {
                console.warn('[AI Companion] Empty KPI explanation received');
                // Display a fallback explanation
                this.displayFallbackKPIExplanationInPanel(results);
            }
        } catch (error) {
            console.error('[AI Companion] Error generating KPI explanation:', error);
            // Display a fallback explanation in the panel
            this.displayFallbackKPIExplanationInPanel(results);
        }
    }

    /**
     * Build prompt for KPI explanation
     * @param {Object} results - KPI analysis results
     * @returns {string} Explanation prompt
     * @private
     */
    buildKPIExplanationPrompt(results) {
        const trendInfo = this.kpiData.trend === 'improving' ? '↗️ improving' :
            this.kpiData.trend === 'declining' ? '↘️ declining' : '→ stable';

        const conversationContext = this.getConversationContextForThinking();

        // Use centralized prompt manager
        return promptManager.getFormattedPrompt('kpiExplanation', {
            kpiName: 'Conversation Quality Metrics',
            kpiValue: `Accuracy: ${results.accuracy.toFixed(1)}/10, Helpfulness: ${results.helpfulness.toFixed(1)}/10, Completeness: ${results.completeness.toFixed(1)}/10, Efficiency: ${this.kpiData.efficiency.toFixed(1)}/10, Trend: ${trendInfo}`,
            kpiContext: results.reasoning || 'Based on conversation analysis and response quality assessment.',
            conversationContext: conversationContext || 'General conversation analysis'
        });
    }

    /**
     * Display fallback KPI explanation when LLM fails
     * @param {Object} results - KPI analysis results
     * @private
     */
    displayFallbackKPIExplanation(results) {
        const avgScore = ((results.accuracy + results.helpfulness + results.completeness + this.kpiData.efficiency) / 4).toFixed(1);
        const trendEmoji = this.kpiData.trend === 'improving' ? '📈' :
            this.kpiData.trend === 'declining' ? '📉' : '📊';

        const fallbackMessage = `## 📊 Conversation Quality Summary

**Overall Score**: ${avgScore}/10 ${trendEmoji}

**Key Metrics:**
• **Accuracy**: ${results.accuracy.toFixed(1)}/10
• **Helpfulness**: ${results.helpfulness.toFixed(1)}/10  
• **Completeness**: ${results.completeness.toFixed(1)}/10
• **Efficiency**: ${this.kpiData.efficiency.toFixed(1)}/10

The conversation quality is currently **${avgScore >= 8 ? 'excellent' : avgScore >= 6 ? 'good' : avgScore >= 4 ? 'fair' : 'needs improvement'}** with a **${this.kpiData.trend}** trend.`;

        this.renderMessage('assistant', fallbackMessage);
    }

    /**
     * Show KPI explanation area
     * @private
     */
    showKPIExplanationArea() {
        if (!this.elements.kpiExplanationArea) return;
        
        this.elements.kpiExplanationArea.style.display = 'block';
        
        // Update toggle button icon
        const toggleIcon = this.elements.kpiExplanationToggle?.querySelector('span');
        if (toggleIcon) toggleIcon.textContent = '▲';
    }

    /**
     * Show loading indicator in KPI explanation area
     * @private
     */
    showKPIExplanationLoading() {
        if (!this.elements.kpiExplanationContent) return;
        
        this.elements.kpiExplanationContent.innerHTML = `
            <div class="kpi-explanation-loading">
                <div class="loading-spinner"></div>
                <p>Generating KPI insights...</p>
            </div>
        `;
    }

    /**
     * Display KPI explanation in the dedicated area
     * @param {string} explanation - The explanation text (markdown)
     * @private
     */
    displayKPIExplanation(explanation) {
        if (!this.elements.kpiExplanationContent) return;
        
        // Process markdown if available
        let processedContent;
        try {
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                const htmlContent = marked.parse(explanation);
                processedContent = DOMPurify.sanitize(htmlContent);
            } else {
                // Fallback: simple HTML conversion
                processedContent = explanation
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/\n/g, '<br>')
                    .replace(/^\s*/, '<p>')
                    .replace(/\s*$/, '</p>');
            }
        } catch (error) {
            console.warn('[AI Companion] Error processing markdown:', error);
            processedContent = explanation.replace(/\n/g, '<br>');
        }
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        this.elements.kpiExplanationContent.innerHTML = `
            <div class="kpi-explanation-content-wrapper">
                <div class="kpi-explanation-timestamp">Generated at ${timestamp}</div>
                <div class="kpi-explanation-text">${processedContent}</div>
            </div>
        `;
    }

    /**
     * Display fallback KPI explanation in the panel when LLM fails
     * @param {Object} results - KPI analysis results
     * @private
     */
    displayFallbackKPIExplanationInPanel(results) {
        const avgScore = ((results.accuracy + results.helpfulness + results.completeness + this.kpiData.efficiency) / 4).toFixed(1);
        const trendEmoji = this.kpiData.trend === 'improving' ? '📈' :
            this.kpiData.trend === 'declining' ? '📉' : '📊';

        const fallbackMessage = `
            <h3>📊 Conversation Quality Summary</h3>
            <div class="kpi-summary-score">
                <strong>Overall Score:</strong> ${avgScore}/10 ${trendEmoji}
            </div>
            
            <div class="kpi-summary-metrics">
                <h4>Key Metrics:</h4>
                <ul>
                    <li><strong>Accuracy:</strong> ${results.accuracy.toFixed(1)}/10</li>
                    <li><strong>Helpfulness:</strong> ${results.helpfulness.toFixed(1)}/10</li>
                    <li><strong>Completeness:</strong> ${results.completeness.toFixed(1)}/10</li>
                    <li><strong>Efficiency:</strong> ${this.kpiData.efficiency.toFixed(1)}/10</li>
                </ul>
            </div>
            
            <div class="kpi-summary-conclusion">
                <p>The conversation quality is currently <strong>${avgScore >= 8 ? 'excellent' : avgScore >= 6 ? 'good' : avgScore >= 4 ? 'fair' : 'needs improvement'}</strong> with a <strong>${this.kpiData.trend}</strong> trend.</p>
            </div>
        `;

        // Add timestamp
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (this.elements.kpiExplanationContent) {
            this.elements.kpiExplanationContent.innerHTML = `
                <div class="kpi-explanation-content-wrapper">
                    <div class="kpi-explanation-timestamp">Generated at ${timestamp}</div>
                    <div class="kpi-explanation-text">${fallbackMessage}</div>
                </div>
            `;
        }
    }
}

// Create and export singleton instance
console.log('[AICompanion] Creating singleton instance...');
export const aiCompanion = new AICompanion();
console.log('[AICompanion] Singleton instance created - isEnabled:', aiCompanion.isEnabled, 'type:', typeof aiCompanion.isEnabled);

// Debug utilities for troubleshooting performance issues
if (typeof window !== 'undefined') {
    window.aiCompanionDebug = {
        getModelState: () => aiCompanion.getModelPerformanceState(),
        resetFirstUse: () => aiCompanion.resetModelFirstUseFlag(),
        resetTokens: () => aiCompanion.resetModelTokens(),
        checkKPIOptimization: () => aiCompanion.kpiOptimization,
        getAllFirstUseFlags: () => {
            const flags = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('ollama_') && key.includes('_firstUse')) {
                    flags[key] = localStorage.getItem(key);
                }
            }
            return flags;
        }
    };

    // Make aiCompanion available globally and add utility methods
    console.log('[AICompanion] Setting window.aiCompanion - before assignment, aiCompanion.isEnabled:', aiCompanion.isEnabled);
    window.aiCompanion = aiCompanion;
    console.log('[AICompanion] window.aiCompanion assigned - window.aiCompanion.isEnabled:', window.aiCompanion.isEnabled);

    // Add additional utility methods to the global instance
    window.aiCompanion.resetSpecificModelTokens = (modelId) => aiCompanion.resetSpecificModelTokens(modelId);

    // Verify the global assignment worked correctly
    console.log('[AICompanion] Global window.aiCompanion set:', {
        hasInstance: !!window.aiCompanion,
        isEnabled: window.aiCompanion.isEnabled,
        isEnabledType: typeof window.aiCompanion.isEnabled,
        hasSimulateMethod: typeof window.aiCompanion.simulateThinkingProcess,
        hasLoadSettings: typeof window.aiCompanion.loadSettings
    });

    // Add a global debug function to check AI companion status
    window.checkAICompanionStatus = () => {
        console.log('[Debug] AI Companion Status Check:', {
            windowAiCompanionExists: !!window.aiCompanion,
            isEnabled: window.aiCompanion ? window.aiCompanion.isEnabled : 'N/A',
            isEnabledType: window.aiCompanion ? typeof window.aiCompanion.isEnabled : 'N/A',
            localStorage_enableLLM: localStorage.getItem('enableLLM'),
            hasSimulateThinkingProcess: window.aiCompanion ? typeof window.aiCompanion.simulateThinkingProcess : 'N/A',
            canCallLoadSettings: window.aiCompanion ? typeof window.aiCompanion.loadSettings : 'N/A'
        });
        return {
            exists: !!window.aiCompanion,
            isEnabled: window.aiCompanion ? window.aiCompanion.isEnabled : null,
            localStorage: localStorage.getItem('enableLLM')
        };
    };

    // Add a global function to force reload AI companion settings
    window.forceReloadAICompanionSettings = () => {
        if (window.aiCompanion && window.aiCompanion.loadSettings) {
            console.log('[Debug] Force reloading AI companion settings...');
            const beforeState = {
                isEnabled: window.aiCompanion.isEnabled,
                localStorage: localStorage.getItem('enableLLM')
            };
            window.aiCompanion.loadSettings();
            const afterState = {
                isEnabled: window.aiCompanion.isEnabled,
                localStorage: localStorage.getItem('enableLLM')
            };
            console.log('[Debug] Settings reloaded:', { before: beforeState, after: afterState });
            return afterState;
        } else {
            console.error('[Debug] AI companion not available or missing loadSettings method');
            return null;
        }
    };
}
