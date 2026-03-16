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
import { messageRenderer } from '../ui/messageRenderer.js';
import { aiCompanion } from '../ai/aiCompanion.js';
import { getKnowledgeHub } from '../services/knowledgeHub.js';
import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';
import { SecureStorage } from '../utils/secureStorage.js';
import { EnhancedTypingIndicator } from '../ui/enhancedTypingIndicator.js';
import { mobileUtils } from '../utils/mobileUtils.js';
import { statusIndicator } from '../utils/statusIndicator.js';
// REMOVED: import { getSVGDataUri } from '../components/svg-icon-manager/index.js';
// Now using global Icon manager: window.Icon.create() for DOM elements
// Using simpler logging manager to fix the issue
import LoggingManager from '../services/simpleLoggingManager.js';
// import LoggingUIManager from '../ui/loggingUIManager.js';
// Temporarily comment out speech engine import to isolate the issue
// import { speechEngine, setLoggingManager as setSpeechLoggingManager } from '../services/speechEngine.js';

// UNIFIED MESSAGE SYSTEM: Import the new unified message system
import { MessageIntegration } from '../ui/messageIntegration.js';

// Import adaptive card modal for global use
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';

const APPLICATION_VERSION = '2.0.0';
console.log(`⚙️ [Application] Version ${APPLICATION_VERSION} loaded`);

export class Application {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.selectedFile = null;
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
        // Temporarily comment out speech engine logging setup
        // setSpeechLoggingManager(this.loggingManager);

        // Track UI state
        this.uiState = {
            leftPanelCollapsed: localStorage.getItem('leftPanelCollapsed') === 'true',
            messageIconsEnabled: localStorage.getItem('messageIconsEnabled') !== 'false' // Default to true
        };

        // DirectLineService is a singleton — global reference for debugging only
        window.directLineService = directLineService;
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

            // Modal elements
            setupModal: DOMUtils.getElementById('setupModal'),
            closeSetupModal: DOMUtils.getElementById('closeSetupModal'),
            imageModal: DOMUtils.getElementById('imageModal'),

            // Panel elements
            citationPreviewPanel: DOMUtils.getElementById('citationPreviewPanel'),
            closeCitationBtn: DOMUtils.getElementById('closeCitationBtn'),
            expandCitationPreviewBtn: DOMUtils.getElementById('expandCitationPreviewBtn'),

            // Chat elements
            chatWindow: DOMUtils.getElementById('chatWindow'),

            // Status elements
            agentStatus: DOMUtils.getElementById('agentStatus'),
            agentName: DOMUtils.getElementById('agentName'),

            // Setup modal form elements
            enableStreamingCheckbox: DOMUtils.getElementById('enableStreamingCheckbox'),
            enableSideBrowserCheckbox: DOMUtils.getElementById('enableSideBrowserCheckbox'),
            fullWidthMessagesCheckbox: DOMUtils.getElementById('fullWidthMessagesCheckbox'),
            enableLLMCheckbox: DOMUtils.getElementById('enableLLMCheckbox'),
            useAIThinkingCheckbox: DOMUtils.getElementById('useAIThinkingCheckbox'),
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

            // Side browser elements
            sideBrowser: DOMUtils.getElementById('sideBrowser'),

            // New UI elements for UX improvements
            leftPanel: DOMUtils.getElementById('leftPanel'),

            // Appearance side panel
            appearanceButton: DOMUtils.getElementById('appearanceButton'),
            appearanceSidePanel: DOMUtils.getElementById('appearanceSidePanel'),
            closeAppearancePanel: DOMUtils.getElementById('closeAppearancePanel'),
            appearanceMessageIconToggle: DOMUtils.getElementById('appearanceMessageIconToggle'),
            appearanceAgentFontSize: DOMUtils.getElementById('appearanceAgentFontSize'),
            appearanceAgentFontSizeValue: DOMUtils.getElementById('appearanceAgentFontSizeValue'),
            appearanceCompanionFontSize: DOMUtils.getElementById('appearanceCompanionFontSize'),
            appearanceCompanionFontSizeValue: DOMUtils.getElementById('appearanceCompanionFontSizeValue'),
            appearanceThemeGallery: DOMUtils.getElementById('appearanceThemeGallery'),
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

        // Set up DirectLine event listeners via on/off
        directLineService.on('statusChange', (status) => this.handleConnectionStatus(status));
        directLineService.on('message', (entry) => this.handleCompleteMessage(entry));
        directLineService.on('messageChunk', (entry) => this.handleStreamingChunk(entry));
        directLineService.on('typing', () => {
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
        directLineService.on('greeting', () => {
            document.dispatchEvent(new CustomEvent('agent:greeting:received'));
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: true } }));
        });
        directLineService.on('greetingTimeout', () => {
            document.dispatchEvent(new CustomEvent('agent:greeting:timeout'));
            const hasAgent = agentManager.getCurrentAgent() !== null;
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent } }));
        });
        directLineService.on('connected', () => {
            document.dispatchEvent(new CustomEvent('agent:greeting:sending'));
            // Release splash screen immediately on connection — don't wait for greeting to finish
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: true } }));
            this.hideProgressIndicator();
        });
        directLineService.on('disconnected', () => {
            // If connection drops before greeting, release splash screen
            if (!this.isInitialized) return;
            this.state.isConnected = false;
        });
        directLineService.on('error', (error) => {
            this.handleConnectionError(error);
            // Release splash screen if stuck
            document.dispatchEvent(new CustomEvent('app:init:complete', { detail: { hasAgent: false } }));
        });
        directLineService.on('conversationUpdate', (activity) => {
            this.handleConversationUpdate(activity);
        });
        directLineService.on('event', (activity) => {
            this.handleEventActivity(activity);
        });

        // Initialize logging UI manager - temporarily disabled
        // this.loggingUIManager = new LoggingUIManager(this.loggingManager);

        console.log('Managers and services initialized');
        // Re-enable basic logging
        this.loggingManager.info('system', 'Application managers initialized successfully');
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
    renderHomeAgentCards() {
        const grid = document.getElementById('homeAgentGrid');
        if (!grid) return;

        const agents = agentManager.getAllAgents();
        const agentIds = Object.keys(agents);

        grid.innerHTML = '';

        // Render each agent card
        agentIds.forEach(agentId => {
            const agent = agents[agentId];
            const stats = this._computeAgentStats(agentId);
            const hasParams = agentManager.agentHasInitParams(agentId);

            const card = document.createElement('div');
            card.className = 'home-agent-card';
            card.innerHTML = `
                <h3 class="home-agent-card-name">${Utils.escapeHtml(agent.name)}</h3>
                <div class="home-agent-card-status">
                    <span class="status-dot"></span>
                    Ready
                    ${hasParams ? `<span class="home-agent-params-badge">${agent.initParams.length} params</span>` : ''}
                </div>
                <div class="home-agent-card-stats">
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.sessionCount}</span>
                        <span class="home-agent-stat-label">Conversations</span>
                    </div>
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.totalDuration}</span>
                        <span class="home-agent-stat-label">Total Time</span>
                    </div>
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.messageCount}</span>
                        <span class="home-agent-stat-label">Messages</span>
                    </div>
                    <div class="home-agent-stat">
                        <span class="home-agent-stat-value">${stats.lastInteraction}</span>
                        <span class="home-agent-stat-label">Last Active</span>
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
            <div class="home-add-label">Add New Agent</div>
        `;
        addCard.addEventListener('click', () => this.showAddAgentOverlay());
        grid.appendChild(addCard);
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
                    <h3>Delete Agent</h3>
                    <p class="init-params-desc">This action cannot be undone. To confirm, type the agent name below:</p>
                    <p class="delete-agent-name-display"></p>
                    <div class="form-group">
                        <input type="text" id="deleteAgentConfirmInput" placeholder="Type agent name to confirm" />
                    </div>
                    <div class="init-params-actions">
                        <button type="button" id="deleteAgentCancelBtn" class="btn btn-secondary">Cancel</button>
                        <button type="button" id="deleteAgentConfirmBtn" class="btn btn-danger" disabled>Delete</button>
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
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return new Date(ts).toLocaleDateString();
    }

    /**
     * Handle click on a Home page agent card
     */
    onHomeAgentCardClick(agentId) {
        const agent = agentManager.agents[agentId];
        if (!agent) return;

        const hasParams = agentManager.agentHasInitParams(agentId);
        this.showAgentSplashOverlay(agentId, hasParams);
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
        titleEl.textContent = "Let's Begin";

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
            paramsSection.innerHTML = '<p class="params-description">Ready to connect to <strong>' + Utils.escapeHtml(agent.name) + '</strong>.</p>';
            startBtn.textContent = 'Connect';
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
                directLineService.setInitContext(context);
            }

            // Show progress in-place
            actionsSection.style.display = 'none';
            paramsSection.style.display = 'none';
            progressSection.style.display = 'block';
            cancelProgressSection.style.display = 'flex';
            const statusEl = document.getElementById('agentSplashStatus');
            statusEl.textContent = 'Connecting to ' + agent.name + '...';

            try {
                await agentManager.setCurrentAgent(agentId);

                // Clear chat window for fresh session (but keep Home visible behind overlay)
                messageRenderer.clearMessages();
                messageRenderer.setTargetWindow('chatWindow');

                const success = await directLineService.connect(agent.secret);
                if (connectionAborted) return;

                if (success) {
                    statusEl.textContent = 'Connected! Waiting for agent response...';
                    this.state.isConnected = true;
                    this.state.currentAgent = agent;
                    this.initializeSession();
                    this.updateAgentStatus('connected', agent.name);

                    // Keep overlay AND home visible — fade both out on first bot message
                    const fadeOutOnFirstMessage = (entry) => {
                        if (connectionAborted) return;
                        directLineService.off('message', fadeOutOnFirstMessage);

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
                    directLineService.on('message', fadeOutOnFirstMessage);

                    // Safety timeout: close overlay after 15s even if no message
                    setTimeout(() => {
                        if (overlay.style.display !== 'none') {
                            directLineService.off('message', fadeOutOnFirstMessage);
                            overlay.style.display = 'none';
                            this.hideHomePage();
                        }
                    }, 15000);
                } else {
                    statusEl.textContent = 'Connection failed. Please try again.';
                    newCancelProgressBtn.textContent = 'Back';
                    this.showHomePage();
                }
            } catch (error) {
                if (connectionAborted) return;
                statusEl.textContent = 'Error: ' + error.message;
                newCancelProgressBtn.textContent = 'Back';
                this.showHomePage();
            }
        });
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
        const paramsList = document.getElementById('agentEditParamsList');
        const addParamBtn = document.getElementById('agentEditAddParamBtn');
        const saveBtn = document.getElementById('agentEditSaveBtn');
        const cancelBtn = document.getElementById('agentEditCancelBtn');
        if (!overlay) return;

        const isEdit = agentId !== null;
        const agent = isEdit ? agentManager.agents[agentId] : null;

        titleEl.textContent = isEdit ? 'Edit Agent' : 'Add New Agent';
        nameInput.value = isEdit ? agent.name : '';
        secretInput.value = isEdit ? agent.secret : '';

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
            const secret = secretInput.value.trim();
            if (!name || !secret) return;

            // Collect params
            const rows = paramsList.querySelectorAll('.param-row');
            const initParams = [];
            rows.forEach(row => {
                const key = row.querySelector('.param-key-input')?.value.trim();
                const display = row.querySelector('.param-display-input')?.value.trim();
                if (key) initParams.push({ name: key, displayName: display || key });
            });

            const savedId = await agentManager.addOrUpdateAgent(agentId, name, secret);
            // Save params separately
            agentManager.agents[savedId].initParams = initParams;
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

        // AI Companion toggle
        DOMUtils.addEventListener(this.elements.aiCompanionToggleBtn, 'click', () => {
            console.log('AI Companion toggle button clicked');
            this.toggleAICompanionMode();
        });

        // Quick action buttons
        const quickActionButtons = document.querySelectorAll('.quick-action-btn');
        quickActionButtons.forEach(btn => {
            DOMUtils.addEventListener(btn, 'click', async (e) => {
                const action = e.target.dataset.action;
                console.log('Quick action clicked:', action);

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
                directLineService.disconnect();
                this.state.isConnected = false;
                this.showHomePage();
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

        // Close right panel
        DOMUtils.addEventListener(this.elements.closeCitationBtn, 'click', () => {
            this.closeCitationPreview();
        });

        // Expand citation preview panel
        if (this.elements.expandCitationPreviewBtn) {
            DOMUtils.addEventListener(this.elements.expandCitationPreviewBtn, 'click', () => {
                this.toggleExpandCitationPreview();
            });
        }

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
            this.removeSelectedFile();
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
        if (this.elements.agentFontSize) {
            DOMUtils.addEventListener(this.elements.agentFontSize, 'input', (e) => {
                this.updateAgentFontSize(e.target.value);
            });
        }

        if (this.elements.companionFontSize) {
            DOMUtils.addEventListener(this.elements.companionFontSize, 'input', (e) => {
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

        // UI events
        window.addEventListener('suggestedActionClicked', (e) => {
            this.handleSuggestedAction(e.detail);
        });
    }

    /**
     * Send message (enhanced with legacy's suggested actions clearing)
     */
    async sendMessage() {
        const messageText = this.elements.userInput.value.trim();
        if (!messageText && !this.selectedFile) return;

        // Temporarily comment out logging call
        // this.loggingManager.info('ui', 'User sending message', {
        //     messageLength: messageText.length,
        //     hasFile: !!this.selectedFile,
        //     fileName: this.selectedFile?.name,
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
                attachments: this.selectedFile ? [this.selectedFile] : [],
                timestamp: userMessageTimestamp
            });

            // Render user message with explicit timestamp
            this.renderUserMessage(messageText, userMessageTimestamp);

            // Send to DirectLine immediately - don't wait for thinking simulation
            let messagePromise;

            // Check if AI Companion mode is active and route message accordingly
            if (this.state.aiCompanionMode && window.aiCompanion && window.aiCompanion.isEnabled) {
                console.log('AI Companion mode active - routing message to LLM');

                // Send to AI Companion instead of DirectLine
                messagePromise = this.sendMessageToAICompanion(messageText);
            } else {
                // Normal flow - send to DirectLine
                if (this.selectedFile) {
                    messagePromise = this.sendMessageWithFile(messageText, this.selectedFile);
                    this.removeSelectedFile();
                } else {
                    messagePromise = directLineService.sendMessage(messageText);
                }
            }

            // Start intelligent thinking simulation after DirectLine send
            this.startIntelligentThinkingSimulation(messageText, messagePromise);

            // Show progress indicator with detected context (only if AI companion is not enabled for thinking simulation)
            const useAIThinking = window.aiCompanion?.isEnabled === true && localStorage.getItem('useAIThinking') !== 'false';
            if (!useAIThinking) {
                this.showProgressIndicator({ source: 'user-message' });
                // Initial status: message sent, waiting for bot
                this.enhancedTypingIndicator.setStatus('Waiting for agent...');
            } else {
                // Set evaluation flag to prevent typing indicators during the 2-second evaluation period
                this.isEvaluatingThinkingSimulation = true;
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
    renderUserMessage(text, timestamp) {
        const activity = {
            from: { id: 'user' },
            text: text,
            timestamp: timestamp || new Date().toISOString()
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

            // Show/hide toggle button based on AI companion enabled status
            this.elements.aiCompanionToggleBtn.style.display = isEnabled ? 'inline-flex' : 'none';

            // If AI companion is disabled, also hide the quick actions and reset the mode
            if (!isEnabled) {
                this.state.aiCompanionMode = false;
                this.elements.aiCompanionToggleBtn.classList.remove('active');
                this.elements.llmQuickActionsContainer.classList.remove('expanded');
            }

            console.log('AI Companion toggle visibility updated:', isEnabled ? 'visible' : 'hidden');
        } else {
            console.log('Missing elements for AI Companion toggle visibility update');
        }
    }

    /**
     * Handle a native streaming chunk from DirectLineService.
     * Renders incremental text updates in real-time.
     * @param {Object} entry - MessageEntry with partial text
     * @private
     */
    handleStreamingChunk(entry) {
        this.hideProgressIndicator();
        this._lastMessageTime = Date.now();

        // Use messageRenderer to update the streaming message in place
        const messageId = entry.id || `stream-${entry.timestamp}`;

        if (!this._streamingElements) {
            this._streamingElements = new Map();
        }

        if (!this._streamingElements.has(messageId)) {
            // First chunk — create the message container
            const chatWindow = this.elements.chatWindow;
            if (!chatWindow) return;

            const messageContainer = document.createElement('div');
            messageContainer.className = 'messageContainer botMessage';
            messageContainer.id = `msg-${messageId}`;

            const messageWrapper = document.createElement('div');
            messageWrapper.className = 'message-wrapper';

            const messageDiv = document.createElement('div');
            messageDiv.className = 'messageContent';

            messageWrapper.appendChild(messageDiv);
            messageContainer.appendChild(messageWrapper);
            chatWindow.appendChild(messageContainer);

            this._streamingElements.set(messageId, { container: messageContainer, contentDiv: messageDiv });
        }

        // Update content
        const el = this._streamingElements.get(messageId);
        if (el && el.contentDiv) {
            el.contentDiv.textContent = entry.text;
            this.elements.chatWindow.scrollTop = this.elements.chatWindow.scrollHeight;
        }

        // If entry is complete, clean up tracking
        if (entry.isComplete) {
            this._streamingElements.delete(messageId);
        }
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

        if (streamingEnabled) {
            console.log('Starting local streaming simulation');
            messageRenderer.simulateStreaming(activity);
        } else {
            console.log('Rendering complete message without streaming');
            messageRenderer.renderCompleteMessage(activity);
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

        // Add to session if it has content
        if (activity.text ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {

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

        messageRenderer.renderCompleteMessage(activity);
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

        // Add to session if it has content
        if (activity.text ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {

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
        const useAIThinking = window.aiCompanion?.isEnabled === true && localStorage.getItem('useAIThinking') !== 'false';
        if (useAIThinking) {
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
        } else {
            console.log('No typing indicator found to remove');
        }
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
        if (this.elements.apiKeySection) {
            if (enabled) {
                console.log('Showing AI companion section');
                DOMUtils.show(this.elements.apiKeySection);
                const currentProvider = this.elements.apiProviderSelect?.value || 'openai';
                console.log('Current provider:', currentProvider);
                this.handleAPIProviderChange(currentProvider);
            } else {
                console.log('Hiding AI companion section');
                DOMUtils.hide(this.elements.apiKeySection);
            }
        } else {
            console.error('apiKeySection element not found!');
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
     * Open URL in citation preview panel
     * @param {string} url - URL to open for citation preview
     */
    openCitationPreview(url) {
        console.log('[CitationPreview] Attempting to open URL:', url);
        
        const citationFrame = DOMUtils.getElementById('citationFrame');
        console.log('[CitationPreview] citationFrame found:', !!citationFrame);
        console.log('[CitationPreview] citationPreviewPanel found:', !!this.elements.citationPreviewPanel);
        
        if (citationFrame && this.elements.citationPreviewPanel) {
            try {
                console.log('[CitationPreview] Setting iframe src and showing panel');
                citationFrame.src = url;
                DOMUtils.show(this.elements.citationPreviewPanel);

                // Initialize expand button if available
                if (this.elements.expandCitationPreviewBtn) {
                    // Check if user had a saved preference
                    const wasExpanded = localStorage.getItem('citationPreviewExpanded') === 'true';
                    
                    if (wasExpanded) {
                        // Apply expanded state
                        DOMUtils.addClass(this.elements.citationPreviewPanel, 'expanded');
                        const agentChatPanel = DOMUtils.getElementById('agentChatPanel');
                        if (agentChatPanel) {
                            DOMUtils.addClass(agentChatPanel, 'citation-expanded');
                        }
                        this.elements.expandCitationPreviewBtn.title = 'Restore default panel width';
                        if (window.updateButtonIcon) {
                            window.updateButtonIcon(this.elements.expandCitationPreviewBtn, 'arrowLeft');
                        }
                    } else {
                        // Default state
                        this.elements.expandCitationPreviewBtn.title = 'Expand panel to 50/50 layout';
                        if (window.updateButtonIcon) {
                            window.updateButtonIcon(this.elements.expandCitationPreviewBtn, 'arrowRight');
                        }
                    }
                }

                // Monitor for loading errors and CSP issues
                const handleLoadError = () => {
                    console.warn('[CitationPreview] Failed to load URL in citation preview (likely CSP restricted):', url);
                    // Fallback to external browser
                    window.open(url, '_blank', 'noopener,noreferrer');
                    this.closeCitationPreview();
                };

                // Set up error handler
                citationFrame.onerror = handleLoadError;
                
                // Handle successful load
                citationFrame.onload = () => {
                    console.log('[CitationPreview] Content loaded successfully in iframe');
                    // Clear any pending timeout since content loaded successfully
                    if (citationFrame._loadTimeout) {
                        clearTimeout(citationFrame._loadTimeout);
                        citationFrame._loadTimeout = null;
                    }
                };

                // Set a longer timeout for truly problematic URLs
                citationFrame._loadTimeout = setTimeout(() => {
                    // Only fallback if the iframe is still trying to load the same URL
                    // and no load event has been triggered
                    if (citationFrame.src === url && citationFrame._loadTimeout) {
                        console.warn('[CitationPreview] Load timeout: URL appears to be blocked or very slow to load');
                        handleLoadError();
                    }
                }, 15000); // Increased to 15 seconds to allow for slow loading content

            } catch (error) {
                console.error('[CitationPreview] Error loading URL in citation preview:', error);
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } else {
            console.error('[CitationPreview] Required elements not found - citationFrame:', !!citationFrame, 'citationPreviewPanel:', !!this.elements.citationPreviewPanel);
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    /**
     * Close citation preview panel
     */
    closeCitationPreview() {
        if (this.elements.citationPreviewPanel) {
            DOMUtils.hide(this.elements.citationPreviewPanel);
            const citationFrame = DOMUtils.getElementById('citationFrame');
            if (citationFrame) {
                citationFrame.src = '';
            }
            
            // Reset to default layout when closing
            this.resetCitationPreviewLayout();
        }
    }

    /**
     * Toggle citation preview panel between default and expanded (50/50) layout
     */
    toggleExpandCitationPreview() {
        if (!this.elements.citationPreviewPanel) return;

        const isExpanded = this.elements.citationPreviewPanel.classList.contains('expanded');
        const agentChatPanel = DOMUtils.getElementById('agentChatPanel');

        if (isExpanded) {
            // Collapse to default width
            DOMUtils.removeClass(this.elements.citationPreviewPanel, 'expanded');
            if (agentChatPanel) {
                DOMUtils.removeClass(agentChatPanel, 'citation-expanded');
            }

            // Update button title and icon
            if (this.elements.expandCitationPreviewBtn) {
                this.elements.expandCitationPreviewBtn.title = 'Expand panel to 50/50 layout';
                this.elements.expandCitationPreviewBtn.setAttribute('aria-label', 'Expand Citation Preview Panel');
                
                // Update icon to collapsed state (arrow pointing right to expand)
                if (window.updateButtonIcon) {
                    window.updateButtonIcon(this.elements.expandCitationPreviewBtn, 'arrowRight');
                }
            }

            console.log('[CitationPreview] Restored default layout');
        } else {
            // Expand to 50/50 layout
            DOMUtils.addClass(this.elements.citationPreviewPanel, 'expanded');
            if (agentChatPanel) {
                DOMUtils.addClass(agentChatPanel, 'citation-expanded');
            }

            // Update button title and icon
            if (this.elements.expandCitationPreviewBtn) {
                this.elements.expandCitationPreviewBtn.title = 'Restore default panel width';
                this.elements.expandCitationPreviewBtn.setAttribute('aria-label', 'Restore Default Citation Preview Width');
                
                // Update icon to expanded state (arrow pointing left to collapse)
                if (window.updateButtonIcon) {
                    window.updateButtonIcon(this.elements.expandCitationPreviewBtn, 'arrowLeft');
                }
            }

            console.log('[CitationPreview] Expanded to 50/50 layout');
        }

        // Store user preference
        localStorage.setItem('citationPreviewExpanded', (!isExpanded).toString());
    }

    /**
     * Reset citation preview panel layout to default
     * @private
     */
    resetCitationPreviewLayout() {
        if (this.elements.citationPreviewPanel) {
            DOMUtils.removeClass(this.elements.citationPreviewPanel, 'expanded');
        }
        
        const agentChatPanel = DOMUtils.getElementById('agentChatPanel');
        if (agentChatPanel) {
            DOMUtils.removeClass(agentChatPanel, 'citation-expanded');
        }

        // Reset button state
        if (this.elements.expandCitationPreviewBtn) {
            this.elements.expandCitationPreviewBtn.title = 'Expand panel to 50/50 layout';
            this.elements.expandCitationPreviewBtn.setAttribute('aria-label', 'Expand Citation Preview Panel');
            
            if (window.updateButtonIcon) {
                window.updateButtonIcon(this.elements.expandCitationPreviewBtn, 'arrowRight');
            }
        }
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

    // File handling methods (simplified - implement as needed)
    handleFileSelection(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('File selected:', file.name, file.size);
            this.selectedFile = file;
            this.showFilePreview(file);
        }
    }

    removeSelectedFile() {
        console.log('File removed');
        this.selectedFile = null;
        this.hideFilePreview();
    }

    showFilePreview(file) {
        // Implement file preview UI
        console.log('Showing file preview for:', file.name);
    }

    hideFilePreview() {
        // Hide file preview UI
        console.log('Hiding file preview');
    }

    handleDragOver(event) { event.preventDefault(); }
    handleDragLeave(event) { /* Handle drag leave */ }
    handleFileDrop(event) { event.preventDefault(); console.log('File dropped'); }

    sendMessageWithFile(text, file) {
        console.log('Sending message with file:', text, file.name);
        return directLineService.sendMessage(text, [file]);
    }

    /**
     * Update agent chat font size
     * @param {string} size - Font size in pixels
     */
    updateAgentFontSize(size) {
        const fontSize = `${size}px`;
        document.documentElement.style.setProperty('--agent-chat-font-size', fontSize);

        // Update the display value
        if (this.elements.agentFontSizeValue) {
            this.elements.agentFontSizeValue.textContent = fontSize;
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
        if (this.elements.companionFontSizeValue) {
            this.elements.companionFontSizeValue.textContent = fontSize;
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
        console.log('Loading font size settings...');

        // Load agent chat font size
        const savedAgentSize = localStorage.getItem('agentChatFontSize') || '15';
        console.log('Saved agent font size:', savedAgentSize);
        console.log('Agent font size element:', this.elements.agentFontSize);

        if (this.elements.agentFontSize) {
            this.elements.agentFontSize.value = savedAgentSize;
            this.updateAgentFontSize(savedAgentSize);
        } else {
            console.warn('Agent font size element not found');
        }

        // Load companion chat font size
        const savedCompanionSize = localStorage.getItem('companionChatFontSize') || '12';
        console.log('Saved companion font size:', savedCompanionSize);
        console.log('Companion font size element:', this.elements.companionFontSize);

        if (this.elements.companionFontSize) {
            this.elements.companionFontSize.value = savedCompanionSize;
            this.updateCompanionFontSize(savedCompanionSize);
        } else {
            console.warn('Companion font size element not found');
        }

        console.log('Font size settings loaded');
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

        console.log('Color theme setting loaded and applied:', savedTheme);
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

        // Apply full-width messages state from localStorage
        const fullWidthEnabled = localStorage.getItem('fullWidthMessages') === 'true';
        this.toggleFullWidthMessages(fullWidthEnabled);

        // Load and apply color theme early (before settings modal is opened)
        this.loadColorThemeSetting();

        // Initialize side command bar state
        this.updateSideCommandBarState();

        // Restore Appearance panel checkbox states
        if (this.elements.enableStreamingCheckbox) {
            this.elements.enableStreamingCheckbox.checked = localStorage.getItem('enableStreaming') === 'true';
        }
        if (this.elements.enableSideBrowserCheckbox) {
            const sideBrowserSetting = localStorage.getItem('enableSideBrowser');
            this.elements.enableSideBrowserCheckbox.checked = sideBrowserSetting === null ? true : sideBrowserSetting === 'true';
            if (sideBrowserSetting === null) localStorage.setItem('enableSideBrowser', 'true');
        }
        if (this.elements.fullWidthMessagesCheckbox) {
            this.elements.fullWidthMessagesCheckbox.checked = fullWidthEnabled;
        }
        if (this.elements.appearanceMessageIconToggle) {
            this.elements.appearanceMessageIconToggle.checked = this.uiState.messageIconsEnabled;
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
