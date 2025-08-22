/**
 * Message Renderer Adapter
 * 
 * Adapts the unified message queue to the existing message renderer system
 */

export class MessageRendererAdapter {
    constructor(messageQueue, messageRenderer) {
        this.messageQueue = messageQueue;
        this.messageRenderer = messageRenderer;
        this.subscriptions = [];
        
        console.log('🎨 MessageRendererAdapter initialized');
        this.setupSubscriptions();
    }

    /**
     * Set up message queue subscriptions
     * @private
     */
    setupSubscriptions() {
        // Subscribe to bot messages (main content)
        const botMessageSub = this.messageQueue.subscribe(
            'bot-message',
            (message) => this.handleBotMessage(message),
            { priority: 10 }
        );
        this.subscriptions.push({ type: 'bot-message', id: botMessageSub });

        // Subscribe to user messages (for echo/confirmation)
        const userMessageSub = this.messageQueue.subscribe(
            'user-message', 
            (message) => this.handleUserMessage(message),
            { priority: 8 }
        );
        this.subscriptions.push({ type: 'user-message', id: userMessageSub });

        // Subscribe to typing indicators
        const typingSub = this.messageQueue.subscribe(
            'typing-indicator',
            (message) => this.handleTypingIndicator(message),
            { priority: 5 }
        );
        this.subscriptions.push({ type: 'typing-indicator', id: typingSub });

        // Subscribe to connection status for UI updates
        const connectionSub = this.messageQueue.subscribe(
            'connection-status',
            (message) => this.handleConnectionStatus(message),
            { priority: 15 }
        );
        this.subscriptions.push({ type: 'connection-status', id: connectionSub });

        // Subscribe to errors for user notification
        const errorSub = this.messageQueue.subscribe(
            'error',
            (message) => this.handleError(message),
            { priority: 20 }
        );
        this.subscriptions.push({ type: 'error', id: errorSub });

        console.log(`🎨 Set up ${this.subscriptions.length} message queue subscriptions`);
    }

    /**
     * Handle bot messages
     * @private
     * @param {Object} message - Message from queue
     */
    async handleBotMessage(message) {
        console.log('🎨 Rendering bot message:', message.id);
        
        const activity = message.data.originalActivity;
        
        try {
            // Check if this is a valid bot message to render
            if (!activity.text && (!activity.attachments || activity.attachments.length === 0)) {
                console.log('🎨 Skipping empty bot message');
                return;
            }

            // Create a compatible message object for the renderer
            const rendererMessage = {
                id: activity.id || message.id,
                text: activity.text || '',
                sender: 'bot',
                timestamp: activity.timestamp || message.timestamp,
                attachments: activity.attachments || [],
                suggestedActions: activity.suggestedActions,
                from: activity.from,
                channelData: activity.channelData,
                // Add streaming metadata for compatibility
                streamingMetadata: {
                    timestamp: Date.now(),
                    isImmediate: true,
                    source: 'directline'
                }
            };

            // Trigger message rendering through the existing system
            this.renderMessage(rendererMessage);

        } catch (error) {
            console.error('🎨 Error rendering bot message:', error);
        }
    }

    /**
     * Handle user messages 
     * @private
     * @param {Object} message - Message from queue
     */
    handleUserMessage(message) {
        console.log('🎨 Processing user message:', message.id);
        
        // User messages are typically just logged, not rendered in chat
        // They're already shown in the input area
        const activity = message.data.originalActivity;
        
        if (activity.text) {
            console.log('🎨 User sent:', activity.text);
        }
    }

    /**
     * Handle typing indicators
     * @private
     * @param {Object} message - Message from queue
     */
    handleTypingIndicator(message) {
        console.log('🎨 Showing typing indicator');
        
        // Show typing indicator
        window.dispatchEvent(new CustomEvent('showTypingIndicator', {
            detail: { 
                source: 'messagequeue',
                timestamp: message.timestamp
            }
        }));

        // Auto-hide after 5 seconds if no other activity
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('hideTypingIndicator', {
                detail: { 
                    source: 'messagequeue',
                    timestamp: Date.now()
                }
            }));
        }, 5000);
    }

    /**
     * Handle connection status changes
     * @private
     * @param {Object} message - Message from queue
     */
    handleConnectionStatus(message) {
        console.log('🎨 Connection status update:', message.data.statusName);
        
        const { status, statusName, isConnected } = message.data;
        
        // Update UI elements based on connection status
        switch (status) {
            case 1: // Connecting
                this.showConnectionStatus('Connecting to bot...', 'connecting');
                break;
            case 2: // Online
                this.showConnectionStatus('Connected', 'connected');
                // Hide status after a moment
                setTimeout(() => this.hideConnectionStatus(), 2000);
                break;
            case 4: // Failed to connect
                this.showConnectionStatus('Connection failed', 'error');
                break;
            case 5: // Ended
                this.showConnectionStatus('Disconnected', 'disconnected');
                break;
        }
    }

    /**
     * Handle errors
     * @private
     * @param {Object} message - Message from queue
     */
    handleError(message) {
        console.error('🎨 Handling error:', message.data.error.message);
        
        // Show error notification to user
        this.showErrorNotification(message.data.error.message);
    }

    /**
     * Render message using the existing message renderer
     * @private
     * @param {Object} message - Message to render
     */
    renderMessage(message) {
        console.log('🎨 Dispatching message for rendering:', message.id);
        
        // Use the existing event system to trigger message rendering
        window.dispatchEvent(new CustomEvent('completeMessage', {
            detail: message
        }));
    }

    /**
     * Show connection status
     * @private
     * @param {string} message - Status message
     * @param {string} type - Status type
     */
    showConnectionStatus(message, type) {
        window.dispatchEvent(new CustomEvent('connectionStatus', {
            detail: { message, type, timestamp: Date.now() }
        }));
    }

    /**
     * Hide connection status
     * @private
     */
    hideConnectionStatus() {
        window.dispatchEvent(new CustomEvent('hideConnectionStatus', {
            detail: { timestamp: Date.now() }
        }));
    }

    /**
     * Show error notification
     * @private
     * @param {string} errorMessage - Error message to show
     */
    showErrorNotification(errorMessage) {
        window.dispatchEvent(new CustomEvent('errorNotification', {
            detail: { 
                message: errorMessage, 
                timestamp: Date.now(),
                type: 'directline-error'
            }
        }));
    }

    /**
     * Disconnect and clean up subscriptions
     */
    disconnect() {
        console.log('🎨 Disconnecting message renderer adapter');
        
        // Unsubscribe from all message queue events
        this.subscriptions.forEach(sub => {
            this.messageQueue.unsubscribe(sub.type, sub.id);
        });
        
        this.subscriptions = [];
    }

    /**
     * Get adapter statistics
     * @returns {Object} Adapter statistics
     */
    getStats() {
        return {
            subscriptions: this.subscriptions.length,
            messageRenderer: !!this.messageRenderer,
            messageQueue: !!this.messageQueue
        };
    }
}

export default MessageRendererAdapter;
