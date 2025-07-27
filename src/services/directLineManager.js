/**
 * DirectLine Connection Manager
 * Handles Microsoft Bot Framework DirectLine API connections and subscriptions
 */

import { Utils } from '../utils/helpers.js';

export class DirectLineManager {
    constructor() {
        this.directLine = null;
        this.connectionCallbacks = {
            onActivity: null,
            onConnectionStatusChange: null,
            onError: null
        };
        this.lastMessageTime = null;
        this.typingTimeout = null;
    }

    /**
     * Initialize DirectLine connection (enhanced with legacy's error handling)
     * @param {string} secret - DirectLine secret
     * @returns {Promise<boolean>} Success status
     */
    async initialize(secret) {
        try {
            console.log('Initializing DirectLine connection...');

            // Check if DirectLine library is available
            if (typeof DirectLine === 'undefined') {
                throw new Error('DirectLine library is not loaded. Please check your internet connection and refresh the page.');
            }

            // Close existing connection if any
            if (this.directLine) {
                this.directLine.end();
            }

            // Create DirectLine with optimized settings
            this.directLine = new DirectLine.DirectLine({
                secret: secret,
                webSocket: true,
                timeout: 20000, // 20 second timeout
                conversationId: undefined // Let DirectLine create new conversation
            });

            // Set up subscriptions
            this.setupSubscriptions();

            console.log('DirectLine initialized successfully');
            return true;

        } catch (error) {
            console.error('Error initializing DirectLine:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * Handle initialization errors with specific error messages (from legacy)
     * @param {Error} error - Initialization error
     * @private
     */
    handleInitializationError(error) {
        let errorMessage = 'Failed to initialize bot connection. Please check your settings.';

        if (error.message && error.message.includes('Invalid secret')) {
            errorMessage = 'Invalid DirectLine secret. Please check your bot configuration.';
        } else if (error.message && error.message.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message && error.message.includes('DirectLine library')) {
            errorMessage = error.message; // Use the specific library loading error message
        }

        this.handleError(new Error(errorMessage));
    }

    /**
     * Set up DirectLine subscriptions
     * @private
     */
    setupSubscriptions() {
        // Subscribe to activities
        this.directLine.activity$.subscribe(activity => {
            console.log('Received activity:', activity);
            this.handleActivity(activity);
        });

        // Subscribe to connection status changes
        this.directLine.connectionStatus$.subscribe(status => {
            console.log('Connection status changed:', status);
            this.handleConnectionStatusChange(status);
        });
    }

    /**
     * Handle incoming activity (fixed to prevent duplicate rendering)
     * @param {Object} activity - DirectLine activity
     * @private
     */
    handleActivity(activity) {
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

        // NOTE: Removed the callback notification here to prevent duplicate rendering
        // The application should only listen to the custom events we dispatch
    }

    /**
     * Handle typing indicator
     * @private
     */
    handleTypingIndicator() {
        // Notify typing indicator
        window.dispatchEvent(new CustomEvent('showTypingIndicator'));

        // Clear any existing typing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set a timeout to hide the typing indicator if no message follows
        this.typingTimeout = setTimeout(() => {
            console.log('Typing indicator timeout - hiding indicator');
            window.dispatchEvent(new CustomEvent('hideTypingIndicator'));
            this.typingTimeout = null;
        }, 10000); // Hide after 10 seconds if no message received
    }

    /**
     * Handle message activity
     * @param {Object} activity - Message activity
     * @private
     */
    handleMessageActivity(activity) {
        // Check if this is a streaming message
        const isStreamingMessage = activity.channelData && activity.channelData.streaming;
        const isStreamingEnd = activity.channelData && activity.channelData.streamingEnd;

        // Also detect streaming based on message patterns
        const couldBeStreaming = activity.text && activity.text.length > 0 && activity.text.length < 100;
        const now = Date.now();

        // If we received a short message within 2 seconds of the last one, treat as streaming
        if (couldBeStreaming && this.lastMessageTime && (now - this.lastMessageTime) < 2000) {
            window.dispatchEvent(new CustomEvent('streamingActivity', { detail: activity }));
        } else if (isStreamingMessage) {
            // This is a streaming message chunk
            window.dispatchEvent(new CustomEvent('streamingActivity', { detail: activity }));
        } else if (isStreamingEnd) {
            // This marks the end of streaming
            window.dispatchEvent(new CustomEvent('streamingEnd', { detail: activity }));
        } else {
            // Regular complete message - but simulate streaming for demo
            window.dispatchEvent(new CustomEvent('completeMessage', { detail: activity }));
        }

        // Update last message time
        this.lastMessageTime = now;
    }

    /**
     * Handle conversation update activity
     * @param {Object} activity - Conversation update activity
     * @private
     */
    handleConversationUpdate(activity) {
        console.log('Conversation updated:', activity);
        // If there's actual content, try to render it
        if (activity.text ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {
            window.dispatchEvent(new CustomEvent('conversationUpdate', { detail: activity }));
        }
    }

    /**
     * Handle event activity
     * @param {Object} activity - Event activity
     * @private
     */
    handleEventActivity(activity) {
        console.log('Event activity received:', activity);
        // Some bots send responses as events
        if (activity.text ||
            (activity.attachments && activity.attachments.length > 0) ||
            (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {
            window.dispatchEvent(new CustomEvent('eventActivity', { detail: activity }));
        }
    }

    /**
     * Handle connection status changes (using legacy's comprehensive approach)
     * @param {number} status - Connection status
     * @private
     */
    handleConnectionStatusChange(status) {
        switch (status) {
            case 1: // ConnectionStatus.Connecting
                console.log('Connecting to the bot...');
                window.dispatchEvent(new CustomEvent('connectionStatus', {
                    detail: { status: 'connecting', message: 'Connecting to bot...' }
                }));
                break;

            case 2: // ConnectionStatus.Online
                console.log('The bot is online!');
                window.dispatchEvent(new CustomEvent('connectionStatus', {
                    detail: { status: 'online', message: 'Bot connected! Waiting for response...' }
                }));

                // Wait a moment for the connection to stabilize, then send comprehensive greeting
                setTimeout(() => {
                    this.sendGreeting();
                }, 1000);
                break;

            case 3: // ConnectionStatus.ExpiredToken
                console.log('DirectLine token expired');
                window.dispatchEvent(new CustomEvent('connectionStatus', {
                    detail: {
                        status: 'expired',
                        message: 'Authentication token has expired. Please check your DirectLine secret.'
                    }
                }));
                this.handleError(new Error('Authentication token has expired. Please check your DirectLine secret.'));
                break;

            case 4: // ConnectionStatus.FailedToConnect
                console.log('Failed to connect to DirectLine');
                window.dispatchEvent(new CustomEvent('connectionStatus', {
                    detail: {
                        status: 'failed',
                        message: 'Failed to connect to the bot service. Please check your DirectLine secret and internet connection.'
                    }
                }));
                this.handleError(new Error('Failed to connect to the bot service. Please check your DirectLine secret and internet connection.'));
                break;

            case 5: // ConnectionStatus.Ended
                console.log('DirectLine connection ended');
                window.dispatchEvent(new CustomEvent('connectionStatus', {
                    detail: {
                        status: 'ended',
                        message: 'Connection to the bot has ended unexpectedly. Please try refreshing the page.'
                    }
                }));
                this.handleError(new Error('Connection to the bot has ended unexpectedly. Please try refreshing the page.'));
                break;

            default:
                console.log('Unknown connection status:', status);
                break;
        }

        // Notify callback
        if (this.connectionCallbacks.onConnectionStatusChange) {
            this.connectionCallbacks.onConnectionStatusChange(status);
        }
    }

    /**
     * Send greeting to trigger welcome message (using legacy's comprehensive approach)
     * Can be called externally to trigger greeting for new chat sessions
     */
    sendGreeting() {
        console.log('Attempting to trigger greeting message...');

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
            const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
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
        }, 3000);
    }

    /**
     * Send a message through DirectLine
     * @param {string} text - Message text
     * @param {Array} attachments - Optional attachments
     * @returns {Promise<string>} Message ID
     */
    async sendMessage(text, attachments = []) {
        if (!this.directLine) {
            throw new Error('DirectLine not initialized');
        }

        const activity = {
            from: { id: 'user' },
            type: 'message',
            text: text,
            attachments: attachments,
            timestamp: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            this.directLine.postActivity(activity).subscribe(
                id => {
                    console.log('Message sent successfully, ID:', id);
                    resolve(id);
                },
                error => {
                    console.error('Error sending message:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Send an activity through DirectLine
     * @param {Object} activity - DirectLine activity
     * @returns {Promise<string>} Activity ID
     */
    async sendActivity(activity) {
        if (!this.directLine) {
            throw new Error('DirectLine not initialized');
        }

        return new Promise((resolve, reject) => {
            this.directLine.postActivity(activity).subscribe(
                id => {
                    console.log('Activity sent successfully, ID:', id);
                    resolve(id);
                },
                error => {
                    console.error('Error sending activity:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Handle connection errors
     * @param {Error} error - Error object
     * @private
     */
    handleError(error) {
        console.error('DirectLine error:', error);

        let errorMessage = 'Connection error occurred';

        if (error.message && error.message.includes('Invalid secret')) {
            errorMessage = 'Invalid DirectLine secret. Please check your bot configuration.';
        } else if (error.message && error.message.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        window.dispatchEvent(new CustomEvent('connectionError', {
            detail: { error, message: errorMessage }
        }));

        // Notify callback
        if (this.connectionCallbacks.onError) {
            this.connectionCallbacks.onError(error);
        }
    }

    /**
     * Set callback functions
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.connectionCallbacks = { ...this.connectionCallbacks, ...callbacks };
    }

    /**
     * Get connection status
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.directLine !== null;
    }

    /**
     * Get DirectLine instance
     * @returns {DirectLine} DirectLine instance
     */
    getDirectLine() {
        return this.directLine;
    }

    /**
     * End DirectLine connection
     */
    disconnect() {
        if (this.directLine) {
            console.log('Disconnecting DirectLine...');
            this.directLine.end();
            this.directLine = null;
        }

        // Clear timeouts
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }

    /**
     * Restart connection with new secret
     * @param {string} secret - New DirectLine secret
     * @returns {Promise<boolean>} Success status
     */
    async restart(secret) {
        this.disconnect();
        return await this.initialize(secret);
    }
}

// Create and export singleton instance
export const directLineManager = new DirectLineManager();
