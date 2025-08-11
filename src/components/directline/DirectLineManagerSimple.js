/**
 * DirectLine Manager Compatibility Wrapper
 * 
 * This wrapper provides a simplified version of the new DirectLine component
 * that's compatible with the existing application setup, removing complex
 * auto-loading features that may conflict with the pre-loaded DirectLine library.
 */

import { Utils } from '../../utils/helpers.js';

export class DirectLineManager {
    constructor() {
        // Core DirectLine instance
        this.directLine = null;

        // Callback handlers for external integration (same as old service)
        this.connectionCallbacks = {
            onActivity: null,
            onConnectionStatusChange: null,
            onError: null
        };

        // Streaming and timing state (same as old service)
        this.lastMessageTime = null;
        this.typingTimeout = null;

        // Bind methods for event handlers
        this.handleActivity = this.handleActivity.bind(this);
        this.handleConnectionStatusChange = this.handleConnectionStatusChange.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Initialize DirectLine connection (simplified, compatible version)
     * @param {string} secret - DirectLine secret key
     * @returns {Promise<boolean>} Success status
     */
    async initialize(secret) {
        try {
            console.log('Initializing DirectLine connection...');

            // Check if DirectLine library is available (same as old service)
            if (typeof DirectLine === 'undefined') {
                throw new Error('DirectLine library is not loaded. Please check your internet connection and refresh the page.');
            }

            // Validate secret
            if (!secret || typeof secret !== 'string') {
                throw new Error('DirectLine secret is required and must be a string');
            }

            // Close existing connection if any (same as old service)
            if (this.directLine) {
                this.directLine.end();
            }

            // Create DirectLine with same configuration as old service
            this.directLine = new DirectLine.DirectLine({
                secret: secret,
                webSocket: true,
                timeout: 20000, // 20 second timeout
                conversationId: undefined, // Let DirectLine create new conversation
                // Enhanced WebSocket configuration for optimal streaming
                streamUrl: null, // Will be auto-generated
                watermark: null, // Start from beginning
                pollingInterval: 1000, // 1 second polling fallback
                domain: 'https://directline.botframework.com/v3/directline'
            });

            // Set up subscriptions with enhanced error handling
            this.setupSubscriptions();

            console.log('DirectLine initialized successfully with WebSocket streaming');
            return true;

        } catch (error) {
            console.error('Error initializing DirectLine:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * Set up DirectLine subscriptions (simplified from new component)
     * @private
     */
    setupSubscriptions() {
        if (!this.directLine) return;

        try {
            // Subscribe to activities
            this.directLine.activity$.subscribe(
                this.handleActivity,
                this.handleError
            );

            // Subscribe to connection status changes
            this.directLine.connectionStatus$.subscribe(
                this.handleConnectionStatusChange,
                this.handleError
            );

        } catch (error) {
            console.error('Error setting up DirectLine subscriptions:', error);
            throw error;
        }
    }

    /**
     * Handle incoming activities
     * @private
     */
    handleActivity(activity) {
        try {
            // Handle typing indicator
            if (activity.type === 'typing') {
                this.handleTypingIndicator();
                return;
            }

            // Clear typing timeout when any other activity is received
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
                this.typingTimeout = null;
            }

            // Only process activities from bot (not user)
            if (activity.from && activity.from.id !== 'user') {
                if (activity.type === 'message') {
                    this.handleMessageActivity(activity);
                } else if (activity.type === 'conversationUpdate') {
                    this.handleConversationUpdate(activity);
                } else if (activity.type === 'event') {
                    this.handleEventActivity(activity);
                }
            }

            // Also call the callback if set
            if (this.connectionCallbacks.onActivity) {
                this.connectionCallbacks.onActivity(activity);
            }
        } catch (error) {
            console.error('Error handling activity:', error);
        }
    }

    /**
     * Handle typing indicator (simplified version)
     * @private
     */
    handleTypingIndicator() {
        // Dispatch typing indicator event for application
        window.dispatchEvent(new CustomEvent('showTypingIndicator', {
            detail: { source: 'directline' }
        }));

        // Auto-hide after 5 seconds
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        this.typingTimeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('hideTypingIndicator', {
                detail: { source: 'directline' }
            }));
        }, 5000);
    }

    /**
     * Handle message activities (same as legacy)
     * @private
     */
    handleMessageActivity(activity) {
        console.log('Processing message activity:', activity);

        // Hide typing indicator
        window.dispatchEvent(new CustomEvent('hideTypingIndicator'));

        // Dispatch complete message event (same as legacy)
        window.dispatchEvent(new CustomEvent('completeMessage', {
            detail: {
                ...activity,
                streamingMetadata: {
                    timestamp: Date.now(),
                    isImmediate: true
                }
            }
        }));

        // Update last message time
        this.lastMessageTime = Date.now();
    }

    /**
     * Handle conversation update activities
     * @private
     */
    handleConversationUpdate(activity) {
        console.log('Processing conversation update:', activity);
        window.dispatchEvent(new CustomEvent('conversationUpdate', { detail: activity }));
    }

    /**
     * Handle event activities  
     * @private
     */
    handleEventActivity(activity) {
        console.log('Processing event activity:', activity);
        window.dispatchEvent(new CustomEvent('eventActivity', { detail: activity }));
    }

    /**
     * Handle connection status changes
     * @private
     */
    handleConnectionStatusChange(status) {
        try {
            // Log status changes
            console.log('DirectLine connection status changed:', status);

            // Handle automatic greeting when connection goes online (same as legacy)
            switch (status) {
                case 2: // ConnectionStatus.Online
                    console.log('The bot is online!');
                    // Wait a moment for the connection to stabilize, then send comprehensive greeting
                    setTimeout(() => {
                        this.sendGreeting();
                    }, 1000);
                    break;

                case 0: // ConnectionStatus.Uninitialized
                    console.log('DirectLine uninitialized');
                    break;

                case 1: // ConnectionStatus.Connecting
                    console.log('DirectLine connecting...');
                    break;

                case 3: // ConnectionStatus.ExpiredToken
                    console.log('DirectLine token expired');
                    break;

                case 4: // ConnectionStatus.FailedToConnect
                    console.log('DirectLine failed to connect');
                    break;

                case 5: // ConnectionStatus.Ended
                    console.log('DirectLine connection ended');
                    break;
            }

            // Pass status to application callback
            if (this.connectionCallbacks.onConnectionStatusChange) {
                this.connectionCallbacks.onConnectionStatusChange(status);
            }
        } catch (error) {
            console.error('Error handling connection status change:', error);
        }
    }

    /**
     * Handle errors
     * @private
     */
    handleError(error) {
        try {
            console.error('DirectLine error:', error);
            if (this.connectionCallbacks.onError) {
                this.connectionCallbacks.onError(error);
            }
        } catch (handlerError) {
            console.error('Error in error handler:', handlerError);
        }
    }

    /**
     * Handle initialization errors (from old service)
     * @private
     */
    handleInitializationError(error) {
        let errorMessage = 'Failed to initialize bot connection. Please check your settings.';

        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid DirectLine secret. Please check your configuration.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'DirectLine secret does not have permission. Please check your Azure Bot configuration.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network connection failed. Please check your internet connection.';
        }

        if (this.connectionCallbacks.onError) {
            this.connectionCallbacks.onError(new Error(errorMessage));
        }
    }

    /**
     * Set callback handlers
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        if (callbacks && typeof callbacks === 'object') {
            this.connectionCallbacks = {
                ...this.connectionCallbacks,
                ...callbacks
            };
        }
    }

    /**
     * Send a message (same signature as old service)
     * @param {string} text - Message text
     * @param {Array} attachments - Message attachments
     * @returns {Promise} Send promise
     */
    async sendMessage(text, attachments = []) {
        if (!this.directLine) {
            throw new Error('DirectLine not initialized');
        }

        try {
            const activity = {
                type: 'message',
                text: text,
                from: { id: 'user' },
                attachments: attachments || []
            };

            return this.directLine.postActivity(activity).subscribe();
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Send greeting message (comprehensive approach from legacy service)
     */
    sendGreeting() {
        if (!this.directLine) {
            throw new Error('DirectLine not initialized');
        }

        console.log('Attempting to trigger greeting message...');

        try {
            // Method 1: Send conversationUpdate event (most common for greeting)
            this.directLine.postActivity({
                from: { id: 'user' },
                type: 'conversationUpdate',
                membersAdded: [{ id: 'user' }]
            }).subscribe(
                id => console.log('conversationUpdate event sent, id:', id),
                error => console.error('Error sending conversationUpdate event:', error)
            );

            // Method 2: Send startConversation event (backup)
            setTimeout(() => {
                this.directLine.postActivity({
                    from: { id: 'user' },
                    type: 'event',
                    name: 'startConversation',
                    value: ''
                }).subscribe(
                    id => console.log('startConversation event sent, id:', id),
                    error => console.error('Error sending startConversation event:', error)
                );
            }, 500);

            // Method 3: Send webchat/join event (alternative approach)
            setTimeout(() => {
                this.directLine.postActivity({
                    from: { id: 'user' },
                    type: 'event',
                    name: 'webchat/join',
                    value: ''
                }).subscribe(
                    id => console.log('webchat/join event sent, id:', id),
                    error => console.error('Error sending webchat/join event:', error)
                );
            }, 1000);

            // Method 4: If no greeting after 3 seconds, send an empty message (last resort)
            setTimeout(() => {
                // Check if we've received any bot messages yet
                try {
                    const chatHistoryData = localStorage.getItem('chatHistory');
                    let chatHistory = [];

                    if (chatHistoryData) {
                        if (typeof chatHistoryData !== 'string') {
                            console.error('Chat history data is not a string:', typeof chatHistoryData);
                            localStorage.removeItem('chatHistory');
                        } else {
                            chatHistory = JSON.parse(chatHistoryData);
                        }
                    }

                    const currentSession = sessionStorage.getItem('currentSession') || 'default';
                    const currentSessionMessages = chatHistory.filter(entry => entry.session === currentSession);

                    // Only send empty message if no bot messages received yet
                    if (currentSessionMessages.filter(msg => msg.sender === 'bot').length === 0) {
                        console.log('No greeting received, sending empty message...');
                        this.directLine.postActivity({
                            from: { id: 'user' },
                            type: 'message',
                            text: ''
                        }).subscribe(
                            id => console.log('Empty message sent to trigger greeting, id:', id),
                            error => console.error('Error sending empty message:', error)
                        );
                    }
                } catch (error) {
                    console.error('Error checking chat history for greeting:', error);
                }
            }, 3000);

        } catch (error) {
            console.error('Error sending greeting:', error);
        }
    }

    /**
     * Disconnect DirectLine
     */
    disconnect() {
        if (this.directLine) {
            try {
                this.directLine.end();
            } catch (error) {
                console.warn('Error disconnecting DirectLine:', error);
            }
            this.directLine = null;
        }
    }

    /**
     * Restart connection with new secret (from old service)
     * @param {string} secret - New DirectLine secret
     * @returns {Promise<boolean>} Success status
     */
    async restart(secret) {
        this.disconnect();
        return await this.initialize(secret);
    }
}

// Create and export singleton instance for backward compatibility
export const directLineManager = new DirectLineManager();
