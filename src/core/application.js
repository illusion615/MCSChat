/**
 * Main Application Controller
 * Orchestrates all modules and handles application lifecycle
 */

import { agentManager } from '../managers/agentManager.js';
import { sessionManager } from '../managers/sessionManager.js';
import { directLineManager } from '../services/directLineManager.js';
import { messageRenderer } from '../ui/messageRenderer.js';
import { aiCompanion } from '../ai/aiCompanion.js';
import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';
import { SecureStorage } from '../utils/secureStorage.js';

export class Application {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.selectedFile = null;
        this.state = {
            isConnected: false,
            currentSession: null,
            currentAgent: null
        };
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
            console.log('Initializing MCSChat application...');
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
            aiCompanion.initialize();

            // Load agents and try to connect (moved to after agentManager is initialized)
            this.updateInitializationIndicator('Connecting to agent...');
            await this.loadAndConnectAgent();

            this.isInitialized = true;
            console.log('Application initialized successfully');

            // Show success briefly then hide
            this.updateInitializationIndicator('Application ready!');
            setTimeout(() => this.hideInitializationIndicator(), 1500);

        } catch (error) {
            console.error('Error initializing application:', error);
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

            // Navigation elements
            clearButton: DOMUtils.getElementById('clearButton'),
            setupButton: DOMUtils.getElementById('setupButton'),
            clearAllHistoryButton: DOMUtils.getElementById('clearAllHistoryButton'),

            // File upload elements
            fileInput: DOMUtils.getElementById('fileInput'),
            attachButton: DOMUtils.getElementById('attachButton'),
            removeFileButton: DOMUtils.getElementById('removeFileButton'),

            // Modal elements
            setupModal: DOMUtils.getElementById('setupModal'),
            closeSetupModal: DOMUtils.getElementById('closeSetupModal'),
            imageModal: DOMUtils.getElementById('imageModal'),

            // Panel elements
            rightPanel: DOMUtils.getElementById('rightPanel'),
            closeButton: DOMUtils.getElementById('closeButton'),

            // Chat elements
            chatWindow: DOMUtils.getElementById('chatWindow'),

            // Status elements
            agentStatus: DOMUtils.getElementById('agentStatus'),
            agentName: DOMUtils.getElementById('agentName'),

            // Setup modal form elements
            enableStreamingCheckbox: DOMUtils.getElementById('enableStreamingCheckbox'),
            enableLLMCheckbox: DOMUtils.getElementById('enableLLMCheckbox'),
            apiKeySection: DOMUtils.getElementById('apiKeySection'),
            apiProviderSelect: DOMUtils.getElementById('apiProviderSelect'),
            apiKeyInput: DOMUtils.getElementById('apiKeyInput'),
            apiKeyField: DOMUtils.getElementById('apiKeyField'),
            ollamaConfig: DOMUtils.getElementById('ollamaConfig'),
            ollamaUrlInput: DOMUtils.getElementById('ollamaUrlInput'),
            ollamaModelSelect: DOMUtils.getElementById('ollamaModelSelect'),
            refreshModelsBtn: DOMUtils.getElementById('refreshModelsBtn'),
            testOllamaBtn: DOMUtils.getElementById('testOllamaBtn'),

            // Font size controls
            agentFontSize: DOMUtils.getElementById('agentFontSize'),
            agentFontSizeValue: DOMUtils.getElementById('agentFontSizeValue'),
            companionFontSize: DOMUtils.getElementById('companionFontSize'),
            companionFontSizeValue: DOMUtils.getElementById('companionFontSizeValue')
        };

        console.log('DOM elements initialized');
    }

    /**
     * Initialize managers and services
     * @private
     */
    async initializeManagers() {
        // Initialize agent manager (loads agents and sets up event listeners)
        await agentManager.initialize();

        // Set up DirectLine callbacks (only for connection status and errors)
        directLineManager.setCallbacks({
            onConnectionStatusChange: (status) => this.handleConnectionStatus(status),
            onError: (error) => this.handleConnectionError(error)
        });

        console.log('Managers and services initialized');
    }

    /**
     * Load agents and try to connect to current agent
     * @private
     */
    async loadAndConnectAgent() {
        const currentAgent = agentManager.getCurrentAgent();

        if (currentAgent) {
            console.log('Connecting to current agent:', currentAgent.name);
            await this.connectToAgent(currentAgent.secret);
        } else {
            // Try legacy migration or show setup
            this.updateInitializationIndicator('Checking for existing configuration...');
            const savedSecret = await this.tryLegacyMigration();
            if (!savedSecret) {
                console.log('No agents configured, showing setup modal');
                this.updateInitializationIndicator('No agents configured');
                setTimeout(() => {
                    this.hideInitializationIndicator();
                    this.showSetupModal();
                }, 1000);
            }
        }
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

            const success = await directLineManager.initialize(secret);

            if (success) {
                this.state.isConnected = true;
                this.state.currentAgent = agentManager.getCurrentAgent();

                // Initialize session if none exists
                if (!this.state.currentSession) {
                    this.initializeSession();
                }

                console.log('Connected to agent successfully');
                this.updateInitializationIndicator('Bot connected! Waiting for response...');

                // Update agent status display
                const agentName = this.state.currentAgent?.name || 'Unknown Agent';
                this.updateAgentStatus('connected', agentName);

                // Check if this is a new/empty session that needs greeting
                const currentSessionMessages = sessionManager.getSessionMessages(this.state.currentSession);
                const hasMessages = currentSessionMessages && currentSessionMessages.length > 0;

                if (!hasMessages) {
                    // This is a fresh session, trigger greeting
                    console.log('Fresh session detected, triggering greeting...');
                    setTimeout(() => {
                        if (directLineManager) {
                            directLineManager.sendGreeting();
                        }
                    }, 1000); // Small delay to ensure connection is stable
                }

                // Don't hide indicator immediately - let the connection status handle it
                // This matches legacy behavior where it waits for bot response

            } else {
                this.handleConnectionError(new Error('Failed to initialize DirectLine'));
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

        DOMUtils.addEventListener(this.elements.userInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Clear chat / start new session
        DOMUtils.addEventListener(this.elements.clearButton, 'click', () => {
            this.startNewChat();
        });

        // Open setup modal
        DOMUtils.addEventListener(this.elements.setupButton, 'click', () => {
            this.showSetupModal();
        });

        // Clear all history
        DOMUtils.addEventListener(this.elements.clearAllHistoryButton, 'click', () => {
            if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
                this.clearAllHistory();
            }
        });

        // Close right panel
        DOMUtils.addEventListener(this.elements.closeButton, 'click', () => {
            this.closeRightPanel();
        });
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
            });
        }

        // API provider selection
        if (this.elements.apiProviderSelect) {
            DOMUtils.addEventListener(this.elements.apiProviderSelect, 'change', (e) => {
                this.handleAPIProviderChange(e.target.value);
                // Save the selected provider
                localStorage.setItem('selectedApiProvider', e.target.value);
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
                this.testOllamaConnection();
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
            this.startNewChat();
        });

        // DirectLine events
        window.addEventListener('showTypingIndicator', () => {
            this.showProgressIndicator();
        });

        window.addEventListener('hideTypingIndicator', () => {
            this.hideProgressIndicator();
        });

        window.addEventListener('completeMessage', (e) => {
            this.handleCompleteMessage(e.detail);
        });

        window.addEventListener('streamingActivity', (e) => {
            this.handleStreamingActivity(e.detail);
        });

        window.addEventListener('streamingEnd', (e) => {
            this.handleStreamingEnd(e.detail);
        });

        window.addEventListener('conversationUpdate', (e) => {
            this.handleConversationUpdate(e.detail);
        });

        window.addEventListener('eventActivity', (e) => {
            this.handleEventActivity(e.detail);
        });

        window.addEventListener('connectionStatus', (e) => {
            this.handleConnectionStatusUI(e.detail);
        });

        window.addEventListener('connectionError', (e) => {
            this.handleConnectionErrorUI(e.detail);
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

        if (!this.state.isConnected) {
            this.showErrorMessage('Not connected to bot. Please check your configuration.');
            return;
        }

        try {
            // Start timing for efficiency tracking (AI Companion)
            if (window.aiCompanion && window.aiCompanion.isEnabled) {
                window.aiCompanion.startUserMessageTiming();
            }

            // Clear suggested actions first (like legacy)
            messageRenderer.clearSuggestedActions();

            // Clear input
            this.elements.userInput.value = '';

            // Add user message to session
            sessionManager.addMessage({
                from: 'user',
                text: messageText,
                attachments: this.selectedFile ? [this.selectedFile] : []
            });

            // Render user message
            this.renderUserMessage(messageText);

            // Send to DirectLine
            if (this.selectedFile) {
                await this.sendMessageWithFile(messageText, this.selectedFile);
                this.removeSelectedFile();
            } else {
                await directLineManager.sendMessage(messageText);
            }

            // Show progress indicator
            this.showProgressIndicator();

        } catch (error) {
            console.error('Error sending message:', error);
            this.showErrorMessage('Failed to send message. Please try again.');
            this.hideProgressIndicator();
        }
    }

    /**
     * Render user message
     * @param {string} text - Message text
     * @private
     */
    renderUserMessage(text) {
        const activity = {
            from: { id: 'user' },
            text: text,
            timestamp: new Date().toISOString()
        };

        messageRenderer.renderCompleteMessage(activity);
    }

    /**
     * Start new chat session - consolidated with page refresh process
     */
    startNewChat() {
        console.log('Starting new chat - using consolidated refresh process...');

        // Create new session first
        const newSessionId = sessionManager.createNewSession();
        this.state.currentSession = newSessionId;

        // Clear the current session storage to ensure fresh start
        sessionManager.clearCurrentSessionStorage();

        // Store the new session as current
        localStorage.setItem('currentSession', newSessionId);

        // Reload the page to use the same initialization process as refresh
        // This ensures consistent behavior and state management
        window.location.reload();
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
        console.log('All chat history cleared');
    }

    /**
     * Handle complete message (enhanced to include session management)
     * @param {Object} activity - Message activity
     * @private
     */
    handleCompleteMessage(activity) {
        this.hideProgressIndicator();

        // Add to session (only for bot messages, user messages are handled in sendMessage)
        if (activity.from && activity.from.id !== 'user') {
            sessionManager.addMessage({
                from: activity.from?.id || 'bot',
                text: activity.text,
                attachments: activity.attachments,
                suggestedActions: activity.suggestedActions,
                timestamp: activity.timestamp
            });
        }

        // Check if streaming is enabled for simulation
        const streamingEnabled = localStorage.getItem('enableStreaming') === 'true';
        if (streamingEnabled) {
            messageRenderer.simulateStreaming(activity);
        } else {
            messageRenderer.renderCompleteMessage(activity);
        }
    }

    /**
     * Handle streaming activity (enhanced to include session management)
     * @param {Object} activity - Streaming activity
     * @private
     */
    handleStreamingActivity(activity) {
        this.hideProgressIndicator();

        // For streaming messages, we'll add to session when streaming ends
        // Just handle the rendering here
        messageRenderer.handleStreamingMessage(activity);
    }

    /**
     * Handle streaming end (enhanced to include session management)
     * @param {Object} activity - Final activity
     * @private
     */
    handleStreamingEnd(activity) {
        // Add the final complete message to session
        sessionManager.addMessage({
            from: activity.from?.id || 'bot',
            text: activity.text,
            attachments: activity.attachments,
            suggestedActions: activity.suggestedActions,
            timestamp: activity.timestamp
        });

        messageRenderer.finalizeStreamingMessage(activity);
    }

    /**
     * Handle conversation update (enhanced to include session management)
     * @param {Object} activity - Conversation update activity
     * @private
     */
    handleConversationUpdate(activity) {
        // Add to session if it has content
        if (activity.text ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {

            sessionManager.addMessage({
                from: activity.from?.id || 'bot',
                text: activity.text,
                attachments: activity.attachments,
                suggestedActions: activity.suggestedActions,
                timestamp: activity.timestamp
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
        // Add to session if it has content
        if (activity.text ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {

            sessionManager.addMessage({
                from: activity.from?.id || 'bot',
                text: activity.text,
                attachments: activity.attachments,
                suggestedActions: activity.suggestedActions,
                timestamp: activity.timestamp
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
                    break;
                case 2: // Online
                    this.elements.agentStatus.className = 'status-indicator connected';
                    this.elements.agentStatus.setAttribute('data-tooltip', `Agent: ${agentName} - Connected`);
                    this.state.isConnected = true;
                    break;
                case 3: // Expired
                case 4: // Failed
                case 5: // Ended
                    this.elements.agentStatus.className = 'status-indicator disconnected';
                    this.elements.agentStatus.setAttribute('data-tooltip', `Agent: ${agentName} - Disconnected`);
                    this.state.isConnected = false;
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
                this.updateInitializationIndicator(detail.message);
                break;
            case 'online':
                this.updateInitializationIndicator(detail.message);
                // Wait longer for bot response before hiding, like legacy
                setTimeout(() => {
                    // Check if we've received any messages yet
                    const chatWindow = this.elements.chatWindow;
                    const hasMessages = chatWindow && chatWindow.children.length > 0;

                    if (hasMessages) {
                        this.updateInitializationIndicator('Bot conversation ready!');
                        setTimeout(() => this.hideInitializationIndicator(), 1000);
                    } else {
                        this.updateInitializationIndicator('Waiting for bot greeting...');
                        // Keep waiting for greeting message
                        setTimeout(() => {
                            this.updateInitializationIndicator('Bot connected - ready to chat');
                            setTimeout(() => this.hideInitializationIndicator(), 2000);
                        }, 3000);
                    }
                }, 2000);
                break;
            case 'expired':
                this.hideInitializationIndicator();
                this.showErrorMessage('Authentication token has expired. Please check your DirectLine secret.');
                break;
            case 'failed':
                this.hideInitializationIndicator();
                this.showErrorMessage('Failed to connect to the bot service. Please check your DirectLine secret and internet connection.');
                break;
            case 'ended':
                this.hideInitializationIndicator();
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
        this.hideInitializationIndicator();
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
                this.openInRightPanel(action.value);
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
     * Load current settings into the setup modal
     * @private
     */
    loadCurrentSettingsToModal() {
        // Load AI companion settings
        if (this.elements.enableLLMCheckbox) {
            this.elements.enableLLMCheckbox.checked = localStorage.getItem('enableLLM') === 'true';
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

        // Update AI companion section visibility
        if (this.elements.enableLLMCheckbox?.checked) {
            this.toggleAICompanionSection(true);
            this.handleAPIProviderChange(savedProvider);
        }

        // Load font size settings
        this.loadFontSizeSettings();

        console.log('Settings loaded into modal:', {
            llmEnabled: this.elements.enableLLMCheckbox?.checked,
            provider: savedProvider,
            ollamaUrl: savedOllamaUrl,
            ollamaModel: savedModel
        });
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
        }
    }

    /**
     * Show progress indicator (enhanced with legacy's typing indicator implementation)
     */
    showProgressIndicator() {
        // Check if an indicator already exists to prevent duplicates
        const existingIndicator = DOMUtils.getElementById('progressIndicator');
        if (existingIndicator) {
            console.log('Progress indicator already exists, skipping creation');
            return;
        }

        const chatWindow = this.elements.chatWindow;
        if (!chatWindow) return;

        const messageContainer = DOMUtils.createElement('div', {
            className: 'messageContainer botMessage',
            id: 'progressIndicator'
        });

        const messageIcon = DOMUtils.createElement('div', {
            className: 'messageIcon'
        });
        messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

        const typingIndicator = DOMUtils.createElement('div', {
            className: 'typingIndicator'
        });

        // Create the three dots for typing animation
        for (let i = 0; i < 3; i++) {
            const dot = DOMUtils.createElement('span');
            typingIndicator.appendChild(dot);
        }

        messageContainer.appendChild(messageIcon);
        messageContainer.appendChild(typingIndicator);
        chatWindow.appendChild(messageContainer);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        console.log('Typing indicator created');

        // Safety timeout to remove indicator if it gets stuck (30 seconds)
        setTimeout(() => {
            const stuckIndicator = DOMUtils.getElementById('progressIndicator');
            if (stuckIndicator) {
                console.log('Removing stuck progress indicator after 30 seconds');
                stuckIndicator.remove();
            }
        }, 30000);
    }

    /**
     * Hide progress indicator (enhanced with legacy's implementation)
     */
    hideProgressIndicator() {
        const progressIndicator = DOMUtils.getElementById('progressIndicator');
        if (progressIndicator) {
            progressIndicator.remove();
            console.log('Typing indicator removed');
        } else {
            console.log('No typing indicator found to remove');
        }
    }

    /**
     * Show initialization indicator
     * @param {string} message - Indicator message
     */
    showInitializationIndicator(message = 'Initializing...') {
        console.log('Initialization indicator:', message);

        const loadingIndicator = DOMUtils.getElementById('loadingIndicator');
        const loadingText = loadingIndicator?.querySelector('.loading-text');

        if (loadingIndicator) {
            DOMUtils.show(loadingIndicator);
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    /**
     * Update initialization indicator
     * @param {string} message - Updated message
     */
    updateInitializationIndicator(message) {
        console.log('Initialization update:', message);

        const loadingIndicator = DOMUtils.getElementById('loadingIndicator');
        const loadingText = loadingIndicator?.querySelector('.loading-text');

        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Hide initialization indicator
     */
    hideInitializationIndicator() {
        console.log('Hiding initialization indicator');

        const loadingIndicator = DOMUtils.getElementById('loadingIndicator');
        if (loadingIndicator) {
            DOMUtils.hide(loadingIndicator);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        console.error('Error:', message);

        // Create error toast
        const errorDiv = document.createElement('div');
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
            agentNameEl.textContent = agentName || '';
        }

        if (agentTitleEl && agentName) {
            agentTitleEl.textContent = `${agentName} Conversation`;
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
        if (this.elements.apiKeySection) {
            if (enabled) {
                DOMUtils.show(this.elements.apiKeySection);
                this.handleAPIProviderChange(this.elements.apiProviderSelect?.value || 'openai');
            } else {
                DOMUtils.hide(this.elements.apiKeySection);
            }
        }
    }

    /**
     * Handle API provider selection change
     * @param {string} provider - Selected provider
     */
    handleAPIProviderChange(provider) {
        if (this.elements.apiKeyField && this.elements.ollamaConfig) {
            if (provider === 'ollama') {
                DOMUtils.hide(this.elements.apiKeyField);
                DOMUtils.show(this.elements.ollamaConfig);
                this.refreshOllamaModels();
            } else {
                DOMUtils.show(this.elements.apiKeyField);
                DOMUtils.hide(this.elements.ollamaConfig);
            }
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
    }    /**
     * Open URL in right panel
     * @param {string} url - URL to open
     */
    openInRightPanel(url) {
        const embeddedBrowser = DOMUtils.getElementById('embeddedBrowser');
        if (embeddedBrowser && this.elements.rightPanel) {
            embeddedBrowser.src = url;
            DOMUtils.show(this.elements.rightPanel);
        }
    }

    /**
     * Close right panel
     */
    closeRightPanel() {
        if (this.elements.rightPanel) {
            DOMUtils.hide(this.elements.rightPanel);
            const embeddedBrowser = DOMUtils.getElementById('embeddedBrowser');
            if (embeddedBrowser) {
                embeddedBrowser.src = '';
            }
        }
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
        return directLineManager.sendMessage(text, [file]);
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

        // Save to localStorage
        localStorage.setItem('companionChatFontSize', size);
        console.log('AI companion chat font size updated to:', fontSize);
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
}

// Create and export singleton instance
export const app = new Application();
