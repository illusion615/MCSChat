/**
 * Main Application Controller
 * Orchestrates all modules and handles application lifecycle
 * 
 * Version: 2.0.0
 * Changelog:
 * - 2.0.0: Added version tracking and splash screen integration
 * - 1.9.0: Unified message system integration
 * - 1.8.0: DirectLineManagerSimple migration
 */

import { agentManager } from '../managers/agentManager.js';
import { sessionManager } from '../managers/sessionManager.js';
// DirectLine Service — unified connection + message queue component
import { directLineService } from '../components/directline/DirectLineService.js';
// Direct-to-Engine connector — alternative streaming transport (isolated, opt-in per agent)
import { directEngineConnector } from '../components/directline/DirectEngineConnector.js';
import { messageRenderer } from '../ui/messageRenderer.js';
import { aiCompanion } from '../ai/aiCompanion.js';
import { getKnowledgeHub } from '../services/knowledgeHub.js';
import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';
import { SecureStorage } from '../utils/secureStorage.js';
import { EnhancedTypingIndicator } from '../ui/enhancedTypingIndicator.js';
import { mobileUtils } from '../utils/mobileUtils.js';
import { statusIndicator } from '../utils/statusIndicator.js';
import { i18n } from '../utils/i18n.js';
import LoggingManager from '../services/simpleLoggingManager.js';

import { MessageIntegration } from '../ui/messageIntegration.js';

// Import adaptive card modal for global use
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';

const APPLICATION_VERSION = '2.0.0';
console.log(`⚙️ [Application] Version ${APPLICATION_VERSION} loaded`);

export class Application {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.selectedFiles = [];
        this.state = {
            isConnected: false,
            currentSession: null,
            currentAgent: null,
            aiCompanionMode: false,
            currentTheme: 'default'
        };

        // Track notification IDs for cleanup
        this.currentInitNotificationId = null;

        // Track thinking simulation evaluation period
        this.isEvaluatingThinkingSimulation = false;

        // Initialize enhanced typing indicator
        this.enhancedTypingIndicator = new EnhancedTypingIndicator();

        // Initialize mobile utilities
        this.mobileUtils = mobileUtils;

        // UNIFIED MESSAGE SYSTEM: Initialize the unified message system
        this.messageIntegration = new MessageIntegration();
        this.mobileUtils = mobileUtils;

        // DirectLineService is a singleton import — no instantiation needed

        // Initialize logging system - using simpler version
        this.loggingManager = new LoggingManager();
        // this.loggingUIManager = null; // Will be initialized after DOM is ready

        // Set up global logging manager for other modules
        window.globalLoggingManager = this.loggingManager;

        // Track UI state
        this.uiState = {
            leftPanelCollapsed: localStorage.getItem('leftPanelCollapsed') === 'true',
            messageIconsEnabled: localStorage.getItem('messageIconsEnabled') !== 'false', // Default to true
            showUserMessages: localStorage.getItem('appearanceShowUserMessages') !== 'false',
            showMetrics: localStorage.getItem('appearanceShowMetrics') !== 'false',
            autoHideMetadata: localStorage.getItem('appearanceAutoHideMetadata') !== 'false',
            autoHideSidebar: localStorage.getItem('appearanceAutoHideSidebar') === 'true'
        };

        // DirectLineService is a singleton — global reference for debugging only
        window.directLineService = directLineService;

        // Expose agentManager for AI Companion AutoQA
        this.agentManager = agentManager;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            this.initStartTime = Date.now();
            console.log('Initializing MCSChat application...');
            // Re-enable basic logging
            this.loggingManager.info('system', 'Application initialization started', {
                version: '2.0',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });

            this.showInitializationIndicator('Starting application...');

            // Initialize DOM elements
            this.updateInitializationIndicator('Initializing components...');
            this.initializeElements();

            // Attach global event listeners
            this.updateInitializationIndicator('Setting up event handlers...');
            this.attachEventListeners();

            // Initialize managers and services
            this.updateInitializationIndicator('Loading agent configurations...');
            await this.initializeManagers();

            // Initialize AI companion
            this.updateInitializationIndicator('Initializing AI companion...');
            await aiCompanion.initialize();
            this.aiCompanion = aiCompanion; // Assign to instance for access throughout the class

            // Initialize application icons that need the full icon collection
            this.updateInitializationIndicator('Setting up application icons...');
            await this.initializeApplicationIcons();

            // UNIFIED MESSAGE SYSTEM: Initialize the unified message system
            this.updateInitializationIndicator('Setting up unified message system...');
            await this.initializeUnifiedMessageSystem();

            // Update AI companion toggle visibility after initialization
            setTimeout(() => {
                this.updateAICompanionToggleVisibility();
            }, 100); // Small delay to ensure AI companion is fully initialized

            // Initialize Knowledge Hub
            this.updateInitializationIndicator('Initializing Knowledge Hub...');
            this.knowledgeHub = getKnowledgeHub();

            // Initialize mobile utilities
            this.updateInitializationIndicator('Setting up mobile interface...');
            if (this.mobileUtils) {
                this.mobileUtils.initializeMobileFeatures();
            }

            // Load UI state and user preferences
            this.updateInitializationIndicator('Loading user preferences...');
            this.loadUIState();

            // Load agents and try to connect (moved to after agentManager is initialized)
            this.updateInitializationIndicator('Connecting to agent...');
            await this.loadAndConnectAgent();

            this.isInitialized = true;
            console.log('Application initialized successfully');

            // Log successful initialization
            this.loggingManager.info('system', 'Application initialization completed successfully', {
                initializationTime: Date.now() - this.initStartTime,
                modulesLoaded: ['agentManager', 'sessionManager', 'directLineManager (NEW component)', 'messageRenderer', 'aiCompanion'],
                uiState: this.uiState
            });

            // Check if agent is configured
            const hasAgent = agentManager.getCurrentAgent() !== null;

            // Emit completion event for splash screen
            // If agent is configured, we'll wait for greeting before completing
            // If no agent, complete immediately
            if (!hasAgent) {
                document.dispatchEvent(new CustomEvent('app:init:complete', {
                    detail: { hasAgent: false }
                }));
            }
            // For agent scenarios, app:init:complete will be triggered by greeting events

            // Safety timeout: if splash screen still active after 8s, force release
            if (hasAgent) {
                setTimeout(() => {
                    document.dispatchEvent(new CustomEvent('app:init:complete', {
                        detail: { hasAgent: true }
                    }));
                }, 8000);
            }

            // Show success briefly then hide
            this.updateInitializationIndicator('Application ready!');
            setTimeout(() => this.hideInitializationIndicator(), 1500);

        } catch (error) {
            console.error('Error initializing application:', error);
            
            // Emit error event for splash screen
            document.dispatchEvent(new CustomEvent('app:init:error', {
                detail: { message: error.message }
            }));
            
            this.hideInitializationIndicator();

            // Show user-friendly error message
            this.showErrorMessage(`Failed to initialize application: ${error.message}`);

            // Even if there's an error, show setup modal to let user configure
            setTimeout(() => this.showSetupModal(), 100);
        }
    }

    /**
     * Initialize DOM elements
     * @private
     */
    initializeElements() {
        this.elements = {
            // Input elements
            userInput: DOMUtils.getElementById('userInput'),
            sendButton: DOMUtils.getElementById('sendButton'),
            voiceInputBtn: DOMUtils.getElementById('voiceInputBtn'),
            aiCompanionToggleBtn: DOMUtils.getElementById('aiCompanionToggleBtn'),
            aiCompanionInlineWrapper: DOMUtils.getElementById('aiCompanionInlineWrapper'),
            aiCompanionHoverMenu: DOMUtils.getElementById('aiCompanionHoverMenu'),
            llmQuickActionsContainer: DOMUtils.getElementById('llmQuickActionsContainer'),

            // Navigation elements
            clearButton: DOMUtils.getElementById('clearButton'),
            knowledgeHubButton: DOMUtils.getElementById('knowledgeHubButton'),
            settingsButton: DOMUtils.getElementById('settingsButton'),
            conversationsButton: DOMUtils.getElementById('conversationsButton'),
            clearAllHistoryButton: DOMUtils.getElementById('clearAllHistoryButton'),
            documentationButton: DOMUtils.getElementById('documentationButton'),

            // File upload elements
            fileInput: DOMUtils.getElementById('fileInput'),
            attachButton: DOMUtils.getElementById('attachButton'),
            removeFileButton: DOMUtils.getElementById('removeFileButton'),
            filePreviewContainer: DOMUtils.getElementById('filePreviewContainer'),
            uploadProgressBar: DOMUtils.getElementById('uploadProgressBar'),
            uploadProgressFill: DOMUtils.getElementById('uploadProgressFill'),
            uploadProgressText: DOMUtils.getElementById('uploadProgressText'),

            // Modal elements
            setupModal: DOMUtils.getElementById('setupModal'),
            closeSetupModal: DOMUtils.getElementById('closeSetupModal'),
            imageModal: DOMUtils.getElementById('imageModal'),

            // Panel elements
            citationPreviewPanel: null, // no longer a static element; citation tab created dynamically
            closeCitationBtn: null,
            expandCitationPreviewBtn: DOMUtils.getElementById('expandCitationPreviewBtn'),

            // Chat elements
            chatWindow: DOMUtils.getElementById('chatWindow'),

            // Status elements
            agentStatus: DOMUtils.getElementById('agentStatus'),
            agentName: DOMUtils.getElementById('agentName'),

            // Setup modal form elements
            enableStreamingCheckbox: DOMUtils.getElementById('enableStreamingCheckbox'),
            enableSideBrowserCheckbox: DOMUtils.getElementById('enableSideBrowserCheckbox'),
            autoOpenCitationsCheckbox: DOMUtils.getElementById('autoOpenCitationsCheckbox'),
            openAttachmentsSideBrowserCheckbox: DOMUtils.getElementById('openAttachmentsSideBrowserCheckbox'),
            fullWidthMessagesCheckbox: DOMUtils.getElementById('fullWidthMessagesCheckbox'),
            enableLLMCheckbox: DOMUtils.getElementById('enableLLMCheckbox'),
            useAIThinkingCheckbox: DOMUtils.getElementById('useAIThinkingCheckbox'),
            showCompanionModelCheckbox: DOMUtils.getElementById('showCompanionModelCheckbox'),
            // Old API config elements (removed from UI, kept for backward compat if referenced)
            apiKeySection: DOMUtils.getElementById('apiKeySection'),
            apiProviderSelect: DOMUtils.getElementById('apiProviderSelect'),
            apiKeyInput: DOMUtils.getElementById('apiKeyInput'),
            apiKeyField: DOMUtils.getElementById('apiKeyField'),
            azureConfig: DOMUtils.getElementById('azureConfig'),
            azureEndpointInput: DOMUtils.getElementById('azureEndpointInput'),
            azureDeploymentInput: DOMUtils.getElementById('azureDeploymentInput'),
            azureApiVersionInput: DOMUtils.getElementById('azureApiVersionInput'),
            testAzureBtn: DOMUtils.getElementById('testAzureBtn'),
            apiTestSection: DOMUtils.getElementById('apiTestSection'),
            testApiBtn: DOMUtils.getElementById('testApiBtn'),
            ollamaConfig: DOMUtils.getElementById('ollamaConfig'),
            ollamaUrlInput: DOMUtils.getElementById('ollamaUrlInput'),
            ollamaModelSelect: DOMUtils.getElementById('ollamaModelSelect'),
            refreshModelsBtn: DOMUtils.getElementById('refreshModelsBtn'),
            testOllamaBtn: DOMUtils.getElementById('testOllamaBtn'),
            openaiCompatibleConfig: DOMUtils.getElementById('openaiCompatibleConfig'),
            openaiCompatibleBaseUrlInput: DOMUtils.getElementById('openaiCompatibleBaseUrlInput'),
            openaiCompatibleApiKeyInput: DOMUtils.getElementById('openaiCompatibleApiKeyInput'),
            openaiCompatibleModelInput: DOMUtils.getElementById('openaiCompatibleModelInput'),
            openaiCompatibleDisplayNameInput: DOMUtils.getElementById('openaiCompatibleDisplayNameInput'),
            testOpenAICompatibleBtn: DOMUtils.getElementById('testOpenAICompatibleBtn'),
            // New model registry elements
            addModelBtn: DOMUtils.getElementById('addModelBtn'),
            addModelFormSection: DOMUtils.getElementById('addModelFormSection'),
            addModelFormCloseBtn: DOMUtils.getElementById('addModelFormCloseBtn'),
            regProviderSelect: DOMUtils.getElementById('regProviderSelect'),
            testModelBtn: DOMUtils.getElementById('testModelBtn'),
            registerModelBtn: DOMUtils.getElementById('registerModelBtn'),

            // New UI elements for UX improvements
            leftPanel: DOMUtils.getElementById('leftPanel'),

            // Appearance side panel
            appearanceButton: DOMUtils.getElementById('appearanceButton'),
            appearanceSidePanel: DOMUtils.getElementById('appearanceSidePanel'),
            closeAppearancePanel: DOMUtils.getElementById('closeAppearancePanel'),
            appearanceMessageIconToggle: DOMUtils.getElementById('appearanceMessageIconToggle'),
            appearanceShowUserMessagesToggle: DOMUtils.getElementById('appearanceShowUserMessagesToggle'),
            appearanceShowMetricsToggle: DOMUtils.getElementById('appearanceShowMetricsToggle'),
            appearanceAutoHideMetadataToggle: DOMUtils.getElementById('appearanceAutoHideMetadataToggle'),
            appearanceAutoHideSidebarToggle: DOMUtils.getElementById('appearanceAutoHideSidebarToggle'),
            appearanceAgentFontSize: DOMUtils.getElementById('appearanceAgentFontSize'),
            appearanceAgentFontSizeValue: DOMUtils.getElementById('appearanceAgentFontSizeValue'),
            appearanceCompanionFontSize: DOMUtils.getElementById('appearanceCompanionFontSize'),
            appearanceCompanionFontSizeValue: DOMUtils.getElementById('appearanceCompanionFontSizeValue'),
            appearanceThemeGallery: DOMUtils.getElementById('appearanceThemeGallery'),
            homeBgFileInput: DOMUtils.getElementById('homeBgFileInput'),
            homeBgRemoveBtn: DOMUtils.getElementById('homeBgRemoveBtn'),
            homeTitleInput: DOMUtils.getElementById('homeTitleInput'),
            homeSubtitleInput: DOMUtils.getElementById('homeSubtitleInput'),
            languageSelect: DOMUtils.getElementById('languageSelect'),
            streamingStyleSelect: DOMUtils.getElementById('streamingStyleSelect'),
            streamingSpeedSelect: DOMUtils.getElementById('streamingSpeedSelect'),
            suggestedActionsPositionSelect: DOMUtils.getElementById('suggestedActionsPositionSelect'),
            thinkingDotStyleSelect: DOMUtils.getElementById('thinkingDotStyleSelect')
        };

        // Debug: Check if Azure elements were found
        console.log('Azure DOM elements check:', {
            azureConfig: !!this.elements.azureConfig,
            azureEndpointInput: !!this.elements.azureEndpointInput,
            azureDeploymentInput: !!this.elements.azureDeploymentInput,
            azureApiVersionInput: !!this.elements.azureApiVersionInput,
            testAzureBtn: !!this.elements.testAzureBtn,
            apiKeySection: !!this.elements.apiKeySection,
            apiProviderSelect: !!this.elements.apiProviderSelect
        });

        console.log('DOM elements initialized');

        // Add global diagnostic function for Azure settings
        window.debugAzureSettings = () => {
            console.log('=== Azure Settings Debug ===');
            console.log('AI Companion enabled:', this.elements.enableLLMCheckbox?.checked);
            console.log('Selected provider:', this.elements.apiProviderSelect?.value);
            console.log('API Key Section visible:', this.elements.apiKeySection?.style.display !== 'none');
            console.log('Azure Config visible:', this.elements.azureConfig?.style.display !== 'none');
            console.log('Azure elements exist:', {
                azureConfig: !!this.elements.azureConfig,
                azureEndpointInput: !!this.elements.azureEndpointInput,
                azureDeploymentInput: !!this.elements.azureDeploymentInput,
                testAzureBtn: !!this.elements.testAzureBtn
            });
            console.log('Current Azure values:', {
                endpoint: this.elements.azureEndpointInput?.value,
                deployment: this.elements.azureDeploymentInput?.value,
                apiVersion: this.elements.azureApiVersionInput?.value
            });
            console.log('========================');
        };
    }

    /**
     * Initialize application icons that require the full icon collection
     * This runs after the AI companion is initialized to ensure icon manager is ready
     * @private
     */
    async initializeApplicationIcons() {
        try {
            // Wait for the full icon collection to be loaded
            if (window.Icon && window.Icon.waitForLoad) {
                await window.Icon.waitForLoad();
                console.log('[Application] Full icon collection loaded, initializing application icons...');
            }

            // Initialize AI Companion Toggle Button icon
            if (this.elements.aiCompanionToggleBtn && this.elements.aiCompanionToggleBtn.children.length === 0) {
                const aiCompanionIcon = window.Icon.create('aiCompanion', {
                    size: '18px',
                    color: 'currentColor'
                });
                console.log('[Application] Created aiCompanionToggleBtn icon:', aiCompanionIcon);
                this.elements.aiCompanionToggleBtn.appendChild(aiCompanionIcon);
            }

        } catch (error) {
            console.warn('[Application] Error initializing application icons:', error);
        }
    }

    /**
     * Initialize managers and services
     * @private
     */
    async initializeManagers() {
        // Initialize agent manager (loads agents and sets up event listeners)
        await agentManager.initialize();

        // Configure MessageRenderer to target the agent chat window (middle panel)
        messageRenderer.setTargetWindow('chatWindow');

        // Wire connector events. Both transports emit the SAME event surface, so
        // the rendering pipeline is identical. Only one is connected at a time.
        this.wireConnectorEvents(directLineService);
        this.wireConnectorEvents(directEngineConnector);

        // Initialize logging UI manager - temporarily disabled
        // this.loggingUIManager = new LoggingUIManager(this.loggingManager);

        console.log('Managers and services initialized');
        // Re-enable basic logging
        this.loggingManager.info('system', 'Application managers initialized successfully');
    }

    /**
     * Wire a connector's events to the shared rendering/handling pipeline.
     * Both DirectLineService and DirectEngineConnector expose the same event
     * surface, so this is identical for either transport. Only one connector
     * is connected at a time, so double-wiring is safe.
     * @param {Object} connector - directLineService | directEngineConnector
     * @private
     */
    wireConnectorEvents(connector) {
        connector.on('statusChange', (status) => this.handleConnectionStatus(status));
        connector.on('message', (entry) => this.handleCompleteMessage(entry));
        connector.on('messageChunk', (entry) => this.handleStreamingChunk(entry));
        connector.on('streamCancelled', (entry) => this.handleStreamCancelled(entry));
        connector.on('typing', () => {
            // Record true TTFT: time from user send to first typing signal from bot
            if (messageRenderer.responseTimeTracking.requestStartTime &&
                !messageRenderer.responseTimeTracking.ttftRecorded) {
                messageRenderer.responseTimeTracking.ttft =
                    Date.now() - messageRenderer.responseTimeTracking.requestStartTime;
                messageRenderer.responseTimeTracking.ttftRecorded = true;
                console.log(`[TTFT] Recorded from typing activity: ${messageRenderer.responseTimeTracking.ttft}ms`);
            }

            const useAIThinking = window.aiCompanion?.isEnabled === true && localStorage.getItem('useAIThinking') !== 'false';
            if (useAIThinking) return;
            // Suppress typing indicator for 500ms after a message arrives to prevent re-show flicker
            if (this._lastMessageTime && (Date.now() - this._lastMessageTime) < 500) return;
            this.showProgressIndicator({ source: 'directline' });
            // Update status to reflect bot is processing
            this.enhancedTypingIndicator.setStatus('Agent is processing...');
        });
        connector.on('greeting', () => {
            document.dispatchEvent(new CustomEvent('agent:greeting:received'));
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: true } }));
        });
        connector.on('greetingTimeout', () => {
            document.dispatchEvent(new CustomEvent('agent:greeting:timeout'));
            const hasAgent = agentManager.getCurrentAgent() !== null;
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent } }));
        });
        connector.on('connected', () => {
            document.dispatchEvent(new CustomEvent('agent:greeting:sending'));
            // Release splash screen immediately on connection — don't wait for greeting to finish
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: true } }));
            this.hideProgressIndicator();
        });
        connector.on('disconnected', () => {
            // If connection drops before greeting, release splash screen
            if (!this.isInitialized) return;
            this.state.isConnected = false;
        });
        connector.on('error', (error) => {
            this.handleConnectionError(error);
            // Release splash screen if stuck
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: false } }));
        });
        connector.on('informative', (info) => this.handleInformativeActivity(info));
        connector.on('conversationUpdate', (activity) => {
            this.handleConversationUpdate(activity);
        });
        connector.on('event', (activity) => {
            this.handleEventActivity(activity);
        });
    }

    /**
     * Return the connector for a given agent (Direct-to-Engine vs classic DirectLine).
     * @param {Object} [agent] - agent config; defaults to the current agent
     * @returns {Object} directEngineConnector | directLineService
     * @private
     */
    getConnectorForAgent(agent) {
        const a = agent || agentManager.getCurrentAgent();
        return a && a.agentType === 'directengine' ? directEngineConnector : directLineService;
    }

    /**
     * Submit an Adaptive Card response through the active agent's connector.
     * Routes to DirectLine or Direct-to-Engine depending on the current agent,
     * so card submits work regardless of transport. Called by the global
     * Adaptive Card modal via window.MCSChatApp.
     * @param {Object} value - The card submit data (action.data)
     * @returns {Promise<void>}
     */
    async submitAdaptiveCard(value) {
        const connector = this.getConnectorForAgent();
        if (!connector || typeof connector.sendCardResponse !== 'function') {
            throw new Error('No active connector available to submit the Adaptive Card.');
        }
        return connector.sendCardResponse(value);
    }

    /**
     * Initialize the unified message system
     * @private
     */
    async initializeUnifiedMessageSystem() {
        try {
            console.log('Initializing unified message system...');

            // Get the chat windows
            const agentChatWindow = DOMUtils.getElementById('chatWindow');
            const aiCompanionChatWindow = DOMUtils.getElementById('llmChatWindow');

            if (!agentChatWindow && !aiCompanionChatWindow) {
                console.warn('No chat windows found, unified message system not initialized');
                return;
            }

            // Configuration for the unified system
            const config = {
                enableQueue: true,
                enableMetadata: true,
                professionalMode: this.state.professionalMode || false,
                migrationMode: false, // Disable migration mode to use unified system by default
                fontSize: {
                    agent: this.uiState?.agentChatFontSize || 15,
                    companion: this.uiState?.companionChatFontSize || 14
                }
            };

            // Initialize the unified message system
            const success = await this.messageIntegration.initialize(
                agentChatWindow,
                aiCompanionChatWindow,
                config
            );

            if (success) {
                console.log('Unified message system initialized successfully');

                // Set up legacy compatibility bridges
                this.messageIntegration.setupLegacyBridge();

                // Store reference to the API for easy access
                this.unifiedMessageAPI = this.messageIntegration.getAPI();

                // Initialize global adaptive card modal
                globalAdaptiveCardModal.init();
                console.log('Global adaptive card modal initialized');

                // Log initialization
                this.loggingManager.info('system', 'Unified message system initialized', {
                    config,
                    agentChatWindow: !!agentChatWindow,
                    aiCompanionChatWindow: !!aiCompanionChatWindow
                });

                // Migrate existing messages if any
                if (agentChatWindow && agentChatWindow.children.length > 0) {
                    const migrated = this.messageIntegration.migrateLegacyMessages(agentChatWindow);
                    console.log(`Migrated ${migrated} legacy agent messages`);
                }

                if (aiCompanionChatWindow && aiCompanionChatWindow.children.length > 0) {
                    const migrated = this.messageIntegration.migrateLegacyMessages(aiCompanionChatWindow);
                    console.log(`Migrated ${migrated} legacy AI companion messages`);
                }

            } else {
                console.warn('Failed to initialize unified message system, using legacy renderers');
                this.loggingManager.warn('system', 'Unified message system initialization failed, falling back to legacy');
            }

        } catch (error) {
            console.error('Error initializing unified message system:', error);
            this.loggingManager.error('system', 'Unified message system initialization error', { error: error.message });
        }
    }

    /**
     * Load agents and try to connect to current agent
     * @private
     */
    async loadAndConnectAgent() {
        // Always show Home page — no auto-connect
        document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: false } }));
        this.hideInitializationIndicator();
        this.showHomePage();
    }

    /**
     * Show the Home page with agent cards
     */
    showHomePage() {
        const homePage = document.getElementById('homePage');
        if (!homePage) return;

        homePage.style.display = 'flex';

        // Hide back-to-home button when on home page
        const backBtn = document.getElementById('backToHomeButton');
        if (backBtn) backBtn.style.display = 'none';

        this.renderHomeAgentCards();
        console.log('[Application] Home page displayed');
    }

    /**
     * Hide the Home page and show the main app
     */
    hideHomePage() {
        const homePage = document.getElementById('homePage');
        if (homePage) homePage.style.display = 'none';

        // Show back-to-home button when leaving home page
        const backBtn = document.getElementById('backToHomeButton');
        if (backBtn) backBtn.style.display = 'flex';
    }

    /**
     * Render agent cards on the Home page
     */
    /**
     * Get saved card order from localStorage, sorted with new agents appended at end
     */
    _getOrderedAgentIds(agentIds) {
        try {
            const saved = JSON.parse(localStorage.getItem('homeCardOrder') || '[]');
            const ordered = saved.filter(id => agentIds.includes(id));
            const newIds = agentIds.filter(id => !ordered.includes(id));
            return [...ordered, ...newIds];
        } catch {
            return agentIds;
        }
    }

    /**
     * Save card order to localStorage
     */
    _saveCardOrder(grid) {
        const ids = Array.from(grid.querySelectorAll('.home-agent-card'))
            .map(card => card.dataset.agentId)
            .filter(Boolean);
        localStorage.setItem('homeCardOrder', JSON.stringify(ids));
    }

    /**
     * Set up drag-and-drop handlers on the agent card grid
     */
    _setupCardDragAndDrop(grid) {
        let draggedCard = null;

        grid.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.home-agent-card');
            if (!card) return;
            draggedCard = card;
            card.classList.add('home-card-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.agentId);
        });

        grid.addEventListener('dragend', (e) => {
            const card = e.target.closest('.home-agent-card');
            if (card) card.classList.remove('home-card-dragging');
            grid.querySelectorAll('.home-card-drag-over').forEach(el => el.classList.remove('home-card-drag-over'));
            draggedCard = null;
        });

        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const target = e.target.closest('.home-agent-card');
            if (!target || target === draggedCard) return;
            grid.querySelectorAll('.home-card-drag-over').forEach(el => el.classList.remove('home-card-drag-over'));
            target.classList.add('home-card-drag-over');
        });

        grid.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.home-agent-card');
            if (target) target.classList.remove('home-card-drag-over');
        });

        grid.addEventListener('drop', (e) => {
            e.preventDefault();
            const target = e.target.closest('.home-agent-card');
            if (!target || !draggedCard || target === draggedCard) return;
            target.classList.remove('home-card-drag-over');

            // Determine insertion position based on relative position
            const cards = Array.from(grid.querySelectorAll('.home-agent-card'));
            const dragIdx = cards.indexOf(draggedCard);
            const dropIdx = cards.indexOf(target);
            if (dragIdx < dropIdx) {
                target.after(draggedCard);
            } else {
                target.before(draggedCard);
            }

            this._saveCardOrder(grid);
        });
    }

    renderHomeAgentCards() {
        const grid = document.getElementById('homeAgentGrid');
        if (!grid) return;

        const agents = agentManager.getAllAgents();
        const agentIds = this._getOrderedAgentIds(Object.keys(agents));

        grid.innerHTML = '';

        // Render each agent card
        agentIds.forEach(agentId => {
            const agent = agents[agentId];
            const stats = this._computeAgentStats(agentId);
            const hasParams = agentManager.agentHasInitParams(agentId);
            const isWebsite = agent.agentType === 'website';

            const card = document.createElement('div');
            card.className = 'home-agent-card';
            card.draggable = true;
            card.dataset.agentId = agentId;
            const descriptionHtml = agent.description
                ? `<p class="home-agent-card-description">${Utils.escapeHtml(agent.description)}</p>`
                : '';
            const statusLabel = isWebsite ? i18n.t('home.website') : i18n.t('home.ready');
            const paramsHtml = (!isWebsite && hasParams) ? `<span class="home-agent-params-badge">${agent.initParams.length} ${i18n.t('home.params')}</span>` : '';
            card.innerHTML = `
                <h3 class="home-agent-card-name">${Utils.escapeHtml(agent.name)}</h3>
                <div class="home-agent-card-status">
                    <span class="status-dot${isWebsite ? ' status-dot-website' : ''}"></span>
                    <span>${statusLabel}</span>
                    ${paramsHtml}
                </div>
                ${descriptionHtml}
                <div class="home-agent-card-stats">
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.sessionCount}</span>
                        <span class="home-agent-stat-label">${i18n.t('home.conversations')}</span>
                    </div>
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.totalDuration}</span>
                        <span class="home-agent-stat-label">${i18n.t('home.totalTime')}</span>
                    </div>
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.messageCount}</span>
                        <span class="home-agent-stat-label">${i18n.t('home.messages')}</span>
                    </div>
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.lastInteraction}</span>
                        <span class="home-agent-stat-label">${i18n.t('home.lastActive')}</span>
                    </div>
                </div>
            `;
            // Settings button
            const settingsBtn = document.createElement('button');
            settingsBtn.className = 'home-agent-settings-btn';
            settingsBtn.title = 'Agent settings';
            settingsBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAgentEditOverlay(agentId);
            });
            card.appendChild(settingsBtn);

            // Delete button (stop propagation so card click doesn't fire)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'home-agent-delete-btn';
            deleteBtn.title = 'Delete agent';
            deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDeleteAgentOverlay(agentId, agent.name);
            });
            card.appendChild(deleteBtn);

            card.addEventListener('click', () => this.onHomeAgentCardClick(agentId));
            grid.appendChild(card);
        });

        // Add "+" card
        const addCard = document.createElement('div');
        addCard.className = 'home-add-card';
        addCard.innerHTML = `
            <div class="home-add-icon">+</div>
            <div class="home-add-label">${i18n.t('home.addAgent')}</div>
        `;
        addCard.addEventListener('click', () => this.showAddAgentOverlay());
        grid.appendChild(addCard);

        // Set up drag-and-drop reordering
        this._setupCardDragAndDrop(grid);
    }

    /**
     * Show confirmation overlay before leaving to home page
     */
    showLeaveConfirmOverlay() {
        let overlay = document.getElementById('leaveConfirmOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'leaveConfirmOverlay';
            overlay.className = 'init-params-overlay';
            overlay.innerHTML = `
                <div class="init-params-card">
                    <h3>${i18n.t('leave.title')}</h3>
                    <p class="init-params-desc">${i18n.t('leave.message')}</p>
                    <div class="init-params-actions">
                        <button type="button" id="leaveConfirmCancelBtn" class="btn btn-secondary">${i18n.t('leave.cancel')}</button>
                        <button type="button" id="leaveConfirmOkBtn" class="btn btn-primary">${i18n.t('leave.confirm')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        overlay.style.display = 'flex';

        const cancelBtn = overlay.querySelector('#leaveConfirmCancelBtn');
        const okBtn = overlay.querySelector('#leaveConfirmOkBtn');

        const cleanup = () => { overlay.style.display = 'none'; };

        cancelBtn.onclick = cleanup;
        okBtn.onclick = () => {
            cleanup();
            this.cleanupWebsiteAgent();
            directLineService.disconnect();
            this.state.isConnected = false;
            this.showHomePage();
        };
    }

    /**
     * Show delete agent confirmation overlay
     * @param {string} agentId
     * @param {string} agentName
     */
    showDeleteAgentOverlay(agentId, agentName) {
        // Create overlay dynamically
        let overlay = document.getElementById('deleteAgentOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'deleteAgentOverlay';
            overlay.className = 'init-params-overlay';
            overlay.innerHTML = `
                <div class="init-params-card">
                    <h3>${i18n.t('delete.title')}</h3>
                    <p class="init-params-desc">${i18n.t('delete.message')}</p>
                    <p class="delete-agent-name-display"></p>
                    <div class="form-group">
                        <input type="text" id="deleteAgentConfirmInput" placeholder="${i18n.t('delete.placeholder')}" />
                    </div>
                    <div class="init-params-actions">
                        <button type="button" id="deleteAgentCancelBtn" class="btn btn-secondary">${i18n.t('delete.cancel')}</button>
                        <button type="button" id="deleteAgentConfirmBtn" class="btn btn-danger" disabled>${i18n.t('delete.confirm')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const nameDisplay = overlay.querySelector('.delete-agent-name-display');
        const confirmInput = overlay.querySelector('#deleteAgentConfirmInput');
        const confirmBtn = overlay.querySelector('#deleteAgentConfirmBtn');
        const cancelBtn = overlay.querySelector('#deleteAgentCancelBtn');

        nameDisplay.textContent = agentName;
        confirmInput.value = '';
        confirmBtn.disabled = true;
        overlay.style.display = 'flex';

        // Enable button only when name matches
        const onInput = () => {
            confirmBtn.disabled = confirmInput.value.trim() !== agentName;
        };
        confirmInput.removeEventListener('input', onInput);
        confirmInput.addEventListener('input', onInput);

        // Clone buttons to clear old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Re-attach input listener to new confirm button
        newConfirmBtn.disabled = true;
        confirmInput.addEventListener('input', () => {
            newConfirmBtn.disabled = confirmInput.value.trim() !== agentName;
        });

        newCancelBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        newConfirmBtn.addEventListener('click', async () => {
            if (confirmInput.value.trim() !== agentName) return;
            await agentManager.deleteAgent(agentId);
            // Also remove agent stats
            localStorage.removeItem(`agentStats_${agentId}`);
            overlay.style.display = 'none';
            this.renderHomeAgentCards();
        });
    }

    /**
     * Compute stats for an agent from stored usage data
     * @private
     */
    _computeAgentStats(agentId, chatHistory) {
        // Load per-agent stats from localStorage
        try {
            const statsRaw = localStorage.getItem(`agentStats_${agentId}`);
            if (statsRaw) {
                const stats = JSON.parse(statsRaw);
                return {
                    sessionCount: stats.sessionCount || 0,
                    messageCount: stats.messageCount || 0,
                    totalDuration: this._formatDurationShort(stats.totalDurationMs || 0),
                    lastInteraction: stats.lastInteractionTs ? this._formatRelativeTime(stats.lastInteractionTs) : 'Never'
                };
            }
        } catch (_) { /* ignore */ }

        return {
            sessionCount: 0,
            messageCount: 0,
            totalDuration: '0m',
            lastInteraction: 'Never'
        };
    }

    /**
     * Update stored stats for the current agent (called after messages)
     * @private
     */
    _updateCurrentAgentStats() {
        const agent = agentManager.getCurrentAgent();
        if (!agent) return;

        const key = `agentStats_${agent.id}`;
        let stats;
        try {
            stats = JSON.parse(localStorage.getItem(key) || '{}');
        } catch (_) {
            stats = {};
        }

        stats.messageCount = (stats.messageCount || 0) + 1;
        stats.lastInteractionTs = Date.now();

        // Session count: increment if this is a new session we haven't counted
        const currentSession = localStorage.getItem('currentSession');
        if (currentSession && stats.lastSessionId !== currentSession) {
            stats.sessionCount = (stats.sessionCount || 0) + 1;
            stats.lastSessionId = currentSession;
            stats.sessionStartTs = Date.now();
        }

        // Duration: accumulate time from session start
        if (stats.sessionStartTs) {
            stats.totalDurationMs = (stats.totalDurationMs || 0) + (Date.now() - (stats.lastDurationCheckTs || stats.sessionStartTs));
            stats.lastDurationCheckTs = Date.now();
        }

        localStorage.setItem(key, JSON.stringify(stats));
    }

    /**
     * Format milliseconds to short duration string
     * @private
     */
    _formatDurationShort(ms) {
        if (ms < 60000) return '<1m';
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ${minutes % 60}m`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    /**
     * Format timestamp to relative time
     * @private
     */
    _formatRelativeTime(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return i18n.t('stats.justNow');
        if (diff < 3600000) return i18n.t('stats.minutesAgo', { n: Math.floor(diff / 60000) });
        if (diff < 86400000) return i18n.t('stats.hoursAgo', { n: Math.floor(diff / 3600000) });
        if (diff < 604800000) return i18n.t('stats.daysAgo', { n: Math.floor(diff / 86400000) });
        return new Date(ts).toLocaleDateString();
    }

    /**
     * Handle click on a Home page agent card
     */
    onHomeAgentCardClick(agentId) {
        const agent = agentManager.agents[agentId];
        if (!agent) return;

        if (agent.agentType === 'website') {
            this.openWebsiteAgent(agentId, agent);
            return;
        }

        const hasParams = agentManager.agentHasInitParams(agentId);
        this.showAgentSplashOverlay(agentId, hasParams);
    }

    /**
     * Open a website-type agent by embedding its URL in the chat area
     */
    openWebsiteAgent(agentId, agent) {
        if (!agent.websiteUrl) return;

        agentManager.setCurrentAgent(agentId);
        this.state.currentAgent = agent;
        this.state.isConnected = true;

        this.hideHomePage();
        this.updateAgentStatus('connected', agent.name);

        const chatWindow = document.getElementById('chatWindow');
        const inputContainer = document.getElementById('inputContainer');
        const suggestedActions = document.getElementById('suggestedActionsContainer');

        // Hide text input and suggested actions — not needed for website agents
        if (inputContainer) inputContainer.style.display = 'none';
        if (suggestedActions) suggestedActions.style.display = 'none';

        // Replace chat window content with iframe
        if (chatWindow) {
            chatWindow.innerHTML = '';
            chatWindow.classList.add('website-agent-mode');

            const iframe = document.createElement('iframe');
            iframe.className = 'website-agent-frame';
            iframe.src = agent.websiteUrl;
            iframe.title = agent.name;
            iframe.setAttribute('allow', 'accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; fullscreen');

            // On load, try to extract content for AI Companion
            iframe.addEventListener('load', () => {
                this._extractWebsiteContent(iframe, agent);
            });

            chatWindow.appendChild(iframe);
        }
    }

    /**
     * Extract text content from the website agent iframe for AI Companion analysis.
     * Tries same-origin DOM access first, then falls back to fetch().
     * @private
     */
    async _extractWebsiteContent(iframe, agent) {
        let textContent = '';
        let pageTitle = '';

        // Attempt 1: Same-origin DOM access
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc && doc.body) {
                pageTitle = doc.title || '';
                textContent = doc.body.innerText || '';
                console.log('[WebsiteAgent] Extracted content via DOM:', textContent.length, 'chars');
            }
        } catch (e) {
            console.log('[WebsiteAgent] Cross-origin, trying proxy/fetch fallback');
        }

        // Attempt 2: Server-side proxy (works when chat-server.js is running)
        if (!textContent && agent.websiteUrl) {
            // Try same-origin proxy first, then known chat-server port
            const proxyBases = [
                window.location.origin,
                'http://localhost:8080'
            ];
            // Deduplicate if already on 8080
            const uniqueBases = [...new Set(proxyBases)];

            for (const base of uniqueBases) {
                if (textContent) break;
                try {
                    const proxyUrl = `${base}/api/proxy?url=${encodeURIComponent(agent.websiteUrl)}`;
                    const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
                    if (resp.ok) {
                        const html = await resp.text();
                        const result = this._parseHtmlToText(html);
                        pageTitle = result.title;
                        textContent = result.text;
                        console.log(`[WebsiteAgent] Extracted content via proxy (${base}):`, textContent.length, 'chars');
                    }
                } catch (proxyError) {
                    console.log(`[WebsiteAgent] Proxy at ${base} not available`);
                }
            }
        }

        // Attempt 3: Direct fetch (may fail due to CORS on GitHub Pages)
        if (!textContent && agent.websiteUrl) {
            try {
                const resp = await fetch(agent.websiteUrl, { mode: 'cors' });
                if (resp.ok) {
                    const html = await resp.text();
                    const result = this._parseHtmlToText(html);
                    pageTitle = result.title;
                    textContent = result.text;
                    console.log('[WebsiteAgent] Extracted content via direct fetch:', textContent.length, 'chars');
                }
            } catch (fetchError) {
                console.warn('[WebsiteAgent] Direct fetch failed (likely CORS):', fetchError.message);
            }
        }

        // Store extracted content for AI Companion
        this._websiteContent = {
            url: agent.websiteUrl,
            title: pageTitle || agent.name,
            text: textContent,
            extractedAt: new Date().toISOString()
        };

        // Dispatch event so AI Companion can pick it up
        window.dispatchEvent(new CustomEvent('websiteContentExtracted', {
            detail: this._websiteContent
        }));
    }

    /**
     * Parse HTML string to extract title and text content
     * @private
     */
    _parseHtmlToText(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const title = doc.title || '';
        doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        const text = doc.body?.innerText || '';
        return { title, text };
    }

    /**
     * Get the currently extracted website content (for AI Companion)
     * @returns {Object|null}
     */
    getWebsiteContent() {
        return this._websiteContent || null;
    }

    /**
     * Clean up website agent mode when leaving
     */
    cleanupWebsiteAgent() {
        const chatWindow = document.getElementById('chatWindow');
        const inputContainer = document.getElementById('inputContainer');
        const suggestedActions = document.getElementById('suggestedActionsContainer');

        if (chatWindow) {
            chatWindow.classList.remove('website-agent-mode');
            // Remove iframe if present
            const iframe = chatWindow.querySelector('.website-agent-frame');
            if (iframe) {
                iframe.src = 'about:blank';
                iframe.remove();
            }
        }

        // Restore chat input UI
        if (inputContainer) inputContainer.style.display = '';
        if (suggestedActions) suggestedActions.style.display = '';

        // Clear stored website content
        this._websiteContent = null;
    }

    /**
     * Show the Agent Splash overlay (params + progress)
     */
    showAgentSplashOverlay(agentId, hasParams) {
        const overlay = document.getElementById('agentSplashOverlay');
        const paramsSection = document.getElementById('agentSplashParams');
        const progressSection = document.getElementById('agentSplashProgress');
        const actionsSection = document.getElementById('agentSplashActions');
        const cancelProgressSection = document.getElementById('agentSplashCancelProgress');
        const startBtn = document.getElementById('agentSplashStartBtn');
        const cancelBtn = document.getElementById('agentSplashCancelBtn');
        const cancelProgressBtn = document.getElementById('agentSplashCancelProgressBtn');
        const titleEl = document.getElementById('agentSplashTitle');
        if (!overlay) return;

        const agent = agentManager.agents[agentId];
        titleEl.textContent = agent?.name || agentId;

        // Reset state
        progressSection.style.display = 'none';
        actionsSection.style.display = 'flex';
        cancelProgressSection.style.display = 'none';
        paramsSection.style.display = '';

        if (hasParams) {
            const params = agentManager.getInitParams(agentId);
            paramsSection.innerHTML = `
                <p class="params-description">This agent requires the following information before starting.</p>
                ${params.map(p => `
                    <div class="form-group">
                        <label for="splash_${p.name}">${Utils.escapeHtml(p.displayName)}:</label>
                        <input type="text" id="splash_${p.name}" name="${Utils.escapeHtml(p.name)}"
                               placeholder="Enter ${Utils.escapeHtml(p.displayName)}" required />
                    </div>
                `).join('')}
            `;
            startBtn.textContent = 'Start Session';
        } else {
            // No params — hide form and buttons, will auto-connect below
            paramsSection.innerHTML = '';
            paramsSection.style.display = 'none';
            actionsSection.style.display = 'none';
        }

        overlay.style.display = 'flex';

        // Clone buttons to remove old listeners
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        const newCancelProgressBtn = cancelProgressBtn.cloneNode(true);
        cancelProgressBtn.parentNode.replaceChild(newCancelProgressBtn, cancelProgressBtn);

        let connectionAborted = false;

        newCancelBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        newCancelProgressBtn.addEventListener('click', () => {
            connectionAborted = true;
            directLineService.disconnect();
            directEngineConnector.disconnect();
            this.state.isConnected = false;
            // Reset overlay
            progressSection.style.display = 'none';
            cancelProgressSection.style.display = 'none';
            paramsSection.style.display = '';
            actionsSection.style.display = 'flex';
            document.getElementById('agentSplashStatus').textContent = 'Connecting...';
            this.showHomePage();
        });

        newStartBtn.addEventListener('click', async () => {
            await this._doAgentConnect(agentId, agent, hasParams, overlay, paramsSection, progressSection, actionsSection, cancelProgressSection, newCancelProgressBtn, connectionAborted, () => connectionAborted);
        });

        // Auto-connect immediately for agents without params
        if (!hasParams) {
            // Small delay to let overlay render
            setTimeout(() => {
                this._doAgentConnect(agentId, agent, false, overlay, paramsSection, progressSection, actionsSection, cancelProgressSection, newCancelProgressBtn, connectionAborted, () => connectionAborted);
            }, 100);
        }
    }

    /**
     * Internal: execute agent connection from splash overlay
     * @private
     */
    async _doAgentConnect(agentId, agent, hasParams, overlay, paramsSection, progressSection, actionsSection, cancelProgressSection, cancelProgressBtn, _unused, isAborted) {
        if (isAborted()) return;

        // Pick the transport for this agent (classic DirectLine vs Direct-to-Engine streaming)
        const connector = this.getConnectorForAgent(agent);

        // Validate params
        if (hasParams) {
            const inputs = paramsSection.querySelectorAll('input[required]');
            let valid = true;
            inputs.forEach(input => {
                if (!input.value.trim()) { input.classList.add('input-error'); valid = false; }
                else { input.classList.remove('input-error'); }
            });
            if (!valid) return;

            const context = {};
            inputs.forEach(input => { context[input.name] = input.value.trim(); });
            connector.setInitContext(context);
        }

        // Show progress in-place
        actionsSection.style.display = 'none';
        paramsSection.style.display = 'none';
        progressSection.style.display = 'block';
        cancelProgressSection.style.display = 'flex';
        const statusEl = document.getElementById('agentSplashStatus');
        statusEl.textContent = 'Connecting to ' + agent.name + '...';
        statusEl.classList.remove('breathing');

        try {
            await agentManager.setCurrentAgent(agentId);

            // Clear chat window for fresh session
            messageRenderer.clearMessages();
            messageRenderer.setTargetWindow('chatWindow');

            const success = agent.agentType === 'directengine'
                ? await connector.connect(agent.directEngine || {})
                : await connector.connect(agent.secret);
            if (isAborted()) return;

            if (success) {
                statusEl.textContent = 'Initializing conversation, please wait...';
                statusEl.classList.add('breathing');
                this.state.isConnected = true;
                this.state.currentAgent = agent;

                // Set agent context on session manager for filtering
                sessionManager.setCurrentAgentId(agentId);

                this.initializeSession();
                this.updateAgentStatus('connected', agent.name);

                // Keep overlay AND home visible — fade both out on first bot message
                const fadeOutOnFirstMessage = (entry) => {
                    if (isAborted()) return;
                    connector.off('message', fadeOutOnFirstMessage);

                    // Fade out overlay
                    overlay.style.transition = 'opacity 0.4s ease';
                    overlay.style.opacity = '0';

                    // Fade out home page
                    const homePage = document.getElementById('homePage');
                    if (homePage && homePage.style.display !== 'none') {
                        homePage.style.transition = 'opacity 0.4s ease';
                        homePage.style.opacity = '0';
                    }

                    setTimeout(() => {
                        overlay.style.display = 'none';
                        overlay.style.opacity = '';
                        overlay.style.transition = '';
                        this.hideHomePage();
                        if (homePage) {
                            homePage.style.opacity = '';
                            homePage.style.transition = '';
                        }
                    }, 400);
                };
                connector.on('message', fadeOutOnFirstMessage);

                // Safety timeout: close overlay after 15s even if no message
                setTimeout(() => {
                    if (overlay.style.display !== 'none') {
                        connector.off('message', fadeOutOnFirstMessage);
                        overlay.style.display = 'none';
                        this.hideHomePage();
                    }
                }, 15000);
            } else {
                statusEl.textContent = 'Connection failed. Please try again.';
                statusEl.classList.remove('breathing');
                cancelProgressBtn.textContent = 'Back';
                this.showHomePage();
            }
        } catch (error) {
            if (isAborted()) return;
            statusEl.textContent = 'Error: ' + error.message;
            statusEl.classList.remove('breathing');
            cancelProgressBtn.textContent = 'Back';
            this.showHomePage();
        }
    }

    /**
     * Show Agent Edit/Add overlay
     * @param {string|null} agentId - null for new agent, string for editing
     */
    showAgentEditOverlay(agentId = null) {
        const overlay = document.getElementById('agentEditOverlay');
        const titleEl = document.getElementById('agentEditTitle');
        const nameInput = document.getElementById('agentEditName');
        const secretInput = document.getElementById('agentEditSecret');
        const descriptionInput = document.getElementById('agentEditDescription');
        const paramsList = document.getElementById('agentEditParamsList');
        const addParamBtn = document.getElementById('agentEditAddParamBtn');
        const saveBtn = document.getElementById('agentEditSaveBtn');
        const cancelBtn = document.getElementById('agentEditCancelBtn');
        const typeSelect = document.getElementById('agentEditType');
        const secretGroup = document.getElementById('agentEditSecretGroup');
        const urlGroup = document.getElementById('agentEditUrlGroup');
        const urlInput = document.getElementById('agentEditUrl');
        const paramsSection = document.getElementById('agentEditParamsSection');
        if (!overlay) return;

        const isEdit = agentId !== null;
        const agent = isEdit ? agentManager.agents[agentId] : null;

        titleEl.textContent = isEdit ? 'Edit Agent' : 'Add New Agent';
        nameInput.value = isEdit ? agent.name : '';
        secretInput.value = isEdit ? agent.secret : '';
        if (descriptionInput) {
            descriptionInput.value = isEdit ? (agent.description || '') : '';
        }

        // Agent type
        const agentType = isEdit ? (agent.agentType || 'copilot') : 'copilot';
        if (typeSelect) typeSelect.value = agentType;
        if (urlInput) urlInput.value = isEdit ? (agent.websiteUrl || '') : '';

        // Direct-to-Engine config fields
        const d2eGroup = document.getElementById('agentEditD2EGroup');
        const d2eAppClientId = document.getElementById('agentEditAppClientId');
        const d2eTenantId = document.getElementById('agentEditTenantId');
        const d2eEnvironmentId = document.getElementById('agentEditEnvironmentId');
        const d2eSchemaName = document.getElementById('agentEditSchemaName');
        const d2e = isEdit ? (agent.directEngine || {}) : {};
        if (d2eAppClientId) d2eAppClientId.value = d2e.appClientId || '';
        if (d2eTenantId) d2eTenantId.value = d2e.tenantId || '';
        if (d2eEnvironmentId) d2eEnvironmentId.value = d2e.environmentId || '';
        if (d2eSchemaName) d2eSchemaName.value = d2e.schemaName || '';

        // Toggle fields based on agent type
        const updateTypeFields = (type) => {
            const isCopilot = type === 'copilot';
            const isDirectEngine = type === 'directengine';
            const isWebsite = type === 'website';
            if (secretGroup) secretGroup.style.display = isCopilot ? '' : 'none';
            if (d2eGroup) d2eGroup.style.display = isDirectEngine ? '' : 'none';
            if (urlGroup) urlGroup.style.display = isWebsite ? '' : 'none';
            if (paramsSection) paramsSection.style.display = (isCopilot || isDirectEngine) ? '' : 'none';
            if (secretInput) secretInput.required = isCopilot;
        };
        updateTypeFields(agentType);

        // Listen for type changes
        if (typeSelect) {
            const newTypeSelect = typeSelect.cloneNode(true);
            typeSelect.parentNode.replaceChild(newTypeSelect, typeSelect);
            newTypeSelect.value = agentType;
            newTypeSelect.addEventListener('change', (e) => updateTypeFields(e.target.value));
        }

        // Render params
        const params = isEdit ? agentManager.getInitParams(agentId) : [];
        this._renderEditParams(paramsList, params);

        overlay.style.display = 'flex';

        // Clone buttons
        const newAddParamBtn = addParamBtn.cloneNode(true);
        addParamBtn.parentNode.replaceChild(newAddParamBtn, addParamBtn);
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newAddParamBtn.addEventListener('click', () => {
            const row = this._createParamRow('', '');
            paramsList.appendChild(row);
        });

        newCancelBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        newSaveBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const currentType = document.getElementById('agentEditType')?.value || 'copilot';
            const secret = secretInput.value.trim();
            const websiteUrl = document.getElementById('agentEditUrl')?.value.trim() || '';

            // Direct-to-Engine config
            const d2eConfig = {
                appClientId: document.getElementById('agentEditAppClientId')?.value.trim() || '',
                tenantId: document.getElementById('agentEditTenantId')?.value.trim() || '',
                environmentId: document.getElementById('agentEditEnvironmentId')?.value.trim() || '',
                schemaName: document.getElementById('agentEditSchemaName')?.value.trim() || '',
            };

            if (!name) return;
            if (currentType === 'copilot' && !secret) return;
            if (currentType === 'website' && !websiteUrl) return;
            if (currentType === 'directengine') {
                if (!d2eConfig.appClientId || !d2eConfig.tenantId || !d2eConfig.environmentId || !d2eConfig.schemaName) {
                    return; // all four D2E fields required
                }
            }

            // Collect params (for copilot + directengine types)
            const rows = paramsList.querySelectorAll('.param-row');
            const initParams = [];
            if (currentType === 'copilot' || currentType === 'directengine') {
                rows.forEach(row => {
                    const key = row.querySelector('.param-key-input')?.value.trim();
                    const display = row.querySelector('.param-display-input')?.value.trim();
                    if (key) initParams.push({ name: key, displayName: display || key });
                });
            }

            const savedId = await agentManager.addOrUpdateAgent(agentId, name, currentType === 'copilot' ? secret : '');
            // Save params, description, type, URL, and Direct-to-Engine config
            agentManager.agents[savedId].initParams = initParams;
            agentManager.agents[savedId].agentType = currentType;
            agentManager.agents[savedId].websiteUrl = currentType === 'website' ? websiteUrl : '';
            agentManager.agents[savedId].directEngine = currentType === 'directengine' ? d2eConfig : null;
            const descEl = document.getElementById('agentEditDescription');
            if (descEl) {
                agentManager.agents[savedId].description = descEl.value.trim().substring(0, 200);
            }
            agentManager.agents[savedId].updatedAt = new Date().toISOString();
            await agentManager.saveAgents();

            overlay.style.display = 'none';
            this.renderHomeAgentCards();
        });
    }

    /**
     * Show Add Agent overlay (convenience wrapper)
     */
    showAddAgentOverlay() {
        this.showAgentEditOverlay(null);
    }

    /**
     * Render param rows in the edit overlay
     * @private
     */
    _renderEditParams(container, params) {
        container.innerHTML = '';
        params.forEach(p => {
            container.appendChild(this._createParamRow(p.name, p.displayName));
        });
    }

    /**
     * Create a single param row element
     * @private
     */
    _createParamRow(key, displayName) {
        const row = document.createElement('div');
        row.className = 'param-row';
        row.innerHTML = `
            <input type="text" class="param-key-input" value="${Utils.escapeHtml(key)}" placeholder="Parameter key" />
            <input type="text" class="param-display-input" value="${Utils.escapeHtml(displayName)}" placeholder="Display name" />
            <button type="button" class="agent-btn agent-btn-delete param-remove-btn" title="Remove">×</button>
        `;
        row.querySelector('.param-remove-btn').addEventListener('click', () => row.remove());
        return row;
    }

    /**
     * Try to migrate legacy single-agent configuration
     * @returns {Promise<boolean>} True if migration successful
     * @private
     */
    async tryLegacyMigration() {
        try {
            const { SecureStorage } = await import('../utils/secureStorage.js');
            const savedSecret = await SecureStorage.retrieve('directLineSecret');

            if (savedSecret) {
                console.log('Migrating legacy configuration...');
                const agentId = await agentManager.addOrUpdateAgent(null, 'Default Agent', savedSecret);
                await agentManager.setCurrentAgent(agentId);
                await SecureStorage.store('directLineSecret', ''); // Clear legacy storage
                await this.connectToAgent(savedSecret);
                return true;
            }
        } catch (error) {
            console.error('Error during legacy migration:', error);
        }
        return false;
    }

    /**
     * Connect to agent using DirectLine (enhanced with consolidated new chat process)
     * @param {string} secret - DirectLine secret
     * @private
     */
    async connectToAgent(secret) {
        try {
            this.showInitializationIndicator('Initializing bot connection...');
            
            // Emit DirectLine connecting event
            document.dispatchEvent(new CustomEvent('directline:connecting'));

            const success = await directLineService.connect(secret);

            if (success) {
                this.state.isConnected = true;
                this.state.currentAgent = agentManager.getCurrentAgent();

                // Set agent context on session manager for filtering
                const currentAgentId = agentManager.currentAgentId;
                sessionManager.setCurrentAgentId(currentAgentId);

                // Emit DirectLine connected event
                document.dispatchEvent(new CustomEvent('directline:connected'));

                // Initialize session if none exists
                if (!this.state.currentSession) {
                    this.initializeSession();
                }

                console.log('Connected to agent successfully');

                // Update agent status display
                const agentName = this.state.currentAgent?.name || 'Unknown Agent';
                this.updateAgentStatus('connected', agentName);

                // Greeting is auto-sent by DirectLineService on 'connected'

            } else {
                this.handleConnectionError(new Error('Failed to initialize DirectLine'));
                // Release splash screen
                document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: false } }));
            }
        } catch (error) {
            this.handleConnectionError(error);
        }
    }

    /**
     * Attach global event listeners
     * @private
     */
    attachEventListeners() {
        // Basic UI interactions
        this.attachBasicEventListeners();

        // File upload functionality
        this.attachFileUploadListeners();

        // Modal interactions
        this.attachModalListeners();

        // Application-specific events
        this.attachApplicationEventListeners();

        console.log('Event listeners attached');
    }

    /**
     * Attach basic UI event listeners
     * @private
     */
    attachBasicEventListeners() {
        // Send message
        DOMUtils.addEventListener(this.elements.sendButton, 'click', () => {
            this.sendMessage();
        });

        // Voice input
        DOMUtils.addEventListener(this.elements.voiceInputBtn, 'click', () => {
            this.aiCompanion.startVoiceInput();
        });

        // AI Companion toggle — click toggles mode directly
        DOMUtils.addEventListener(this.elements.aiCompanionToggleBtn, 'click', () => {
            console.log('AI Companion toggle button clicked');
            this.toggleAICompanionMode();
        });

        // Hover menu items — switch mode
        if (this.elements.aiCompanionHoverMenu) {
            this.elements.aiCompanionHoverMenu.querySelectorAll('.hover-menu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    const wantCompanion = mode === 'companion';
                    if (wantCompanion !== this.state.aiCompanionMode) {
                        this.toggleAICompanionMode();
                    }
                });
            });
        }

        // Quick action buttons
        const quickActionButtons = document.querySelectorAll('.quick-action-btn');
        quickActionButtons.forEach(btn => {
            DOMUtils.addEventListener(btn, 'click', async (e) => {
                const actionBtn = e.target.closest('.quick-action-btn');
                const action = actionBtn?.dataset.action;
                console.log('Quick action clicked:', action);

                // AutoQA has special handling — opens config modal, doesn't require AI Companion mode
                if (action === 'autoqa') {
                    if (window.aiCompanion && window.aiCompanion.isEnabled) {
                        if (window.aiCompanion.autoQA.isRunning) {
                            window.aiCompanion.stopAutoQA('manual');
                        } else {
                            window.aiCompanion.showAutoQAConfigModal();
                        }
                    } else {
                        console.warn('AI Companion not enabled — AutoQA requires AI Companion');
                    }
                    return;
                }

                if (window.aiCompanion && window.aiCompanion.isEnabled) {
                    try {
                        await window.aiCompanion.handleQuickAction(action);
                    } catch (error) {
                        console.error('Error handling quick action:', error);
                    }
                } else {
                    console.warn('AI Companion not enabled or available');
                }
            });
        });

        DOMUtils.addEventListener(this.elements.userInput, 'keydown', (e) => {
            if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clear chat / start new session
        DOMUtils.addEventListener(this.elements.clearButton, 'click', () => {
            this.startNewChat();
        });

        // Knowledge Hub button
        DOMUtils.addEventListener(this.elements.knowledgeHubButton, 'click', () => {
            this.openKnowledgeHub();
        });

        // Settings button (replaces old setup button)
        DOMUtils.addEventListener(this.elements.settingsButton, 'click', () => {
            this.showSetupModal();
        });

        // Appearance side panel toggle
        DOMUtils.addEventListener(this.elements.appearanceButton, 'click', () => {
            this.toggleAppearancePanel();
        });
        DOMUtils.addEventListener(this.elements.closeAppearancePanel, 'click', () => {
            this.toggleAppearancePanel(false);
        });
        // Appearance panel: message icon toggle
        if (this.elements.appearanceMessageIconToggle) {
            DOMUtils.addEventListener(this.elements.appearanceMessageIconToggle, 'change', (e) => {
                this.toggleMessageIcons(e.target.checked);
                this.uiState.messageIconsEnabled = e.target.checked;
                localStorage.setItem('messageIconsEnabled', e.target.checked.toString());
                // Sync the settings modal checkbox
                if (this.elements.messageIconToggle) {
                    this.elements.messageIconToggle.checked = e.target.checked;
                }
            });
        }
        if (this.elements.appearanceShowUserMessagesToggle) {
            DOMUtils.addEventListener(this.elements.appearanceShowUserMessagesToggle, 'change', (e) => {
                this.toggleUserMessagesVisibility(e.target.checked);
            });
        }
        if (this.elements.appearanceShowMetricsToggle) {
            DOMUtils.addEventListener(this.elements.appearanceShowMetricsToggle, 'change', (e) => {
                this.toggleMetricsVisibility(e.target.checked);
            });
        }
        if (this.elements.appearanceAutoHideMetadataToggle) {
            DOMUtils.addEventListener(this.elements.appearanceAutoHideMetadataToggle, 'change', (e) => {
                this.toggleAutoHideMetadata(e.target.checked);
            });
        }
        if (this.elements.appearanceAutoHideSidebarToggle) {
            DOMUtils.addEventListener(this.elements.appearanceAutoHideSidebarToggle, 'change', (e) => {
                this.toggleAutoHideSidebar(e.target.checked);
            });
        }
        // Appearance panel: font size controls
        if (this.elements.appearanceAgentFontSize) {
            DOMUtils.addEventListener(this.elements.appearanceAgentFontSize, 'input', (e) => {
                this.updateAgentFontSize(e.target.value);
                if (this.elements.appearanceAgentFontSizeValue) {
                    this.elements.appearanceAgentFontSizeValue.textContent = e.target.value + 'px';
                }
            });
        }
        if (this.elements.appearanceCompanionFontSize) {
            DOMUtils.addEventListener(this.elements.appearanceCompanionFontSize, 'input', (e) => {
                this.updateCompanionFontSize(e.target.value);
                if (this.elements.appearanceCompanionFontSizeValue) {
                    this.elements.appearanceCompanionFontSizeValue.textContent = e.target.value + 'px';
                }
            });
        }
        // Appearance panel: theme selection
        if (this.elements.appearanceThemeGallery) {
            this.elements.appearanceThemeGallery.addEventListener('click', (e) => {
                const themeOption = e.target.closest('.theme-option');
                if (themeOption) {
                    const theme = themeOption.dataset.theme;
                    this.applyColorTheme(theme);
                    localStorage.setItem('selectedColorTheme', theme);
                    // Update active state in the gallery
                    this.elements.appearanceThemeGallery.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
                    themeOption.classList.add('active');
                }
            });
        }
        // Appearance panel: home background image upload
        if (this.elements.homeBgFileInput) {
            this.elements.homeBgFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size must be under 5 MB');
                    e.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    localStorage.setItem('homeBgImage', ev.target.result);
                    this.applyHomeBgImage();
                    this._syncHomeBgPreview();
                };
                reader.readAsDataURL(file);
                e.target.value = '';
            });
        }
        if (this.elements.homeBgRemoveBtn) {
            this.elements.homeBgRemoveBtn.addEventListener('click', () => {
                this.removeHomeBgImage();
            });
        }
        // Home title & subtitle inputs
        if (this.elements.homeTitleInput) {
            this.elements.homeTitleInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                const title = document.querySelector('.home-title');
                if (title) title.textContent = val || i18n.t('home.defaultTitle');
                if (val) {
                    localStorage.setItem('homeTitle', val);
                } else {
                    localStorage.removeItem('homeTitle');
                }
            });
        }
        if (this.elements.homeSubtitleInput) {
            this.elements.homeSubtitleInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                const subtitle = document.querySelector('.home-subtitle');
                if (subtitle) subtitle.textContent = val || i18n.t('home.defaultSubtitle');
                if (val) {
                    localStorage.setItem('homeSubtitle', val);
                } else {
                    localStorage.removeItem('homeSubtitle');
                }
            });
        }
        // Language selector
        if (this.elements.languageSelect) {
            this.elements.languageSelect.addEventListener('change', (e) => {
                i18n.setLanguage(e.target.value);
                // Re-apply custom title/subtitle or defaults
                const savedTitle = localStorage.getItem('homeTitle');
                const savedSubtitle = localStorage.getItem('homeSubtitle');
                const titleEl = document.querySelector('.home-title');
                const subtitleEl = document.querySelector('.home-subtitle');
                if (titleEl && !savedTitle) titleEl.textContent = i18n.t('home.defaultTitle');
                if (subtitleEl && !savedSubtitle) subtitleEl.textContent = i18n.t('home.defaultSubtitle');
                // Re-render home cards for translated labels
                this.renderHomeAgentCards();
            });
        }
        // Streaming style and speed controls
        if (this.elements.streamingStyleSelect) {
            DOMUtils.addEventListener(this.elements.streamingStyleSelect, 'change', (e) => {
                localStorage.setItem('streamingStyle', e.target.value);
                console.log('Streaming style set to:', e.target.value);
            });
        }
        if (this.elements.streamingSpeedSelect) {
            DOMUtils.addEventListener(this.elements.streamingSpeedSelect, 'change', (e) => {
                localStorage.setItem('streamingSpeed', e.target.value);
                console.log('Streaming speed set to:', e.target.value);
            });
        }
        if (this.elements.suggestedActionsPositionSelect) {
            DOMUtils.addEventListener(this.elements.suggestedActionsPositionSelect, 'change', (e) => {
                localStorage.setItem('suggestedActionsPosition', e.target.value);
                console.log('Suggested actions position set to:', e.target.value);
            });
        }
        if (this.elements.thinkingDotStyleSelect) {
            DOMUtils.addEventListener(this.elements.thinkingDotStyleSelect, 'change', (e) => {
                localStorage.setItem('thinkingDotStyle', e.target.value);
                console.log('Thinking dot style set to:', e.target.value);
            });
        }

        // Conversations button (toggle left panel)
        DOMUtils.addEventListener(this.elements.conversationsButton, 'click', () => {
            this.toggleLeftPanel(!this.uiState.leftPanelCollapsed);
        });

        // Back to Home button
        const backToHomeBtn = document.getElementById('backToHomeButton');
        if (backToHomeBtn) {
            DOMUtils.addEventListener(backToHomeBtn, 'click', () => {
                // Website agents don't need disconnect confirmation
                const currentAgent = this.state.currentAgent;
                if (currentAgent && currentAgent.agentType === 'website') {
                    this.cleanupWebsiteAgent();
                    this.state.isConnected = false;
                    this.showHomePage();
                    return;
                }
                this.showLeaveConfirmOverlay();
            });
        }

        // Clear all history
        DOMUtils.addEventListener(this.elements.clearAllHistoryButton, 'click', () => {
            if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
                this.clearAllHistory();
            }
        });

        // Documentation button - open GitHub README
        DOMUtils.addEventListener(this.elements.documentationButton, 'click', () => {
            this.openDocumentation();
        });

        // Note: Logging button removed - now using unified notification system

        // Close logging panel
        const closeLoggingPanel = document.getElementById('closeLoggingPanel');
        if (closeLoggingPanel) {
            DOMUtils.addEventListener(closeLoggingPanel, 'click', () => {
                const panel = document.getElementById('loggingPanel');
                if (panel) {
                    panel.classList.remove('visible');
                }
            });
        }

        // Refresh logs button
        const refreshLogsBtn = document.getElementById('refreshLogsBtn');
        if (refreshLogsBtn) {
            DOMUtils.addEventListener(refreshLogsBtn, 'click', () => {
                console.log('Refresh logs button clicked');
                this.loggingManager.info('ui', 'Logs refreshed manually by user');
                if (this.isLoggingPanelExpanded) {
                    this.renderTableView();
                } else {
                    this.populateSimpleLoggingPanel();
                }
            });
        }

        // Debug logs button
        const debugLogsBtn = document.getElementById('debugLogsBtn');
        if (debugLogsBtn) {
            DOMUtils.addEventListener(debugLogsBtn, 'click', () => {
                console.log('Debug logs button clicked');

                // Run comprehensive debug
                if (this.loggingManager.debugState) {
                    const debugInfo = this.loggingManager.debugState();
                    console.log('Debug info:', debugInfo);
                }

                // Force refresh panel
                this.populateSimpleLoggingPanel();
            });
        }

        // Add filter event listeners
        this.attachLoggingFilterListeners();

        // Initialize analysis panel tab system
        this.initAnalysisTabs();

        // New UX features
        this.attachUXEnhancementListeners();
    }

    /**
     * Attach logging filter event listeners
     * @private
     */
    attachLoggingFilterListeners() {
        // Search filter
        const logSearch = document.getElementById('logSearch');
        if (logSearch) {
            DOMUtils.addEventListener(logSearch, 'input', () => {
                this.applyLoggingFilters();
            });
        }

        // Level filter
        const logLevelFilter = document.getElementById('logLevelFilter');
        if (logLevelFilter) {
            DOMUtils.addEventListener(logLevelFilter, 'change', () => {
                this.applyLoggingFilters();
            });
        }

        // Category filter
        const logCategoryFilter = document.getElementById('logCategoryFilter');
        if (logCategoryFilter) {
            DOMUtils.addEventListener(logCategoryFilter, 'change', () => {
                this.applyLoggingFilters();
            });
        }

        // Time range filter
        const logTimeFilter = document.getElementById('logTimeFilter');
        if (logTimeFilter) {
            DOMUtils.addEventListener(logTimeFilter, 'change', () => {
                this.applyLoggingFilters();
            });
        }

        console.log('Logging filter listeners attached');

        // Add cleanup handler for page unload to prevent memory leaks
        window.addEventListener('beforeunload', () => {
            console.log('[Application] Page unloading, performing cleanup...');
            this.cleanup();
        });

        console.log('Performance optimization event listeners attached');
    }

    /**
     * Apply current filter settings to the displayed logs
     */
    applyLoggingFilters() {
        if (this.isLoggingPanelExpanded) {
            this.renderTableView();
        } else {
            this.populateSimpleLoggingPanel();
        }
    }

    /**
     * Get current filter settings
     */
    getCurrentFilters() {
        const logSearch = document.getElementById('logSearch');
        const logLevelFilter = document.getElementById('logLevelFilter');
        const logCategoryFilter = document.getElementById('logCategoryFilter');
        const logTimeFilter = document.getElementById('logTimeFilter');

        const filters = {
            search: logSearch?.value.trim() || '',
            level: logLevelFilter?.value || 'all',
            category: logCategoryFilter?.value || 'all',
            timeRange: logTimeFilter?.value || 'all'
        };

        // Apply time range filtering
        if (filters.timeRange !== 'all') {
            const now = new Date();
            let timeLimit;

            switch (filters.timeRange) {
                case '1h':
                    timeLimit = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '24h':
                    timeLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    timeLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    timeLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }

            if (timeLimit) {
                filters.timeLimit = timeLimit.toISOString();
            }
        }

        return filters;
    }
    attachUXEnhancementListeners() {
        // Message icon toggle
        if (this.elements.messageIconToggle) {
            DOMUtils.addEventListener(this.elements.messageIconToggle, 'change', (e) => {
                this.toggleMessageIcons(e.target.checked);
            });
        }
    }

    /**
     * Attach file upload event listeners
     * @private
     */
    attachFileUploadListeners() {
        // File selection
        DOMUtils.addEventListener(this.elements.attachButton, 'click', () => {
            this.elements.fileInput.click();
        });

        DOMUtils.addEventListener(this.elements.fileInput, 'change', (e) => {
            this.handleFileSelection(e);
        });

        DOMUtils.addEventListener(this.elements.removeFileButton, 'click', () => {
            this.removeAllSelectedFiles();
        });

        // Drag and drop
        DOMUtils.addEventListener(this.elements.chatWindow, 'dragover', (e) => {
            this.handleDragOver(e);
        });

        DOMUtils.addEventListener(this.elements.chatWindow, 'dragleave', (e) => {
            this.handleDragLeave(e);
        });

        DOMUtils.addEventListener(this.elements.chatWindow, 'drop', (e) => {
            this.handleFileDrop(e);
        });

        // Clipboard paste (image from screenshot / web copy)
        DOMUtils.addEventListener(this.elements.userInput, 'paste', (e) => {
            this.handlePasteImage(e);
        });
    }

    /**
     * Attach modal event listeners
     * @private
     */
    attachModalListeners() {
        // Setup modal
        DOMUtils.addEventListener(this.elements.closeSetupModal, 'click', () => {
            this.hideSetupModal();
        });

        // Close modals when clicking outside
        DOMUtils.addEventListener(this.elements.setupModal, 'click', (e) => {
            if (e.target === this.elements.setupModal) {
                this.hideSetupModal();
            }
        });

        // Image modal
        const closeImageModal = DOMUtils.querySelector('#imageModal .closeModal');
        if (closeImageModal) {
            DOMUtils.addEventListener(closeImageModal, 'click', () => {
                DOMUtils.removeClass(this.elements.imageModal, 'show');
            });
        }

        DOMUtils.addEventListener(this.elements.imageModal, 'click', (e) => {
            if (e.target === this.elements.imageModal) {
                DOMUtils.removeClass(this.elements.imageModal, 'show');
            }
        });

        // Setup modal form interactions
        this.attachSetupModalListeners();
    }

    /**
     * Attach setup modal specific event listeners
     * @private
     */
    attachSetupModalListeners() {
        // Settings navigation
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.settings-section');

        navItems.forEach(item => {
            DOMUtils.addEventListener(item, 'click', (e) => {
                e.preventDefault();
                const targetSection = item.getAttribute('data-section');

                // Update active navigation item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Show target section
                sections.forEach(section => section.classList.remove('active'));
                const targetElement = document.getElementById(targetSection);
                if (targetElement) {
                    targetElement.classList.add('active');
                }
            });
        });

        // AI Companion checkbox
        if (this.elements.enableLLMCheckbox) {
            DOMUtils.addEventListener(this.elements.enableLLMCheckbox, 'change', (e) => {
                this.toggleAICompanionSection(e.target.checked);
                // Save the setting
                localStorage.setItem('enableLLM', e.target.checked.toString());

                // Update AI companion status immediately
                if (this.aiCompanion) {
                    if (e.target.checked) {
                        this.aiCompanion.enable();
                    } else {
                        this.aiCompanion.disable();
                    }
                    // Update AI companion toggle visibility
                    this.updateAICompanionToggleVisibility();
                }
            });
        }

        // AI Thinking mode checkbox
        if (this.elements.useAIThinkingCheckbox) {
            DOMUtils.addEventListener(this.elements.useAIThinkingCheckbox, 'change', (e) => {
                localStorage.setItem('useAIThinking', e.target.checked.toString());
                console.log('AI thinking simulation:', e.target.checked ? 'enabled' : 'disabled (using thinking dot)');
            });
        }

        // Show companion model in header checkbox
        if (this.elements.showCompanionModelCheckbox) {
            DOMUtils.addEventListener(this.elements.showCompanionModelCheckbox, 'change', (e) => {
                localStorage.setItem('showCompanionModel', e.target.checked.toString());
                const panel = document.getElementById('companionStatusPanel');
                if (panel) panel.style.display = e.target.checked ? '' : 'none';
            });
        }

        // ── Model Registration Form ──
        this._setupModelRegistrationHandlers();

        // Streaming checkbox
        if (this.elements.enableStreamingCheckbox) {
            DOMUtils.addEventListener(this.elements.enableStreamingCheckbox, 'change', (e) => {
                localStorage.setItem('enableStreaming', e.target.checked.toString());
            });
        }

        // Side Browser checkbox
        if (this.elements.enableSideBrowserCheckbox) {
            DOMUtils.addEventListener(this.elements.enableSideBrowserCheckbox, 'change', (e) => {
                localStorage.setItem('enableSideBrowser', e.target.checked.toString());
            });
        }

        // Auto-open citations checkbox
        if (this.elements.autoOpenCitationsCheckbox) {
            DOMUtils.addEventListener(this.elements.autoOpenCitationsCheckbox, 'change', (e) => {
                localStorage.setItem('autoOpenCitations', e.target.checked.toString());
            });
        }

        // Open attachments in side browser checkbox
        if (this.elements.openAttachmentsSideBrowserCheckbox) {
            DOMUtils.addEventListener(this.elements.openAttachmentsSideBrowserCheckbox, 'change', (e) => {
                localStorage.setItem('openAttachmentsSideBrowser', e.target.checked.toString());
            });
        }

        // Full Width Messages checkbox
        if (this.elements.fullWidthMessagesCheckbox) {
            DOMUtils.addEventListener(this.elements.fullWidthMessagesCheckbox, 'change', (e) => {
                localStorage.setItem('fullWidthMessages', e.target.checked.toString());
                this.toggleFullWidthMessages(e.target.checked);
            });
        }

        // API provider selection
        if (this.elements.apiProviderSelect) {
            DOMUtils.addEventListener(this.elements.apiProviderSelect, 'change', (e) => {
                this.handleAPIProviderChange(e.target.value);
                // Save the selected provider
                localStorage.setItem('selectedApiProvider', e.target.value);
                // Load API key for the new provider
                this.loadCurrentAPIKey(e.target.value);
            });
        }

        // Ollama model selection
        if (this.elements.ollamaModelSelect) {
            DOMUtils.addEventListener(this.elements.ollamaModelSelect, 'change', (e) => {
                // Save the selected model
                localStorage.setItem('ollamaSelectedModel', e.target.value);
                console.log('Ollama model selected and saved:', e.target.value);

                // Update AI companion status to show new model
                if (this.aiCompanion) {
                    this.aiCompanion.updateStatus();
                    // Update AI companion toggle visibility
                    this.updateAICompanionToggleVisibility();
                }
            });
        }

        // Ollama URL input
        if (this.elements.ollamaUrlInput) {
            DOMUtils.addEventListener(this.elements.ollamaUrlInput, 'change', (e) => {
                // Save the Ollama URL
                localStorage.setItem('ollamaUrl', e.target.value);
                console.log('Ollama URL saved:', e.target.value);
            });
        }

        // API Key input
        if (this.elements.apiKeyInput) {
            DOMUtils.addEventListener(this.elements.apiKeyInput, 'change', async (e) => {
                // Save the API key securely
                const provider = this.elements.apiProviderSelect?.value || 'openai';
                if (e.target.value.trim()) {
                    await SecureStorage.store(`${provider}ApiKey`, e.target.value.trim());
                    console.log(`${provider} API key saved`);

                    // Update AI companion status
                    if (this.aiCompanion) {
                        this.aiCompanion.updateStatus();
                        // Update AI companion toggle visibility
                        this.updateAICompanionToggleVisibility();
                    }
                }
            });
        }

        // Azure OpenAI settings
        if (this.elements.azureEndpointInput) {
            DOMUtils.addEventListener(this.elements.azureEndpointInput, 'change', (e) => {
                localStorage.setItem('azureEndpoint', e.target.value);
                console.log('Azure endpoint saved:', e.target.value);

                // Update AI companion status if Azure is selected
                if (this.aiCompanion && this.elements.apiProviderSelect?.value === 'azure') {
                    this.aiCompanion.updateStatus();
                    // Update AI companion toggle visibility
                    this.updateAICompanionToggleVisibility();
                }
            });
        }

        if (this.elements.azureDeploymentInput) {
            DOMUtils.addEventListener(this.elements.azureDeploymentInput, 'change', (e) => {
                localStorage.setItem('azureDeployment', e.target.value);
                console.log('Azure deployment saved:', e.target.value);

                // Update AI companion status if Azure is selected
                if (this.aiCompanion && this.elements.apiProviderSelect?.value === 'azure') {
                    this.aiCompanion.updateStatus();
                    // Update AI companion toggle visibility
                    this.updateAICompanionToggleVisibility();
                }
            });
        }

        if (this.elements.azureApiVersionInput) {
            DOMUtils.addEventListener(this.elements.azureApiVersionInput, 'change', (e) => {
                localStorage.setItem('azureApiVersion', e.target.value);
                console.log('Azure API version saved:', e.target.value);

                // Update AI companion status if Azure is selected
                if (this.aiCompanion && this.elements.apiProviderSelect?.value === 'azure') {
                    this.aiCompanion.updateStatus();
                    // Update AI companion toggle visibility
                    this.updateAICompanionToggleVisibility();
                }
            });
        }

        // Refresh Ollama models
        if (this.elements.refreshModelsBtn) {
            DOMUtils.addEventListener(this.elements.refreshModelsBtn, 'click', () => {
                this.refreshOllamaModels();
            });
        }

        // Test Ollama connection
        if (this.elements.testOllamaBtn) {
            DOMUtils.addEventListener(this.elements.testOllamaBtn, 'click', () => {
                this.runConnectionTestWithProgress(
                    this.elements.testOllamaBtn,
                    'Testing...',
                    () => this.testOllamaConnection()
                );
            });
        }

        // Test Azure OpenAI connection
        if (this.elements.testAzureBtn) {
            DOMUtils.addEventListener(this.elements.testAzureBtn, 'click', () => {
                this.runConnectionTestWithProgress(
                    this.elements.testAzureBtn,
                    'Testing...',
                    () => this.testAzureConnection()
                );
            });
        }

        // Test general API connection
        if (this.elements.testApiBtn) {
            DOMUtils.addEventListener(this.elements.testApiBtn, 'click', () => {
                this.runConnectionTestWithProgress(
                    this.elements.testApiBtn,
                    'Testing...',
                    () => this.testApiConnection()
                );
            });
        }

        // OpenAI Compatible settings
        if (this.elements.openaiCompatibleBaseUrlInput) {
            DOMUtils.addEventListener(this.elements.openaiCompatibleBaseUrlInput, 'change', (e) => {
                localStorage.setItem('openaiCompatibleBaseUrl', e.target.value);
                console.log('OpenAI Compatible base URL saved:', e.target.value);
            });
        }
        if (this.elements.openaiCompatibleModelInput) {
            DOMUtils.addEventListener(this.elements.openaiCompatibleModelInput, 'change', (e) => {
                localStorage.setItem('openaiCompatibleModel', e.target.value);
                console.log('OpenAI Compatible model saved:', e.target.value);
                // Update AI companion status and token displays for new model
                if (this.aiCompanion) {
                    this.aiCompanion.updateStatus();
                    this.aiCompanion.updateTokenDisplays();
                    this.aiCompanion.updateModelComparisonView();
                }
            });
        }
        if (this.elements.openaiCompatibleDisplayNameInput) {
            DOMUtils.addEventListener(this.elements.openaiCompatibleDisplayNameInput, 'change', (e) => {
                localStorage.setItem('openaiCompatibleDisplayName', e.target.value);
                console.log('OpenAI Compatible display name saved:', e.target.value);
                // Update AI companion status display
                if (this.aiCompanion) {
                    this.aiCompanion.updateStatus();
                    this.aiCompanion.updateModelComparisonView();
                }
            });
        }
        if (this.elements.openaiCompatibleApiKeyInput) {
            DOMUtils.addEventListener(this.elements.openaiCompatibleApiKeyInput, 'change', async (e) => {
                try {
                    const { SecureStorage } = await import('../utils/secureStorage.js');
                    await SecureStorage.store('openaiCompatibleApiKey', e.target.value);
                    console.log('OpenAI Compatible API key saved securely');
                } catch (err) {
                    console.error('Failed to save OpenAI Compatible API key:', err);
                }
            });
        }
        if (this.elements.testOpenAICompatibleBtn) {
            DOMUtils.addEventListener(this.elements.testOpenAICompatibleBtn, 'click', () => {
                this.runConnectionTestWithProgress(
                    this.elements.testOpenAICompatibleBtn,
                    'Testing...',
                    () => this.testOpenAICompatibleConnection()
                );
            });
        }

        // Font size controls
        if (this.elements.appearanceAgentFontSize) {
            DOMUtils.addEventListener(this.elements.appearanceAgentFontSize, 'input', (e) => {
                this.updateAgentFontSize(e.target.value);
            });
        }

        if (this.elements.appearanceCompanionFontSize) {
            DOMUtils.addEventListener(this.elements.appearanceCompanionFontSize, 'input', (e) => {
                this.updateCompanionFontSize(e.target.value);
            });
        }

        console.log('Setup modal event listeners attached');
    }

    /**
     * Attach application-specific event listeners
     * @private
     */
    attachApplicationEventListeners() {
        // Agent management events
        window.addEventListener('agentChanged', (e) => {
            this.handleAgentChanged(e.detail);
        });

        window.addEventListener('agentSwitched', (e) => {
            this.hideSetupModal();
            const agentId = e.detail?.agentId;
            if (agentId) {
                // Disconnect and reconnect to new agent via overlay
                directLineService.disconnect();
                this.state.isConnected = false;
                messageRenderer.clearMessages();
                messageRenderer.setTargetWindow('chatWindow');
                const hasParams = agentManager.agentHasInitParams(agentId);
                this.showAgentSplashOverlay(agentId, hasParams);
            }
        });

        // Agent greeting events are now handled by directLineService.on('greeting'/'greetingTimeout')

        // DirectLine events — typing, message, conversationUpdate, event
        // are now handled by directLineService.on() in initializeManagers()
        // Keep only UI-specific window events not covered by DirectLineService

        window.addEventListener('hideTypingIndicator', () => {
            this.hideProgressIndicator();
        });

        window.addEventListener('streamingActivity', (e) => {
            this.handleStreamingActivity(e.detail);
        });

        window.addEventListener('streamingEnd', (e) => {
            this.handleStreamingEnd(e.detail);
        });

        window.addEventListener('connectionStatus', (e) => {
            this.handleConnectionStatusUI(e.detail);
        });

        window.addEventListener('connectionError', (e) => {
            this.handleConnectionErrorUI(e.detail);
        });

        // Streaming events
        window.addEventListener('streamingHealth', (e) => {
            this.handleStreamingHealth(e.detail);
        });

        window.addEventListener('streamingCompleted', (e) => {
            this.handleStreamingCompleted(e.detail);
        });

        // Session events
        window.addEventListener('sessionLoaded', (e) => {
            this.handleSessionLoaded(e.detail);
        });

        window.addEventListener('sessionChanged', (e) => {
            this.handleSessionChanged(e.detail);
        });

        // AutoQA state change — manage UI and input mode
        window.addEventListener('autoQAStateChange', (e) => {
            const { state } = e.detail;

            if (state === 'started') {
                // Switch text box back to Agent mode (turn off AI Companion mode)
                if (this.state.aiCompanionMode) {
                    this.toggleAICompanionMode();
                }
                // Disable user input during AutoQA
                document.body.classList.add('autoqa-active');
                if (this.elements.userInput) this.elements.userInput.disabled = true;
                if (this.elements.sendButton) this.elements.sendButton.disabled = true;
                // Show floating Live banner
                this._showAutoQALiveBanner();
            } else if (state === 'stopped') {
                document.body.classList.remove('autoqa-active');
                if (this.elements.userInput) this.elements.userInput.disabled = false;
                if (this.elements.sendButton) this.elements.sendButton.disabled = false;
                this._removeAutoQALiveBanner();
            } else if (state === 'paused') {
                const banner = document.getElementById('autoqa-live-banner');
                if (banner) {
                    banner.querySelector('.autoqa-live-text').textContent = 'AutoQA Paused';
                    banner.classList.add('autoqa-live-paused');
                }
            } else if (state === 'resumed') {
                document.body.classList.add('autoqa-active');
                if (this.elements.userInput) this.elements.userInput.disabled = true;
                if (this.elements.sendButton) this.elements.sendButton.disabled = true;
                const banner = document.getElementById('autoqa-live-banner');
                if (banner) {
                    banner.querySelector('.autoqa-live-text').textContent = 'AutoQA Live';
                    banner.classList.remove('autoqa-live-paused');
                }
            }

            // Update quick-action button
            const autoqaBtn = document.querySelector('.quick-action-btn[data-action="autoqa"]');
            if (autoqaBtn) {
                if (state === 'started' || state === 'resumed') {
                    autoqaBtn.textContent = 'Stop AutoQA';
                    autoqaBtn.classList.add('autoqa-running');
                } else if (state === 'stopped') {
                    autoqaBtn.textContent = 'AutoQA';
                    autoqaBtn.classList.remove('autoqa-running');
                } else if (state === 'paused') {
                    autoqaBtn.textContent = 'AutoQA (Paused)';
                }
            }

            // Update round counter on banner
            if (state === 'roundComplete') {
                const banner = document.getElementById('autoqa-live-banner');
                if (banner) {
                    const { round, total } = e.detail;
                    banner.querySelector('.autoqa-live-round').textContent = `${round}/${total}`;
                }
            }
        });

        // UI events
        window.addEventListener('suggestedActionClicked', (e) => {
            this.handleSuggestedAction(e.detail);
        });

        // AutoQA: programmatic message send (already in Agent mode, goes to DirectLine)
        window.addEventListener('autoQASendMessage', () => {
            this.sendMessage();
        });
    }

    /**
     * Show the AutoQA Live floating banner
     * @private
     */
    _showAutoQALiveBanner() {
        this._removeAutoQALiveBanner();

        const banner = DOMUtils.createElement('div', {
            id: 'autoqa-live-banner',
            className: 'autoqa-live-banner'
        });

        banner.innerHTML = `
            <span class="autoqa-live-dot"></span>
            <span class="autoqa-live-text">AutoQA Live</span>
            <span class="autoqa-live-round">0/${window.aiCompanion?.autoQA?.config?.maxRounds || '?'}</span>
            <button class="autoqa-live-stop" title="Stop AutoQA">Stop</button>
        `;

        banner.querySelector('.autoqa-live-stop').addEventListener('click', () => {
            if (window.aiCompanion) {
                window.aiCompanion.stopAutoQA('manual');
            }
        });

        // Insert at the top of the chat panel
        const chatPanel = document.getElementById('agentChatPanel');
        if (chatPanel) {
            chatPanel.insertBefore(banner, chatPanel.firstChild);
        } else {
            document.body.appendChild(banner);
        }
    }

    /**
     * Remove the AutoQA Live floating banner
     * @private
     */
    _removeAutoQALiveBanner() {
        const existing = document.getElementById('autoqa-live-banner');
        if (existing) existing.remove();
    }

    /**
     * Send message (enhanced with legacy's suggested actions clearing)
     */
    async sendMessage() {
        const messageText = this.elements.userInput.value.trim();
        if (!messageText && (!this.selectedFiles || this.selectedFiles.length === 0)) return;

        // Temporarily comment out logging call
        // this.loggingManager.info('ui', 'User sending message', {
        //     messageLength: messageText.length,
        //     hasFile: !!this.selectedFiles.length,
        //     fileName: this.selectedFiles[0]?.name,
        //     isConnected: this.state.isConnected
        // });

        if (!this.state.isConnected) {
            this.showErrorMessage('Not connected to bot. Please check your configuration.');
            // Temporarily comment out logging call
            // this.loggingManager.warn('ui', 'Message send blocked - not connected', {
            //     messageText: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '')
            // });
            return;
        }

        // Stop and completely reinitialize all speech services when user sends a new message
        console.log('🔴 [SPEECH-DISPOSE] =================================');
        console.log('🔴 [SPEECH-DISPOSE] NEW MESSAGE SENT - DISPOSING AND REINITIALIZING ALL SPEECH SERVICES');
        console.log('🔴 [SPEECH-DISPOSE] =================================');
        try {
            // Use the new comprehensive disposal and reinitialization method
            if (window.speechEngine && window.speechEngine.disposeAndReinitialize) {
                console.log('🟡 [SPEECH-DISPOSE] Calling speechEngine.disposeAndReinitialize()');
                const startTime = performance.now();
                await window.speechEngine.disposeAndReinitialize();
                const endTime = performance.now();
                console.log(`🟢 [SPEECH-DISPOSE] speechEngine.disposeAndReinitialize() completed in ${(endTime - startTime).toFixed(2)}ms`);
            } else if (window.speechEngine && window.speechEngine.stopSpeaking) {
                // Fallback to old method if new method is not available
                console.log('🟡 [SPEECH-DISPOSE] Fallback: Using old stopSpeaking() method');
                window.speechEngine.stopSpeaking();
            } else {
                console.log('� [SPEECH-DISPOSE] No speech engine available');
            }

            // Also stop AI Companion speech as additional safety measure
            if (window.aiCompanion && window.aiCompanion.stopSpeaking) {
                console.log('🟡 [SPEECH-DISPOSE] Also stopping AI Companion speech as safety measure');
                window.aiCompanion.stopSpeaking();
            }

        } catch (error) {
            console.error('� [SPEECH-DISPOSE] Error during disposal and reinitialization:', error);
            console.error('� [SPEECH-DISPOSE] Error stack:', error.stack);

            // Fallback to old stopping methods if disposal fails
            console.log('� [SPEECH-DISPOSE] Attempting fallback speech stopping methods...');
            try {
                if (window.speechEngine && window.speechEngine.stopSpeaking) {
                    window.speechEngine.stopSpeaking();
                }
                if (window.aiCompanion && window.aiCompanion.stopSpeaking) {
                    window.aiCompanion.stopSpeaking();
                }
                if (typeof window.speechSynthesis !== 'undefined') {
                    window.speechSynthesis.cancel();
                }
            } catch (fallbackError) {
                console.error('🔴 [SPEECH-DISPOSE] Even fallback methods failed:', fallbackError);
            }
        }

        console.log('🔴 [SPEECH-DISPOSE] =================================');

        // Temporarily disable send button to prevent multiple sends
        this.elements.sendButton.disabled = true;

        try {
            // Start timing for efficiency tracking (AI Companion)
            if (window.aiCompanion && window.aiCompanion.isEnabled) {
                window.aiCompanion.startUserMessageTiming();
            }

            // Start response time tracking for accurate request-to-response timing
            messageRenderer.startResponseTimeTracking();

            // Update per-agent stats for user message
            this._updateCurrentAgentStats();

            // Clear suggested actions first (like legacy)
            messageRenderer.clearSuggestedActions();

            // Clear input
            this.elements.userInput.value = '';

            // Create timestamp for proper chronological ordering
            const userMessageTimestamp = new Date().toISOString();

            // Add user message to session
            sessionManager.addMessage({
                from: 'user',
                text: messageText,
                attachments: (this.selectedFiles && this.selectedFiles.length > 0) ? [...this.selectedFiles] : [],
                timestamp: userMessageTimestamp
            });

            // Build local attachment objects for rendering in user message
            const userAttachments = [];
            for (const file of (this.selectedFiles || [])) {
                const blobUrl = URL.createObjectURL(file);
                userAttachments.push({
                    contentType: file.type || 'application/octet-stream',
                    contentUrl: blobUrl,
                    name: file.name,
                    _fileSize: file.size
                });
            }

            // Render user message with explicit timestamp and attachments
            this.renderUserMessage(messageText, userMessageTimestamp, userAttachments);

            // Send to DirectLine immediately - don't wait for thinking simulation
            let messagePromise;

            // Check if AI Companion mode is active and route message accordingly
            if (this.state.aiCompanionMode && window.aiCompanion && window.aiCompanion.isEnabled) {
                console.log('AI Companion mode active - routing message to LLM');

                // Send to AI Companion instead of DirectLine
                messagePromise = this.sendMessageToAICompanion(messageText);
            } else {
                // Normal flow - send to the active transport (DirectLine or Direct-to-Engine)
                if (this.selectedFiles && this.selectedFiles.length > 0) {
                    messagePromise = this.sendMessageWithFiles(messageText, [...this.selectedFiles]);
                    this.removeAllSelectedFiles();
                } else {
                    messagePromise = this.getConnectorForAgent().sendMessage(messageText);
                }

                // The transport send is async (D2E streams over SSE). A mid-stream
                // network drop on a long generative answer rejects this promise
                // LATER, after the synchronous try/catch has already exited — which
                // previously surfaced as an unhandled rejection and left the typing
                // indicator stuck for 30s. Attach a dedicated failure sink so the
                // UI degrades gracefully. (This is a separate handler; the original
                // promise is still passed to the thinking simulation below.)
                messagePromise.catch((err) => {
                    console.error('[Application] Message send failed (transport):', err);
                    this.hideProgressIndicator();
                    this.isEvaluatingThinkingSimulation = false;
                    if (window.aiCompanion?.isThinkingActive?.()) {
                        try { window.aiCompanion.emergencyStopThinking?.(); } catch (_) { /* ignore */ }
                    }
                    this.showErrorMessage('The connection was interrupted before the agent finished responding. Please try again.');
                });
            }

            // Start intelligent thinking simulation after DirectLine send
            this.startIntelligentThinkingSimulation(messageText || 'User sent file attachment(s)', messagePromise);

            // Show progress indicator with detected context (only if AI companion is not enabled for thinking simulation)
            {
                const useAIThinking = window.aiCompanion?.isEnabled === true && localStorage.getItem('useAIThinking') !== 'false';
                const hasFiles = userAttachments.length > 0;

                if (!useAIThinking || hasFiles) {
                    this.showProgressIndicator({ source: hasFiles ? 'file-upload' : 'user-message' });
                    this.enhancedTypingIndicator.setStatus(hasFiles ? 'Uploading and processing...' : 'Waiting for agent...');
                } else {
                    this.isEvaluatingThinkingSimulation = true;
                }
            }

            // Re-enable send button after message is processed
            this.elements.sendButton.disabled = false;

        } catch (error) {
            console.error('Error sending message:', error);

            // Re-enable send button on error
            this.elements.sendButton.disabled = false;

            this.showErrorMessage('Failed to send message. Please try again.');
            this.hideProgressIndicator();
        }
    }

    /**
     * Render user message with explicit timestamp for proper ordering
     * @param {string} text - Message text
     * @param {string} timestamp - Message timestamp
     * @private
     */
    renderUserMessage(text, timestamp, attachments) {
        const activity = {
            from: { id: 'user' },
            text: text,
            timestamp: timestamp || new Date().toISOString(),
            attachments: attachments || []
        };

        messageRenderer.renderCompleteMessage(activity);
    }

    /**
     * Start new chat session — uses the same overlay flow as Home page.
     * Disconnects current agent, clears chat, reconnects via overlay.
     */
    startNewChat() {
        console.log('Starting new chat...');

        const currentAgent = agentManager.getCurrentAgent();
        if (!currentAgent) {
            this.showHomePage();
            return;
        }

        // Disconnect current session
        directLineService.disconnect();
        this.state.isConnected = false;

        // Clear chat
        messageRenderer.clearMessages();
        messageRenderer.setTargetWindow('chatWindow');

        // Create fresh session
        const newSessionId = sessionManager.createNewSession();
        this.state.currentSession = newSessionId;
        sessionManager.clearCurrentSessionStorage();
        localStorage.setItem('currentSession', newSessionId);

        // Show the same agent overlay
        const hasParams = agentManager.agentHasInitParams(currentAgent.id);
        this.showAgentSplashOverlay(currentAgent.id, hasParams);
    }

    /**
     * Start new session (alias for compatibility)
     */
    startNewSession() {
        this.startNewChat();
    }

    /**
     * Initialize session (without clearing existing messages)
     * @private
     */
    initializeSession() {
        console.log('Initializing session...');

        // Start new session
        const newSessionId = sessionManager.startNewSession();
        this.state.currentSession = newSessionId;

        console.log('Session initialized:', newSessionId);
    }

    /**
     * Clear all chat history
     */
    clearAllHistory() {
        sessionManager.clearAllHistory();
        messageRenderer.clearMessages();
        // Ensure MessageRenderer targets the correct window after clearing
        messageRenderer.setTargetWindow('chatWindow');
        console.log('All chat history cleared');
    }

    /**
     * Toggle AI Companion mode
     */
    toggleAICompanionMode() {
        console.log('toggleAICompanionMode called, current state:', this.state.aiCompanionMode);

        this.state.aiCompanionMode = !this.state.aiCompanionMode;

        // Apply visual changes
        this.applyAICompanionVisualState();

        console.log('AI Companion mode:', this.state.aiCompanionMode ? 'ON' : 'OFF');
    }

    /**
     * Apply visual state for AI companion mode
     * @private
     */
    applyAICompanionVisualState() {
        const toggleBtn = this.elements.aiCompanionToggleBtn;
        const quickActionsContainer = this.elements.llmQuickActionsContainer;

        if (this.state.aiCompanionMode) {
            toggleBtn.classList.add('active');
            quickActionsContainer.classList.add('expanded');
            document.body.classList.add('ai-companion-active');
            this.elements.userInput.placeholder = "Ask AI Companion...";
        } else {
            toggleBtn.classList.remove('active');
            quickActionsContainer.classList.remove('expanded');
            document.body.classList.remove('ai-companion-active');
            this.elements.userInput.placeholder = "Type your message...";
        }

        // Sync hover menu active-mode indicators and status text
        if (this.elements.aiCompanionHoverMenu) {
            this.elements.aiCompanionHoverMenu.querySelectorAll('.hover-menu-item').forEach(item => {
                const isAgent = item.dataset.mode === 'agent';
                const active = this.state.aiCompanionMode ? !isAgent : isAgent;
                item.classList.toggle('active-mode', active);
            });
            const statusEl = document.getElementById('aiCompanionModeStatus');
            if (statusEl) {
                statusEl.textContent = this.state.aiCompanionMode
                    ? 'AI Companion Mode — messages are sent to your AI companion for analysis and insights.'
                    : 'Agent Mode — messages are sent to your Copilot Studio agent.';
            }
        }
    }

    /**
     * Send message to AI Companion LLM
     * @param {string} messageText - The message to send
     * @returns {Promise} Promise that resolves when the message is processed
     */
    async sendMessageToAICompanion(messageText) {
        if (!window.aiCompanion || !window.aiCompanion.isEnabled) {
            throw new Error('AI Companion is not available or enabled');
        }

        try {
            // Add conversation context like the AI companion does
            const conversationContext = window.aiCompanion.getAdaptiveConversationContext('general');
            const messageWithContext = `${conversationContext}\n\nUser Question: ${messageText}`;

            // Estimate token usage
            window.aiCompanion.estimateTokenUsage(messageWithContext, true);

            // Show typing indicator
            window.aiCompanion.showTypingIndicator();

            // Send to AI companion's LLM processing
            await window.aiCompanion.sendQuickActionRequest(messageWithContext);

            return Promise.resolve();
        } catch (error) {
            console.error('Error sending message to AI Companion:', error);
            window.aiCompanion.hideTypingIndicator();
            throw error;
        }
    }

    /**
     * Update AI Companion toggle button visibility based on AI Companion enabled status
     */
    updateAICompanionToggleVisibility() {
        console.log('updateAICompanionToggleVisibility called');
        console.log('Elements found:', {
            aiCompanionToggleBtn: !!this.elements.aiCompanionToggleBtn,
            llmQuickActionsContainer: !!this.elements.llmQuickActionsContainer
        });

        if (this.elements.aiCompanionToggleBtn && this.elements.llmQuickActionsContainer) {
            // Check both the AI companion instance and localStorage as fallback
            const isEnabled = (window.aiCompanion && window.aiCompanion.isEnabled) ||
                (localStorage.getItem('enableLLM') === 'true');

            console.log('AI Companion enabled check:', {
                aiCompanionExists: !!window.aiCompanion,
                aiCompanionEnabled: window.aiCompanion?.isEnabled,
                localStorageValue: localStorage.getItem('enableLLM'),
                finalIsEnabled: isEnabled
            });

            // Show/hide the inline wrapper (contains button + hover menu)
            const wrapper = this.elements.aiCompanionInlineWrapper;
            if (wrapper) {
                wrapper.style.display = isEnabled ? 'flex' : 'none';
            } else {
                this.elements.aiCompanionToggleBtn.style.display = isEnabled ? 'inline-flex' : 'none';
            }

            // If AI companion is disabled, also hide the quick actions and reset the mode
            if (!isEnabled) {
                this.state.aiCompanionMode = false;
                this.elements.aiCompanionToggleBtn.classList.remove('active');
                this.elements.llmQuickActionsContainer.classList.remove('expanded');
            }

            // Sync hover menu active-mode indicators on init
            this.applyAICompanionVisualState();

            console.log('AI Companion toggle visibility updated:', isEnabled ? 'visible' : 'hidden');
        } else {
            console.log('Missing elements for AI Companion toggle visibility update');
        }
    }

    /**
     * Handle a native streaming chunk from DirectLineService.
     * Routes incremental updates through messageRenderer so the live bubble has
     * the same Markdown/KaTeX/icon/metrics treatment as a normal message and
     * shares a single DOM element with the eventual finalized message.
     * @param {Object} entry - MessageEntry with cumulative partial text
     * @private
     */
    handleStreamingChunk(entry) {
        this.hideProgressIndicator();
        this.clearInformativeIndicator();
        this._lastMessageTime = Date.now();

        // Skip leading empty chunks that would create an empty bubble
        if (!entry.text?.trim()) return;

        // Stream diagnostic: one concise line per chunk showing the growing
        // content tail, so the live answer is readable in the console.
        const _streamText = typeof entry.text === 'string' ? entry.text : '';
        console.log(`💬 [stream ${entry?.id ?? '?'}] ${_streamText.length} chars | …${_streamText.slice(-60)}`);

        // MessageEntry is activity-shaped (id/from/text/timestamp/attachments).
        // entry.id is kept stable across chunks + finalize so the renderer reuses
        // the same streaming bubble. entry.text is cumulative → non-realtime path.
        // Serialize chunk rendering: handleStreamingMessageDirect is async and the
        // first chunk creates the DOM container; without serialization, fast
        // follow-up chunks race ahead while the container is still being built.
        // Wrap the synchronous kick-off in try/catch so a throw before the first
        // await still surfaces instead of dying silently.
        try {
            this._streamRenderChain = (this._streamRenderChain || Promise.resolve())
                .then(() => messageRenderer.handleStreamingMessageDirect(entry))
                .catch((err) => console.error('[Application] handleStreamingChunk async render error:', err));
        } catch (err) {
            console.error('[Application] handleStreamingChunk sync error:', err);
        }
    }

    /**
     * Remove a "regretted" livestream bubble (bot concluded with no content).
     * @param {Object} entry - MessageEntry whose stream was cancelled
     * @private
     */
    handleStreamCancelled(entry) {
        const messageId = entry.id || `stream-${entry.timestamp}`;
        messageRenderer.cancelStreamingMessage(messageId);
    }

    /**
     * Check if activity should be skipped (internal/system events)
     * @param {Object} activity - Activity to check
     * @returns {boolean} True if should skip
     * @private
     */
    shouldSkipActivity(activity) {
        // Skip internal system events that shouldn't be rendered
        const INTERNAL_EVENT_NAMES = [
            'handoff.initiated',
            'handoff.completed',
            'typing',
            'trace',
            'conversationUpdate',
            'contactRelationUpdate',
            'deleteUserData',
            'installationUpdate',
            'messageUpdate',
            'messageDelete'
        ];

        // Skip internal events by name
        if (activity.type === 'event' && activity.name && INTERNAL_EVENT_NAMES.includes(activity.name)) {
            console.log(`[Activity Filter] Skipping internal event: ${activity.name}`);
            return true;
        }

        // Skip trace activities (debugging only)
        if (activity.type === 'trace') {
            console.log('[Activity Filter] Skipping trace activity');
            return true;
        }

        // Skip typing indicators
        if (activity.type === 'typing') {
            return true;
        }

        return false;
    }

    /**
     * Check if activity is user-facing based on inputHint
     * @param {Object} activity - Activity to check
     * @returns {boolean} True if user-facing
     * @private
     */
    isUserFacingMessage(activity) {
        // If inputHint is explicitly set, respect it
        if (activity.inputHint) {
            // ignoringInput = bot is processing, not a final user-facing message
            if (activity.inputHint === 'ignoringInput') {
                console.log('[Activity Filter] Skipping ignoringInput activity (transitional message)');
                return false;
            }

            // acceptingInput or expectingInput = user-facing message
            if (activity.inputHint === 'acceptingInput' || activity.inputHint === 'expectingInput') {
                return true;
            }
        }

        // If no inputHint, assume user-facing for backward compatibility
        return true;
    }

    /**
     * Handle complete message (enhanced to include session management)
     * @param {Object} activity - Message activity
     * @private
     */
    async handleCompleteMessage(activity) {
        this.hideProgressIndicator();
        this.clearInformativeIndicator();
        this._lastMessageTime = Date.now();

        // Skip internal/system activities
        if (this.shouldSkipActivity(activity)) {
            console.log('[Application] handleCompleteMessage: Skipping internal activity:', {
                type: activity.type,
                name: activity.name
            });
            return;
        }

        // Skip non-user-facing messages (transitional states)
        if (!this.isUserFacingMessage(activity)) {
            console.log('[Application] handleCompleteMessage: Skipping non-user-facing activity:', {
                inputHint: activity.inputHint,
                text: activity.text?.substring(0, 50)
            });
            return;
        }

        // Skip activities with no renderable content (avoids empty bubbles)
        if (activity.from && activity.from.id !== 'user') {
            const textContent = activity.text?.trim();
            const hasContent = textContent ||
                (activity.attachments && activity.attachments.length > 0) ||
                (activity.suggestedActions && activity.suggestedActions.actions.length > 0);
            if (!hasContent) {
                console.log('[Application] handleCompleteMessage: Skipping empty bot activity (no text/attachments/suggestedActions)');
                return;
            }
        }

        // Wait for thinking simulation to complete before starting agent message rendering
        if (window.aiCompanion && window.aiCompanion.isEnabled && activity.from && activity.from.id !== 'user') {
            try {
                // Check if thinking simulation is active
                if (window.aiCompanion.isThinkingActive()) {
                    console.log('[Application] Thinking simulation active, waiting for natural completion before rendering complete agent message...');

                    // Signal thinking to end naturally with agent response content
                    const agentResponseContent = activity?.text || activity?.message || '';
                    window.aiCompanion.endThinkingSimulationNaturally(agentResponseContent);

                    // Wait for thinking completion
                    const thinkingPromise = window.aiCompanion.getThinkingCompletionPromise();
                    if (thinkingPromise) {
                        await thinkingPromise;
                        console.log('[Application] Thinking simulation completed, now starting complete agent message rendering');
                    }
                }
            } catch (error) {
                console.error('[Application] Error waiting for thinking completion:', error);
            }
        }

        // Add to session (only for bot messages, user messages are handled in sendMessage)
        if (activity.from && activity.from.id !== 'user') {
            sessionManager.addMessage({
                from: activity.from?.id || 'bot',
                text: activity.text,
                attachments: activity.attachments,
                suggestedActions: activity.suggestedActions,
                timestamp: activity.timestamp
            });

            // Dispatch completeMessage event for AI Companion KPI analysis and speech queue
            window.dispatchEvent(new CustomEvent('completeMessage', {
                detail: activity
            }));

            // Update per-agent stats
            this._updateCurrentAgentStats();
        }

        // Check if this message is already being handled by DirectLine streaming simulation
        const isSimulatedStreaming = activity.streamingMetadata?.isSimulated;
        const streamingEnabled = localStorage.getItem('enableStreaming') === 'true';

        console.log('handleCompleteMessage:', {
            text: activity.text?.substring(0, 50) + '...',
            streamingEnabled,
            isSimulatedStreaming,
            hasStreamingMetadata: !!activity.streamingMetadata
        });

        if (isSimulatedStreaming) {
            // DirectLine manager is already handling streaming via events, don't duplicate
            console.log('Message already being streamed by DirectLine manager, skipping local simulation');
            return;
        }

        if (activity.meta?.wasStreamed) {
            // Native livestreaming: a live bubble already exists for this entry —
            // finalize it in place (Markdown/attachments/metrics/speech) instead of
            // rendering a fresh bubble. Prevents duplicate bubbles.
            console.log('Finalizing native streaming message in place:', activity.id);
            messageRenderer.finalizeStreamingMessage(activity);
        } else if (streamingEnabled) {
            console.log('Starting local streaming simulation');
            messageRenderer.simulateStreaming(activity);
        } else {
            console.log('Rendering complete message without streaming');
            messageRenderer.renderCompleteMessage(activity);
        }

        // Auto-open URLs from bot messages in the analysis panel
        if (activity.from && activity.from.id !== 'user' && activity.text) {
            this._autoOpenMessageUrls(activity.text);
        }
    }

    /**
     * Handle streaming activity with enhanced metadata processing
     * @param {Object} activity - Streaming activity with metadata
     * @private
     */
    async handleStreamingActivity(activity) {
        this.hideProgressIndicator();
        this._lastMessageTime = Date.now();

        // Skip empty streaming activities (avoids empty bubbles)
        if (activity.from && activity.from.id !== 'user') {
            const hasContent = activity.text?.trim() ||
                (activity.attachments && activity.attachments.length > 0) ||
                (activity.suggestedActions && activity.suggestedActions.actions.length > 0);
            if (!hasContent) {
                console.log('[Application] handleStreamingActivity: Skipping empty bot activity');
                return;
            }
        }

        // Wait for thinking simulation to complete before starting agent message rendering
        if (window.aiCompanion && window.aiCompanion.isEnabled && activity.from && activity.from.id !== 'user') {
            try {
                // Check if thinking simulation is active
                if (window.aiCompanion.isThinkingActive()) {
                    console.log('[Application] Thinking simulation active, waiting for natural completion before rendering agent message...');

                    // Signal thinking to end naturally with agent response content
                    const agentResponseContent = activity?.text || activity?.message || '';
                    window.aiCompanion.endThinkingSimulationNaturally(agentResponseContent);

                    // Wait for thinking completion
                    const thinkingPromise = window.aiCompanion.getThinkingCompletionPromise();
                    if (thinkingPromise) {
                        await thinkingPromise;
                        console.log('[Application] Thinking simulation completed, now starting agent message rendering');
                    }
                }
            } catch (error) {
                console.error('[Application] Error waiting for thinking completion:', error);
            }
        }

        // For streaming messages, we'll add to session when streaming ends
        // Just handle the rendering here
        messageRenderer.handleStreamingMessage(activity);
    }

    /**
     * Handle streaming end with completion metrics
     * @param {Object} activity - Final activity with metadata
     * @private
     */
    handleStreamingEnd(activity) {
        // Process final streaming metrics
        if (activity.streamingMetadata) {
            this.finalizeStreamingMetrics(activity.streamingMetadata);
        }

        // Add the final complete message to session
        sessionManager.addMessage({
            from: activity.from?.id || 'bot',
            text: activity.text,
            attachments: activity.attachments,
            suggestedActions: activity.suggestedActions,
            timestamp: activity.timestamp,
            streamingMetadata: activity.streamingMetadata // Include for analytics
        });

        messageRenderer.finalizeStreamingMessage(activity);
    }

    /**
     * Finalize streaming metrics and log performance
     * @param {Object} metadata - Final streaming metadata
     * @private
     */
    finalizeStreamingMetrics(metadata) {
        if (this.streamingSession) {
            const totalDuration = (metadata.timestamp || Date.now()) - this.streamingSession.startTime;

            console.log('Streaming completed:', {
                duration: totalDuration,
                chunks: this.streamingSession.chunksReceived,
                realtime: this.streamingSession.isRealtime,
                simulated: this.streamingSession.isSimulated,
                averageChunkDelay: totalDuration / Math.max(1, this.streamingSession.chunksReceived)
            });

            // Emit performance metrics for analytics
            window.dispatchEvent(new CustomEvent('streamingCompleted', {
                detail: {
                    ...this.streamingSession,
                    totalDuration,
                    metadata
                }
            }));

            this.streamingSession = null;
        }
    }

    /**
     * Handle conversation update (enhanced to include session management)
     * @param {Object} activity - Conversation update activity
     * @private
     */
    handleConversationUpdate(activity) {
        // Skip internal/system activities
        if (this.shouldSkipActivity(activity)) {
            console.log('[Application] handleConversationUpdate: Skipping internal activity:', {
                type: activity.type,
                name: activity.name
            });
            return;
        }

        // Skip non-user-facing messages (transitional states)
        if (!this.isUserFacingMessage(activity)) {
            console.log('[Application] handleConversationUpdate: Skipping non-user-facing activity:', {
                inputHint: activity.inputHint,
                text: activity.text?.substring(0, 50)
            });
            return;
        }

        // Skip activities with no renderable content (avoids empty bubbles)
        const textContent = activity.text?.trim();
        const hasContent = textContent ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0);

        if (!hasContent) {
            console.log('[Application] handleConversationUpdate: Skipping empty activity (no text, attachments, or suggestedActions)');
            return;
        }

        // Add to session
        sessionManager.addMessage({
            from: activity.from?.id || 'bot',
            text: activity.text,
            attachments: activity.attachments,
            suggestedActions: activity.suggestedActions,
            timestamp: activity.timestamp,
            inputHint: activity.inputHint,
            replyToId: activity.replyToId
        });

        messageRenderer.renderCompleteMessage(activity);
    }

    /**
     * Handle informative activity (thinking/status updates from Copilot Studio)
     * Shows real-time bot thinking text as a temporary indicator in chat.
     * @param {Object} info - { text, streamId, timestamp }
     * @private
     */
    handleInformativeActivity(info) {
        if (!info.text?.trim()) return;

        this.hideProgressIndicator();
        this._lastMessageTime = Date.now();

        const chatWindow = this.elements.chatWindow;
        if (!chatWindow) return;

        // Reuse existing informative indicator or create new one
        let indicator = chatWindow.querySelector('#informativeIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'informativeIndicator';
            indicator.className = 'messageContainer botMessage informative-indicator';

            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'messageContent informative-content';

            const dots = document.createElement('span');
            dots.className = 'informative-dots';
            dots.textContent = '';

            const textSpan = document.createElement('span');
            textSpan.className = 'informative-text';

            contentDiv.appendChild(dots);
            contentDiv.appendChild(textSpan);
            wrapper.appendChild(contentDiv);
            indicator.appendChild(wrapper);
            chatWindow.appendChild(indicator);
        }

        // Update the thinking text
        const textSpan = indicator.querySelector('.informative-text');
        if (textSpan) {
            textSpan.textContent = info.text;
        }

        chatWindow.scrollTop = chatWindow.scrollHeight;
        console.log(`[Application] Informative: "${info.text}"`);
    }

    /**
     * Clear informative indicator from chat window
     * @private
     */
    clearInformativeIndicator() {
        const indicator = this.elements.chatWindow?.querySelector('#informativeIndicator');
        if (indicator) {
            indicator.classList.add('informative-fade-out');
            setTimeout(() => indicator.remove(), 300);
        }
    }

    /**
     * Handle event activity (enhanced to include session management)
     * @param {Object} activity - Event activity
     * @private
     */
    handleEventActivity(activity) {
        // Skip internal/system activities
        if (this.shouldSkipActivity(activity)) {
            console.log('[Application] handleEventActivity: Skipping internal activity:', {
                type: activity.type,
                name: activity.name
            });
            return;
        }

        // Skip non-user-facing messages (transitional states)
        if (!this.isUserFacingMessage(activity)) {
            console.log('[Application] handleEventActivity: Skipping non-user-facing activity:', {
                inputHint: activity.inputHint,
                text: activity.text?.substring(0, 50)
            });
            return;
        }

        // Skip activities with no renderable content (avoids empty bubbles)
        const eventHasContent = activity.text?.trim() ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0);

        // Add to session if it has content
        if (eventHasContent) {

            sessionManager.addMessage({
                from: activity.from?.id || 'bot',
                text: activity.text,
                attachments: activity.attachments,
                suggestedActions: activity.suggestedActions,
                timestamp: activity.timestamp,
                inputHint: activity.inputHint,
                replyToId: activity.replyToId
            });
        }

        if (!eventHasContent) {
            console.log('[Application] handleEventActivity: Skipping empty event activity');
            return;
        }

        messageRenderer.renderCompleteMessage(activity);
    }

    /**
     * Handle connection status changes
     * @param {number} status - Connection status
     * @private
     */
    handleConnectionStatus(status) {
        // Update agent manager display
        agentManager.updateCurrentAgentDisplay();

        // Update agent status indicator
        if (this.elements.agentStatus) {
            const currentAgent = this.agentManager?.getCurrentAgent();
            const agentName = currentAgent?.name || 'Unknown Agent';

            switch (status) {
                case 1: // Connecting
                    this.elements.agentStatus.className = 'status-indicator connecting';
                    this.elements.agentStatus.setAttribute('data-tooltip', `Agent: ${agentName} - Connecting`);
                    // Temporarily comment out logging
                    // this.loggingManager.info('directline', 'Connection status: Connecting', { 
                    //     status, 
                    //     agentName,
                    //     timestamp: new Date().toISOString()
                    // });
                    break;
                case 2: // Online
                    this.elements.agentStatus.className = 'status-indicator connected';
                    this.elements.agentStatus.setAttribute('data-tooltip', `Agent: ${agentName} - Connected`);
                    this.state.isConnected = true;
                    // Temporarily comment out logging
                    // this.loggingManager.info('directline', 'Connection status: Connected', { 
                    //     status, 
                    //     agentName,
                    //     timestamp: new Date().toISOString()
                    // });
                    break;
                case 3: // Expired
                case 4: // Failed
                case 5: // Ended
                    this.elements.agentStatus.className = 'status-indicator disconnected';
                    this.elements.agentStatus.setAttribute('data-tooltip', `Agent: ${agentName} - Disconnected`);
                    this.state.isConnected = false;
                    // Temporarily comment out logging
                    // this.loggingManager.warn('directline', 'Connection status: Disconnected', { 
                    //     status, 
                    //     statusText: status === 3 ? 'Expired' : status === 4 ? 'Failed' : 'Ended',
                    //     agentName,
                    //     timestamp: new Date().toISOString()
                    // });
                    break;
            }
        }
    }

    /**
     * Handle connection status UI updates (enhanced with legacy approach)
     * @param {Object} detail - Status detail
     * @private
     */
    handleConnectionStatusUI(detail) {
        switch (detail.status) {
            case 'connecting':
                // Use unified notification system for connection status
                if (window.unifiedNotificationManager) {
                    window.unifiedNotificationManager.show({
                        id: 'connection-status',
                        message: detail.message,
                        type: 'loading',
                        zone: 'connection',
                        persistent: true
                    });
                } else {
                    // Fallback to old method
                    this.updateInitializationIndicator(detail.message);
                }
                break;
            case 'online':
                // Use unified notification system for connection status
                if (window.unifiedNotificationManager) {
                    window.unifiedNotificationManager.show({
                        id: 'connection-status',
                        message: detail.message,
                        type: 'success',
                        zone: 'connection',
                        persistent: true
                    });

                    // Wait longer for bot response before transitioning, like legacy
                    setTimeout(() => {
                        // Check if we've received any messages yet
                        const chatWindow = this.elements.chatWindow;
                        const hasMessages = chatWindow && chatWindow.children.length > 0;

                        if (hasMessages) {
                            window.unifiedNotificationManager.show({
                                id: 'connection-status',
                                message: 'Bot conversation ready!',
                                type: 'success',
                                zone: 'connection',
                                autoHide: 1000
                            });
                        } else {
                            window.unifiedNotificationManager.show({
                                id: 'connection-status',
                                message: 'Waiting for bot greeting...',
                                type: 'info',
                                zone: 'connection',
                                persistent: true
                            });
                            // Keep waiting for greeting message
                            setTimeout(() => {
                                window.unifiedNotificationManager.show({
                                    id: 'connection-status',
                                    message: 'Bot connected - ready to chat',
                                    type: 'success',
                                    zone: 'connection',
                                    autoHide: 2000
                                });
                            }, 3000);
                        }
                    }, 2000);
                } else {
                    // Fallback to old method
                    this.updateInitializationIndicator(detail.message);
                    setTimeout(() => {
                        const chatWindow = this.elements.chatWindow;
                        const hasMessages = chatWindow && chatWindow.children.length > 0;

                        if (hasMessages) {
                            this.updateInitializationIndicator('Bot conversation ready!');
                            setTimeout(() => this.hideInitializationIndicator(), 1000);
                        } else {
                            this.updateInitializationIndicator('Waiting for bot greeting...');
                            setTimeout(() => {
                                this.updateInitializationIndicator('Bot connected - ready to chat');
                                setTimeout(() => this.hideInitializationIndicator(), 2000);
                            }, 3000);
                        }
                    }, 2000);
                }
                break;
            case 'expired':
                // Clear connection status and show error
                if (window.unifiedNotificationManager) {
                    window.unifiedNotificationManager.hide('connection-status');
                } else {
                    this.hideInitializationIndicator();
                }
                this.showErrorMessage('Authentication token has expired. Please check your DirectLine secret.');
                break;
            case 'failed':
                // Clear connection status and show error
                if (window.unifiedNotificationManager) {
                    window.unifiedNotificationManager.hide('connection-status');
                } else {
                    this.hideInitializationIndicator();
                }
                this.showErrorMessage('Failed to connect to the bot service. Please check your DirectLine secret and internet connection.');
                break;
            case 'ended':
                // Clear connection status and show error
                if (window.unifiedNotificationManager) {
                    window.unifiedNotificationManager.hide('connection-status');
                } else {
                    this.hideInitializationIndicator();
                }
                this.showErrorMessage('Connection to the bot has ended unexpectedly. Please try refreshing the page.');
                break;
        }
    }

    /**
     * Handle connection errors (enhanced with legacy's specific error handling)
     * @param {Error} error - Connection error
     * @private
     */
    handleConnectionError(error) {
        console.error('Connection error:', error);
        this.state.isConnected = false;

        // Emit DirectLine failed event
        document.dispatchEvent(new CustomEvent('directline:failed', {
            detail: { error: error.message }
        }));

        // Clear connection status using unified notification system
        if (window.unifiedNotificationManager) {
            window.unifiedNotificationManager.hide('connection-status');
        } else {
            this.hideInitializationIndicator();
        }
        this.hideProgressIndicator();

        // Update status
        if (this.elements.agentStatus) {
            this.elements.agentStatus.className = 'status-indicator error';
            const currentAgent = this.agentManager?.getCurrentAgent();
            const agentName = currentAgent?.name || 'Unknown Agent';
            this.elements.agentStatus.setAttribute('data-tooltip', `Agent: ${agentName} - Error`);
        }

        // Show specific error message based on error type (like legacy)
        let userMessage = 'Failed to initialize bot connection. Please check your settings.';

        if (error.message) {
            if (error.message.includes('Invalid secret')) {
                userMessage = 'Invalid DirectLine secret. Please check your bot configuration.';
            } else if (error.message.includes('network') || error.message.includes('internet')) {
                userMessage = 'Network error. Please check your internet connection.';
            } else if (error.message.includes('DirectLine library')) {
                userMessage = 'DirectLine library failed to load. Please check your internet connection and refresh the page.';
            } else if (error.message.includes('token') || error.message.includes('expired')) {
                userMessage = 'Authentication token has expired. Please check your DirectLine secret.';
            } else if (error.message.includes('Failed to connect')) {
                userMessage = 'Failed to connect to the bot service. Please check your DirectLine secret and internet connection.';
            } else if (error.message.includes('ended')) {
                userMessage = 'Connection to the bot has ended unexpectedly. Please try refreshing the page.';
            } else {
                // Use the actual error message if it's descriptive
                userMessage = error.message;
            }
        }

        this.showErrorMessage(userMessage);

        // Update agent manager display
        agentManager.updateCurrentAgentDisplay();
    }

    /**
     * Handle connection error UI updates
     * @param {Object} detail - Error detail
     * @private
     */
    handleConnectionErrorUI(detail) {
        this.showErrorMessage(detail.message);
    }

    /**
     * Handle agent changed
     * @param {Object} detail - Agent change detail
     * @private
     */
    handleAgentChanged(detail) {
        console.log('Agent changed:', detail);
        this.state.currentAgent = detail.agent;
        // Skip the legacy DirectLine connect for agent types that own their own
        // transport: website agents render an iframe (no connection), and
        // direct-to-engine agents are connected via _doAgentConnect using
        // directEngineConnector. Calling directLineService.connect() here for a
        // D2E agent has no secret and throws "DirectLine secret is required".
        if (detail.agent.agentType === 'website') return;
        if (detail.agent.agentType === 'directengine') return;
        this.connectToAgent(detail.agent.secret);
    }

    /**
     * Handle session loaded
     * @param {Object} detail - Session detail
     * @private
     */
    handleSessionLoaded(detail) {
        console.log('Session loaded:', detail.sessionId);
        this.state.currentSession = detail.sessionId;

        // Clear current display
        messageRenderer.clearMessages();
        // Ensure MessageRenderer targets the correct window after clearing
        messageRenderer.setTargetWindow('chatWindow');

        // Render session messages
        detail.messages.forEach(message => {
            const activity = {
                from: { id: message.from },
                text: message.text,
                attachments: message.attachments,
                suggestedActions: message.suggestedActions,
                timestamp: message.timestamp
            };

            messageRenderer.renderCompleteMessage(activity);
        });

        // Close mobile sidebar when session is loaded
        if (this.mobileUtils && this.mobileUtils.isMobileLayout() && this.mobileUtils.isSidebarOpen()) {
            this.mobileUtils.forceCloseSidebar();
        }
    }

    /**
     * Handle session changed
     * @param {Object} detail - Session change detail
     * @private
     */
    handleSessionChanged(detail) {
        console.log('Session changed:', detail.sessionId);
        this.state.currentSession = detail.sessionId;
    }

    /**
     * Handle suggested action clicked
     * @param {Object} detail - Action detail
     * @private
     */
    handleSuggestedAction(detail) {
        const action = detail.action;

        if (action.type === 'imBack' || action.type === 'postBack') {
            // Send the action value as a message
            const messageText = action.value || action.title;
            if (messageText) {
                this.elements.userInput.value = messageText;
                this.sendMessage();
            }
        } else if (action.type === 'openUrl') {
            // Open URL in right panel or new tab
            if (action.value) {
                this.openCitationPreview(action.value);
            }
        }
    }

    // UI Helper Methods

    /**
     * Show setup modal
     */
    showSetupModal() {
        console.log('Attempting to show setup modal...');
        if (this.elements.setupModal) {
            console.log('Setup modal element found, showing modal');
            DOMUtils.show(this.elements.setupModal, 'flex');
            DOMUtils.addClass(this.elements.setupModal, 'show');

            // Load current settings into the modal
            this.loadCurrentSettingsToModal();
        } else {
            console.error('Setup modal element not found!');
        }
    }

    /**
     * Open documentation in side browser
     */
    openDocumentation() {
        console.log('Opening documentation in side browser...');
        const githubReadmeUrl = 'https://github.com/illusion615/MCSChat/blob/main/README.md';

        // Always open in side browser, regardless of the "open citations in side browser" setting
        if (this.messageRenderer && typeof this.messageRenderer.openSideBrowser === 'function') {
            this.messageRenderer.openSideBrowser(githubReadmeUrl);
        } else {
            console.warn('MessageRenderer not available, falling back to new tab');
            window.open(githubReadmeUrl, '_blank');
        }

        // Temporarily comment out logging
        // this.loggingManager.info('ui', 'Documentation opened', { url: githubReadmeUrl });
    }

    /**
     * Open Knowledge Hub modal
     */
    openKnowledgeHub() {
        try {
            console.log('Opening Knowledge Hub...');
            const knowledgeHub = getKnowledgeHub();
            knowledgeHub.showModal();

            // Log the action
            this.loggingManager.info('ui', 'Knowledge Hub opened', {
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error opening Knowledge Hub:', error);
            // Show error notification if available
            if (window.unifiedNotificationManager) {
                window.unifiedNotificationManager.show('error', 'Failed to open Knowledge Hub. Please try again.');
            }
        }
    }

    /**
     * Open the logging panel
     */
    openLoggingPanel() {
        console.log('Opening logging panel...');

        // Simple logging panel implementation
        if (this.loggingManager && this.loggingManager.isInitialized) {
            this.showSimpleLoggingPanel();
        } else {
            console.warn('Logging Manager not available');
            alert('Logging system is not available.');
        }
    }

    /**
     * Show a simple logging panel
     */
    showSimpleLoggingPanel() {
        const panel = document.getElementById('loggingPanel');
        if (panel) {
            panel.classList.add('visible');
            this.isLoggingPanelExpanded = false; // Initialize as collapsed

            // Add expand button functionality
            const expandBtn = document.getElementById('expandPanelBtn');
            if (expandBtn) {
                expandBtn.onclick = () => this.togglePanelView();
            }

            this.populateSimpleLoggingPanel();
        } else {
            console.warn('Logging panel element not found');
        }
    }

    /**
     * Toggle between card view and table view
     */
    togglePanelView() {
        const panel = document.getElementById('loggingPanel');
        const expandBtn = document.getElementById('expandPanelBtn');
        const expandIcon = expandBtn?.querySelector('i');

        this.isLoggingPanelExpanded = !this.isLoggingPanelExpanded;

        if (this.isLoggingPanelExpanded) {
            panel.classList.add('expanded');
            if (expandIcon) {
                expandIcon.className = 'fas fa-compress-alt';
            }
            expandBtn.title = 'Collapse View';
            this.renderTableView();
        } else {
            panel.classList.remove('expanded');
            if (expandIcon) {
                expandIcon.className = 'fas fa-expand-alt';
            }
            expandBtn.title = 'Expand to Table View';
            this.populateSimpleLoggingPanel(); // Back to card view
        }
    }

    /**
     * Render table view for expanded panel
     */
    renderTableView() {
        const container = document.getElementById('logGroupContainer');
        if (!container || !this.loggingManager) return;

        const filters = this.getCurrentFilters();
        const logs = this.loggingManager.getLogs(filters);

        container.innerHTML = `
            <div class="table-container">
                <table class="log-table">
                    <thead>
                        <tr>
                            <th width="15%">Time</th>
                            <th width="8%">Level</th>
                            <th width="12%">Category</th>
                            <th width="40%">Message</th>
                            <th width="25%">Metadata</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.slice(0, 100).map(log => this.renderTableRow(log)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Render a single table row
     */
    renderTableRow(log) {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const metadata = (log.metadata && Object.keys(log.metadata).length > 0) ? JSON.stringify(log.metadata) : '';
        const truncatedMetadata = metadata.length > 100 ? metadata.substring(0, 100) + '...' : metadata;

        return `
            <tr class="log-row" data-level="${log.level}">
                <td class="time-cell">${time}</td>
                <td class="level-cell">
                    <span class="level-badge level-${log.level}">${log.level.toUpperCase()}</span>
                </td>
                <td class="category-cell">
                    <span class="category-badge">${log.category || 'general'}</span>
                </td>
                <td class="message-cell">${this.escapeHtml(log.message)}</td>
                <td class="metadata-cell">
                    ${metadata ? `
                        <div class="metadata-preview" title="${this.escapeHtml(metadata)}">
                            ${this.escapeHtml(truncatedMetadata)}
                        </div>
                    ` : '-'}
                </td>
            </tr>
        `;
    }

    /**
     * Populate the simple logging panel with current logs
     */
    populateSimpleLoggingPanel() {
        const container = document.getElementById('logGroupContainer');
        if (!container || !this.loggingManager) {
            console.warn('Container or logging manager not found:', { container: !!container, loggingManager: !!this.loggingManager });
            return;
        }

        // Force a fresh retrieval of logs with current filters
        const filters = this.getCurrentFilters();
        let logs = this.loggingManager.getLogs(filters);
        const stats = this.loggingManager.getLogStats();

        console.log('Populating logs:', { logsCount: logs.length, stats, isInitialized: this.loggingManager.isInitialized });
        console.log('Raw logs array:', this.loggingManager.logs); // Direct access to logs array

        // Add comprehensive debug information
        if (this.loggingManager.debugState) {
            this.loggingManager.debugState();
        }

        // Failsafe: If stats show logs but array is empty, try to reload from storage
        if (logs.length === 0 && stats.total > 0) {
            console.warn('Stats show logs but array is empty. Attempting to reload from storage...');
            this.loggingManager.loadLogsFromStorage();
            const reloadedLogs = this.loggingManager.getLogs();
            console.log('After reload attempt:', { logsCount: reloadedLogs.length });

            // If still empty, let's use the direct logs array
            if (reloadedLogs.length === 0) {
                console.warn('Still no logs after reload. Checking direct logs array...');
                const directLogs = this.loggingManager.logs || [];
                console.log('Direct logs array length:', directLogs.length);

                if (directLogs.length > 0) {
                    logs = directLogs;
                    console.log('Using direct logs array');
                } else {
                    console.log('No logs available, logs array will be empty');
                    logs = this.loggingManager.getLogs();
                }
            } else {
                logs = reloadedLogs;
            }
        }

        // Update stats
        const totalCount = document.getElementById('totalLogsCount');
        const errorCount = document.getElementById('errorLogsCount');
        const warnCount = document.getElementById('warnLogsCount');
        const infoCount = document.getElementById('infoLogsCount');
        const debugCount = document.getElementById('debugLogsCount');

        if (totalCount) totalCount.textContent = stats.total;
        if (errorCount) errorCount.textContent = stats.error;
        if (warnCount) warnCount.textContent = stats.warn;
        if (infoCount) infoCount.textContent = stats.info;
        if (debugCount) debugCount.textContent = stats.debug;

        // Clear container
        container.innerHTML = '';

        if (logs.length === 0) {
            // Show empty state message
            container.innerHTML = '<div class="empty-logs-message">No logs available yet.</div>';
            return;
        }

        // Create log entries (compact style for default view)
        logs.slice(0, 50).forEach(log => { // Show only first 50 logs
            const logElement = document.createElement('div');
            logElement.className = `log-entry compact log-${log.level}`;

            const timestamp = new Date(log.timestamp).toLocaleTimeString();

            logElement.innerHTML = `
                <div class="log-entry-header compact">
                    <div class="compact-info">
                        <span class="level-badge level-${log.level}">${log.level.toUpperCase()}</span>
                        <span class="category-badge">${log.category || 'general'}</span>
                        <span class="log-timestamp">${timestamp}</span>
                        <span class="compact-message">${this.escapeHtml(log.message)}</span>
                    </div>
                    ${(log.metadata && Object.keys(log.metadata).length > 0) ? `
                        <button class="metadata-toggle" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('i').classList.toggle('fa-chevron-down'); this.querySelector('i').classList.toggle('fa-chevron-up');">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="metadata-preview" style="display: none;">
                            <pre>${this.escapeHtml(JSON.stringify(log.metadata, null, 2))}</pre>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(logElement);
        });

        this.loggingManager.info('ui', 'Simple logging panel opened', { logsShown: Math.min(logs.length, 50) });

        // Add global debug function for troubleshooting
        window.debugLogging = () => {
            console.log('=== Logging Debug ===');
            if (this.loggingManager.debugState) {
                return this.loggingManager.debugState();
            } else {
                console.log('No debug state method available');
                return {
                    logs: this.loggingManager.logs,
                    getLogs: this.loggingManager.getLogs(),
                    stats: this.loggingManager.getLogStats()
                };
            }
        };

        window.refreshLoggingPanel = () => {
            console.log('Manually refreshing logging panel...');
            this.populateSimpleLoggingPanel();
        };
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Load current settings into the setup modal
     * @private
     */
    loadCurrentSettingsToModal() {
        // Load AI companion settings
        if (this.elements.enableLLMCheckbox) {
            this.elements.enableLLMCheckbox.checked = localStorage.getItem('enableLLM') === 'true';
        }

        // Load AI thinking preference (default: true)
        if (this.elements.useAIThinkingCheckbox) {
            this.elements.useAIThinkingCheckbox.checked = localStorage.getItem('useAIThinking') !== 'false';
        }

        // Load show companion model preference (default: true)
        if (this.elements.showCompanionModelCheckbox) {
            const show = localStorage.getItem('showCompanionModel') !== 'false';
            this.elements.showCompanionModelCheckbox.checked = show;
            const panel = document.getElementById('companionStatusPanel');
            if (panel) panel.style.display = show ? '' : 'none';
        }

        // Load streaming settings
        if (this.elements.enableStreamingCheckbox) {
            this.elements.enableStreamingCheckbox.checked = localStorage.getItem('enableStreaming') === 'true';
        }

        // Load side browser settings
        if (this.elements.enableSideBrowserCheckbox) {
            // Default to true for better user experience
            const sideBrowserSetting = localStorage.getItem('enableSideBrowser');
            if (sideBrowserSetting === null) {
                // First time user, default to true
                localStorage.setItem('enableSideBrowser', 'true');
                this.elements.enableSideBrowserCheckbox.checked = true;
            } else {
                this.elements.enableSideBrowserCheckbox.checked = sideBrowserSetting === 'true';
            }
        }

        // Load auto-open citations setting
        if (this.elements.autoOpenCitationsCheckbox) {
            this.elements.autoOpenCitationsCheckbox.checked = localStorage.getItem('autoOpenCitations') === 'true';
        }

        // Load open attachments in side browser setting
        if (this.elements.openAttachmentsSideBrowserCheckbox) {
            this.elements.openAttachmentsSideBrowserCheckbox.checked = localStorage.getItem('openAttachmentsSideBrowser') === 'true';
        }

        // Load full width messages settings
        if (this.elements.fullWidthMessagesCheckbox) {
            this.elements.fullWidthMessagesCheckbox.checked = localStorage.getItem('fullWidthMessages') === 'true';
            this.toggleFullWidthMessages(this.elements.fullWidthMessagesCheckbox.checked);
        }

        // Load API provider
        const savedProvider = localStorage.getItem('selectedApiProvider') || 'openai';
        if (this.elements.apiProviderSelect) {
            this.elements.apiProviderSelect.value = savedProvider;
        }

        // Load Ollama URL
        const savedOllamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        if (this.elements.ollamaUrlInput) {
            this.elements.ollamaUrlInput.value = savedOllamaUrl;
        }

        // Load selected Ollama model
        const savedModel = localStorage.getItem('ollamaSelectedModel');
        if (this.elements.ollamaModelSelect && savedModel) {
            // Check if the saved model exists in the current options
            const modelExists = Array.from(this.elements.ollamaModelSelect.options).some(option => option.value === savedModel);
            if (modelExists) {
                this.elements.ollamaModelSelect.value = savedModel;
            }
        }

        // Load Azure OpenAI settings
        const savedAzureEndpoint = localStorage.getItem('azureEndpoint');
        const savedAzureDeployment = localStorage.getItem('azureDeployment');
        const savedAzureApiVersion = localStorage.getItem('azureApiVersion') || '2024-02-01';

        if (this.elements.azureEndpointInput && savedAzureEndpoint) {
            this.elements.azureEndpointInput.value = savedAzureEndpoint;
        }
        if (this.elements.azureDeploymentInput && savedAzureDeployment) {
            this.elements.azureDeploymentInput.value = savedAzureDeployment;
        }
        if (this.elements.azureApiVersionInput) {
            this.elements.azureApiVersionInput.value = savedAzureApiVersion;
        }

        // Load OpenAI Compatible settings
        const savedCompatibleBaseUrl = localStorage.getItem('openaiCompatibleBaseUrl');
        const savedCompatibleModel = localStorage.getItem('openaiCompatibleModel');
        const savedCompatibleDisplayName = localStorage.getItem('openaiCompatibleDisplayName');

        if (this.elements.openaiCompatibleBaseUrlInput && savedCompatibleBaseUrl) {
            this.elements.openaiCompatibleBaseUrlInput.value = savedCompatibleBaseUrl;
        }
        if (this.elements.openaiCompatibleModelInput && savedCompatibleModel) {
            this.elements.openaiCompatibleModelInput.value = savedCompatibleModel;
        }
        if (this.elements.openaiCompatibleDisplayNameInput && savedCompatibleDisplayName) {
            this.elements.openaiCompatibleDisplayNameInput.value = savedCompatibleDisplayName;
        }
        // Load saved API key into input for display
        this.loadOpenAICompatibleApiKey();

        // Update AI companion section visibility
        if (this.elements.enableLLMCheckbox?.checked) {
            this.toggleAICompanionSection(true);
            this.handleAPIProviderChange(savedProvider);

            // Load current API key for the selected provider
            this.loadCurrentAPIKey(savedProvider);
        }

        // Load font size settings
        this.loadFontSizeSettings();

        // Setup color theme selection
        this.setupColorThemeSelection();

        console.log('Settings loaded into modal:', {
            llmEnabled: this.elements.enableLLMCheckbox?.checked,
            provider: savedProvider,
            ollamaUrl: savedOllamaUrl,
            ollamaModel: savedModel
        });
    }

    /**
     * Load current API key for the selected provider
     * @param {string} provider - API provider
     * @private
     */
    async loadCurrentAPIKey(provider) {
        if (!this.elements.apiKeyInput || provider === 'ollama') return;

        try {
            const apiKey = await SecureStorage.retrieve(`${provider}ApiKey`);
            if (apiKey) {
                this.elements.apiKeyInput.value = apiKey;
                console.log(`${provider} API key loaded`);
            } else {
                this.elements.apiKeyInput.value = '';
                console.log(`No ${provider} API key found`);
            }
        } catch (error) {
            console.error('Error loading API key:', error);
            this.elements.apiKeyInput.value = '';
        }
    }

    /**
     * Toggle full width messages display
     * @param {boolean} enabled - Whether to enable full width messages
     */
    toggleFullWidthMessages(enabled) {
        const chatWindow = this.elements.chatWindow;
        if (chatWindow) {
            if (enabled) {
                DOMUtils.addClass(chatWindow, 'full-width-messages');
            } else {
                DOMUtils.removeClass(chatWindow, 'full-width-messages');
            }
        }
    }

    /**
     * Toggle the Appearance side panel
     * @param {boolean} [forceState] - Optional force open/close
     */
    toggleAppearancePanel(forceState) {
        const panel = this.elements.appearanceSidePanel;
        if (!panel) return;

        const isOpen = panel.classList.contains('open');
        const shouldOpen = forceState !== undefined ? forceState : !isOpen;

        if (shouldOpen) {
            panel.classList.add('open');
            this.elements.appearanceButton?.classList.add('active');
            // Sync current settings into the panel
            this.syncAppearancePanelState();
        } else {
            panel.classList.remove('open');
            this.elements.appearanceButton?.classList.remove('active');
        }
    }

    /**
     * Sync current settings state into the Appearance side panel controls
     * @private
     */
    syncAppearancePanelState() {
        // Sync message icon toggle
        if (this.elements.appearanceMessageIconToggle) {
            this.elements.appearanceMessageIconToggle.checked = this.uiState.messageIconsEnabled;
        }
        if (this.elements.appearanceShowUserMessagesToggle) {
            this.elements.appearanceShowUserMessagesToggle.checked = this.uiState.showUserMessages;
        }
        if (this.elements.appearanceShowMetricsToggle) {
            this.elements.appearanceShowMetricsToggle.checked = this.uiState.showMetrics;
        }
        if (this.elements.appearanceAutoHideMetadataToggle) {
            this.elements.appearanceAutoHideMetadataToggle.checked = this.uiState.autoHideMetadata;
        }
        if (this.elements.appearanceAutoHideSidebarToggle) {
            this.elements.appearanceAutoHideSidebarToggle.checked = this.uiState.autoHideSidebar;
        }
        // Sync font sizes
        const agentSize = localStorage.getItem('agentChatFontSize') || '15';
        const companionSize = localStorage.getItem('companionChatFontSize') || '12';
        if (this.elements.appearanceAgentFontSize) {
            this.elements.appearanceAgentFontSize.value = agentSize;
            if (this.elements.appearanceAgentFontSizeValue) this.elements.appearanceAgentFontSizeValue.textContent = agentSize + 'px';
        }
        if (this.elements.appearanceCompanionFontSize) {
            this.elements.appearanceCompanionFontSize.value = companionSize;
            if (this.elements.appearanceCompanionFontSizeValue) this.elements.appearanceCompanionFontSizeValue.textContent = companionSize + 'px';
        }
        // Sync theme selection
        const savedTheme = localStorage.getItem('selectedColorTheme') || 'default';
        if (this.elements.appearanceThemeGallery) {
            this.elements.appearanceThemeGallery.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.theme === savedTheme);
            });
        }
        // Sync streaming settings
        if (this.elements.streamingStyleSelect) {
            this.elements.streamingStyleSelect.value = localStorage.getItem('streamingStyle') || 'typewriter';
        }
        if (this.elements.streamingSpeedSelect) {
            this.elements.streamingSpeedSelect.value = localStorage.getItem('streamingSpeed') || 'normal';
        }
        if (this.elements.suggestedActionsPositionSelect) {
            this.elements.suggestedActionsPositionSelect.value = localStorage.getItem('suggestedActionsPosition') || 'aboveInput';
        }
        if (this.elements.thinkingDotStyleSelect) {
            this.elements.thinkingDotStyleSelect.value = localStorage.getItem('thinkingDotStyle') || 'bounce';
        }
        // Sync home background image preview
        this._syncHomeBgPreview();
        // Sync home title & subtitle inputs
        if (this.elements.homeTitleInput) {
            this.elements.homeTitleInput.value = localStorage.getItem('homeTitle') || '';
        }
        if (this.elements.homeSubtitleInput) {
            this.elements.homeSubtitleInput.value = localStorage.getItem('homeSubtitle') || '';
        }
        // Sync language selector
        if (this.elements.languageSelect) {
            this.elements.languageSelect.value = i18n.language;
        }
    }

    /**
     * Hide setup modal
     */
    hideSetupModal() {
        if (this.elements.setupModal) {
            DOMUtils.removeClass(this.elements.setupModal, 'show');
            setTimeout(() => {
                DOMUtils.hide(this.elements.setupModal);
            }, 300);

            // Reload AI companion settings when modal is closed
            if (this.aiCompanion) {
                this.aiCompanion.reloadSettings();
            }
        }
    }

    // ── Init Parameters Overlay ──────────────────────────────

    /**
     * Show the init parameters overlay for an agent.
     * @param {string} agentId
     * @param {Function} onSubmit - Called after user submits the form
     */
    showInitParamsOverlay(agentId, onSubmit) {
        const overlay = document.getElementById('initParamsOverlay');
        const form = document.getElementById('initParamsForm');
        const startBtn = document.getElementById('initParamsStartBtn');
        const cancelBtn = document.getElementById('initParamsCancelBtn');
        if (!overlay || !form) return;

        const params = agentManager.getInitParams(agentId);
        if (!params.length) {
            onSubmit?.();
            return;
        }

        // Build form fields — use displayName as label, name as the key
        form.innerHTML = params.map(p => `
            <div class="form-group">
                <label for="initParam_${p.name}">${Utils.escapeHtml(p.displayName)}:</label>
                <input type="text" id="initParam_${p.name}" name="${Utils.escapeHtml(p.name)}"
                       placeholder="Enter ${Utils.escapeHtml(p.displayName)}" required />
            </div>
        `).join('');

        overlay.style.display = 'flex';

        // Clean up previous listeners
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newStartBtn.addEventListener('click', () => {
            // Validate all fields filled
            const inputs = form.querySelectorAll('input[required]');
            let valid = true;
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    input.classList.add('input-error');
                    valid = false;
                } else {
                    input.classList.remove('input-error');
                }
            });
            if (!valid) return;

            // Collect values
            const context = {};
            inputs.forEach(input => {
                context[input.name] = input.value.trim();
            });

            // Store in sessionStorage so it survives the page reload
            sessionStorage.setItem('pendingInitContext', JSON.stringify(context));
            console.log('[Application] Init params submitted:', context);

            overlay.style.display = 'none';
            onSubmit?.();
        });

        newCancelBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });
    }

    /**
     * Show progress indicator (enhanced with legacy's typing indicator implementation)
     */
    showProgressIndicator(context = null) {
        // Check if AI companion handles thinking simulation (only block if AI thinking is enabled)
        // Exception: always show for file uploads since they need visible feedback
        const isFileUpload = context?.source === 'file-upload';
        const useAIThinking = window.aiCompanion?.isEnabled === true && localStorage.getItem('useAIThinking') !== 'false';
        if (useAIThinking && !isFileUpload) {
            console.log('AI thinking simulation enabled, skipping progress indicator');
            return;
        }

        // Check if streaming is currently active - don't show typing indicator during streaming
        if (messageRenderer.currentlyStreamingMessageId) {
            console.log('Message streaming is active, skipping typing indicator');
            return;
        }

        // Check if thinking simulation is active - don't show typing indicator during thinking simulation
        if (window.aiCompanion && window.aiCompanion.isThinkingSimulationActive) {
            console.log('Thinking simulation is active, skipping typing indicator');
            return;
        }

        // Check if we're in thinking simulation evaluation period - don't show typing indicator during evaluation
        if (window.aiCompanion && window.aiCompanion.isEnabled && this.isEvaluatingThinkingSimulation) {
            console.log('Evaluating thinking simulation, skipping typing indicator');
            return;
        }

        // Check if an indicator already exists to prevent duplicates
        const existingIndicator = this.elements.chatWindow?.querySelector('#progressIndicator');
        if (existingIndicator) {
            console.log('Progress indicator already exists, skipping creation');
            return;
        }

        const chatWindow = this.elements.chatWindow;
        if (!chatWindow) return;

        // Create the enhanced typing indicator with context
        const indicatorElement = this.enhancedTypingIndicator.createIndicator(context);

        // Create the message container
        const messageContainer = DOMUtils.createElement('div', {
            className: 'messageContainer botMessage',
            id: 'progressIndicator'
        });

        const messageIcon = DOMUtils.createElement('div', {
            className: 'messageIcon'
        });
        
        // Use the same icon as thinking messages for consistency
        const aiCompanionIcon = window.Icon.create('aiCompanion', { color: '#333', size: '28px' });
        messageIcon.appendChild(aiCompanionIcon);

        messageContainer.appendChild(messageIcon);
        messageContainer.appendChild(indicatorElement);
        chatWindow.appendChild(messageContainer);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        console.log('Enhanced typing indicator created with context:', context);

        // Safety timeout to remove indicator if it gets stuck (30 seconds)
        setTimeout(() => {
            const stuckIndicator = chatWindow.querySelector('#progressIndicator');
            if (stuckIndicator) {
                console.log('Removing stuck progress indicator after 30 seconds');
                this.enhancedTypingIndicator.hide();
                stuckIndicator.remove();
            }
        }, 30000);
    }

    /**
     * Hide progress indicator (enhanced with legacy's implementation)
     */
    hideProgressIndicator() {
        // Use querySelector to avoid warnings when element doesn't exist
        const progressIndicator = this.elements.chatWindow?.querySelector('#progressIndicator');
        if (progressIndicator) {
            // Stop the enhanced typing indicator immediately
            this.enhancedTypingIndicator.hide();

            // Immediately hide the container to prevent any delay
            progressIndicator.style.display = 'none';

            // Remove after a short delay to ensure smooth transition
            setTimeout(() => {
                if (progressIndicator.parentNode) {
                    progressIndicator.remove();
                }
            }, 100);

            console.log('Enhanced typing indicator removed');
        }
        // No log when there is nothing to remove — this path fires on every
        // streaming chunk and would otherwise flood the console.
    }

    /**
     * Start intelligent thinking simulation with improved timing and immediate LLM invocation
     * @param {string} messageText - The user's message
     * @param {Promise} messagePromise - Promise for the DirectLine message sending
     * @private
     */
    async startIntelligentThinkingSimulation(messageText, messagePromise) {
        // Check if AI companion is enabled
        if (!window.aiCompanion || window.aiCompanion.isEnabled !== true) {
            console.log('[Application] AI Companion not enabled, skipping thinking simulation');
            return;
        }

        // Check if user prefers simple thinking dot over AI thinking
        if (localStorage.getItem('useAIThinking') === 'false') {
            console.log('[Application] AI thinking disabled by user, using simple typing indicator');
            return;
        }

        // Skip thinking simulation when in AI companion mode (user is chatting with AI companion directly)
        if (this.state.aiCompanionMode) {
            console.log('[Application] AI Companion mode active, skipping thinking simulation');
            return;
        }

        console.log('[Application] Starting improved thinking simulation with immediate LLM invocation...');

        // Flag to track if agent response has arrived
        let agentResponseReceived = false;
        let thinkingSimulationActive = false;
        let thinkingDisplayed = false;

        // Listen for agent responses
        const responseListener = (event) => {
            console.log('[Application] Response listener triggered:', {
                eventType: event.type,
                eventDetail: event.detail,
                from: event.detail?.from,
                fromId: event.detail?.from?.id
            });

            // Check if this is actually an agent response, not a user action
            if (event.detail && event.detail.from && event.detail.from.id !== 'user') {
                agentResponseReceived = true;
                console.log('[Application] Agent response detected, will end thinking simulation', {
                    responseReceived: agentResponseReceived,
                    thinkingActive: thinkingSimulationActive
                });

                // Immediately end thinking simulation if it's active
                if (thinkingSimulationActive && window.aiCompanion) {
                    console.log('[Application] Immediately ending thinking simulation due to agent response');
                    
                    // Extract agent response content for dynamic thinking conclusion
                    const agentResponseContent = event.detail?.text || event.detail?.message || '';
                    console.log('[Application] Agent response content for thinking:', agentResponseContent?.substring(0, 100));
                    
                    window.aiCompanion.endThinkingSimulationNaturally(agentResponseContent);
                    thinkingSimulationActive = false;
                }

                // If we're still in evaluation period, clear the flag but don't show typing indicator
                if (this.isEvaluatingThinkingSimulation) {
                    this.isEvaluatingThinkingSimulation = false;
                    console.log('[Application] Agent response during evaluation period, clearing evaluation flag');
                }
            } else {
                console.log('[Application] Event not considered agent response:', {
                    hasDetail: !!event.detail,
                    hasFrom: !!event.detail?.from,
                    fromId: event.detail?.from?.id
                });
            }
        };

        // Listen for agent response via directLineService
        const directLineResponseHandler = (entry) => {
            if (entry && entry.from && entry.from.id !== 'user') {
                agentResponseReceived = true;
            }
        };
        directLineService.on('message', directLineResponseHandler);

        try {
            // IMPROVEMENT: Start thinking process immediately for faster LLM response
            console.log('[Application] Starting thinking process immediately for faster response times...');
            
            // Use the original simulateThinkingProcess method for now (keeping it simple)
            // The delay is now configurable via AI companion settings
            const thinkingPromise = window.aiCompanion.simulateThinkingProcess(messageText);

            // Get configurable delay from AI companion (default 1.5 seconds)
            const delaySeconds = window.aiCompanion.getThinkingDisplayDelay();
            const delayMs = Math.round(delaySeconds * 1000);
            console.log('[Application] Waiting', delaySeconds, 'seconds for potential quick response...');
            await this.delay(delayMs);

            // Clear evaluation flag
            this.isEvaluatingThinkingSimulation = false;

            // If no response yet, the thinking simulation is already running
            if (!agentResponseReceived) {
                console.log('[Application] No response in', delaySeconds, 'seconds, thinking simulation already active...');
                thinkingSimulationActive = true;

                // Monitor for agent response while thinking is displayed with faster polling
                const responseCheckInterval = setInterval(() => {
                    if (agentResponseReceived && thinkingSimulationActive) {
                        console.log('[Application] Agent response received, ending thinking simulation naturally...');
                        window.aiCompanion.endThinkingSimulationNaturally();
                        thinkingSimulationActive = false;
                        clearInterval(responseCheckInterval);
                        console.log('[Application] Thinking simulation end request sent, interval cleared');
                    }
                }, 200); // Faster check: every 200ms instead of 500ms

                // Wait for thinking simulation to complete or be interrupted
                await thinkingPromise;
                thinkingSimulationActive = false;
                clearInterval(responseCheckInterval);
            } else {
                console.log('[Application] Quick response received, no thinking display needed');
                // Ensure thinking simulation is stopped if response came quickly
                if (window.aiCompanion.endThinkingSimulationNaturally) {
                    window.aiCompanion.endThinkingSimulationNaturally();
                }
                
                // Don't show progress indicator if AI companion is enabled
                if (!window.aiCompanion || window.aiCompanion.isEnabled !== true) {
                    const messageContext = this.detectMessageContext(messageText);
                    this.showProgressIndicator({
                        source: 'user-message',
                        messageText: messageText,
                        hasFile: false,
                        detectedContext: messageContext
                    });
                }
            }

        } catch (error) {
            console.error('[Application] Error in improved thinking simulation:', error);
        } finally {
            // Clean up evaluation flag and event listeners
            this.isEvaluatingThinkingSimulation = false;
            directLineService.off('message', directLineResponseHandler);
            console.log('[Application] Thinking simulation cleanup completed');
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
     * Detect context from user message for enhanced typing indicator
     * @param {string} messageText - The user's message
     * @returns {string} Context type
     */
    detectMessageContext(messageText) {
        if (!messageText) return 'general';

        const message = messageText.toLowerCase();

        // Code-related keywords
        const codeKeywords = [
            'function', 'class', 'method', 'variable', 'array', 'object',
            'javascript', 'python', 'java', 'html', 'css', 'sql', 'api',
            'code', 'script', 'programming', 'debug', 'error', 'syntax',
            'algorithm', 'logic', 'loop', 'condition', 'import', 'export'
        ];

        // Research-related keywords
        const researchKeywords = [
            'research', 'find information', 'search for', 'look up', 'investigate',
            'analyze', 'compare', 'study', 'examine', 'explore', 'discover',
            'what is', 'how does', 'why is', 'when did', 'where is',
            'explain', 'definition', 'meaning', 'background', 'history'
        ];

        // Creative-related keywords
        const creativeKeywords = [
            'write', 'create', 'generate', 'compose', 'draft', 'design',
            'story', 'poem', 'article', 'blog', 'content', 'creative',
            'imagine', 'brainstorm', 'ideas', 'innovative', 'original'
        ];

        // Complex analysis keywords
        const complexKeywords = [
            'analyze deeply', 'comprehensive', 'detailed analysis', 'in-depth',
            'complex', 'sophisticated', 'advanced', 'thorough', 'extensive',
            'multi-step', 'elaborate', 'comprehensive review', 'full analysis'
        ];

        // Check for complex queries first (most specific)
        if (complexKeywords.some(keyword => message.includes(keyword))) {
            return 'complex';
        }

        // Check for code-related content
        if (codeKeywords.some(keyword => message.includes(keyword))) {
            return 'code';
        }

        // Check for research content
        if (researchKeywords.some(keyword => message.includes(keyword))) {
            return 'research';
        }

        // Check for creative content
        if (creativeKeywords.some(keyword => message.includes(keyword))) {
            return 'creative';
        }

        return 'general';
    }

    /**
     * Show initialization indicator
     * @param {string} message - Indicator message
     */
    showInitializationIndicator(message = 'Initializing...') {
        console.log('Initialization indicator (fallback):', message);
        // Note: loadingIndicator element removed - now using unified notification system
        // This method is kept for compatibility but only logs the message
    }

    /**
     * Update initialization indicator
     * @param {string} message - Updated message
     */
    updateInitializationIndicator(message) {
        console.log('Initialization update:', message);

        // Emit progress event for splash screen
        const progressMap = {
            'Starting application...': 5,
            'Initializing components...': 10,
            'Setting up event handlers...': 15,
            'Loading agent configurations...': 25,
            'Initializing AI companion...': 35,
            'Setting up application icons...': 45,
            'Setting up unified message system...': 55,
            'Initializing Knowledge Hub...': 65,
            'Setting up mobile interface...': 70,
            'Loading user preferences...': 75,
            'Connecting to agent...': 80,
            'Checking for existing configuration...': 82,
            'No agents configured': 85,
            'Initializing bot connection...': 85,
            'Application ready!': 100
        };

        const progress = progressMap[message] || this.estimateProgress(message);
        document.dispatchEvent(new CustomEvent('app:init:progress', {
            detail: { progress, message }
        }));

        // Use unified notification system for initialization messages
        if (window.unifiedNotificationManager) {
            // Clear any existing initialization notifications first
            window.unifiedNotificationManager.clearZone('initialization');

            // Determine notification type based on message content
            let notificationType = 'init-loading';
            if (message.toLowerCase().includes('ready') || message.toLowerCase().includes('complete')) {
                notificationType = 'init-ready';
            } else if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
                notificationType = 'init-error';
            }

            // Show new initialization notification
            const notificationId = window.unifiedNotificationManager.show(notificationType, message, {
                persistent: true, // Keep visible until explicitly hidden
                duration: 0 // Don't auto-hide
            });

            // Store the notification ID for later cleanup
            this.currentInitNotificationId = notificationId;

            console.log(`[Application] Initialization notification shown: ${notificationType} - ${message}`);
        } else {
            // Note: loadingIndicator element removed - using unified notification system only
            console.log('[Application] Unified notification system not available - initialization update ignored');
        }
    }

    /**
     * Estimate progress based on message content
     * @param {string} message - Status message
     * @returns {number} Progress percentage
     */
    estimateProgress(message) {
        if (message.includes('connecting')) return 85;
        if (message.includes('connected')) return 95;
        if (message.includes('ready')) return 100;
        return 50;
    }

    /**
     * Hide initialization indicator
     */
    hideInitializationIndicator() {
        console.log('Hiding initialization indicator');

        // Use unified notification system to clear initialization zone
        if (window.unifiedNotificationManager) {
            window.unifiedNotificationManager.clearZone('initialization');
            this.currentInitNotificationId = null;
            console.log('[Application] Initialization notifications cleared via unified system');
        } else {
            // Note: loadingIndicator element removed - using unified notification system only
            console.log('[Application] Unified notification system not available - initialization complete');
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        console.error('Error:', message);

        // Use unified notification system directly if available
        if (window.unifiedNotificationManager) {
            window.unifiedNotificationManager.show({
                id: `error-${Date.now()}`,
                message: message,
                type: 'error',
                zone: 'logging',
                autoHide: 8000
            });
            console.log('[Application] Error message shown via unified notification system');
            return;
        }

        // Fallback to AI companion if unified system not available but AI companion is
        if (this.aiCompanion) {
            this.aiCompanion.showNotification('error', message, 8000);
            console.log('[Application] Error message shown via AI companion fallback');
            return;
        }

        // Final fallback to old toast system if neither unified system nor AI companion available
        console.warn('[Application] Using legacy error message fallback');
        const errorDiv = DOMUtils.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        errorDiv.innerHTML = `
            <strong>Error</strong><br>
            ${Utils.escapeHtml(message)}
        `;

        document.body.appendChild(errorDiv);

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 8000);
    }

    /**
     * Update agent status display
     * @param {string} status - Status: 'connected', 'disconnected', 'connecting'
     * @param {string} agentName - Agent name
     */
    updateAgentStatus(status, agentName = '') {
        // Update status in main panel
        const agentStatusEl = DOMUtils.getElementById('agentStatus');
        const agentNameEl = DOMUtils.getElementById('agentName');
        const agentTitleEl = DOMUtils.getElementById('agentConversationTitle');

        if (agentStatusEl) {
            agentStatusEl.className = `status-indicator ${status}`;
            // Update tooltip instead of text content
            const statusText = status.charAt(0).toUpperCase() + status.slice(1);
            const agentText = agentName ? `Agent: ${agentName} - ${statusText}` : `Agent: ${statusText}`;
            agentStatusEl.setAttribute('data-tooltip', agentText);
        }

        // Update agent name display
        if (agentNameEl) {
            agentNameEl.textContent = agentName ? `Agent: ${agentName}` : '';
        }

        if (agentTitleEl && agentName) {
            // Check if AI companion has set a custom title
            const hasCustomTitle = aiCompanion &&
                aiCompanion.currentConversationTitle &&
                aiCompanion.currentConversationTitle !== 'Agent Conversation';

            // Only update title if no custom AI-generated title exists
            if (!hasCustomTitle) {
                const conversationTitle = `${agentName} Conversation`;
                agentTitleEl.textContent = conversationTitle;
                console.log('[Application] Set default title:', conversationTitle);
            } else {
                console.log('[Application] Preserving AI-generated title:', aiCompanion.currentConversationTitle);
            }

            // Update mobile title if in mobile layout
            if (this.mobileUtils && this.mobileUtils.isMobileLayout()) {
                this.mobileUtils.updateMobileTitle(agentName);
            }
        }

        // Update status in setup modal if visible
        const currentAgentName = DOMUtils.getElementById('currentAgentName');
        const currentAgentStatus = DOMUtils.getElementById('currentAgentStatus');

        if (currentAgentName && agentName) {
            currentAgentName.textContent = agentName;
        }

        if (currentAgentStatus) {
            currentAgentStatus.className = `agent-status ${status}`;
            currentAgentStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    /**
     * Toggle AI Companion section visibility
     * @param {boolean} enabled - Whether AI companion is enabled
     */
    toggleAICompanionSection(enabled) {
        console.log('toggleAICompanionSection called with enabled:', enabled);
        // Refresh the registered models table when section becomes visible
        if (enabled && window.aiCompanion) {
            window.aiCompanion.renderRegisteredModelsTable();
        }
    }

    /**
     * Set up event handlers for the model registration form
     * @private
     */
    _setupModelRegistrationHandlers() {
        const addBtn = this.elements.addModelBtn;
        const formSection = this.elements.addModelFormSection;
        const closeBtn = this.elements.addModelFormCloseBtn;
        const providerSelect = this.elements.regProviderSelect;
        const testBtn = this.elements.testModelBtn;
        const registerBtn = this.elements.registerModelBtn;
        const formTitle = formSection?.querySelector('.add-model-form-header h4');

        const formState = {
            mode: 'create',
            editingModelId: null
        };

        if (!addBtn || !formSection) return;

        const getProviderApiKeyStorageKey = (provider) => {
            switch (provider) {
                case 'openai-compatible':
                    return 'openaiCompatibleApiKey';
                case 'openai':
                    return 'openaiApiKey';
                case 'anthropic':
                    return 'anthropicApiKey';
                case 'azure':
                    return 'azureApiKey';
                default:
                    return null;
            }
        };

        const showProviderFields = (provider) => {
            document.querySelectorAll('.reg-provider-fields').forEach(el => {
                el.style.display = 'none';
            });
            switch (provider) {
                case 'openai-compatible':
                    DOMUtils.show(document.getElementById('regCompatFields'));
                    break;
                case 'openai':
                case 'anthropic':
                    DOMUtils.show(document.getElementById('regDirectFields'));
                    break;
                case 'azure':
                    DOMUtils.show(document.getElementById('regAzureFields'));
                    break;
                case 'ollama':
                    DOMUtils.show(document.getElementById('regOllamaFields'));
                    break;
            }
        };

        const updateApiKeyPlaceholders = () => {
            const isEditMode = formState.mode === 'edit';
            const placeholder = isEditMode ? 'Leave blank to keep existing API key' : 'Enter API key...';
            const compatApiKey = document.getElementById('regCompatApiKey');
            const directApiKey = document.getElementById('regDirectApiKey');
            const azureApiKey = document.getElementById('regAzureApiKey');

            if (compatApiKey) compatApiKey.placeholder = placeholder;
            if (directApiKey) directApiKey.placeholder = placeholder;
            if (azureApiKey) azureApiKey.placeholder = isEditMode ? 'Leave blank to keep existing Azure API key' : 'Enter Azure API key...';
        };

        const getSubmitButtonLabel = () => formState.mode === 'edit' ? 'Save Changes' : 'Register Model';

        const syncFormChrome = () => {
            const isEditMode = formState.mode === 'edit';
            if (formTitle) {
                formTitle.textContent = isEditMode ? 'Edit Model' : 'Add New Model';
            }
            if (providerSelect) {
                providerSelect.disabled = isEditMode;
                providerSelect.title = isEditMode
                    ? 'Provider is fixed while editing. Add a new model to change provider.'
                    : '';
            }
            if (registerBtn && !registerBtn.disabled) {
                registerBtn.textContent = getSubmitButtonLabel();
            }
            if (formSection.style.display === 'none') {
                addBtn.textContent = '+ Add Model';
            } else {
                addBtn.textContent = isEditMode ? '− Cancel Edit' : '− Cancel';
            }
            updateApiKeyPlaceholders();
        };

        const resetFormFields = () => {
            formSection.querySelectorAll('input').forEach(input => {
                if (input.type === 'hidden') return;
                if (input.type === 'checkbox') {
                    input.checked = input.defaultChecked;
                    return;
                }
                input.value = input.defaultValue || '';
            });
            if (providerSelect) {
                providerSelect.value = 'openai-compatible';
                showProviderFields(providerSelect.value);
            }
        };

        const closeForm = () => {
            formState.mode = 'create';
            formState.editingModelId = null;
            resetFormFields();
            formSection.style.display = 'none';
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Register Model';
            }
            syncFormChrome();
        };

        const openCreateForm = () => {
            formState.mode = 'create';
            formState.editingModelId = null;
            resetFormFields();
            formSection.style.display = 'block';
            syncFormChrome();
        };

        const openEditForm = (model) => {
            if (!model) return;

            formState.mode = 'edit';
            formState.editingModelId = model.id;
            formSection.style.display = 'block';

            if (providerSelect) {
                providerSelect.value = model.provider;
                showProviderFields(model.provider);
            }

            document.getElementById('regCompatBaseUrl').value = model.provider === 'openai-compatible' ? (model.config.baseUrl || '') : '';
            document.getElementById('regCompatApiKey').value = '';
            document.getElementById('regCompatModel').value = model.provider === 'openai-compatible' ? (model.config.model || '') : '';
            document.getElementById('regCompatDisplayName').value = model.provider === 'openai-compatible' ? (model.config.displayName || model.displayName || '') : '';

            document.getElementById('regDirectApiKey').value = '';

            document.getElementById('regAzureApiKey').value = '';
            document.getElementById('regAzureEndpoint').value = model.provider === 'azure' ? (model.config.endpoint || '') : '';
            document.getElementById('regAzureDeployment').value = model.provider === 'azure' ? (model.config.deployment || '') : '';
            document.getElementById('regAzureApiVersion').value = model.provider === 'azure' ? (model.config.apiVersion || '2024-02-01') : '2024-02-01';

            document.getElementById('regOllamaUrl').value = model.provider === 'ollama' ? (model.config.url || 'http://localhost:11434') : 'http://localhost:11434';
            document.getElementById('regOllamaModel').value = model.provider === 'ollama' ? (model.config.model || '') : '';

            const reasoningCheckbox = document.getElementById('regDisableReasoning');
            if (reasoningCheckbox) reasoningCheckbox.checked = model.reasoningDisabled === true;

            syncFormChrome();
        };

        if (closeBtn) {
            DOMUtils.addEventListener(closeBtn, 'click', closeForm);
        }

        DOMUtils.addEventListener(addBtn, 'click', () => {
            const isHidden = formSection.style.display === 'none';
            if (isHidden) {
                openCreateForm();
            } else {
                closeForm();
            }
        });

        if (providerSelect) {
            showProviderFields(providerSelect.value || 'openai-compatible');
            DOMUtils.addEventListener(providerSelect, 'change', (e) => {
                showProviderFields(e.target.value);
            });
        }

        const getFormConfig = ({ allowBlankApiKey = false } = {}) => {
            const provider = providerSelect?.value || 'openai-compatible';
            const config = { provider };
            const requireApiKey = !allowBlankApiKey;

            switch (provider) {
                case 'openai-compatible':
                    config.baseUrl = document.getElementById('regCompatBaseUrl')?.value?.trim();
                    config.apiKey = document.getElementById('regCompatApiKey')?.value?.trim();
                    config.model = document.getElementById('regCompatModel')?.value?.trim();
                    config.displayName = document.getElementById('regCompatDisplayName')?.value?.trim();
                    if (!config.baseUrl || !config.model || (requireApiKey && !config.apiKey)) return null;
                    break;
                case 'openai':
                case 'anthropic':
                    config.apiKey = document.getElementById('regDirectApiKey')?.value?.trim();
                    if (requireApiKey && !config.apiKey) return null;
                    break;
                case 'azure':
                    config.apiKey = document.getElementById('regAzureApiKey')?.value?.trim();
                    config.endpoint = document.getElementById('regAzureEndpoint')?.value?.trim();
                    config.deployment = document.getElementById('regAzureDeployment')?.value?.trim();
                    config.apiVersion = document.getElementById('regAzureApiVersion')?.value?.trim() || '2024-02-01';
                    if (!config.endpoint || !config.deployment || (requireApiKey && !config.apiKey)) return null;
                    break;
                case 'ollama':
                    config.url = document.getElementById('regOllamaUrl')?.value?.trim() || 'http://localhost:11434';
                    config.model = document.getElementById('regOllamaModel')?.value?.trim();
                    if (!config.model) return null;
                    break;
            }
            return config;
        };

        const resolveTestConfig = async (config) => {
            if (!config || config.provider === 'ollama' || config.apiKey) {
                return config;
            }

            const storageKey = getProviderApiKeyStorageKey(config.provider);
            if (!storageKey) {
                return config;
            }

            const storedApiKey = await SecureStorage.retrieve(storageKey);
            return storedApiKey ? { ...config, apiKey: storedApiKey } : config;
        };

        // Test connection
        if (testBtn) {
            DOMUtils.addEventListener(testBtn, 'click', async () => {
                const allowBlankApiKey = formState.mode === 'edit';
                const config = getFormConfig({ allowBlankApiKey });
                if (!config) {
                    alert('Please fill in all required fields.');
                    return;
                }
                testBtn.disabled = true;
                testBtn.textContent = 'Testing...';
                try {
                    const testConfig = await resolveTestConfig(config);
                    if (['openai-compatible', 'openai', 'anthropic', 'azure'].includes(testConfig.provider) && !testConfig.apiKey) {
                        throw new Error('API key is required for connection testing. Enter a new key or keep an existing provider key configured.');
                    }
                    const reasoningCheckbox = document.getElementById('regDisableReasoning');
                    testConfig.reasoningDisabled = reasoningCheckbox?.checked || false;
                    const result = await window.aiCompanion.testModelConnection(testConfig);
                    if (result.ok && result.metrics) {
                        const m = result.metrics;
                        const fmtMs = (ms) => {
                            if (ms == null) return 'N/A';
                            if (ms >= 60000) return (ms / 60000).toFixed(1) + 'min';
                            if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
                            return ms + 'ms';
                        };
                        const ttftStr = fmtMs(m.ttft);
                        const ttltStr = fmtMs(m.ttlt);
                        const tpsStr = m.tokensPerSec > 0 ? `${m.tokensPerSec} tok/s` : 'N/A';
                        // Build model ID to save metrics for registered/to-be-registered model
                        const entry = window.aiCompanion._buildRegisteredModelEntry(testConfig);
                        window.aiCompanion.saveModelTestMetrics(entry.id, m);
                        alert(`✅ Connection successful!\n\nPerformance:\n  TTFT: ${ttftStr}\n  TTLT: ${ttltStr}\n  Speed: ${tpsStr}\n  Tokens: ${m.outputTokens}`);
                    } else {
                        alert('❌ Connection failed. Check your settings.');
                    }
                } catch (err) {
                    alert('❌ Error: ' + err.message);
                } finally {
                    testBtn.disabled = false;
                    testBtn.textContent = 'Test Connection';
                }
            });
        }

        // Register model
        if (registerBtn) {
            DOMUtils.addEventListener(registerBtn, 'click', async () => {
                const isEditMode = formState.mode === 'edit';
                const config = getFormConfig({ allowBlankApiKey: isEditMode });
                if (!config) {
                    alert('Please fill in all required fields.');
                    return;
                }
                const reasoningCheckbox = document.getElementById('regDisableReasoning');
                config.reasoningDisabled = reasoningCheckbox?.checked || false;
                registerBtn.disabled = true;
                registerBtn.textContent = isEditMode ? 'Saving...' : 'Registering...';
                try {
                    if (isEditMode) {
                        await window.aiCompanion.updateRegisteredModel(formState.editingModelId, config);
                        closeForm();
                        alert('✅ Model updated successfully!');
                    } else {
                        await window.aiCompanion.registerModel(config);
                        closeForm();
                        alert('✅ Model registered successfully!');
                    }
                } catch (err) {
                    alert('❌ Error: ' + err.message);
                } finally {
                    registerBtn.disabled = false;
                    registerBtn.textContent = getSubmitButtonLabel();
                }
            });
        }

        window.addEventListener('editRegisteredModel', (e) => {
            const modelId = e.detail?.modelId;
            if (!modelId || !window.aiCompanion) {
                return;
            }

            const model = window.aiCompanion.getRegisteredModel(modelId);
            if (!model) {
                alert('Unable to load the selected model for editing.');
                return;
            }

            openEditForm(model);
        });

        syncFormChrome();

        // Render initial table
        if (window.aiCompanion) {
            window.aiCompanion.renderRegisteredModelsTable();
        }
    }

    /**
     * Handle API provider selection change
     * @param {string} provider - Selected provider
     */
    handleAPIProviderChange(provider) {
        console.log('handleAPIProviderChange called with provider:', provider);

        // Save the provider setting
        localStorage.setItem('selectedApiProvider', provider);

        // Hide all config sections first
        if (this.elements.apiKeyField) DOMUtils.hide(this.elements.apiKeyField);
        if (this.elements.azureConfig) DOMUtils.hide(this.elements.azureConfig);
        if (this.elements.apiTestSection) DOMUtils.hide(this.elements.apiTestSection);
        if (this.elements.ollamaConfig) DOMUtils.hide(this.elements.ollamaConfig);
        if (this.elements.openaiCompatibleConfig) DOMUtils.hide(this.elements.openaiCompatibleConfig);

        // Show appropriate config section based on provider
        if (provider === 'ollama') {
            console.log('Showing Ollama config');
            DOMUtils.show(this.elements.ollamaConfig);
            this.refreshOllamaModels();
        } else if (provider === 'azure') {
            console.log('Showing Azure config - API key field and Azure config');
            DOMUtils.show(this.elements.apiKeyField);
            DOMUtils.show(this.elements.azureConfig);
        } else if (provider === 'openai-compatible') {
            console.log('Showing OpenAI Compatible config');
            DOMUtils.show(this.elements.openaiCompatibleConfig);
        } else {
            // OpenAI, Anthropic, etc.
            console.log('Showing general API config for provider:', provider);
            DOMUtils.show(this.elements.apiKeyField);
            DOMUtils.show(this.elements.apiTestSection);
        }

        // Update AI companion provider and status
        if (this.aiCompanion) {
            this.aiCompanion.setProvider(provider);
        }
    }

    /**
     * Refresh available Ollama models
     */
    async refreshOllamaModels() {
        if (!this.elements.ollamaModelSelect) return;

        try {
            const ollamaUrl = this.elements.ollamaUrlInput?.value || 'http://localhost:11434';

            // Save the currently selected model
            const currentlySelected = this.elements.ollamaModelSelect.value;

            // Clear current options
            this.elements.ollamaModelSelect.innerHTML = '<option value="">Loading models...</option>';

            // Fetch models from Ollama
            const response = await fetch(`${ollamaUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Clear and populate options
            this.elements.ollamaModelSelect.innerHTML = '<option value="">Select a model...</option>';

            if (data.models && data.models.length > 0) {
                data.models.forEach(model => {
                    const option = DOMUtils.createElement('option', { value: model.name }, model.name);
                    this.elements.ollamaModelSelect.appendChild(option);
                });

                // Restore the previously selected model if it still exists
                if (currentlySelected && data.models.some(model => model.name === currentlySelected)) {
                    this.elements.ollamaModelSelect.value = currentlySelected;
                } else {
                    // If no current selection, try to load the saved model from localStorage
                    const savedModel = localStorage.getItem('ollamaSelectedModel');
                    if (savedModel && data.models.some(model => model.name === savedModel)) {
                        this.elements.ollamaModelSelect.value = savedModel;
                        console.log('Restored saved Ollama model:', savedModel);
                    }
                }

                // Notify AI Companion to sync its dropdown if panel is open
                if (this.aiCompanion) {
                    this.aiCompanion.syncModelDropdownSelection?.();
                }
            } else {
                this.elements.ollamaModelSelect.innerHTML = '<option value="">No models found</option>';
            }

        } catch (error) {
            console.error('Error fetching Ollama models:', error);
            this.elements.ollamaModelSelect.innerHTML = '<option value="">Error loading models</option>';
        }
    }

    /**
     * Run a connection test while showing button progress state.
     * @param {HTMLButtonElement|null} button - Button to show loading state on
     * @param {string} loadingLabel - Label shown while test is running
     * @param {Function} testCallback - Async test function to execute
     * @returns {Promise<void>}
     * @private
     */
    async runConnectionTestWithProgress(button, loadingLabel, testCallback) {
        if (typeof testCallback !== 'function') {
            return;
        }

        if (!button) {
            await testCallback();
            return;
        }

        if (button.dataset.testing === 'true') {
            return;
        }

        const originalLabel = button.dataset.originalLabel || button.textContent.trim();
        if (!button.dataset.originalLabel) {
            button.dataset.originalLabel = originalLabel;
        }

        button.dataset.testing = 'true';
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = loadingLabel || 'Testing...';

        try {
            await testCallback();
        } finally {
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.dataset.testing = 'false';
            button.textContent = button.dataset.originalLabel || originalLabel;
        }
    }

    /**
     * Test Ollama connection
     */
    async testOllamaConnection() {
        try {
            const ollamaUrl = this.elements.ollamaUrlInput?.value || 'http://localhost:11434';

            // Test connection to Ollama
            const response = await fetch(`${ollamaUrl}/api/version`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            alert(`✅ Ollama connection successful!\nVersion: ${data.version || 'Unknown'}`);

            // Only refresh models if the dropdown is empty or has an error state
            const currentOptions = this.elements.ollamaModelSelect?.innerHTML || '';
            if (currentOptions.includes('Select a model...') ||
                currentOptions.includes('Error loading models') ||
                currentOptions.includes('No models found') ||
                this.elements.ollamaModelSelect?.options.length <= 1) {
                console.log('Refreshing models after successful connection test');
                this.refreshOllamaModels();
            }

        } catch (error) {
            console.error('Ollama connection test failed:', error);
            alert(`❌ Ollama connection failed:\n${error.message}\n\nMake sure Ollama is running and accessible at the specified URL.`);
        }
    }

    /**
     * Test Azure OpenAI connection
     */
    async testAzureConnection() {
        try {
            const apiKey = this.elements.apiKeyInput?.value;
            const endpoint = this.elements.azureEndpointInput?.value;
            const deployment = this.elements.azureDeploymentInput?.value;
            const apiVersion = this.elements.azureApiVersionInput?.value || '2024-02-01';

            if (!apiKey || !endpoint || !deployment) {
                alert('❌ Please fill in all required Azure OpenAI fields:\n- API Key\n- Endpoint\n- Deployment Name');
                return;
            }

            // Test with a simple chat completion request
            const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

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
                            content: 'Hello, this is a connection test.'
                        }
                    ],
                    max_tokens: 10,
                    temperature: 0
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            alert(`✅ Azure OpenAI connection successful!\nModel: ${data.model || deployment}\nUsage: ${data.usage?.total_tokens || 'N/A'} tokens`);

        } catch (error) {
            console.error('Azure OpenAI connection test failed:', error);
            alert(`❌ Azure OpenAI connection failed:\n${error.message}\n\nPlease check your configuration and try again.`);
        }
    }

    /**
     * Load OpenAI Compatible API key from SecureStorage into the input field
     * @private
     */
    async loadOpenAICompatibleApiKey() {
        try {
            const { SecureStorage } = await import('../utils/secureStorage.js');
            const savedKey = await SecureStorage.retrieve('openaiCompatibleApiKey');
            if (savedKey && this.elements.openaiCompatibleApiKeyInput) {
                this.elements.openaiCompatibleApiKeyInput.value = savedKey;
            }
        } catch (err) {
            console.warn('Could not load OpenAI Compatible API key:', err);
        }
    }

    /**
     * Test OpenAI Compatible connection
     */
    async testOpenAICompatibleConnection() {
        try {
            const baseUrl = this.elements.openaiCompatibleBaseUrlInput?.value?.replace(/\/+$/, '');
            const apiKey = this.elements.openaiCompatibleApiKeyInput?.value;
            const model = this.elements.openaiCompatibleModelInput?.value;

            if (!baseUrl || !apiKey || !model) {
                alert('❌ Please fill in all required fields:\n- Base URL\n- API Key\n- Model Name');
                return;
            }

            // Ensure URL ends with /v1 pattern or use as-is
            const chatUrl = baseUrl.endsWith('/chat/completions')
                ? baseUrl
                : baseUrl.replace(/\/v1\/?$/, '') + '/v1/chat/completions';

            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: 'Hello, this is a connection test.' }],
                    max_tokens: 10,
                    temperature: 0
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const displayName = this.elements.openaiCompatibleDisplayNameInput?.value || 'OpenAI Compatible';
            alert(`✅ ${displayName} connection successful!\nModel: ${data.model || model}\nUsage: ${data.usage?.total_tokens || 'N/A'} tokens`);

            // Save config on successful test
            localStorage.setItem('openaiCompatibleBaseUrl', baseUrl);
            localStorage.setItem('openaiCompatibleModel', model);
            if (this.elements.openaiCompatibleDisplayNameInput?.value) {
                localStorage.setItem('openaiCompatibleDisplayName', this.elements.openaiCompatibleDisplayNameInput.value);
            }
            const { SecureStorage } = await import('../utils/secureStorage.js');
            await SecureStorage.store('openaiCompatibleApiKey', apiKey);

        } catch (error) {
            console.error('OpenAI Compatible connection test failed:', error);
            alert(`❌ Connection failed:\n${error.message}\n\nPlease check your Base URL, API Key, and Model Name.`);
        }
    }

    /**
     * Test general API connection (OpenAI, Anthropic, etc.)
     */
    async testApiConnection() {
        try {
            const provider = this.elements.apiProviderSelect?.value || 'openai';
            const apiKey = this.elements.apiKeyInput?.value;

            if (!apiKey) {
                alert('❌ Please enter your API key before testing the connection.');
                return;
            }

            let url, headers, body;

            if (provider === 'openai') {
                url = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                body = JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Hello, this is a connection test.' }],
                    max_tokens: 10,
                    temperature: 0
                });
            } else if (provider === 'anthropic') {
                url = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                };
                body = JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    messages: [{ role: 'user', content: 'Hello, this is a connection test.' }],
                    max_tokens: 10
                });
            } else {
                alert(`❌ Connection testing for ${provider} is not implemented yet.`);
                return;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || errorData.message || response.statusText}`);
            }

            const data = await response.json();
            let modelInfo = '';

            if (provider === 'openai') {
                modelInfo = `Model: ${data.model || 'Unknown'}\nUsage: ${data.usage?.total_tokens || 'N/A'} tokens`;
            } else if (provider === 'anthropic') {
                modelInfo = `Model: ${data.model || 'Unknown'}\nUsage: ${data.usage?.input_tokens || 'N/A'} input, ${data.usage?.output_tokens || 'N/A'} output tokens`;
            }

            alert(`✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} connection successful!\n${modelInfo}`);

        } catch (error) {
            console.error('API connection test failed:', error);
            alert(`❌ API connection failed:\n${error.message}\n\nPlease check your API key and try again.`);
        }
    }

    /**
     * Check if URL is from a domain that likely has CSP frame-ancestors restrictions
     * @param {string} url - URL to check
     * @returns {boolean} True if domain likely has CSP restrictions
     * @private
     */
    isCSPRestrictedDomain(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            // Known domains that typically have strict CSP frame-ancestors policies
            const restrictedDomains = [
                'sharepoint.com',
                'sharepointonline.com',
                'office.com',
                'office365.com',
                'microsoft365.com',
                'teams.microsoft.com',
                'onedrive.live.com',
                'powerbi.com',
                'powerapps.com',
                'dynamics.com',
                'live.com',
                'outlook.com',
                'hotmail.com',
                'yammer.com',
                'microsoftonline.com',
                'login.microsoft.com',
                'account.microsoft.com'
            ];

            return restrictedDomains.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch (e) {
            // If URL parsing fails, assume it might be restricted
            console.warn('Failed to parse URL for CSP check:', url);
            return false;
        }
    }

    /**
     * Initialize analysis panel tab system
     * @private
     */
    initAnalysisTabs() {
        const tabBar = document.getElementById('analysisTabBar');
        if (!tabBar) return;

        tabBar.addEventListener('click', (e) => {
            const tab = e.target.closest('.analysis-tab');
            if (!tab) return;

            // Handle close button on citation tabs
            if (e.target.closest('.tab-close')) {
                e.stopPropagation();
                this.closeCitationTab(tab.dataset.tab);
                return;
            }

            this.switchAnalysisTab(tab.dataset.tab);
        });
    }

    /**
     * Extract URLs from bot message text and auto-open the first one in a citation tab
     * @param {string} text - Message text (may contain markdown)
     * @private
     */
    _autoOpenMessageUrls(text) {
        if (localStorage.getItem('autoOpenCitations') !== 'true') return;

        // Match URLs: markdown links [text](url) and bare http(s) URLs
        const markdownLinkRe = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
        const bareLinkRe = /(?<!\]\()https?:\/\/[^\s)>\]]+/g;

        let url = null;
        let title = null;

        // Prefer the first markdown link (has a title)
        const mdMatch = markdownLinkRe.exec(text);
        if (mdMatch) {
            title = mdMatch[1].trim() || null;
            url = mdMatch[2];
        } else {
            // Fall back to first bare URL
            const bareMatch = bareLinkRe.exec(text);
            if (bareMatch) {
                url = bareMatch[0];
            }
        }

        if (!url) return;

        // Derive a display name: use markdown link text, else hostname
        if (!title) {
            try { title = new URL(url).hostname.replace('www.', ''); } catch { title = 'Link'; }
        }

        console.log('[AutoOpen] Opening URL from agent message:', url, 'title:', title);
        this.openCitationPreview(url, title);
    }

    /**
     * Switch to a specific analysis tab
     * @param {string} tabId - Tab identifier (performance, chat, citation-*)
     */
    switchAnalysisTab(tabId) {
        const panel = document.getElementById('llmAnalysisPanel');
        if (!panel) return;

        // Deactivate all tabs and panes
        panel.querySelectorAll('.analysis-tab').forEach(t => t.classList.remove('active'));
        panel.querySelectorAll('.analysis-tab-pane').forEach(p => p.classList.remove('active'));

        // Activate target tab and pane
        const tab = panel.querySelector(`.analysis-tab[data-tab="${tabId}"]`);
        const pane = panel.querySelector(`.analysis-tab-pane[data-tab-pane="${tabId}"]`);
        if (tab) tab.classList.add('active');
        if (pane) pane.classList.add('active');
    }

    /**
     * Open a file attachment in a tab within the analysis panel.
     * Uses the same rendering approach as the overlay preview (no sandbox iframe)
     * to avoid X-Frame-Options / Edge security blocking.
     * @param {string} url - File URL
     * @param {string} name - Display name
     * @param {string} [contentType] - MIME type
     */
    openAttachmentInPanel(url, name = 'Attachment', contentType = '') {
        const panel = document.getElementById('llmAnalysisPanel');
        const tabBar = document.getElementById('analysisTabBar');
        if (!panel || !tabBar) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        // Ensure analysis panel is visible
        if (panel.style.display === 'none') {
            panel.style.display = '';
            DOMUtils.removeClass(panel, 'collapsed');
        }

        const tabId = 'attachment';

        // Reuse or create tab
        let existingPane = panel.querySelector(`.analysis-tab-pane[data-tab-pane="${tabId}"]`);
        let existingTab = tabBar.querySelector(`.analysis-tab[data-tab="${tabId}"]`);

        // Build content using the same logic as the overlay preview
        const buildContent = (container) => {
            container.innerHTML = '';
            const ext = name.split('.').pop().toLowerCase();
            const isPdf = contentType === 'application/pdf' || ext === 'pdf';
            const isImage = (contentType && contentType.startsWith('image/')) || ['png','jpg','jpeg','gif','webp','svg'].includes(ext);

            if (isPdf) {
                const iframe = document.createElement('iframe');
                iframe.src = url;
                iframe.title = name;
                iframe.style.cssText = 'width:100%;height:100%;border:none;';
                container.appendChild(iframe);
            } else if (isImage) {
                const img = document.createElement('img');
                img.src = url;
                img.alt = name;
                img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;margin:auto;display:block;';
                container.appendChild(img);
            } else {
                const fallback = document.createElement('div');
                fallback.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--color-text-secondary);';
                fallback.innerHTML = `<div style="font-size:48px;">\uD83D\uDCC4</div><p><strong>${DOMUtils.escapeHtml ? DOMUtils.escapeHtml(name) : name}</strong></p><p>This file type cannot be previewed inline.</p>`;
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = 'Open in New Tab';
                link.style.cssText = 'color:var(--color-accent);text-decoration:underline;';
                fallback.appendChild(link);
                container.appendChild(fallback);
            }
        };

        if (existingPane) {
            buildContent(existingPane);
            if (existingTab) {
                const labelSpan = existingTab.querySelector('.tab-label');
                if (labelSpan) labelSpan.textContent = name;
            }
        } else {
            // Create tab button
            const tabBtn = document.createElement('button');
            tabBtn.className = 'analysis-tab';
            tabBtn.dataset.tab = tabId;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'tab-label';
            labelSpan.textContent = name;
            tabBtn.appendChild(labelSpan);

            const closeSpan = document.createElement('span');
            closeSpan.className = 'tab-close';
            closeSpan.title = 'Close';
            closeSpan.textContent = '\u00d7';
            tabBtn.appendChild(closeSpan);

            tabBar.appendChild(tabBtn);

            // Create pane
            const pane = document.createElement('div');
            pane.className = 'analysis-tab-pane';
            pane.dataset.tabPane = tabId;
            pane.style.cssText = 'height:100%;overflow:auto;';

            buildContent(pane);

            const kpiModal = panel.querySelector('#kpiModal');
            if (kpiModal) {
                panel.insertBefore(pane, kpiModal);
            } else {
                panel.appendChild(pane);
            }
        }

        this.switchAnalysisTab(tabId);
    }

    /**
     * Open URL in citation tab within the analysis panel
     * @param {string} url - URL to open for citation preview
     * @param {string} [title] - Optional display title for the tab (defaults to hostname)
     */
    openCitationPreview(url, title) {
        console.log('[CitationPreview] Opening URL in analysis tab:', url);

        const panel = document.getElementById('llmAnalysisPanel');
        const tabBar = document.getElementById('analysisTabBar');
        if (!panel || !tabBar) {
            console.error('[CitationPreview] Analysis panel not found');
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        // Ensure analysis panel is visible
        if (panel.style.display === 'none') {
            panel.style.display = '';
            DOMUtils.removeClass(panel, 'collapsed');
        }

        // Resolve display label: explicit title > hostname > fallback
        let displayLabel = title || null;
        if (!displayLabel) {
            try { displayLabel = new URL(url).hostname.replace('www.', ''); } catch { displayLabel = 'Citation'; }
        }

        // Derive a tab ID from the URL for uniqueness
        const tabId = 'citation';

        // Check if citation tab already exists and reuse it
        let existingPane = panel.querySelector(`.analysis-tab-pane[data-tab-pane="${tabId}"]`);
        let existingTab = tabBar.querySelector(`.analysis-tab[data-tab="${tabId}"]`);

        if (existingPane) {
            // Reuse existing tab — update the iframe src
            const iframe = existingPane.querySelector('.citation-browser-frame');
            const loader = existingPane.querySelector('.citation-browser-loader');
            const errorEl = existingPane.querySelector('.citation-browser-error');

            if (loader) loader.style.display = '';
            if (errorEl) errorEl.style.display = 'none';
            if (iframe) {
                iframe.style.display = 'none';
                this._setupCitationIframe(iframe, url, loader, errorEl);
            }

            // Update tab label
            if (existingTab) {
                const labelSpan = existingTab.querySelector('.tab-label');
                if (labelSpan) labelSpan.textContent = displayLabel;
            }
        } else {
            // Create citation tab button
            const tabBtn = document.createElement('button');
            tabBtn.className = 'analysis-tab';
            tabBtn.dataset.tab = tabId;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'tab-label';
            labelSpan.textContent = displayLabel;
            tabBtn.appendChild(labelSpan);

            const closeSpan = document.createElement('span');
            closeSpan.className = 'tab-close';
            closeSpan.title = 'Close';
            closeSpan.textContent = '\u00d7';
            tabBtn.appendChild(closeSpan);

            tabBar.appendChild(tabBtn);

            // Create citation tab pane
            const pane = document.createElement('div');
            pane.className = 'analysis-tab-pane';
            pane.dataset.tabPane = tabId;

            const loader = document.createElement('div');
            loader.className = 'citation-browser-loader';
            loader.innerHTML = '<div class="loader-spinner"></div><p>Loading citation source...</p>';

            const errorEl = document.createElement('div');
            errorEl.className = 'citation-browser-error';
            errorEl.style.display = 'none';
            errorEl.innerHTML = '<p>Unable to load citation source. This content may be blocked by security policies.</p><button class="btn btn-secondary citation-open-external">Open in External Browser</button>';
            errorEl.querySelector('.citation-open-external').addEventListener('click', () => {
                window.open(url, '_blank', 'noopener,noreferrer');
            });

            const iframe = document.createElement('iframe');
            iframe.className = 'citation-browser-frame';
            iframe.title = 'Citation content';
            iframe.style.display = 'none';
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox');
            iframe.setAttribute('allow', 'accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media');

            pane.appendChild(loader);
            pane.appendChild(errorEl);
            pane.appendChild(iframe);

            // Insert pane before kpiModal
            const kpiModal = panel.querySelector('#kpiModal');
            if (kpiModal) {
                panel.insertBefore(pane, kpiModal);
            } else {
                panel.appendChild(pane);
            }

            this._setupCitationIframe(iframe, url, loader, errorEl);
        }

        // Switch to citation tab
        this.switchAnalysisTab(tabId);
    }

    /**
     * Set up iframe loading with error/timeout handling
     * @param {HTMLIFrameElement} iframe
     * @param {string} url
     * @param {HTMLElement} loader
     * @param {HTMLElement} errorEl
     * @private
     */
    _setupCitationIframe(iframe, url, loader, errorEl) {
        if (iframe._loadTimeout) {
            clearTimeout(iframe._loadTimeout);
            iframe._loadTimeout = null;
        }

        const handleLoadError = () => {
            console.warn('[CitationPreview] Failed to load URL:', url);
            if (loader) loader.style.display = 'none';
            if (errorEl) {
                errorEl.style.display = '';
                // Update the external button URL
                const btn = errorEl.querySelector('.citation-open-external');
                if (btn) {
                    btn.onclick = () => window.open(url, '_blank', 'noopener,noreferrer');
                }
            }
        };

        iframe.onerror = handleLoadError;
        iframe.onload = () => {
            if (iframe._loadTimeout) {
                clearTimeout(iframe._loadTimeout);
                iframe._loadTimeout = null;
            }

            // Detect X-Frame-Options / CSP blocking: if the iframe loaded
            // but we can't access its contentDocument, the site likely blocked framing
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                // If accessible and has a non-trivial body, show it
                if (doc && doc.body && doc.body.innerHTML.length > 0) {
                    console.log('[CitationPreview] Content loaded successfully');
                    if (loader) loader.style.display = 'none';
                    if (errorEl) errorEl.style.display = 'none';
                    iframe.style.display = '';
                    return;
                }
            } catch (e) {
                // Cross-origin: we can't inspect, but the page DID load — show it
                console.log('[CitationPreview] Cross-origin frame loaded (assumed OK)');
                if (loader) loader.style.display = 'none';
                if (errorEl) errorEl.style.display = 'none';
                iframe.style.display = '';
                return;
            }

            // Same-origin blank page — likely blocked
            console.warn('[CitationPreview] Frame loaded but appears blank, treating as blocked');
            handleLoadError();
        };

        iframe.src = url;

        iframe._loadTimeout = setTimeout(() => {
            if (iframe._loadTimeout) {
                console.warn('[CitationPreview] Load timeout for URL:', url);
                handleLoadError();
            }
        }, 8000);
    }

    /**
     * Close a citation tab and switch to the previous tab
     * @param {string} tabId - The citation tab ID to close
     */
    closeCitationTab(tabId) {
        const panel = document.getElementById('llmAnalysisPanel');
        if (!panel) return;

        const tab = panel.querySelector(`.analysis-tab[data-tab="${tabId}"]`);
        const pane = panel.querySelector(`.analysis-tab-pane[data-tab-pane="${tabId}"]`);

        // Clean up iframe
        if (pane) {
            const iframe = pane.querySelector('iframe');
            if (iframe) {
                if (iframe._loadTimeout) clearTimeout(iframe._loadTimeout);
                iframe.src = 'about:blank';
            }
            pane.remove();
        }
        if (tab) tab.remove();

        // Switch to performance tab
        this.switchAnalysisTab('performance');
    }

    /**
     * Close citation preview (called from legacy code paths)
     */
    closeCitationPreview() {
        this.closeCitationTab('citation');
    }

    // Legacy support methods for backward compatibility
    openInRightPanel(url) {
        console.warn('openInRightPanel is deprecated, use openCitationPreview instead');
        this.openCitationPreview(url);
    }

    closeRightPanel() {
        console.warn('closeRightPanel is deprecated, use closeCitationPreview instead');
        this.closeCitationPreview();
    }

    // ── File handling ────────────────────────────────────────

    /** Max upload size in bytes (DirectLine server hard limit) */
    static MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

    /**
     * Get a simple icon string for a file type
     * @param {File} file
     * @returns {string}
     */
    _fileTypeIcon(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (['pdf'].includes(ext)) return '📄';
        if (['doc', 'docx'].includes(ext)) return '📝';
        if (['xls', 'xlsx'].includes(ext)) return '📊';
        if (['ppt', 'pptx'].includes(ext)) return '📑';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️';
        if (['txt'].includes(ext)) return '📃';
        return '📎';
    }

    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        const rejected = [];
        for (const file of files) {
            if (file.size > Application.MAX_FILE_SIZE) {
                rejected.push(file.name);
            } else {
                this.selectedFiles.push(file);
            }
        }

        if (rejected.length) {
            this.showErrorMessage(`File(s) too large (max 4 MB): ${rejected.join(', ')}`);
        }

        if (this.selectedFiles.length > 0) {
            this.showFilePreview();
        }

        // Reset input so same files can be re-selected
        event.target.value = '';
    }

    /**
     * Remove a specific file by index
     * @param {number} index
     */
    removeSelectedFileAt(index) {
        this.selectedFiles.splice(index, 1);
        if (this.selectedFiles.length === 0) {
            this.hideFilePreview();
        } else {
            this.showFilePreview();
        }
    }

    removeAllSelectedFiles() {
        this.selectedFiles = [];
        this.hideFilePreview();
        if (this.elements.fileInput) this.elements.fileInput.value = '';
    }

    showFilePreview() {
        if (!this.elements.filePreviewContainer) return;
        const container = this.elements.filePreviewContainer;
        const listEl = document.getElementById('filePreviewList');
        if (!listEl) return;

        listEl.innerHTML = '';
        this.selectedFiles.forEach((file, idx) => {
            const item = document.createElement('div');
            item.className = 'file-preview-item';
            item.innerHTML = `
                <span class="file-type-icon">${this._fileTypeIcon(file)}</span>
                <span class="file-preview-name" title="${Utils.escapeHtml(file.name)}">${Utils.escapeHtml(file.name)}</span>
                <span class="file-preview-size">${Utils.formatBytes(file.size)}</span>
            `;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-preview-remove';
            removeBtn.title = 'Remove';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => this.removeSelectedFileAt(idx));
            item.appendChild(removeBtn);
            listEl.appendChild(item);
        });

        container.style.display = 'block';
        if (this.elements.uploadProgressBar) this.elements.uploadProgressBar.style.display = 'none';
    }

    hideFilePreview() {
        if (this.elements.filePreviewContainer) {
            this.elements.filePreviewContainer.style.display = 'none';
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        if (this.elements.chatWindow) this.elements.chatWindow.classList.add('drag-over');
    }

    handleDragLeave(event) {
        if (this.elements.chatWindow) this.elements.chatWindow.classList.remove('drag-over');
    }

    handleFileDrop(event) {
        event.preventDefault();
        if (this.elements.chatWindow) this.elements.chatWindow.classList.remove('drag-over');

        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return;

        const rejected = [];
        for (const file of files) {
            if (file.size > Application.MAX_FILE_SIZE) {
                rejected.push(file.name);
            } else {
                this.selectedFiles.push(file);
            }
        }

        if (rejected.length) {
            this.showErrorMessage(`File(s) too large (max 4 MB): ${rejected.join(', ')}`);
        }

        if (this.selectedFiles.length > 0) {
            this.showFilePreview();
        }
    }

    /**
     * Handle paste event to extract images from clipboard
     * @param {ClipboardEvent} event
     */
    handlePasteImage(event) {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter(item => item.type.startsWith('image/'));

        if (imageItems.length === 0) return; // Not an image paste — let default behavior proceed

        event.preventDefault();

        const rejected = [];
        for (const item of imageItems) {
            const blob = item.getAsFile();
            if (!blob) continue;

            if (blob.size > Application.MAX_FILE_SIZE) {
                rejected.push('Pasted image');
                continue;
            }

            const ext = blob.type.split('/')[1] || 'png';
            const fileName = `pasted-image-${Date.now()}.${ext}`;
            const file = new File([blob], fileName, { type: blob.type });
            this.selectedFiles.push(file);
        }

        if (rejected.length) {
            this.showErrorMessage('Pasted image too large (max 4 MB)');
        }

        if (this.selectedFiles.length > 0) {
            this.showFilePreview();
        }
    }

    /**
     * Show upload progress UI
     * @param {number} percent 0-100
     * @param {string} statusText
     */
    _showUploadProgress(percent, statusText) {
        if (this.elements.uploadProgressBar) {
            this.elements.uploadProgressBar.style.display = 'flex';
        }
        if (this.elements.uploadProgressFill) {
            this.elements.uploadProgressFill.style.width = `${percent}%`;
        }
        if (this.elements.uploadProgressText) {
            this.elements.uploadProgressText.textContent = statusText || `${Math.round(percent)}%`;
        }
    }

    _hideUploadProgress() {
        if (this.elements.uploadProgressBar) {
            this.elements.uploadProgressBar.style.display = 'none';
        }
    }

    /**
     * Send message with file attachments via DirectLine REST upload endpoint.
     * Uses the proven XHR direct-File approach that works with Copilot Studio.
     * @param {string} text - Message text
     * @param {File[]} files - Files to upload
     * @returns {Promise}
     */
    async sendMessageWithFiles(text, files) {
        console.log('Sending message with', files.length, 'file(s)');

        const label = files.length === 1
            ? `Uploading: ${files[0].name}`
            : `Uploading 0/${files.length}...`;
        this._showUploadProgress(0, label);
        this.elements.sendButton.disabled = true;

        try {
            await this.getConnectorForAgent().sendMessageWithFiles(text, files, (progress) => {
                const percent = Math.round(progress * 100);
                const currentFile = Math.min(Math.floor(progress * files.length) + 1, files.length);
                const progressLabel = files.length === 1
                    ? `Uploading: ${files[0].name} ${percent}%`
                    : `Uploading ${currentFile}/${files.length}... ${percent}%`;
                this._showUploadProgress(percent, progressLabel);
            });
            this._showUploadProgress(100, 'Sent');
            setTimeout(() => this._hideUploadProgress(), 1500);
        } catch (error) {
            console.error('File upload failed:', error);
            this._hideUploadProgress();
            this.showErrorMessage('Failed to upload file: ' + (error.message || 'Unknown error'));
        } finally {
            this.elements.sendButton.disabled = false;
        }
    }

    /**
     * Update agent chat font size
     * @param {string} size - Font size in pixels
     */
    updateAgentFontSize(size) {
        const fontSize = `${size}px`;
        document.documentElement.style.setProperty('--agent-chat-font-size', fontSize);

        // Update the display value
        if (this.elements.appearanceAgentFontSizeValue) {
            this.elements.appearanceAgentFontSizeValue.textContent = fontSize;
        }

        // Force refresh of existing agent messages by triggering reflow
        this.refreshAgentMessageStyles(fontSize);

        // Save to localStorage
        localStorage.setItem('agentChatFontSize', size);
        console.log('Agent chat font size updated to:', fontSize);
    }

    /**
     * Update AI companion chat font size
     * @param {string} size - Font size in pixels
     */
    updateCompanionFontSize(size) {
        const fontSize = `${size}px`;
        document.documentElement.style.setProperty('--companion-chat-font-size', fontSize);

        // Update the display value
        if (this.elements.appearanceCompanionFontSizeValue) {
            this.elements.appearanceCompanionFontSizeValue.textContent = fontSize;
        }

        // Force refresh of existing companion messages
        this.refreshCompanionMessageStyles(fontSize);

        // Save to localStorage
        localStorage.setItem('companionChatFontSize', size);
        console.log('AI companion chat font size updated to:', fontSize);
    }

    /**
     * Force refresh of existing agent message styles
     * @param {string} fontSize - New font size
     * @private
     */
    refreshAgentMessageStyles(fontSize) {
        // Update main chat window agent messages
        const chatWindow = DOMUtils.getElementById('chatWindow');
        if (chatWindow) {
            // Target all message content that uses --agent-chat-font-size variable
            const agentMessages = chatWindow.querySelectorAll(
                '.botMessage .messageContent, ' +
                '.userMessage .messageContent, ' +
                '.full-width-messages .botMessage .messageContent, ' +
                '.companion-response .messageContent, ' +
                '.full-width-messages .companion-response .messageContent, ' +
                '.messageText'
            );
            agentMessages.forEach(messageContent => {
                // Temporarily set the font-size directly to force immediate update
                const originalFontSize = messageContent.style.fontSize;
                messageContent.style.fontSize = fontSize;

                // After a brief moment, remove the inline style to let CSS variable take over
                requestAnimationFrame(() => {
                    messageContent.style.fontSize = originalFontSize || '';
                });
            });
        }
        console.log('Refreshed agent message styles with font size:', fontSize);
    }

    /**
     * Force refresh of existing companion message styles
     * @param {string} fontSize - New font size
     * @private
     */
    refreshCompanionMessageStyles(fontSize) {
        // Update companion chat window messages
        const llmChatWindow = DOMUtils.getElementById('llmChatWindow');
        if (llmChatWindow) {
            const companionMessages = llmChatWindow.querySelectorAll('.messageContent, .messageText');
            companionMessages.forEach(messageContent => {
                // Temporarily set the font-size directly to force immediate update
                const originalFontSize = messageContent.style.fontSize;
                messageContent.style.fontSize = fontSize;

                // After a brief moment, remove the inline style to let CSS variable take over
                requestAnimationFrame(() => {
                    messageContent.style.fontSize = originalFontSize || '';
                });
            });
        }
        console.log('Refreshed companion message styles with font size:', fontSize);
    }

    /**
     * Load saved font size settings
     * @private
     */
    loadFontSizeSettings() {
        // Load agent chat font size
        const savedAgentSize = localStorage.getItem('agentChatFontSize') || '15';
        if (this.elements.appearanceAgentFontSize) {
            this.elements.appearanceAgentFontSize.value = savedAgentSize;
            this.updateAgentFontSize(savedAgentSize);
        } else {
            // Still apply the CSS variable even if the slider isn't in DOM yet
            document.documentElement.style.setProperty('--agent-chat-font-size', savedAgentSize + 'px');
        }

        // Load companion chat font size
        const savedCompanionSize = localStorage.getItem('companionChatFontSize') || '12';
        if (this.elements.appearanceCompanionFontSize) {
            this.elements.appearanceCompanionFontSize.value = savedCompanionSize;
            this.updateCompanionFontSize(savedCompanionSize);
        } else {
            document.documentElement.style.setProperty('--companion-chat-font-size', savedCompanionSize + 'px');
        }
    }

    /**
     * Get application state
     * @returns {Object} Application state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Check if application is initialized
     * @returns {boolean} Initialization status
     */
    isAppInitialized() {
        return this.isInitialized;
    }

    /**
     * Handle streaming health updates
     * @param {Object} healthData - Streaming health metrics
     * @private
     */
    handleStreamingHealth(healthData) {
        // Update internal metrics
        this.streamingHealth = {
            ...this.streamingHealth,
            ...healthData
        };

        // Log health metrics for debugging
        if (healthData.connectionQuality === 'poor') {
            console.warn('DirectLine streaming quality degraded:', healthData);
        }

        // Could update UI indicators here if needed
        // For now, just store for analytics
    }

    /**
     * Handle streaming completion events
     * @param {Object} completionData - Streaming completion metrics
     * @private
     */
    handleStreamingCompleted(completionData) {
        // Log streaming performance for analytics
        console.log('Streaming session completed:', {
            duration: completionData.totalDuration,
            chunks: completionData.chunksReceived,
            type: completionData.isRealtime ? 'realtime' : (completionData.isSimulated ? 'simulated' : 'unknown'),
            efficiency: completionData.averageChunkDelay
        });

        // Could send analytics data here
        // For now, just log for debugging
    }











    /**
     * Setup color theme selection
     * @private
     */
    setupColorThemeSelection() {
        console.log('Setting up color theme selection...');

        // Get all theme option elements
        const themeOptions = document.querySelectorAll('.theme-option');
        console.log('Found theme options:', themeOptions.length);

        themeOptions.forEach(option => {
            DOMUtils.addEventListener(option, 'click', () => {
                const themeName = option.getAttribute('data-theme');
                console.log('Theme option clicked:', themeName);
                this.selectColorTheme(themeName);
            });
        });

        // Update UI selection to reflect current theme (theme already loaded during app init)
        if (themeOptions.length > 0) {
            this.updateThemeUISelection();
        }

        console.log('Color theme selection setup complete');
    }

    /**
     * Select a color theme
     * @param {string} themeName - The name of the theme selected
     */
    selectColorTheme(themeName) {
        console.log('Selecting color theme:', themeName);

        // Update visual selection
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-theme') === themeName) {
                option.classList.add('selected');
            }
        });

        // Apply theme immediately
        this.applyColorTheme(themeName);

        // Save selection to localStorage
        localStorage.setItem('selectedColorTheme', themeName);

        // Store as current theme in application state
        this.state.currentTheme = themeName;

        console.log('Color theme selected and applied:', themeName);
    }

    /**
     * Apply color theme to the interface
     * @param {string} themeName - The name of the theme to apply
     */
    applyColorTheme(themeName) {
        const themeGradients = {
            'default': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'ocean': 'linear-gradient(135deg, #2E86AB 0%, #A23B72 100%)',
            'sunset': 'linear-gradient(135deg, #F18701 0%, #F35B04 100%)',
            'forest': 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)',
            'cosmic': 'linear-gradient(135deg, #434343 0%, #000000 100%)',
            'aurora': 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)',
            'minimal': 'linear-gradient(135deg, #f7f7f7 0%, #e0e0e0 100%)',
            'dark': 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)'
        };

        const gradient = themeGradients[themeName] || themeGradients['default'];

        // Update CSS custom property
        document.documentElement.style.setProperty('--theme-background', gradient);

        console.log('Applied theme:', themeName, 'with gradient:', gradient);
    }

    /**
     * Load saved color theme setting
     * @private
     */
    loadColorThemeSetting() {
        console.log('Loading color theme setting...');

        const savedTheme = localStorage.getItem('selectedColorTheme') || 'default';
        console.log('Saved color theme:', savedTheme);

        // Store current theme in application state
        this.state.currentTheme = savedTheme;

        // Update UI selection
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-theme') === savedTheme) {
                option.classList.add('selected');
            }
        });

        // Apply the theme immediately
        this.applyColorTheme(savedTheme);

        // Apply saved background image
        this.applyHomeBgImage();

        console.log('Color theme setting loaded and applied:', savedTheme);
    }

    /**
     * Apply home background image from localStorage
     */
    applyHomeBgImage() {
        const homePage = document.getElementById('homePage');
        if (!homePage) return;

        const imageData = localStorage.getItem('homeBgImage');
        let bgLayer = homePage.querySelector('.home-bg-image');

        if (imageData) {
            if (!bgLayer) {
                bgLayer = document.createElement('div');
                bgLayer.className = 'home-bg-image';
                homePage.prepend(bgLayer);
            }
            bgLayer.style.backgroundImage = `url(${imageData})`;
            homePage.classList.add('has-bg-image');
        } else {
            if (bgLayer) bgLayer.remove();
            homePage.classList.remove('has-bg-image');
        }
    }

    /**
     * Remove home background image
     */
    removeHomeBgImage() {
        localStorage.removeItem('homeBgImage');
        this.applyHomeBgImage();
        this._syncHomeBgPreview();
    }

    /**
     * Sync background image preview in Appearance panel
     */
    _syncHomeBgPreview() {
        const preview = document.getElementById('homeBgPreview');
        const removeBtn = document.getElementById('homeBgRemoveBtn');
        if (!preview) return;

        const imageData = localStorage.getItem('homeBgImage');
        if (imageData) {
            preview.innerHTML = '';
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = 'Background preview';
            preview.appendChild(img);
            if (removeBtn) removeBtn.style.display = '';
        } else {
            preview.innerHTML = '<span class="home-bg-placeholder">No image selected</span>';
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }

    /**
     * Update theme UI selection to reflect current theme (without reloading theme)
     * @private
     */
    updateThemeUISelection() {
        const currentTheme = this.getCurrentTheme();
        console.log('Updating theme UI selection for:', currentTheme);

        // Update visual selection in theme options
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-theme') === currentTheme) {
                option.classList.add('selected');
            }
        });

        console.log('Theme UI selection updated');
    }

    /**
     * Get the current active theme
     * @returns {string} The current theme name
     */
    getCurrentTheme() {
        return this.state.currentTheme || 'default';
    }

    /**
     * Check if a specific theme is currently active
     * @param {string} themeName - The theme name to check
     * @returns {boolean} True if the theme is currently active
     */
    isThemeActive(themeName) {
        return this.getCurrentTheme() === themeName;
    }

    /**
     * Toggle message icons visibility
     * @param {boolean} enabled - Whether to show message icons
     */
    toggleMessageIcons(enabled) {
        this.uiState.messageIconsEnabled = enabled;
        localStorage.setItem('messageIconsEnabled', enabled.toString());

        // Apply to all message icons immediately
        const allIcons = document.querySelectorAll('.messageIcon');
        allIcons.forEach(icon => {
            icon.style.display = enabled ? '' : 'none';
        });

        // Update checkbox state if settings panel is open
        const iconToggle = document.getElementById('messageIconToggle');
        if (iconToggle) {
            iconToggle.checked = enabled;
        }

        console.log('Message icons', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Toggle visibility of user messages
     * @param {boolean} enabled
     */
    toggleUserMessagesVisibility(enabled) {
        this.uiState.showUserMessages = enabled;
        localStorage.setItem('appearanceShowUserMessages', enabled.toString());

        document.body.classList.toggle('hide-user-messages', !enabled);

        if (this.elements.appearanceShowUserMessagesToggle) {
            this.elements.appearanceShowUserMessagesToggle.checked = enabled;
        }

        console.log('User messages', enabled ? 'shown' : 'hidden');
    }

    /**
     * Toggle visibility of metric information
     * @param {boolean} enabled
     */
    toggleMetricsVisibility(enabled) {
        this.uiState.showMetrics = enabled;
        localStorage.setItem('appearanceShowMetrics', enabled.toString());

        document.body.classList.toggle('hide-metrics', !enabled);

        if (this.elements.appearanceShowMetricsToggle) {
            this.elements.appearanceShowMetricsToggle.checked = enabled;
        }

        console.log('Metric information', enabled ? 'shown' : 'hidden');
    }

    /**
     * Toggle auto-hide metadata behavior
     * @param {boolean} enabled - true = metadata hidden by default, hover to show
     */
    toggleAutoHideMetadata(enabled) {
        this.uiState.autoHideMetadata = enabled;
        localStorage.setItem('appearanceAutoHideMetadata', enabled.toString());

        document.body.classList.toggle('auto-hide-metadata', enabled);

        if (this.elements.appearanceAutoHideMetadataToggle) {
            this.elements.appearanceAutoHideMetadataToggle.checked = enabled;
        }

        console.log('Auto hide metadata', enabled ? 'on' : 'off');
    }

    /**
     * Toggle auto-hide sidebar
     * @param {boolean} enabled
     */
    toggleAutoHideSidebar(enabled) {
        this.uiState.autoHideSidebar = enabled;
        localStorage.setItem('appearanceAutoHideSidebar', enabled.toString());

        document.body.classList.toggle('auto-hide-sidebar', enabled);

        if (this.elements.appearanceAutoHideSidebarToggle) {
            this.elements.appearanceAutoHideSidebarToggle.checked = enabled;
        }
    }

    /**
     * Toggle left panel collapsed state
     * @param {boolean} collapsed - Whether to collapse the panel
     */
    toggleLeftPanel(collapsed) {
        this.uiState.leftPanelCollapsed = collapsed;
        localStorage.setItem('leftPanelCollapsed', collapsed.toString());

        const body = document.body;

        if (body) {
            if (collapsed) {
                DOMUtils.addClass(body, 'leftPanelCollapsed');
            } else {
                DOMUtils.removeClass(body, 'leftPanelCollapsed');
            }
        }

        // Update side command bar state
        this.updateSideCommandBarState();

        console.log('Left panel', collapsed ? 'collapsed' : 'expanded');
    }

    /**
     * Update side command bar button states
     * @private
     */
    updateSideCommandBarState() {
        const conversationsBtn = this.elements.conversationsButton;
        if (conversationsBtn) {
            if (this.uiState.leftPanelCollapsed) {
                DOMUtils.removeClass(conversationsBtn, 'active');
            } else {
                DOMUtils.addClass(conversationsBtn, 'active');
            }
        }
    }

    /**
     * Load and apply UI state from localStorage
     */
    loadUIState() {
        // Apply left panel state
        this.toggleLeftPanel(this.uiState.leftPanelCollapsed);

        // Apply message icons state
        this.toggleMessageIcons(this.uiState.messageIconsEnabled);
        this.toggleUserMessagesVisibility(this.uiState.showUserMessages);
        this.toggleMetricsVisibility(this.uiState.showMetrics);
        this.toggleAutoHideMetadata(this.uiState.autoHideMetadata);

        // Apply auto-hide sidebar state
        this.toggleAutoHideSidebar(this.uiState.autoHideSidebar);

        // Apply full-width messages state from localStorage
        const fullWidthEnabled = localStorage.getItem('fullWidthMessages') === 'true';
        this.toggleFullWidthMessages(fullWidthEnabled);

        // Load and apply color theme early (before settings modal is opened)
        this.loadColorThemeSetting();

        // Apply i18n translations and sync language selector
        i18n.applyToDOM();
        if (this.elements.languageSelect) {
            this.elements.languageSelect.value = i18n.language;
        }

        // Apply saved home title & subtitle
        const savedTitle = localStorage.getItem('homeTitle');
        const savedSubtitle = localStorage.getItem('homeSubtitle');
        if (savedTitle) {
            const titleEl = document.querySelector('.home-title');
            if (titleEl) titleEl.textContent = savedTitle;
        }
        if (savedSubtitle) {
            const subtitleEl = document.querySelector('.home-subtitle');
            if (subtitleEl) subtitleEl.textContent = savedSubtitle;
        }

        // Initialize side command bar state
        this.updateSideCommandBarState();

        // Apply companion model visibility
        const showCompanion = localStorage.getItem('showCompanionModel') !== 'false';
        const companionPanel = document.getElementById('companionStatusPanel');
        if (companionPanel) companionPanel.style.display = showCompanion ? '' : 'none';

        // Restore Appearance panel checkbox states
        if (this.elements.enableStreamingCheckbox) {
            this.elements.enableStreamingCheckbox.checked = localStorage.getItem('enableStreaming') === 'true';
        }
        if (this.elements.enableSideBrowserCheckbox) {
            const sideBrowserSetting = localStorage.getItem('enableSideBrowser');
            this.elements.enableSideBrowserCheckbox.checked = sideBrowserSetting === null ? true : sideBrowserSetting === 'true';
            if (sideBrowserSetting === null) localStorage.setItem('enableSideBrowser', 'true');
        }
        if (this.elements.autoOpenCitationsCheckbox) {
            this.elements.autoOpenCitationsCheckbox.checked = localStorage.getItem('autoOpenCitations') === 'true';
        }
        if (this.elements.openAttachmentsSideBrowserCheckbox) {
            this.elements.openAttachmentsSideBrowserCheckbox.checked = localStorage.getItem('openAttachmentsSideBrowser') === 'true';
        }
        if (this.elements.fullWidthMessagesCheckbox) {
            this.elements.fullWidthMessagesCheckbox.checked = fullWidthEnabled;
        }
        if (this.elements.appearanceMessageIconToggle) {
            this.elements.appearanceMessageIconToggle.checked = this.uiState.messageIconsEnabled;
        }
        if (this.elements.appearanceShowUserMessagesToggle) {
            this.elements.appearanceShowUserMessagesToggle.checked = this.uiState.showUserMessages;
        }
        if (this.elements.appearanceShowMetricsToggle) {
            this.elements.appearanceShowMetricsToggle.checked = this.uiState.showMetrics;
        }
        if (this.elements.appearanceAutoHideMetadataToggle) {
            this.elements.appearanceAutoHideMetadataToggle.checked = this.uiState.autoHideMetadata;
        }
        if (this.elements.appearanceAutoHideSidebarToggle) {
            this.elements.appearanceAutoHideSidebarToggle.checked = this.uiState.autoHideSidebar;
        }
    }

    /**
     * Get the unified message API for external use
     * @returns {Object|null} The unified message API or null if not initialized
     */
    getUnifiedMessageAPI() {
        return this.unifiedMessageAPI || null;
    }

    /**
     * Get the message integration system
     * @returns {MessageIntegration|null} The message integration system or null if not initialized
     */
    getMessageIntegration() {
        return this.messageIntegration || null;
    }

    /**
     * Switch between unified and legacy message systems
     * @param {boolean} useUnified - Whether to use the unified system
     */
    setUnifiedMessageMode(useUnified) {
        if (this.messageIntegration) {
            this.messageIntegration.setMigrationMode(!useUnified);
            this.loggingManager.info('system', `Switched to ${useUnified ? 'unified' : 'legacy'} message system`);
        }
    }

    /**
     * Enable or disable professional message mode
     * @param {boolean} enabled - Whether to enable professional mode
     */
    setProfessionalMessageMode(enabled) {
        if (this.messageIntegration) {
            this.messageIntegration.setProfessionalMode(enabled);
            this.state.professionalMode = enabled;
            this.loggingManager.info('system', `Professional message mode ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Cleanup method to stop all running processes and prevent memory leaks
     */
    cleanup() {
        console.log('[Application] Performing cleanup...');
        
        // Stop AI Companion thinking simulation
        if (window.aiCompanion && typeof window.aiCompanion.emergencyStopThinking === 'function') {
            window.aiCompanion.emergencyStopThinking();
        }
        
        // Stop logging auto-save
        if (this.loggingManager && this.loggingManager.autoSaveInterval) {
            clearInterval(this.loggingManager.autoSaveInterval);
            this.loggingManager.autoSaveInterval = null;
            console.log('[Application] Stopped logging auto-save interval');
        }
        
        // Stop DirectLine connection
        directLineService.disconnect();
        
        console.log('[Application] Cleanup completed');
    }
}

// Create and export singleton instance
export const app = new Application();

// Export directLineService for other modules
export { directLineService };

// Global emergency functions for debugging and performance issues
window.emergencyStopThinking = function() {
    console.log('[Global] Emergency stop thinking triggered from console');
    if (window.aiCompanion && typeof window.aiCompanion.emergencyStopThinking === 'function') {
        window.aiCompanion.emergencyStopThinking();
    } else {
        console.log('[Global] AI Companion not available or emergency stop method not found');
    }
};

window.performanceCleanup = function() {
    console.log('[Global] Performance cleanup triggered from console');
    if (app && typeof app.cleanup === 'function') {
        app.cleanup();
    } else {
        console.log('[Global] Application cleanup method not available');
    }
};

console.log('[Application] Global emergency functions available: emergencyStopThinking(), performanceCleanup()');
