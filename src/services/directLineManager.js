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

            // Create DirectLine with enhanced WebSocket streaming configuration
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

            // Monitor WebSocket connection health for streaming optimization
            this.setupStreamingMonitor();

            console.log('DirectLine initialized successfully with WebSocket streaming');
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
     * Set up DirectLine subscriptions with enhanced streaming support
     * @private
     */
    setupSubscriptions() {
        // Subscribe to activities with enhanced logging
        this.directLine.activity$.subscribe(
            activity => {
                console.log('Received activity:', activity.type, activity.id);
                this.handleActivity(activity);
            },
            error => {
                console.error('Activity subscription error:', error);
                this.handleError(error);
            }
        );

        // Subscribe to connection status changes
        this.directLine.connectionStatus$.subscribe(
            status => {
                console.log('Connection status changed:', this.getStatusName(status));
                this.handleConnectionStatusChange(status);
            },
            error => {
                console.error('Connection status subscription error:', error);
                this.handleError(error);
            }
        );
    }

    /**
     * Set up WebSocket streaming health monitor
     * @private
     */
    setupStreamingMonitor() {
        // Monitor for streaming performance metrics
        this.streamingMetrics = {
            messagesReceived: 0,
            streamingEnabled: true,
            averageLatency: 0,
            connectionQuality: 'excellent'
        };

        // Set up periodic health check
        this.healthCheckInterval = setInterval(() => {
            this.checkStreamingHealth();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Check WebSocket streaming health
     * @private
     */
    checkStreamingHealth() {
        const status = this.directLine?.connectionStatus$?.value;
        const isOnline = status === 2; // ConnectionStatus.Online

        if (!isOnline) {
            this.streamingMetrics.connectionQuality = 'poor';
            console.warn('DirectLine connection quality degraded');
        } else {
            this.streamingMetrics.connectionQuality = 'excellent';
        }

        // Emit streaming health event for diagnostics
        window.dispatchEvent(new CustomEvent('streamingHealth', {
            detail: {
                ...this.streamingMetrics,
                isOnline,
                timestamp: Date.now()
            }
        }));
    }

    /**
     * Get human-readable connection status name
     * @param {number} status - Connection status code
     * @returns {string} Status name
     * @private
     */
    getStatusName(status) {
        const statusNames = {
            0: 'Uninitialized',
            1: 'Connecting',
            2: 'Online',
            3: 'ExpiredToken',
            4: 'FailedToConnect',
            5: 'Ended'
        };
        return statusNames[status] || `Unknown(${status})`;
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
     * Handle typing indicator with enhanced timing
     * @private
     */
    handleTypingIndicator() {
        // Record when streaming might start
        this.streamingStartTime = Date.now();

        // Notify typing indicator with enhanced metadata
        window.dispatchEvent(new CustomEvent('showTypingIndicator', {
            detail: {
                timestamp: this.streamingStartTime,
                source: 'realtime',
                expectedDuration: 5000 // Estimate 5 seconds max
            }
        }));

        // Clear any existing typing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set a more intelligent timeout based on message complexity
        const timeoutDuration = this.calculateTypingTimeout();
        this.typingTimeout = setTimeout(() => {
            console.log('Typing indicator timeout - hiding indicator');
            window.dispatchEvent(new CustomEvent('hideTypingIndicator', {
                detail: {
                    reason: 'timeout',
                    duration: timeoutDuration
                }
            }));
            this.typingTimeout = null;
        }, timeoutDuration);
    }

    /**
     * Calculate adaptive typing timeout based on context
     * @returns {number} Timeout duration in milliseconds
     * @private
     */
    calculateTypingTimeout() {
        // Base timeout of 8 seconds
        let timeout = 8000;

        // Extend timeout if we detect a complex query was sent
        const lastUserMessage = this.getLastUserMessage();
        if (lastUserMessage && lastUserMessage.length > 100) {
            timeout += 4000; // Add 4 seconds for complex queries
        }

        // Cap at 15 seconds maximum
        return Math.min(timeout, 15000);
    }

    /**
     * Get the last user message for context
     * @returns {string|null} Last user message text
     * @private
     */
    getLastUserMessage() {
        try {
            const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
            const userMessages = chatHistory.filter(msg => msg.sender === 'user');
            return userMessages.length > 0 ? userMessages[userMessages.length - 1].message : null;
        } catch (error) {
            console.warn('Could not retrieve last user message:', error);
            return null;
        }
    }

    /**
     * Handle message activity with enhanced streaming detection
     * @param {Object} activity - Message activity
     * @private
     */
    handleMessageActivity(activity) {
        const now = Date.now();

        // Enhanced streaming detection based on DirectLine 3.0 best practices
        const isStreamingMessage = this.detectStreamingMessage(activity);
        const isStreamingEnd = this.detectStreamingEnd(activity);

        if (isStreamingMessage) {
            // Real streaming message chunk detected
            this.handleStreamingChunk(activity);
        } else if (isStreamingEnd) {
            // End of streaming detected
            this.handleStreamingEnd(activity);
        } else {
            // Complete message - enhance with intelligent streaming simulation
            this.handleCompleteMessage(activity);
        }

        // Update last message time for timing analysis
        this.lastMessageTime = now;
    }

    /**
     * Enhanced streaming detection using DirectLine patterns
     * @param {Object} activity - Message activity
     * @returns {boolean} True if this is a streaming chunk
     * @private
     */
    detectStreamingMessage(activity) {
        // Method 1: Check for explicit streaming markers
        if (activity.channelData) {
            if (activity.channelData.streaming === true) return true;
            if (activity.channelData.streamType === 'fragment') return true;
            if (activity.channelData.isPartial === true) return true;
        }

        // Method 2: Check for incomplete content patterns
        if (activity.text) {
            const text = activity.text.trim();
            // Short message that doesn't end with punctuation might be streaming
            if (text.length > 0 && text.length < 150 &&
                !text.match(/[.!?]\s*$/) &&
                !text.match(/^\s*$/) &&
                this.lastMessageTime &&
                (Date.now() - this.lastMessageTime) < 3000) {
                return true;
            }
        }

        // Method 3: Check for rapid successive messages (streaming pattern)
        if (this.lastMessageTime && (Date.now() - this.lastMessageTime) < 1000) {
            return true;
        }

        return false;
    }

    /**
     * Detect end of streaming
     * @param {Object} activity - Message activity
     * @returns {boolean} True if this marks end of streaming
     * @private
     */
    detectStreamingEnd(activity) {
        if (activity.channelData) {
            if (activity.channelData.streamingEnd === true) return true;
            if (activity.channelData.streamType === 'complete') return true;
            if (activity.channelData.isComplete === true) return true;
        }

        // If message contains entities (citations), it's likely complete
        if (activity.entities && activity.entities.length > 0) {
            return true;
        }

        // Long message with proper punctuation is likely complete
        if (activity.text && activity.text.length > 150 &&
            activity.text.match(/[.!?]\s*$/)) {
            return true;
        }

        return false;
    }

    /**
     * Handle streaming chunk with progressive loading
     * @param {Object} activity - Streaming chunk activity
     * @private
     */
    handleStreamingChunk(activity) {
        // Add typing indicator management for streaming
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }

        // Hide typing indicator when first chunk arrives
        window.dispatchEvent(new CustomEvent('hideTypingIndicator'));

        // Dispatch streaming event
        window.dispatchEvent(new CustomEvent('streamingActivity', {
            detail: {
                ...activity,
                streamingMetadata: {
                    timestamp: Date.now(),
                    chunkNumber: this.getChunkNumber(),
                    isRealtime: true
                }
            }
        }));
    }

    /**
     * Handle end of streaming
     * @param {Object} activity - Final streaming activity
     * @private
     */
    handleStreamingEnd(activity) {
        window.dispatchEvent(new CustomEvent('streamingEnd', {
            detail: {
                ...activity,
                streamingMetadata: {
                    timestamp: Date.now(),
                    totalDuration: this.getStreamingDuration(),
                    isComplete: true
                }
            }
        }));
    }

    /**
     * Handle complete message with immediate display
     * @param {Object} activity - Complete message activity
     * @private
     */
    handleCompleteMessage(activity) {
        // Always use immediate display - removed simulated streaming to avoid confusion
        window.dispatchEvent(new CustomEvent('completeMessage', {
            detail: {
                ...activity,
                streamingMetadata: {
                    timestamp: Date.now(),
                    isImmediate: true
                }
            }
        }));
    }

    /**
     * Get current chunk number for streaming
     * @returns {number} Current chunk number
     * @private
     */
    getChunkNumber() {
        this.chunkCounter = (this.chunkCounter || 0) + 1;
        return this.chunkCounter;
    }

    /**
     * Get total streaming duration
     * @returns {number} Duration in milliseconds
     * @private
     */
    getStreamingDuration() {
        return this.streamingStartTime ? Date.now() - this.streamingStartTime : 0;
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
     * End DirectLine connection with full cleanup
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

        // Clear streaming health monitor
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Reset streaming state
        this.streamingMetrics = null;
        this.streamingStartTime = null;
        this.chunkCounter = 0;
        this.lastMessageTime = null;

        console.log('DirectLine disconnected and cleaned up');
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
