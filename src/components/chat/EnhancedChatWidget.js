/**
 * Enhanced Chat Widget - Standalone Component
 * Extracted from MCSChat main application with all advanced features
 * 
 * Features:
 * - Rich message rendering with adaptive cards
 * - File upload support
 * - Citation preview
 * - Voice input integration
 * - DirectLine integration via DirectLineConnector
 * - UnifiedMessageQueue integration
 * - Mobile responsive design
 * - Typing indicators
 * - Suggested actions
 */

export class EnhancedChatWidget {
    constructor(options = {}) {
        // Configuration
        this.container = options.container || '#chat-widget';
        this.directLineSecret = options.directLineSecret || '';
        this.directLineConnector = options.directLineConnector || null;
        this.unifiedMessageQueue = options.unifiedMessageQueue || null;
        
        // Feature flags
        this.features = {
            fileUpload: options.features?.fileUpload !== false,
            adaptiveCards: options.features?.adaptiveCards !== false,
            voiceInput: options.features?.voiceInput !== false,
            citations: options.features?.citations !== false,
            suggestedActions: options.features?.suggestedActions !== false,
            typing: options.features?.typing !== false,
            ...options.features
        };

        // Styling options
        this.styling = {
            theme: options.styling?.theme || 'default',
            fullWidth: options.styling?.fullWidth || false,
            height: options.styling?.height || '600px',
            ...options.styling
        };

        // Event callbacks
        this.callbacks = {
            onMessageSent: options.onMessageSent || (() => {}),
            onMessageReceived: options.onMessageReceived || (() => {}),
            onConnectionStatusChanged: options.onConnectionStatusChanged || (() => {}),
            onError: options.onError || (() => {}),
            ...options.callbacks
        };

        // Internal state
        this.state = {
            isConnected: false,
            isTyping: false,
            currentFile: null,
            messages: [],
            connectionId: null
        };

        // DOM elements (will be initialized in createStructure)
        this.elements = {};
        
        // Unique ID for this widget instance
        this.widgetId = 'chat-widget-' + Math.random().toString(36).substr(2, 9);
        
        // Initialize
        this.isInitialized = false;
    }

    /**
     * Initialize the chat widget
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('EnhancedChatWidget already initialized');
            return;
        }

        try {
            console.log('Initializing EnhancedChatWidget...');

            // Create DOM structure
            this.createStructure();
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Connect to DirectLine if configuration provided
            if (this.directLineSecret || this.directLineConnector) {
                await this.connect();
            }

            this.isInitialized = true;
            console.log('EnhancedChatWidget initialized successfully');
            
            // Show welcome message
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('Failed to initialize EnhancedChatWidget:', error);
            this.callbacks.onError(error);
            throw error;
        }
    }

    /**
     * Create the DOM structure for the chat widget
     */
    createStructure() {
        const containerElement = typeof this.container === 'string' 
            ? document.querySelector(this.container) 
            : this.container;

        if (!containerElement) {
            throw new Error(`Container not found: ${this.container}`);
        }

        // Create main widget HTML
        containerElement.innerHTML = `
            <div id="${this.widgetId}" class="enhanced-chat-widget ${this.styling.theme}" style="height: ${this.styling.height};">
                <!-- Chat Header -->
                <div class="chat-header">
                    <div class="header-info">
                        <span class="connection-status" id="${this.widgetId}-status">Disconnected</span>
                        <span class="agent-name" id="${this.widgetId}-agent-name"></span>
                    </div>
                    <div class="header-actions">
                        ${this.features.citations ? `
                        <button class="header-btn citation-btn" id="${this.widgetId}-citation-btn" title="Toggle Citation Preview" style="display: none;">
                            📄
                        </button>
                        ` : ''}
                        <button class="header-btn settings-btn" id="${this.widgetId}-settings-btn" title="Settings">
                            ⚙️
                        </button>
                    </div>
                </div>

                <!-- Chat Window -->
                <div class="chat-window" id="${this.widgetId}-chat-window">
                    <div class="welcome-container" id="${this.widgetId}-welcome">
                        <div class="welcome-icon">💬</div>
                        <h4>Welcome to Enhanced Chat</h4>
                        <p>Start typing to begin your conversation...</p>
                    </div>
                </div>

                <!-- Suggested Actions Container -->
                ${this.features.suggestedActions ? `
                <div class="suggested-actions-container" id="${this.widgetId}-suggested-actions" style="display: none;"></div>
                ` : ''}

                <!-- Input Container -->
                <div class="input-container">
                    ${this.features.fileUpload ? `
                    <!-- File Upload -->
                    <div class="file-upload-container">
                        <input type="file" id="${this.widgetId}-file-input" 
                               accept=".pdf,.doc,.docx,.txt,.xlsx,.pptx,.png,.jpg,.jpeg,.gif,.webp" 
                               style="display: none;" />
                        <button class="input-btn attach-btn" id="${this.widgetId}-attach-btn" title="Attach file">
                            📎
                        </button>
                    </div>
                    ` : ''}
                    
                    <!-- Message Input -->
                    <div class="message-input-wrapper">
                        <input type="text" class="message-input" id="${this.widgetId}-message-input" 
                               placeholder="Type your message..." autocomplete="off" />
                        
                        ${this.features.voiceInput ? `
                        <button class="input-btn voice-btn" id="${this.widgetId}-voice-btn" title="Voice input" style="display: none;">
                            🎤
                        </button>
                        ` : ''}
                    </div>
                    
                    <!-- Send Button -->
                    <button class="input-btn send-btn primary" id="${this.widgetId}-send-btn" title="Send message">
                        ➤
                    </button>
                </div>

                <!-- File Preview Container -->
                ${this.features.fileUpload ? `
                <div class="file-preview-container" id="${this.widgetId}-file-preview" style="display: none;">
                    <div class="file-preview">
                        <div class="file-info">
                            <span class="file-name" id="${this.widgetId}-file-name">filename.txt</span>
                            <span class="file-size" id="${this.widgetId}-file-size">1.2 KB</span>
                        </div>
                        <button class="remove-file-btn" id="${this.widgetId}-remove-file-btn" title="Remove file">
                            ✕
                        </button>
                    </div>
                </div>
                ` : ''}

                <!-- Citation Preview Panel -->
                ${this.features.citations ? `
                <div class="citation-preview-panel" id="${this.widgetId}-citation-panel" style="display: none;">
                    <div class="citation-header">
                        <h4>Citation Preview</h4>
                        <button class="close-citation-btn" id="${this.widgetId}-close-citation-btn">✕</button>
                    </div>
                    <iframe class="citation-frame" id="${this.widgetId}-citation-frame" 
                            style="width: 100%; height: 100%; border: none;" 
                            title="Citation content"></iframe>
                </div>
                ` : ''}
            </div>
        `;

        // Add CSS styles
        this.addStyles();
        
        // Cache DOM elements
        this.cacheElements();
    }

    /**
     * Cache DOM elements for easy access
     */
    cacheElements() {
        this.elements = {
            widget: document.getElementById(this.widgetId),
            chatWindow: document.getElementById(`${this.widgetId}-chat-window`),
            welcome: document.getElementById(`${this.widgetId}-welcome`),
            messageInput: document.getElementById(`${this.widgetId}-message-input`),
            sendBtn: document.getElementById(`${this.widgetId}-send-btn`),
            status: document.getElementById(`${this.widgetId}-status`),
            agentName: document.getElementById(`${this.widgetId}-agent-name`),
            settingsBtn: document.getElementById(`${this.widgetId}-settings-btn`)
        };

        if (this.features.fileUpload) {
            this.elements.fileInput = document.getElementById(`${this.widgetId}-file-input`);
            this.elements.attachBtn = document.getElementById(`${this.widgetId}-attach-btn`);
            this.elements.filePreview = document.getElementById(`${this.widgetId}-file-preview`);
            this.elements.fileName = document.getElementById(`${this.widgetId}-file-name`);
            this.elements.fileSize = document.getElementById(`${this.widgetId}-file-size`);
            this.elements.removeFileBtn = document.getElementById(`${this.widgetId}-remove-file-btn`);
        }

        if (this.features.voiceInput) {
            this.elements.voiceBtn = document.getElementById(`${this.widgetId}-voice-btn`);
        }

        if (this.features.suggestedActions) {
            this.elements.suggestedActions = document.getElementById(`${this.widgetId}-suggested-actions`);
        }

        if (this.features.citations) {
            this.elements.citationBtn = document.getElementById(`${this.widgetId}-citation-btn`);
            this.elements.citationPanel = document.getElementById(`${this.widgetId}-citation-panel`);
            this.elements.citationFrame = document.getElementById(`${this.widgetId}-citation-frame`);
            this.elements.closeCitationBtn = document.getElementById(`${this.widgetId}-close-citation-btn`);
        }
    }

    /**
     * Initialize components (DirectLine, MessageQueue, etc.)
     */
    async initializeComponents() {
        console.log('Initializing chat widget components...');

        // Initialize typing indicator if enabled
        if (this.features.typing) {
            this.typingIndicator = this.createTypingIndicator();
        }

        // Initialize message renderer
        this.messageRenderer = this.createMessageRenderer();

        console.log('Components initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Send button click
        this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());

        // Enter key in message input
        this.elements.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // File upload
        if (this.features.fileUpload) {
            this.elements.attachBtn?.addEventListener('click', () => {
                this.elements.fileInput?.click();
            });

            this.elements.fileInput?.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files[0]);
            });

            this.elements.removeFileBtn?.addEventListener('click', () => {
                this.removeFile();
            });
        }

        // Voice input
        if (this.features.voiceInput) {
            this.elements.voiceBtn?.addEventListener('click', () => {
                this.toggleVoiceInput();
            });
        }

        // Citations
        if (this.features.citations) {
            this.elements.citationBtn?.addEventListener('click', () => {
                this.toggleCitationPanel();
            });

            this.elements.closeCitationBtn?.addEventListener('click', () => {
                this.closeCitationPanel();
            });
        }

        // Settings
        this.elements.settingsBtn?.addEventListener('click', () => {
            this.showSettings();
        });

        console.log('Event listeners setup completed');
    }

    /**
     * Connect to DirectLine service
     */
    async connect() {
        try {
            console.log('Connecting to DirectLine...');
            
            if (this.directLineConnector) {
                // Use provided DirectLineConnector instance
                await this.directLineConnector.connect();
                this.setupDirectLineListeners();
            } else if (this.directLineSecret) {
                // Create new DirectLineConnector instance
                // This would require importing DirectLineConnector
                console.warn('DirectLineConnector not provided, cannot connect');
                return;
            }

            this.updateConnectionStatus(true);
            console.log('Connected to DirectLine successfully');
            
        } catch (error) {
            console.error('Failed to connect to DirectLine:', error);
            this.updateConnectionStatus(false);
            this.callbacks.onError(error);
            throw error;
        }
    }

    /**
     * Setup DirectLine event listeners
     */
    setupDirectLineListeners() {
        if (!this.directLineConnector) return;

        console.log('Setting up DirectLine listeners...');

        // Get the actual DirectLine instance
        const directLine = this.directLineConnector.getDirectLine();
        if (!directLine) {
            console.warn('DirectLine instance not available');
            return;
        }

        // Listen for incoming activities
        if (directLine.activity$) {
            directLine.activity$.subscribe(activity => {
                if (activity.from.id !== 'user') {  // Only handle bot messages
                    this.handleIncomingMessage(activity);
                }
            });
            console.log('Subscribed to DirectLine activities');
        } else {
            console.warn('DirectLine activity$ not available');
        }

        // Listen for connection status changes via DirectLineConnector callbacks
        this.directLineConnector.setCallback('onConnectionStatusChange', (status) => {
            this.updateConnectionStatus(status === 'connected' || status === 2);
        });

        // Listen for errors
        this.directLineConnector.setCallback('onError', (error) => {
            console.error('DirectLine error:', error);
            this.callbacks.onError(error);
        });
    }

    /**
     * Send a message
     */
    async sendMessage() {
        const messageText = this.elements.messageInput?.value?.trim();
        if (!messageText && !this.state.currentFile) return;

        try {
            // Clear input
            if (this.elements.messageInput) {
                this.elements.messageInput.value = '';
            }

            // Add user message to UI
            if (messageText) {
                this.addMessageToUI({
                    id: this.generateMessageId(),
                    text: messageText,
                    from: { id: 'user', name: 'You' },
                    type: 'message',
                    timestamp: new Date(),
                    attachments: this.state.currentFile ? [this.state.currentFile] : []
                });
            }

            // Send via DirectLine
            if (this.directLineConnector) {
                if (this.state.currentFile) {
                    // Note: File sending needs to be implemented in DirectLineConnector
                    await this.directLineConnector.sendMessage(messageText);
                    console.warn('File upload not yet implemented with DirectLineConnector');
                } else {
                    await this.directLineConnector.sendMessage(messageText);
                }
            }

            // Clear file
            this.removeFile();

            // Callback
            this.callbacks.onMessageSent({ text: messageText, file: this.state.currentFile });

        } catch (error) {
            console.error('Failed to send message:', error);
            this.callbacks.onError(error);
        }
    }

    /**
     * Handle incoming message from DirectLine
     */
    handleIncomingMessage(activity) {
        console.log('Received message:', activity);

        // Add to UI
        this.addMessageToUI({
            id: activity.id || this.generateMessageId(),
            text: activity.text,
            from: { id: 'bot', name: 'Assistant' },
            type: activity.type,
            timestamp: new Date(activity.timestamp),
            attachments: activity.attachments || [],
            suggestedActions: activity.suggestedActions,
            adaptiveCard: this.extractAdaptiveCard(activity)
        });

        // Add to UnifiedMessageQueue if available
        if (this.unifiedMessageQueue) {
            this.unifiedMessageQueue.addMessage({
                id: activity.id,
                text: activity.text,
                from: activity.from,
                timestamp: activity.timestamp,
                type: 'bot'
            });
        }

        // Callback
        this.callbacks.onMessageReceived(activity);
    }

    /**
     * Add message to UI
     */
    addMessageToUI(message) {
        // Hide welcome message
        if (this.elements.welcome) {
            this.elements.welcome.style.display = 'none';
        }

        // Create message element
        const messageElement = this.createMessageElement(message);
        
        // Add to chat window
        this.elements.chatWindow?.appendChild(messageElement);
        
        // Scroll to bottom
        this.scrollToBottom();

        // Update suggested actions
        if (this.features.suggestedActions && message.suggestedActions) {
            this.updateSuggestedActions(message.suggestedActions);
        }
    }

    /**
     * Create message element
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.from.id === 'user' ? 'user-message' : 'bot-message'}`;
        messageDiv.dataset.messageId = message.id;

        let content = `
            <div class="message-header">
                <span class="message-author">${message.from.name || message.from.id}</span>
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            </div>
        `;

        // Add text content
        if (message.text) {
            content += `<div class="message-text">${this.renderMessageText(message.text)}</div>`;
        }

        // Add adaptive card
        if (this.features.adaptiveCards && message.adaptiveCard) {
            content += `<div class="adaptive-card-container">${this.renderAdaptiveCard(message.adaptiveCard)}</div>`;
        }

        // Add attachments
        if (message.attachments && message.attachments.length > 0) {
            content += this.renderAttachments(message.attachments);
        }

        messageDiv.innerHTML = content;
        return messageDiv;
    }

    /**
     * Render message text with markdown support
     */
    renderMessageText(text) {
        if (!text) return '';
        
        // Basic markdown rendering
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Extract adaptive card from activity
     */
    extractAdaptiveCard(activity) {
        if (!activity.attachments) return null;
        
        const adaptiveCardAttachment = activity.attachments.find(
            att => att.contentType === 'application/vnd.microsoft.card.adaptive'
        );
        
        return adaptiveCardAttachment?.content || null;
    }

    /**
     * Render adaptive card
     */
    renderAdaptiveCard(cardContent) {
        if (!this.features.adaptiveCards || !cardContent) return '';
        
        // Basic adaptive card rendering - can be enhanced with AdaptiveCards SDK
        return `<div class="adaptive-card-placeholder">Adaptive Card: ${JSON.stringify(cardContent).slice(0, 100)}...</div>`;
    }

    /**
     * Render attachments
     */
    renderAttachments(attachments) {
        return attachments.map(attachment => {
            if (attachment.contentType?.startsWith('image/')) {
                return `<img src="${attachment.contentUrl}" alt="Attachment" class="message-image" />`;
            } else {
                return `<a href="${attachment.contentUrl}" target="_blank" class="message-attachment">📎 ${attachment.name || 'Attachment'}</a>`;
            }
        }).join('');
    }

    /**
     * Handle file selection
     */
    handleFileSelection(file) {
        if (!file) return;

        this.state.currentFile = file;
        
        // Show file preview
        if (this.elements.filePreview) {
            this.elements.fileName.textContent = file.name;
            this.elements.fileSize.textContent = this.formatFileSize(file.size);
            this.elements.filePreview.style.display = 'block';
        }
    }

    /**
     * Remove selected file
     */
    removeFile() {
        this.state.currentFile = null;
        
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
        
        if (this.elements.filePreview) {
            this.elements.filePreview.style.display = 'none';
        }
    }

    /**
     * Update suggested actions
     */
    updateSuggestedActions(suggestedActions) {
        if (!this.features.suggestedActions || !this.elements.suggestedActions || !suggestedActions?.actions) {
            return;
        }

        const actionsHtml = suggestedActions.actions.map(action => `
            <button class="suggested-action-btn" data-action-type="${action.type}" data-action-value="${action.value}">
                ${action.title}
            </button>
        `).join('');

        this.elements.suggestedActions.innerHTML = actionsHtml;
        this.elements.suggestedActions.style.display = actionsHtml ? 'block' : 'none';

        // Add click handlers
        this.elements.suggestedActions.querySelectorAll('.suggested-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const actionType = btn.dataset.actionType;
                const actionValue = btn.dataset.actionValue;
                
                if (actionType === 'imBack' || actionType === 'postBack') {
                    this.elements.messageInput.value = actionValue;
                    this.sendMessage();
                }
                
                // Hide suggested actions after use
                this.elements.suggestedActions.style.display = 'none';
            });
        });
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(isConnected) {
        this.state.isConnected = isConnected;
        
        if (this.elements.status) {
            this.elements.status.textContent = isConnected ? 'Connected' : 'Disconnected';
            this.elements.status.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
        }

        this.callbacks.onConnectionStatusChanged(isConnected);
    }

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        if (this.elements.welcome) {
            this.elements.welcome.style.display = 'block';
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        if (this.elements.chatWindow) {
            this.elements.chatWindow.scrollTop = this.elements.chatWindow.scrollHeight;
        }
    }

    /**
     * Create typing indicator
     */
    createTypingIndicator() {
        return {
            show: () => {
                if (!this.state.isTyping) {
                    const typingDiv = document.createElement('div');
                    typingDiv.className = 'typing-indicator';
                    typingDiv.id = `${this.widgetId}-typing`;
                    typingDiv.innerHTML = `
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    `;
                    this.elements.chatWindow?.appendChild(typingDiv);
                    this.scrollToBottom();
                    this.state.isTyping = true;
                }
            },
            hide: () => {
                const typingElement = document.getElementById(`${this.widgetId}-typing`);
                if (typingElement) {
                    typingElement.remove();
                    this.state.isTyping = false;
                }
            }
        };
    }

    /**
     * Create message renderer
     */
    createMessageRenderer() {
        return {
            renderMessage: (message) => this.addMessageToUI(message),
            renderTyping: () => this.typingIndicator?.show(),
            hideTyping: () => this.typingIndicator?.hide()
        };
    }

    /**
     * Utility methods
     */
    generateMessageId() {
        return 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Voice input methods (placeholder)
     */
    toggleVoiceInput() {
        console.log('Voice input toggle - feature placeholder');
    }

    /**
     * Citation methods (placeholder)
     */
    toggleCitationPanel() {
        if (this.elements.citationPanel) {
            const isVisible = this.elements.citationPanel.style.display !== 'none';
            this.elements.citationPanel.style.display = isVisible ? 'none' : 'block';
        }
    }

    closeCitationPanel() {
        if (this.elements.citationPanel) {
            this.elements.citationPanel.style.display = 'none';
        }
    }

    /**
     * Settings method (placeholder)
     */
    showSettings() {
        console.log('Settings - feature placeholder');
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('enhanced-chat-widget-styles')) return;

        const style = document.createElement('style');
        style.id = 'enhanced-chat-widget-styles';
        style.textContent = `
            .enhanced-chat-widget {
                display: flex;
                flex-direction: column;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
            }

            .enhanced-chat-widget.default {
                /* Default theme styles */
            }

            /* Header */
            .chat-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #e0e0e0;
            }

            .header-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .connection-status {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .connection-status.connected {
                background: #d4edda;
                color: #155724;
            }

            .connection-status.disconnected {
                background: #f8d7da;
                color: #721c24;
            }

            .agent-name {
                font-weight: 500;
                color: #495057;
            }

            .header-actions {
                display: flex;
                gap: 8px;
            }

            .header-btn {
                background: none;
                border: none;
                padding: 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }

            .header-btn:hover {
                background: #e9ecef;
            }

            /* Chat Window */
            .chat-window {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                min-height: 300px;
                max-height: 400px;
            }

            .welcome-container {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
            }

            .welcome-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .welcome-container h4 {
                margin: 0 0 8px 0;
                color: #495057;
            }

            .welcome-container p {
                margin: 0;
                font-size: 14px;
            }

            /* Messages */
            .message {
                margin-bottom: 16px;
                max-width: 80%;
            }

            .message.user-message {
                margin-left: auto;
            }

            .message.bot-message {
                margin-right: auto;
            }

            .message-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                font-size: 12px;
                color: #6c757d;
            }

            .message-author {
                font-weight: 500;
            }

            .message-text {
                padding: 12px 16px;
                border-radius: 18px;
                line-height: 1.4;
                word-wrap: break-word;
            }

            .user-message .message-text {
                background: #007bff;
                color: white;
                margin-left: auto;
            }

            .bot-message .message-text {
                background: #f8f9fa;
                color: #212529;
                border: 1px solid #e9ecef;
            }

            .message-image {
                max-width: 100%;
                border-radius: 8px;
                margin-top: 8px;
            }

            .message-attachment {
                display: inline-block;
                padding: 8px 12px;
                background: #e9ecef;
                border-radius: 4px;
                text-decoration: none;
                color: #495057;
                margin-top: 8px;
            }

            .message-attachment:hover {
                background: #dee2e6;
            }

            /* Typing Indicator */
            .typing-indicator {
                margin-bottom: 16px;
                max-width: 80%;
            }

            .typing-dots {
                display: flex;
                padding: 12px 16px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 18px;
                width: fit-content;
            }

            .typing-dots span {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #6c757d;
                margin: 0 2px;
                animation: typing 1.4s infinite ease-in-out;
            }

            .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
            .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

            @keyframes typing {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }

            /* Suggested Actions */
            .suggested-actions-container {
                padding: 8px 16px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
            }

            .suggested-action-btn {
                margin: 4px 8px 4px 0;
                padding: 8px 16px;
                background: white;
                border: 1px solid #007bff;
                color: #007bff;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
            }

            .suggested-action-btn:hover {
                background: #007bff;
                color: white;
            }

            /* Input Container */
            .input-container {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-top: 1px solid #e0e0e0;
                background: #ffffff;
                gap: 8px;
            }

            .message-input-wrapper {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .message-input {
                flex: 1;
                border: 1px solid #ced4da;
                border-radius: 20px;
                padding: 8px 16px;
                font-size: 14px;
                outline: none;
            }

            .message-input:focus {
                border-color: #007bff;
            }

            .input-btn {
                background: none;
                border: none;
                padding: 8px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .input-btn:hover {
                background: #f8f9fa;
            }

            .input-btn.primary {
                background: #007bff;
                color: white;
            }

            .input-btn.primary:hover {
                background: #0056b3;
            }

            /* File Preview */
            .file-preview-container {
                padding: 8px 16px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
            }

            .file-preview {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 4px;
            }

            .file-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .file-name {
                font-weight: 500;
                font-size: 14px;
            }

            .file-size {
                font-size: 12px;
                color: #6c757d;
            }

            .remove-file-btn {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 18px;
                color: #dc3545;
                padding: 4px;
            }

            .remove-file-btn:hover {
                background: #f8d7da;
                border-radius: 4px;
            }

            /* Citation Panel */
            .citation-preview-panel {
                position: absolute;
                top: 0;
                right: 0;
                width: 40%;
                height: 100%;
                background: white;
                border-left: 1px solid #e0e0e0;
                display: flex;
                flex-direction: column;
            }

            .citation-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
            }

            .citation-header h4 {
                margin: 0;
                font-size: 16px;
            }

            .close-citation-btn {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 18px;
                padding: 4px;
            }

            .close-citation-btn:hover {
                background: #e9ecef;
                border-radius: 4px;
            }

            .citation-frame {
                flex: 1;
                border: none;
            }

            /* Adaptive Cards */
            .adaptive-card-container {
                margin-top: 8px;
                padding: 12px;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                background: #f8f9fa;
            }

            .adaptive-card-placeholder {
                font-style: italic;
                color: #6c757d;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .message {
                    max-width: 90%;
                }
                
                .citation-preview-panel {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Destroy the widget
     */
    destroy() {
        if (this.elements.widget) {
            this.elements.widget.remove();
        }
        
        // Clean up event listeners, connections, etc.
        if (this.directLineConnector) {
            this.directLineConnector.disconnect?.();
        }
        
        this.isInitialized = false;
        console.log('EnhancedChatWidget destroyed');
    }
}

// Export for use as ES6 module
export default EnhancedChatWidget;

// Global exposure for non-module environments
if (typeof window !== 'undefined') {
    window.EnhancedChatWidget = EnhancedChatWidget;
    console.log('EnhancedChatWidget exposed to window object');
}
