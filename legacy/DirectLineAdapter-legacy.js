/**
 * DirectLine Adapter for Chat Component
 * Integrates with Microsoft Bot Framework DirectLine API
 */

import { EventEmitter } from '../utils/EventEmitter.js';

export class DirectLineAdapter extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            secret: options.secret,
            domain: options.domain || 'https://directline.botframework.com/v3/directline',
            webSocket: options.webSocket !== false,
            timeout: options.timeout || 20000,
            pollingInterval: options.pollingInterval || 1000,
            enableAutoReconnect: options.enableAutoReconnect !== false,
            maxReconnectAttempts: options.maxReconnectAttempts || 5,
            ...options
        };

        // State
        this.directLine = null;
        this.connectionStatus = 'Uninitialized';
        this.reconnectAttempts = 0;
        this.lastActivity = null;
        this.conversationId = null;

        console.log('DirectLineAdapter created with config:', {
            domain: this.config.domain,
            webSocket: this.config.webSocket,
            timeout: this.config.timeout
        });
    }

    /**
     * Initialize DirectLine connection
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            console.log('Initializing DirectLine connection...');

            if (!this.config.secret) {
                throw new Error('DirectLine secret is required');
            }

            // Load DirectLine library if not available
            await this.ensureDirectLineLibrary();

            // Get DirectLine constructor (check both global and window)
            const DirectLineConstructor = (typeof window !== 'undefined' && window.DirectLine) 
                ? window.DirectLine.DirectLine 
                : DirectLine.DirectLine;

            if (!DirectLineConstructor) {
                throw new Error('DirectLine constructor not found after library load');
            }

            // Create DirectLine instance
            this.directLine = new DirectLineConstructor({
                secret: this.config.secret,
                domain: this.config.domain,
                webSocket: this.config.webSocket,
                timeout: this.config.timeout,
                pollingInterval: this.config.pollingInterval
            });

            // Setup event subscriptions
            this.setupSubscriptions();

            console.log('DirectLine adapter initialized successfully');
            this.emit('initialized');
            return true;

        } catch (error) {
            console.error('Failed to initialize DirectLine adapter:', error);
            this.emit('error', { error, phase: 'initialization' });
            return false;
        }
    }

    /**
     * Ensure DirectLine library is loaded
     * @returns {Promise<void>}
     */
    async ensureDirectLineLibrary() {
        if (typeof DirectLine !== 'undefined') {
            return; // Already loaded
        }

        console.log('Loading DirectLine library...');

        // Try multiple CDN sources
        const cdnSources = [
            'https://unpkg.com/botframework-directlinejs@0.15.4/dist/directline.js',
            'https://cdn.jsdelivr.net/npm/botframework-directlinejs@0.15.4/dist/directline.js',
            'https://unpkg.com/botframework-directlinejs@0.15.6/dist/directline.js',
            'https://cdn.jsdelivr.net/npm/botframework-directlinejs@0.15.6/dist/directline.js',
            'https://unpkg.com/botframework-directlinejs@latest/dist/directline.js',
            'https://cdn.jsdelivr.net/npm/botframework-directlinejs@latest/dist/directline.js'
        ];

        for (const cdnUrl of cdnSources) {
            try {
                console.log(`Attempting to load DirectLine from: ${cdnUrl}`);
                await this.loadScript(cdnUrl);
                
                // Check if DirectLine is now available
                if (typeof window !== 'undefined' && window.DirectLine) {
                    console.log(`DirectLine library loaded successfully from: ${cdnUrl}`);
                    window.DirectLine = window.DirectLine; // Ensure global access
                    return;
                }
                
                // Also check for global DirectLine object
                if (typeof DirectLine !== 'undefined') {
                    console.log(`DirectLine library loaded from: ${cdnUrl}`);
                    return;
                }
            } catch (error) {
                console.warn(`Failed to load DirectLine from ${cdnUrl}:`, error.message);
            }
        }

        throw new Error('Failed to load DirectLine library from all CDN sources. Please check your internet connection and ensure the DirectLine SDK is available.');
    }

    /**
     * Load script from URL
     * @param {string} url - Script URL
     * @returns {Promise<void>}
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                reject(new Error('Not in browser environment'));
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                setTimeout(resolve, 100); // Allow library to initialize
            };
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${url}`));
            };

            document.head.appendChild(script);

            // Timeout after 10 seconds
            setTimeout(() => {
                reject(new Error(`Script loading timeout: ${url}`));
            }, 10000);
        });
    }

    /**
     * Setup DirectLine event subscriptions
     */
    setupSubscriptions() {
        if (!this.directLine) return;

        // Subscribe to activities (incoming messages)
        this.directLine.activity$.subscribe(
            activity => this.handleActivity(activity),
            error => this.handleError(error)
        );

        // Subscribe to connection status changes
        this.directLine.connectionStatus$.subscribe(
            status => this.handleConnectionStatusChange(status),
            error => this.handleError(error)
        );
    }

    /**
     * Handle incoming activity from DirectLine
     * @param {Object} activity - DirectLine activity
     */
    handleActivity(activity) {
        console.log('Received activity:', activity.type, activity.id);

        // Skip activities from the user (echo)
        if (activity.from && activity.from.id === 'user') {
            return;
        }

        this.lastActivity = activity;

        // Handle different activity types
        switch (activity.type) {
            case 'message':
                this.handleMessageActivity(activity);
                break;
            case 'typing':
                this.handleTypingActivity(activity);
                break;
            case 'conversationUpdate':
                this.handleConversationUpdate(activity);
                break;
            case 'event':
                this.handleEventActivity(activity);
                break;
            default:
                console.log('Unhandled activity type:', activity.type);
        }
    }

    /**
     * Handle message activity
     * @param {Object} activity - Message activity
     */
    handleMessageActivity(activity) {
        const message = this.convertActivityToMessage(activity);

        // Check if this is a streaming message
        if (this.isStreamingMessage(activity)) {
            this.emit('streamingMessage', message);
        } else {
            this.emit('messageReceived', message);
        }
    }

    /**
     * Handle typing activity
     * @param {Object} activity - Typing activity
     */
    handleTypingActivity(activity) {
        this.emit('typingIndicator', {
            from: activity.from,
            timestamp: activity.timestamp
        });
    }

    /**
     * Handle conversation update
     * @param {Object} activity - Conversation update activity
     */
    handleConversationUpdate(activity) {
        if (activity.membersAdded) {
            // Bot joined conversation - send greeting if configured
            const botJoined = activity.membersAdded.some(member => member.id !== 'user');
            if (botJoined) {
                this.emit('botJoined', { activity });
            }
        }
    }

    /**
     * Handle event activity
     * @param {Object} activity - Event activity
     */
    handleEventActivity(activity) {
        this.emit('eventReceived', {
            name: activity.name,
            value: activity.value,
            activity
        });
    }

    /**
     * Handle connection status changes
     * @param {number} status - Connection status
     */
    handleConnectionStatusChange(status) {
        const statusName = this.getConnectionStatusName(status);
        console.log('Connection status changed:', statusName);

        this.connectionStatus = statusName;

        // Handle specific status changes
        switch (status) {
            case 2: // Online
                this.reconnectAttempts = 0;
                this.emit('connected');
                break;
            case 4: // ExpiredToken
                this.emit('tokenExpired');
                break;
            case 8: // FailedToConnect
                this.handleConnectionFailure();
                break;
        }

        this.emit('connectionStatusChanged', { status, statusName });
    }

    /**
     * Handle connection errors
     * @param {Error} error - Connection error
     */
    handleError(error) {
        console.error('DirectLine error:', error);
        this.emit('error', { error, source: 'directline' });
    }

    /**
     * Handle connection failure with auto-reconnect
     */
    handleConnectionFailure() {
        if (!this.config.enableAutoReconnect) return;

        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
            
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts}) in ${delay}ms`);
            
            setTimeout(() => {
                this.reconnect();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('reconnectFailed');
        }
    }

    /**
     * Reconnect to DirectLine
     * @returns {Promise<boolean>} Success status
     */
    async reconnect() {
        try {
            console.log('Reconnecting to DirectLine...');
            
            // Cleanup existing connection
            if (this.directLine) {
                this.directLine.end();
            }

            // Reinitialize
            return await this.initialize();

        } catch (error) {
            console.error('Reconnection failed:', error);
            this.handleConnectionFailure(); // Try again
            return false;
        }
    }

    /**
     * Send message through DirectLine
     * @param {string} content - Message content
     * @param {Object} options - Send options
     * @returns {Promise<string>} Activity ID
     */
    async sendMessage(content, options = {}) {
        if (!this.directLine) {
            console.error('DirectLine adapter not initialized. Make sure to call initialize() first.');
            throw new Error('DirectLine not initialized. Please ensure the adapter is properly initialized before sending messages.');
        }

        if (!content || typeof content !== 'string') {
            throw new Error('Message content must be a non-empty string');
        }

        const activity = {
            type: 'message',
            from: { id: 'user' },
            text: content,
            locale: options.locale || 'en-US',
            timestamp: new Date().toISOString(),
            ...options.activity
        };

        try {
            const result = await this.directLine.postActivity(activity).toPromise();
            console.log('Message sent successfully:', result.id);
            return result.id;

        } catch (error) {
            console.error('Failed to send message:', error);
            this.emit('sendError', { error, activity });
            throw error;
        }
    }

    /**
     * Send greeting message (if auto-greeting is enabled)
     */
    sendGreeting() {
        if (!this.directLine) return;

        const greetingActivity = {
            type: 'event',
            name: 'webchat/join',
            from: { id: 'user' },
            timestamp: new Date().toISOString()
        };

        this.directLine.postActivity(greetingActivity);
        console.log('Greeting sent');
    }

    /**
     * Convert DirectLine activity to chat message format
     * @param {Object} activity - DirectLine activity
     * @returns {Object} Chat message
     */
    convertActivityToMessage(activity) {
        return {
            id: activity.id,
            type: 'bot',
            content: activity.text || '',
            sender: activity.from?.name || 'Bot',
            timestamp: new Date(activity.timestamp).getTime(),
            attachments: activity.attachments,
            suggestedActions: activity.suggestedActions,
            metadata: {
                originalActivity: activity,
                conversationId: activity.conversation?.id
            }
        };
    }

    /**
     * Check if activity represents a streaming message
     * @param {Object} activity - DirectLine activity
     * @returns {boolean} True if streaming message
     */
    isStreamingMessage(activity) {
        // Simple heuristic for streaming detection
        // In real implementation, this might check for specific flags or patterns
        return false; // Placeholder - implement based on your streaming logic
    }

    /**
     * Get connection status name
     * @param {number} status - Status code
     * @returns {string} Status name
     */
    getConnectionStatusName(status) {
        const statusNames = {
            0: 'Uninitialized',
            1: 'Connecting',
            2: 'Online',
            3: 'Offline',
            4: 'ExpiredToken',
            5: 'FailedToConnect',
            6: 'Ended'
        };
        
        return statusNames[status] || `Unknown(${status})`;
    }

    /**
     * Check if adapter is properly initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return !!(this.directLine && this.connectionStatus !== 'Uninitialized');
    }

    /**
     * Get adapter status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized(),
            connectionStatus: this.connectionStatus,
            reconnectAttempts: this.reconnectAttempts,
            lastActivity: this.lastActivity?.timestamp,
            conversationId: this.conversationId,
            hasDirectLine: !!this.directLine,
            config: {
                domain: this.config.domain,
                webSocket: this.config.webSocket,
                enableAutoReconnect: this.config.enableAutoReconnect
            }
        };
    }

    /**
     * Disconnect from DirectLine
     */
    disconnect() {
        console.log('Disconnecting DirectLine adapter...');
        
        if (this.directLine) {
            this.directLine.end();
            this.directLine = null;
        }

        this.connectionStatus = 'Disconnected';
        this.emit('disconnected');
    }

    /**
     * Cleanup and destroy adapter
     */
    destroy() {
        this.disconnect();
        this.removeAllListeners();
        console.log('DirectLine adapter destroyed');
    }
}
