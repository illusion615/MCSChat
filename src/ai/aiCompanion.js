/**
 * AI Companion Module
 * Handles AI-powered conversation analysis, title generation, and companion features
 */

import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';
import { SecureStorage } from '../utils/secureStorage.js';

export class AICompanion {
    constructor() {
        this.isEnabled = false;
        this.currentProvider = 'openai';
        this.titleUpdateTimeout = null;
        this.currentConversationTitle = 'Agent Conversation';
        this.conversationContext = [];
        
        // Store the actual context used for KPI analysis
        this.lastKPIAnalysisContext = '';
        
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

        // Time tracking for efficiency KPI
        this.timeTracking = {
            conversationStart: null,
            lastUserMessage: null,
            responseTime: null,
            totalConversationTime: 0,
            messageCount: 0,
            avgResponseTime: 0
        };

        this.initializeElements();
        this.loadSettings();
        this.setupRealTimeSync();
    }

    /**
     * Initialize DOM elements
     * @private
     */
    initializeElements() {
        this.elements = {
            llmPanel: DOMUtils.getElementById('llmAnalysisPanel'),
            llmChatWindow: DOMUtils.getElementById('llmChatWindow'),
            llmUserInput: DOMUtils.getElementById('llmUserInput'),
            llmSendButton: DOMUtils.getElementById('llmSendButton'),
            llmStatus: DOMUtils.getElementById('llmStatus'),
            llmModelName: DOMUtils.getElementById('llmModelName'),
            toggleButton: DOMUtils.getElementById('toggleLLMPanelBtn'),
            quickActionButtons: DOMUtils.querySelectorAll('.quick-action-btn'),
            agentConversationTitle: DOMUtils.getElementById('agentConversationTitle'),
            contextIndicator: DOMUtils.querySelector('.context-indicator span'),
            // KPI elements
            kpiAccuracy: DOMUtils.getElementById('kpiAccuracy'),
            kpiHelpfulness: DOMUtils.getElementById('kpiHelpfulness'),
            kpiCompleteness: DOMUtils.getElementById('kpiCompleteness'),
            kpiHumanlikeness: DOMUtils.getElementById('kpiHumanlikeness'),
            kpiEfficiency: DOMUtils.getElementById('kpiEfficiency'),
            kpiChanges: DOMUtils.getElementById('kpiChanges'),
            kpiAccuracyBar: DOMUtils.getElementById('kpiAccuracyBar'),
            kpiHelpfulnessBar: DOMUtils.getElementById('kpiHelpfulnessBar'),
            kpiCompletenessBar: DOMUtils.getElementById('kpiCompletenessBar'),
            kpiHumanlikenessBar: DOMUtils.getElementById('kpiHumanlikenessBar'),
            kpiEfficiencyBar: DOMUtils.getElementById('kpiEfficiencyBar'),
            kpiChangesTrend: DOMUtils.getElementById('kpiChangesTrend'),
            // Modal elements
            kpiModal: DOMUtils.getElementById('kpiModal'),
            kpiModalTitle: DOMUtils.getElementById('kpiModalTitle'),
            kpiModalScore: DOMUtils.getElementById('kpiModalScore'),
            kpiModalDetails: DOMUtils.getElementById('kpiModalDetails'),
            kpiModalMessages: DOMUtils.getElementById('kpiModalMessages'),
            kpiModalClose: DOMUtils.getElementById('kpiModalClose')
        };

        // Setup KPI click handlers
        this.setupKPIClickHandlers();
    }

    /**
     * Load AI companion settings
     * @private
     */
    loadSettings() {
        this.isEnabled = localStorage.getItem('enableLLM') === 'true';
        this.currentProvider = localStorage.getItem('selectedApiProvider') || 'openai';
        console.log('AI Companion settings loaded:', { enabled: this.isEnabled, provider: this.currentProvider });
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
            this.analyzeMessageForKPIs(messageData);
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
    refreshKPIAnalysis() {
        console.log('[AI Companion] Manual KPI analysis refresh triggered');
        
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

        // Run the KPI analysis
        this.analyzeMessageForKPIs(messageData);
        
        console.log('[AI Companion] KPI analysis refreshed with current context');
        return {
            contextLength: currentContext.length,
            messageCount: messageCount,
            lastAnalyzedMessage: messageData.content.substring(0, 100) + '...',
            kpiResults: { ...this.kpiData }
        };
    }

    /**
     * Initialize AI companion panel
     */
    initialize() {
        this.initializePanelState();
        this.attachEventListeners();
        this.updateStatus();
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
        // Send button and input events
        if (this.elements.llmSendButton && this.elements.llmUserInput) {
            DOMUtils.addEventListener(this.elements.llmSendButton, 'click', () => {
                this.sendMessage();
            });

            DOMUtils.addEventListener(this.elements.llmUserInput, 'keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize textarea
            DOMUtils.addEventListener(this.elements.llmUserInput, 'input', function () {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }

        // Quick action buttons
        this.elements.quickActionButtons.forEach(btn => {
            DOMUtils.addEventListener(btn, 'click', (e) => {
                this.handleQuickAction(e);
            });
        });

        // Toggle panel button
        if (this.elements.toggleButton) {
            DOMUtils.addEventListener(this.elements.toggleButton, 'click', () => {
                const isVisible = !this.elements.llmPanel.classList.contains('collapsed');
                this.togglePanel(!isVisible);
            });
        }

        // Listen for conversation changes to update context
        window.addEventListener('messageRendered', () => {
            this.updateContextIndicator();
        });

        // Listen for session changes to schedule title updates
        window.addEventListener('messageRendered', () => {
            if (this.isEnabled) {
                // Automatic title updates removed - user can manually request title suggestions if needed
                // this.scheduleConversationTitleUpdate();
            }
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

        // The toggle button visibility should only depend on whether LLM is enabled
        if (this.elements.toggleButton) {
            this.elements.toggleButton.style.display = this.isEnabled ? 'inline-flex' : 'none';
        }

        // Update status when showing panel
        if (show) {
            this.updateStatus();
        }

        // Initialize panel if showing for first time
        if (show && !this.elements.llmPanel.hasAttribute('data-initialized')) {
            this.initializePanel();
            this.elements.llmPanel.setAttribute('data-initialized', 'true');
        }
    }

    /**
     * Initialize panel components
     * @private
     */
    initializePanel() {
        console.log('Initializing AI companion panel components');
        this.updateContextIndicator();
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
            const ollamaLastWorking = localStorage.getItem('ollamaLastWorking') === 'true';
            const ollamaModel = localStorage.getItem('ollamaSelectedModel') || 'No Model Selected';

            // Update model name display
            if (this.elements.llmModelName) {
                this.elements.llmModelName.textContent = ollamaModel !== 'No Model Selected' ? ollamaModel : '';
            }

            if (ollamaLastWorking) {
                this.elements.llmStatus.className = 'status-indicator connected';
            } else {
                this.elements.llmStatus.className = 'status-indicator';
            }
        } else {
            // For other providers, check if API key exists and additional configuration for Azure
            SecureStorage.retrieve(`${this.currentProvider}ApiKey`).then(apiKey => {
                const providerName = this.currentProvider.charAt(0).toUpperCase() + this.currentProvider.slice(1);

                // Update model name display with provider name
                if (this.elements.llmModelName) {
                    if (this.currentProvider === 'azure') {
                        const deployment = localStorage.getItem('azureDeployment');
                        this.elements.llmModelName.textContent = deployment ? `Azure: ${deployment}` : 'Azure OpenAI';
                    } else {
                        this.elements.llmModelName.textContent = providerName || '';
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
     * Send message to AI companion
     */
    async sendMessage() {
        if (!this.elements.llmUserInput) return;

        const userMessage = this.elements.llmUserInput.value.trim();
        if (!userMessage) return;

        // Clear input
        this.elements.llmUserInput.value = '';
        this.elements.llmUserInput.style.height = 'auto';

        // For manual user input, show the message and add context automatically
        this.renderMessage('user', userMessage);

        // Add conversation context for user messages
        const conversationContext = this.getAdaptiveConversationContext('general');
        const messageWithContext = `${conversationContext}\n\nUser Question: ${userMessage}`;

        // Show typing indicator
        this.showTypingIndicator();

        try {
            if (!this.isEnabled) {
                throw new Error('AI Companion not enabled. Please enable it in settings.');
            }

            await this.sendQuickActionRequest(messageWithContext);
        } catch (error) {
            console.error('AI companion message error:', error);
            this.hideTypingIndicator();
            this.renderMessage('error', `Error: ${error.message}`);
        }
    }

    /**
     * Handle quick action button clicks
     * @param {Event} event - Click event
     */
    async handleQuickAction(event) {
        const action = event.target.dataset.action;
        console.log('Quick action clicked:', action);

        // Debug conversation context when analysis is requested
        if (action === 'analyze') {
            this.debugConversationContext();
        }

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
        }

        if (prompt) {
            this.showTypingIndicator();
            try {
                await this.sendQuickActionRequest(prompt);
            } catch (error) {
                console.error('Error sending quick action request:', error);
                this.hideTypingIndicator();
                this.renderMessage('error', `Error: ${error.message}`);
            }
        }
    }

    /**
     * Send quick action request to AI
     * @param {string} messageWithContext - Message with conversation context
     * @private
     */
    async sendQuickActionRequest(messageWithContext) {
        if (this.currentProvider === 'ollama') {
            await this.handleOllamaStreaming(messageWithContext);
        } else {
            await this.handleAPIStreaming(messageWithContext);
        }
    }

    /**
     * Handle Ollama streaming
     * @param {string} message - Message to send
     * @private
     */
    async handleOllamaStreaming(message) {
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
                            break;
                        }
                    } catch (e) {
                        console.warn('Error parsing JSON line:', line, e);
                    }
                }
            }
        } catch (error) {
            console.error('Ollama streaming error:', error);
            this.hideTypingIndicator();
            throw error;
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

        console.log('Sending to Ollama:', { url: ollamaUrl, model: selectedModel });

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

        return response;
    }

    /**
     * Render message in AI companion chat
     * @param {string} sender - Message sender (user, assistant, error)
     * @param {string} message - Message content
     */
    renderMessage(sender, message) {
        if (!this.elements.llmChatWindow) return;

        const messageContainer = this.createMessageContainer(sender);
        const messageDiv = DOMUtils.createElement('div', {
            className: 'messageDiv'
        });

        // Use unified message creation with proper markdown processing
        this.createMessageElement(messageDiv, message, sender === 'error');

        messageContainer.appendChild(messageDiv);
        this.elements.llmChatWindow.appendChild(messageContainer);

        this.scrollToBottom();
    }

    /**
     * Create message container for AI companion
     * @param {string} sender - Message sender
     * @returns {HTMLElement} Message container
     * @private
     */
    createMessageContainer(sender) {
        const isUser = sender === 'user';
        const container = DOMUtils.createElement('div', {
            className: `messageContainer llmMessage ${sender}Message`,
            dataset: {
                sender,
                timestamp: new Date().toISOString()
            }
        });

        // Only add icon for user messages, positioned on the right
        if (isUser) {
            const icon = DOMUtils.createElement('div', {
                className: 'messageIcon'
            });
            // Set user icon background image to match agent chat
            icon.style.backgroundImage = 'url("images/carter_30k.png")';
            icon.style.backgroundSize = 'cover';

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
        let textElement = parentDiv.querySelector('.messageText');
        if (!textElement) {
            textElement = DOMUtils.createElement('div', {
                className: `messageText ${isError ? 'error-message' : ''}`
            });
            parentDiv.appendChild(textElement);
        }

        if (content) {
            const processed = this.processMarkdownContent(content, isError);
            if (processed.html) {
                textElement.innerHTML = processed.content;
            } else {
                textElement.textContent = processed.content;
            }
        }

        return textElement;
    }

    /**
     * Initialize streaming message structure
     * @returns {Object} Object containing messageContainer and messageDiv
     * @private
     */
    initializeStreamingMessage() {
        this.hideTypingIndicator();

        const messageContainer = this.createMessageContainer('assistant');
        const messageDiv = DOMUtils.createElement('div', { className: 'messageDiv' });

        messageContainer.appendChild(messageDiv);
        this.elements.llmChatWindow.appendChild(messageContainer);

        return { messageContainer, messageDiv };
    }

    /**
     * Update streaming content with typing cursor
     * @param {HTMLElement} messageDiv - Message div
     * @param {string} content - Current content
     * @private
     */
    updateStreamingContent(messageDiv, content) {
        let textElement = messageDiv.querySelector('.messageText');
        if (!textElement) {
            textElement = this.createMessageElement(messageDiv);
        }

        // Process markdown and add typing cursor for streaming effect
        const processed = this.processMarkdownContent(content);

        if (processed.html) {
            // For HTML content, append typing cursor as HTML
            textElement.innerHTML = processed.content + '<span class="typing-cursor">|</span>';
        } else {
            // For plain text, append typing cursor as text
            textElement.innerHTML = processed.content + '<span class="typing-cursor">|</span>';
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
     * Show typing indicator
     */
    showTypingIndicator() {
        if (this.elements.llmChatWindow) {
            const existingIndicator = this.elements.llmChatWindow.querySelector('.llm-typing-indicator');
            if (existingIndicator) return;

            const indicator = DOMUtils.createElement('div', {
                className: 'llm-typing-indicator'
            }, `
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `);

            this.elements.llmChatWindow.appendChild(indicator);
            this.scrollToBottom();
        }
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        if (this.elements.llmChatWindow) {
            const indicator = this.elements.llmChatWindow.querySelector('.llm-typing-indicator');
            if (indicator) {
                indicator.remove();
            }
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
            case 'summary':
                // For analysis, include more messages for longer conversations
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
        
        console.log(`[AI Companion] Final context delivered: ${finalMessageCount} messages`);
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
    analyzeMessageForKPIs(messageData) {
        if (!messageData.content || messageData.role !== 'assistant') return;

        console.log('[AI Companion] Starting comprehensive KPI analysis with conversation context');

        try {
            // Show calculating indicators
            this.showKPICalculatingIndicators();

            // Get comprehensive conversation context for accurate KPI analysis
            const conversationContext = this.getAdaptiveConversationContext('analysis');
            
            // Store the context used for KPI analysis for modal display
            this.lastKPIAnalysisContext = conversationContext;
            
            // Calculate and log actual message count in context
            const contextMessageCount = (conversationContext.match(/\n(User|Agent):/g) || []).length;
            console.log(`[AI Companion] KPI Analysis using ${contextMessageCount} messages from conversation context`);
            
            const content = messageData.content.toLowerCase();
            const wordCount = content.split(' ').length;

            // Store word count for modal display
            this.lastWordCount = wordCount;

            // Store previous values for trend calculation
            this.previousKpiData = { ...this.kpiData };

            // Enhanced analysis with conversation context
            const contextualAnalysis = this.analyzeWithContext(messageData, conversationContext);

            console.log(`[AI Companion] Context analysis complete:`, {
                contextLength: conversationContext.length,
                contextPreview: conversationContext.substring(0, 150) + '...',
                messageCount: contextMessageCount,
                analysisResults: {
                    accuracy: contextualAnalysis.accuracy.toFixed(1),
                    helpfulness: contextualAnalysis.helpfulness.toFixed(1),
                    completeness: contextualAnalysis.completeness.toFixed(1),
                    humanlikeness: contextualAnalysis.humanlikeness.toFixed(1)
                }
            });

            // Apply contextual analysis results
            this.kpiData.accuracy = Math.max(0, Math.min(10, contextualAnalysis.accuracy));
            this.kpiData.helpfulness = Math.max(0, Math.min(10, contextualAnalysis.helpfulness));
            this.kpiData.completeness = Math.max(0, Math.min(10, contextualAnalysis.completeness));
            this.kpiData.humanlikeness = Math.max(0, Math.min(10, contextualAnalysis.humanlikeness));

            // Complete response timing and calculate efficiency
            this.completeResponseTiming();
            const efficiency = this.calculateEfficiency();
            this.kpiData.efficiency = Math.max(0, Math.min(10, efficiency));

            // Calculate changes
            this.kpiData.changes++;

            // Update trend (now includes all 5 core metrics)
            const avgCurrent = (this.kpiData.accuracy + this.kpiData.helpfulness + this.kpiData.completeness + this.kpiData.humanlikeness + this.kpiData.efficiency) / 5;
            const avgPrevious = (this.previousKpiData.accuracy + this.previousKpiData.helpfulness + this.previousKpiData.completeness + this.previousKpiData.humanlikeness + this.previousKpiData.efficiency) / 5;

            if (avgCurrent > avgPrevious + 0.5) {
                this.kpiData.trend = 'up';
            } else if (avgCurrent < avgPrevious - 0.5) {
                this.kpiData.trend = 'down';
            } else {
                this.kpiData.trend = 'stable';
            }

            console.log('[AI Companion] KPI analysis complete:', {
                accuracy: this.kpiData.accuracy.toFixed(1),
                helpfulness: this.kpiData.helpfulness.toFixed(1),
                completeness: this.kpiData.completeness.toFixed(1),
                humanlikeness: this.kpiData.humanlikeness.toFixed(1),
                efficiency: this.kpiData.efficiency.toFixed(1),
                trend: this.kpiData.trend
            });

        } catch (error) {
            console.error('[AI Companion] Error during KPI analysis:', error);
        } finally {
            // Always hide calculating indicators and update UI
            this.hideKPICalculatingIndicators();
            this.updateKPIDisplay();
        }
    }

    /**
     * Analyze message with conversation context for enhanced KPI accuracy
     * @param {Object} messageData - Message to analyze
     * @param {string} conversationContext - Full conversation context
     * @returns {Object} Analysis results with accuracy, helpfulness, completeness, humanlikeness scores
     * @private
     */
    analyzeWithContext(messageData, conversationContext) {
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

        // Enhanced human-likeness with context
        const humanlikeness = this.calculateHumanLikenessWithContext(messageData.content, conversationContext);

        return {
            accuracy: Math.max(0, Math.min(10, accuracy)),
            helpfulness: Math.max(0, Math.min(10, helpfulness)),
            completeness: Math.max(0, Math.min(10, completeness)),
            humanlikeness: Math.max(0, Math.min(10, humanlikeness))
        };
    }

    /**
     * Calculate human-likeness score based on conversational patterns
     * @param {string} content - Message content to analyze
     * @returns {number} Human-likeness score (0-10)
     * @private
     */
    calculateHumanLikeness(content) {
        if (!content) return 5.0;

        let score = 5.0; // Base score
        const lowerContent = content.toLowerCase();

        // Language naturalness analysis (30% weight)
        const naturalness = this.analyzeLanguageNaturalness(lowerContent);

        // Empathy and emotional intelligence (40% weight)
        const empathy = this.analyzeEmpathy(lowerContent);

        // Conversation flow and context awareness (30% weight)
        const contextAwareness = this.analyzeContextAwareness(content);

        // Weighted average
        score = (naturalness * 0.3) + (empathy * 0.4) + (contextAwareness * 0.3);

        return Math.max(0, Math.min(10, score));
    }

    /**
     * Analyze language naturalness
     * @param {string} content - Lowercase content
     * @returns {number} Naturalness score (0-10)
     * @private
     */
    analyzeLanguageNaturalness(content) {
        let score = 5.0;

        // Positive indicators of natural language
        const contractions = /(i'll|don't|can't|won't|you're|it's|we'll|they're|isn't|aren't)/g;
        if (contractions.test(content)) score += 1.5;

        const casualPhrases = /(you know|i think|well|actually|basically|honestly|obviously)/g;
        if (casualPhrases.test(content)) score += 1.0;

        const personalPhrases = /(in my experience|i believe|from what i understand|i feel|seems to me)/g;
        if (personalPhrases.test(content)) score += 1.0;

        // Negative indicators (too robotic)
        const robotPhrases = /(as an ai|i am programmed|according to my training|i cannot feel|i do not have emotions)/g;
        if (robotPhrases.test(content)) score -= 3.0;

        const tooFormal = /(furthermore|nevertheless|consequently|therefore|thus)/g;
        if (tooFormal.test(content) && content.length < 100) score -= 1.0;

        // Check for repetitive patterns
        const words = content.split(' ');
        const uniqueWords = new Set(words);
        if (words.length > 10 && uniqueWords.size / words.length < 0.6) score -= 1.5;

        return Math.max(0, Math.min(10, score));
    }

    /**
     * Analyze empathy and emotional intelligence
     * @param {string} content - Lowercase content
     * @returns {number} Empathy score (0-10)
     * @private
     */
    analyzeEmpathy(content) {
        let score = 5.0;

        // Empathetic phrases
        const empathy = /(that sounds|i understand|i can imagine|that must be|i'm sorry to hear|that's frustrating|that's exciting|how wonderful|that's great)/g;
        if (empathy.test(content)) score += 2.0;

        // Emotional acknowledgment
        const emotion = /(feel|feeling|emotional|frustrated|excited|happy|sad|worried|concerned|glad)/g;
        if (emotion.test(content)) score += 1.5;

        // Supportive language
        const support = /(i'm here to help|let me assist|i'll do my best|we can work|together|support)/g;
        if (support.test(content)) score += 1.0;

        // Conversational warmth
        const warmth = /(great question|absolutely|definitely|of course|certainly|sure thing)/g;
        if (warmth.test(content)) score += 0.5;

        // Cold/robotic responses
        const cold = /(error|invalid|incorrect|not possible|unable to process|system)/g;
        if (cold.test(content)) score -= 1.5;

        return Math.max(0, Math.min(10, score));
    }

    /**
     * Analyze context awareness and conversation flow
     * @param {string} content - Original content
     * @returns {number} Context awareness score (0-10)
     * @private
     */
    analyzeContextAwareness(content) {
        let score = 5.0;

        // References to earlier conversation
        const contextRef = /(as you mentioned|like we discussed|from what you said|as you described|earlier you)/gi;
        if (contextRef.test(content)) score += 2.0;

        // Building on user input
        const building = /(based on that|following up|to add to|expanding on|regarding your)/gi;
        if (building.test(content)) score += 1.5;

        // Natural transitions
        const transitions = /(by the way|also|additionally|speaking of|that reminds me)/gi;
        if (transitions.test(content)) score += 1.0;

        // Questions showing engagement
        const engagement = /\?.*?(what|how|why|when|where|would|could|do you)/gi;
        if (engagement.test(content)) score += 1.0;

        // Appropriate length (not too short, not too verbose)
        const wordCount = content.split(' ').length;
        if (wordCount >= 10 && wordCount <= 100) score += 0.5;
        else if (wordCount < 5) score -= 1.0;
        else if (wordCount > 200) score -= 1.0;

        return Math.max(0, Math.min(10, score));
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
     * Calculate human-likeness with conversation context
     * @param {string} content - Message content
     * @param {string} conversationContext - Full conversation context
     * @returns {number} Human-likeness score (0-10)
     * @private
     */
    calculateHumanLikenessWithContext(content, conversationContext) {
        if (!content) return 5.0;

        let score = 5.0;
        const lowerContent = content.toLowerCase();

        // Base human-likeness analysis
        const naturalness = this.analyzeLanguageNaturalness(lowerContent);
        const empathy = this.analyzeEmpathy(lowerContent);
        const contextAwareness = this.analyzeContextAwareness(content);

        // Context-aware enhancements
        const conversationLength = (conversationContext.match(/\n(User|Agent):/g) || []).length;
        
        // Adjust for conversation progression
        if (conversationLength > 5) {
            // Longer conversations should show more familiarity
            if (lowerContent.includes('as we discussed') || lowerContent.includes('from our conversation')) {
                score += 1.0;
            }
        }
        
        // Check for appropriate conversation flow
        if (conversationLength > 2) {
            const showsFlow = this.checkConversationFlow(content, conversationContext);
            if (showsFlow) score += 0.5;
        }

        // Weighted combination with context awareness
        score = (naturalness * 0.25) + (empathy * 0.35) + (contextAwareness * 0.25) + (score * 0.15);
        
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
     * Update KPI display in real-time
     * @private
     */
    updateKPIDisplay() {
        if (!this.elements.kpiAccuracy) return;

        // Update values with 10-point scoring
        this.elements.kpiAccuracy.textContent = this.kpiData.accuracy.toFixed(1) + '/10';
        this.elements.kpiHelpfulness.textContent = this.kpiData.helpfulness.toFixed(1) + '/10';
        this.elements.kpiCompleteness.textContent = this.kpiData.completeness.toFixed(1) + '/10';
        this.elements.kpiHumanlikeness.textContent = this.kpiData.humanlikeness.toFixed(1) + '/10';
        this.elements.kpiEfficiency.textContent = this.kpiData.efficiency.toFixed(1) + '/10';
        this.elements.kpiChanges.textContent = this.kpiData.changes;

        // Update progress bars
        this.updateProgressBar(this.elements.kpiAccuracyBar, this.kpiData.accuracy);
        this.updateProgressBar(this.elements.kpiHelpfulnessBar, this.kpiData.helpfulness);
        this.updateProgressBar(this.elements.kpiCompletenessBar, this.kpiData.completeness);
        this.updateProgressBar(this.elements.kpiHumanlikenessBar, this.kpiData.humanlikeness);
        this.updateProgressBar(this.elements.kpiEfficiencyBar, this.kpiData.efficiency);

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
     * Schedule conversation title update with debouncing (DISABLED)
     * Note: Automatic title updates have been disabled to prevent unwanted AI requests
     */
    scheduleConversationTitleUpdate() {
        // Automatic title updates disabled - users can manually request title suggestions if needed
        console.log('[AI Companion] Automatic title updates disabled');
        return;
        
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
            console.log('AI Companion not enabled, skipping title update');
            return;
        }

        try {
            const conversationContext = this.getAdaptiveConversationContext('title');
            console.log('Title generation - conversation context:', conversationContext);

            if (!conversationContext || conversationContext === 'No conversation available.') {
                console.log('No conversation context available for title generation');
                return;
            }

            const prompt = `${conversationContext}\n\nGenerate a short, descriptive title (3-8 words) for this conversation. Return only the title, nothing else.`;

            let title = '';
            if (this.currentProvider === 'ollama') {
                title = await this.generateTitleWithOllama(prompt);
            } else {
                title = await this.generateTitleWithAPI(prompt, this.currentProvider);
            }

            if (title && title.trim()) {
                this.updateConversationTitleDisplay(title.trim());
            }
        } catch (error) {
            console.error('Error updating conversation title:', error);
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
            const response = await this.sendToOllama(prompt);
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
                        }
                        if (data.done) break;
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }

            return fullResponse.trim();
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
        // Placeholder for OpenAI/Anthropic/Azure implementations
        console.log(`Title generation with ${provider} not yet implemented`);
        return '';
    }

    /**
     * Update conversation title display
     * @param {string} title - New title
     */
    updateConversationTitleDisplay(title) {
        console.log('updateConversationTitleDisplay called with title:', title);
        console.log('agentConversationTitle element:', this.elements.agentConversationTitle);

        if (this.elements.agentConversationTitle) {
            this.currentConversationTitle = title;
            this.elements.agentConversationTitle.textContent = title;
            console.log('Successfully updated conversation title to:', title);
        } else {
            console.warn('agentConversationTitle element not found');
        }
    }

    /**
     * Scroll AI chat to bottom
     * @private
     */
    scrollToBottom() {
        if (this.elements.llmChatWindow) {
            this.elements.llmChatWindow.scrollTop = this.elements.llmChatWindow.scrollHeight;
        }
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
            item.addEventListener('click', () => {
                const kpiTypes = ['accuracy', 'helpfulness', 'completeness', 'humanlikeness', 'changes'];
                this.showKPIModal(kpiTypes[index]);
            });
        });

        // Modal close handlers
        if (this.elements.kpiModalClose) {
            this.elements.kpiModalClose.addEventListener('click', () => {
                this.hideKPIModal();
            });
        }

        if (this.elements.kpiModal) {
            this.elements.kpiModal.addEventListener('click', (e) => {
                if (e.target === this.elements.kpiModal) {
                    this.hideKPIModal();
                }
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

        const kpiData = this.getKPIDetails(kpiType);

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
                    <span class="calculation-label">Base Score:</span>
                    <span class="calculation-value">7.0/10</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Certainty Indicators:</span>
                    <span class="calculation-value positive">+1.5 (definitive language)</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Uncertainty Phrases:</span>
                    <span class="calculation-value negative">-1.5 ("maybe", "I think")</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Error References:</span>
                    <span class="calculation-value negative">-2.0 (mentions errors)</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.accuracy.toFixed(1)}/10</strong></span>
                </div>
            `;
        } else if (type === 'helpfulness') {
            html = `
                <div class="calculation-item">
                    <span class="calculation-label">Base Score:</span>
                    <span class="calculation-value">6.5/10</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Actionable Content:</span>
                    <span class="calculation-value positive">+2.0 ("here's how", "you can")</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Step-by-step Guidance:</span>
                    <span class="calculation-value positive">+1.5 (numbered steps)</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Non-helpful Responses:</span>
                    <span class="calculation-value negative">-1.5 ("can't help", "don't know")</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.helpfulness.toFixed(1)}/10</strong></span>
                </div>
            `;
        } else if (type === 'completeness') {
            html = `
                <div class="calculation-item">
                    <span class="calculation-label">Word Count Factor:</span>
                    <span class="calculation-value">${(this.lastWordCount || 0)} words × 0.2</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Examples Provided:</span>
                    <span class="calculation-value positive">+1.0 (includes examples)</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Brief Responses:</span>
                    <span class="calculation-value negative">-1.5 (brief/quick mentions)</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Range:</span>
                    <span class="calculation-value">3.0 - 10.0 points</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.completeness.toFixed(1)}/10</strong></span>
                </div>
            `;
        } else if (type === 'humanlikeness') {
            html = `
                <div class="calculation-item">
                    <span class="calculation-label">Language Naturalness (30%):</span>
                    <span class="calculation-value">Contractions, casual phrases, personal language</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Empathy & Emotion (40%):</span>
                    <span class="calculation-value">Emotional recognition, supportive language</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Context Awareness (30%):</span>
                    <span class="calculation-value">References to earlier conversation, engagement</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Positive Indicators:</span>
                    <span class="calculation-value positive">Natural contractions, empathy, context references</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Negative Indicators:</span>
                    <span class="calculation-value negative">Robot phrases ("As an AI"), overly formal tone</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label"><strong>Final Score:</strong></span>
                    <span class="calculation-value"><strong>${this.kpiData.humanlikeness.toFixed(1)}/10</strong></span>
                </div>
            `;
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
                <div class="calculation-item">
                    <span class="calculation-label">Total Conversation Updates:</span>
                    <span class="calculation-value">${this.kpiData.changes}</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Performance Trend:</span>
                    <span class="calculation-value">${this.kpiData.trend === 'up' ? '↗ Improving' : this.kpiData.trend === 'down' ? '↘ Declining' : '→ Stable'}</span>
                </div>
                <div class="calculation-item">
                    <span class="calculation-label">Average Score (5 metrics):</span>
                    <span class="calculation-value">${((this.kpiData.accuracy + this.kpiData.helpfulness + this.kpiData.completeness + this.kpiData.humanlikeness + this.kpiData.efficiency) / 5).toFixed(1)}/10</span>
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
                const accuracyIndicators = [];
                if (lowerContent.includes('definitely') || lowerContent.includes('certainly')) {
                    accuracyIndicators.push('High certainty language (+)');
                }
                if (lowerContent.includes('maybe') || lowerContent.includes('probably')) {
                    accuracyIndicators.push('Uncertain language (-)');
                }
                if (lowerContent.includes('error') || lowerContent.includes('incorrect')) {
                    accuracyIndicators.push('Error acknowledgment (-)');
                }
                return accuracyIndicators.length > 0 ? accuracyIndicators.join(', ') : 'Neutral accuracy indicators';

            case 'helpfulness':
                const helpfulnessIndicators = [];
                if (lowerContent.includes('here\'s how') || lowerContent.includes('you can')) {
                    helpfulnessIndicators.push('Actionable guidance (+)');
                }
                if (lowerContent.includes('step') || lowerContent.includes('first')) {
                    helpfulnessIndicators.push('Structured approach (+)');
                }
                if (lowerContent.includes('sorry') || lowerContent.includes('can\'t help')) {
                    helpfulnessIndicators.push('Limited assistance (-)');
                }
                return helpfulnessIndicators.length > 0 ? helpfulnessIndicators.join(', ') : 'Standard helpfulness level';

            case 'completeness':
                const wordCount = lowerContent.split(' ').length;
                const completenessIndicators = [];
                if (lowerContent.includes('example') || lowerContent.includes('for instance')) {
                    completenessIndicators.push('Includes examples (+)');
                }
                if (wordCount > 50) {
                    completenessIndicators.push('Detailed response (+)');
                } else if (wordCount < 10) {
                    completenessIndicators.push('Brief response (-)');
                }
                return completenessIndicators.length > 0 ? completenessIndicators.join(', ') : `${wordCount} words - standard length`;

            case 'humanlikeness':
                const humanIndicators = [];
                if (/(i'll|don't|can't|won't)/.test(lowerContent)) {
                    humanIndicators.push('Natural contractions (+)');
                }
                if (/(i think|actually|basically)/.test(lowerContent)) {
                    humanIndicators.push('Casual language (+)');
                }
                if (/(as an ai|i am programmed)/.test(lowerContent)) {
                    humanIndicators.push('AI self-reference (-)');
                }
                return humanIndicators.length > 0 ? humanIndicators.join(', ') : 'Neutral human-like qualities';

            case 'efficiency':
                return `Response time analysis - see efficiency metrics`;

            default:
                return 'Analysis data not available';
        }
    }
}

// Create and export singleton instance
export const aiCompanion = new AICompanion();
