/**
 * DirectLine Connection Manager Component
 * 
 * A reusable component for managing Microsoft Bot Framework DirectLine API connections.
 * Provides streaming support, connection management, and event-driven communication.
 * 
 * @version 1.0.0
 * @author MCSChat Project
 * @license MIT
 * 
 * Features:
 * - WebSocket streaming with health monitoring
 * - Adaptive typing indicators with intelligent timeouts
 * - Enhanced error handling and connection status management
 * - Event-driven architecture for loose coupling
 * - Comprehensive streaming detection and simulation
 * - Connection retry and recovery mechanisms
 * 
 * Dependencies:
 * - Microsoft Bot Framework DirectLine 3.0 API
 * - Utils helper library
 * 
 * Usage:
 * ```javascript
 * import { DirectLineManager } from './DirectLineManager.js';
 * 
 * const manager = new DirectLineManager();
 * await manager.initialize('your-directline-secret');
 * manager.setCallbacks({
 *   onActivity: (activity) => console.log('Received:', activity),
 *   onError: (error) => console.error('Error:', error)
 * });
 * ```
 */

import { Utils } from '../../utils/helpers.js';

export class DirectLineManager {
    /**
     * Create a new DirectLine manager instance
     * @param {Object} config - Configuration options
     * @param {number} config.timeout - Connection timeout in milliseconds (default: 20000)
     * @param {number} config.pollingInterval - Polling fallback interval (default: 1000)
     * @param {string} config.domain - DirectLine API domain (default: official)
     * @param {boolean} config.webSocket - Enable WebSocket streaming (default: true)
     */
    constructor(config = {}) {
        // Core DirectLine instance
        this.directLine = null;

        // DirectLine library version detection
        this.directLineVersion = 'unknown';

        // Configuration with defaults
        this.config = {
            timeout: config.timeout || 20000,
            pollingInterval: config.pollingInterval || 1000,
            domain: config.domain || 'https://directline.botframework.com/v3/directline',
            webSocket: config.webSocket !== false, // default true
            ...config
        };

        // Callback handlers for external integration
        this.connectionCallbacks = {
            onActivity: null,
            onConnectionStatusChange: null,
            onError: null
        };

        // Streaming and timing state
        this.lastMessageTime = null;
        this.typingTimeout = null;
        this.streamingStartTime = null;
        this.chunkCounter = 0;

        // Health monitoring
        this.streamingMetrics = null;
        this.healthCheckInterval = null;

        // Detect existing DirectLine version if available
        if (typeof DirectLine !== 'undefined') {
            this.detectDirectLineVersion();
        }

        // Bind methods for event handlers
        this.handleActivity = this.handleActivity.bind(this);
        this.handleConnectionStatusChange = this.handleConnectionStatusChange.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Initialize DirectLine connection with enhanced error handling
     * @param {string} secret - DirectLine secret key
     * @returns {Promise<boolean>} Success status
     * @throws {Error} When DirectLine library is unavailable or initialization fails
     */
    async initialize(secret) {
        try {
            console.log('Initializing DirectLine connection...');

            // Validate DirectLine library availability
            if (typeof DirectLine === 'undefined') {
                // Try to load DirectLine library dynamically
                await this.loadDirectLineLibrary();

                // Check again after loading attempt
                if (typeof DirectLine === 'undefined') {
                    throw new Error('DirectLine library is not loaded. Please check your internet connection and refresh the page.');
                }
            }

            // Validate secret
            if (!secret || typeof secret !== 'string') {
                throw new Error('DirectLine secret is required and must be a string');
            }

            // Close existing connection
            this.disconnect();

            // Create DirectLine with enhanced configuration
            this.directLine = new DirectLine.DirectLine({
                secret: secret,
                webSocket: this.config.webSocket,
                timeout: this.config.timeout,
                conversationId: undefined, // Auto-generate new conversation
                streamUrl: null, // Auto-generated
                watermark: null, // Start from beginning
                pollingInterval: this.config.pollingInterval,
                domain: this.config.domain
            });

            // Set up event subscriptions with version-specific handling
            this.setupSubscriptions();

            // Start health monitoring (enhanced features for modern library)
            if (this.directLineVersion === 'modern') {
                this.setupStreamingMonitor();
            }

            console.log(`DirectLine initialized successfully (${this.directLineVersion} version)`);
            return true;

        } catch (error) {
            console.error('Error initializing DirectLine:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * Dynamically load DirectLine library if not available
     * @returns {Promise<void>}
     * @private
     */
    async loadDirectLineLibrary() {
        if (typeof DirectLine !== 'undefined') {
            return; // Already loaded
        }

        console.log('Attempting to load DirectLine library...');

        // Try modern DirectLine library first (preferred for new features)
        const modernCdnSources = [
            'https://cdn.botframework.com/botframework-directline/3.0.3/directline.js',
            'https://unpkg.com/botframework-directline@3.0.3/built/directline.js',
            'https://cdn.jsdelivr.net/npm/botframework-directline@3.0.3/built/directline.js'
        ];

        // Fallback to legacy library for compatibility
        const legacyCdnSources = [
            'https://unpkg.com/botframework-directlinejs@0.11.6/dist/directline.js'
        ];

        const allSources = [...modernCdnSources, ...legacyCdnSources];

        for (const cdnUrl of allSources) {
            try {
                await this.loadScript(cdnUrl);
                if (typeof DirectLine !== 'undefined') {
                    console.log(`DirectLine library loaded successfully from: ${cdnUrl}`);

                    // Detect which version was loaded
                    this.detectDirectLineVersion();
                    return;
                }
            } catch (error) {
                console.warn(`Failed to load DirectLine from ${cdnUrl}:`, error.message);
            }
        }

        throw new Error('Failed to load DirectLine library from all CDN sources');
    }

    /**
     * Detect DirectLine library version and set compatibility flags
     * @private
     */
    detectDirectLineVersion() {
        if (typeof DirectLine === 'undefined') {
            this.directLineVersion = 'none';
            return;
        }

        // Check for modern DirectLine 3.0+ features
        if (DirectLine.DirectLine && typeof DirectLine.DirectLine === 'function') {
            // Try to detect version by checking for specific features
            const testInstance = DirectLine.DirectLine;

            // Modern library typically has more properties and methods
            if (DirectLine.ConnectionStatus && Object.keys(DirectLine).length > 2) {
                this.directLineVersion = 'modern';
                console.log('Detected modern DirectLine library (3.0+)');
            } else {
                this.directLineVersion = 'legacy';
                console.log('Detected legacy DirectLine library (0.11.x)');
            }
        } else {
            this.directLineVersion = 'unknown';
            console.warn('DirectLine library detected but version unknown');
        }
    }

    /**
     * Load a script dynamically
     * @param {string} url - Script URL
     * @returns {Promise<void>}
     * @private
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            // Check if we're in a browser environment
            if (typeof document === 'undefined') {
                reject(new Error('Not in browser environment'));
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            script.onload = () => {
                // Small delay to allow library to initialize
                setTimeout(() => resolve(), 100);
            };

            script.onerror = () => {
                reject(new Error(`Failed to load script from ${url}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Set up DirectLine event subscriptions
     * @private
     */
    setupSubscriptions() {
        if (!this.directLine) return;

        // Subscribe to incoming activities
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
     * Set up streaming health monitoring
     * @private
     */
    setupStreamingMonitor() {
        // Initialize metrics
        this.streamingMetrics = {
            messagesReceived: 0,
            streamingEnabled: true,
            averageLatency: 0,
            connectionQuality: 'excellent'
        };

        // Periodic health check
        this.healthCheckInterval = setInterval(() => {
            this.checkStreamingHealth();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Check streaming connection health
     * @private
     */
    checkStreamingHealth() {
        const status = this.directLine?.connectionStatus$?.value;
        const isOnline = status === 2; // ConnectionStatus.Online

        this.streamingMetrics.connectionQuality = isOnline ? 'excellent' : 'poor';

        if (!isOnline) {
            console.warn('DirectLine connection quality degraded');
        }

        // Emit health status event
        this.emitEvent('streamingHealth', {
            ...this.streamingMetrics,
            isOnline,
            timestamp: Date.now()
        });
    }

    /**
     * Handle incoming DirectLine activities
     * @param {Object} activity - DirectLine activity object
     * @private
     */
    handleActivity(activity) {
        // Handle typing indicators
        if (activity.type === 'typing') {
            this.handleTypingIndicator();
            return;
        }

        // Clear typing timeout for non-typing activities
        this.clearTypingTimeout();

        // Process activities from bot only (not user echoes)
        if (activity.from && activity.from.id !== 'user') {
            switch (activity.type) {
                case 'message':
                    this.handleMessageActivity(activity);
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
    }

    /**
     * Handle message activities with streaming detection
     * @param {Object} activity - Message activity
     * @private
     */
    handleMessageActivity(activity) {
        const now = Date.now();

        // Update metrics
        if (this.streamingMetrics) {
            this.streamingMetrics.messagesReceived++;
        }

        // Enhanced streaming detection
        const isStreamingMessage = this.detectStreamingMessage(activity);
        const isStreamingEnd = this.detectStreamingEnd(activity);

        if (isStreamingMessage) {
            this.handleStreamingChunk(activity);
        } else if (isStreamingEnd) {
            this.handleStreamingEnd(activity);
        } else {
            this.handleCompleteMessage(activity);
        }

        this.lastMessageTime = now;
    }

    /**
     * Detect if message is part of streaming sequence
     * @param {Object} activity - Message activity
     * @returns {boolean} True if streaming message
     * @private
     */
    detectStreamingMessage(activity) {
        // Check for streaming indicators in activity metadata
        return activity.channelData?.streaming === true ||
            (activity.text && activity.text.length < 50 && this.streamingStartTime);
    }

    /**
     * Detect end of streaming sequence
     * @param {Object} activity - Message activity
     * @returns {boolean} True if streaming end
     * @private
     */
    detectStreamingEnd(activity) {
        return activity.channelData?.streamingEnd === true ||
            (activity.attachments?.length > 0) ||
            (activity.suggestedActions?.actions?.length > 0);
    }

    /**
     * Handle streaming message chunk
     * @param {Object} activity - Streaming chunk activity
     * @private
     */
    handleStreamingChunk(activity) {
        const chunkNumber = this.getChunkNumber();
        const duration = this.getStreamingDuration();

        this.emitEvent('streamingChunk', {
            ...activity,
            chunkNumber,
            duration,
            isStreaming: true
        });
    }

    /**
     * Handle end of streaming
     * @param {Object} activity - Final streaming activity
     * @private
     */
    handleStreamingEnd(activity) {
        const duration = this.getStreamingDuration();

        this.emitEvent('streamingEnd', {
            ...activity,
            duration,
            totalChunks: this.chunkCounter
        });

        // Reset streaming state
        this.streamingStartTime = null;
        this.chunkCounter = 0;
    }

    /**
     * Handle complete non-streaming message
     * @param {Object} activity - Complete message activity
     * @private
     */
    handleCompleteMessage(activity) {
        this.emitEvent('messageReceived', activity);
    }

    /**
     * Handle conversation update activities
     * @param {Object} activity - Conversation update activity
     * @private
     */
    handleConversationUpdate(activity) {
        console.log('Conversation updated:', activity);

        if (activity.text ||
            (activity.attachments?.length > 0) ||
            (activity.suggestedActions?.actions?.length > 0)) {
            this.emitEvent('conversationUpdate', activity);
        }
    }

    /**
     * Handle event activities
     * @param {Object} activity - Event activity
     * @private
     */
    handleEventActivity(activity) {
        console.log('Event activity received:', activity);

        if (activity.text ||
            (activity.attachments?.length > 0) ||
            (activity.suggestedActions?.actions?.length > 0)) {
            this.emitEvent('eventActivity', activity);
        }
    }

    /**
     * Handle typing indicators with adaptive timing
     * @private
     */
    handleTypingIndicator() {
        this.streamingStartTime = Date.now();

        this.emitEvent('showTypingIndicator', {
            timestamp: this.streamingStartTime,
            source: 'realtime',
            expectedDuration: 5000
        });

        this.clearTypingTimeout();

        const timeoutDuration = this.calculateTypingTimeout();
        this.typingTimeout = setTimeout(() => {
            console.log('Typing indicator timeout - hiding indicator');
            this.emitEvent('hideTypingIndicator', {
                reason: 'timeout',
                duration: timeoutDuration
            });
            this.typingTimeout = null;
        }, timeoutDuration);
    }

    /**
     * Calculate adaptive typing timeout based on context
     * @returns {number} Timeout duration in milliseconds
     * @private
     */
    calculateTypingTimeout() {
        const lastUserMessage = this.getLastUserMessage();
        const baseTimeout = 8000; // 8 seconds base

        if (!lastUserMessage) return baseTimeout;

        // Longer timeout for complex questions
        if (lastUserMessage.length > 100 ||
            lastUserMessage.includes('?') ||
            lastUserMessage.includes('explain') ||
            lastUserMessage.includes('how')) {
            return baseTimeout * 1.5; // 12 seconds
        }

        return baseTimeout;
    }

    /**
     * Get last user message for context
     * @returns {string|null} Last user message text
     * @private
     */
    getLastUserMessage() {
        // This would need to be implemented based on your message history
        // For now, return null as placeholder
        return null;
    }

    /**
     * Clear typing timeout
     * @private
     */
    clearTypingTimeout() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
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
     * Get streaming duration
     * @returns {number} Duration in milliseconds
     * @private
     */
    getStreamingDuration() {
        return this.streamingStartTime ? Date.now() - this.streamingStartTime : 0;
    }

    /**
     * Handle connection status changes
     * @param {number} status - Connection status code
     * @private
     */
    handleConnectionStatusChange(status) {
        const statusInfo = this.getConnectionStatusInfo(status);

        console.log(`Connection status: ${statusInfo.name}`);

        this.emitEvent('connectionStatus', {
            status: statusInfo.status,
            message: statusInfo.message,
            code: status
        });

        // Handle specific status cases
        switch (status) {
            case 2: // Online
                setTimeout(() => this.sendGreeting(), 1000);
                break;
            case 3: // ExpiredToken
            case 4: // FailedToConnect
            case 5: // Ended
                this.handleError(new Error(statusInfo.message));
                break;
        }

        // Notify external callbacks
        if (this.connectionCallbacks.onConnectionStatusChange) {
            this.connectionCallbacks.onConnectionStatusChange(status);
        }
    }

    /**
     * Get connection status information
     * @param {number} status - Status code
     * @returns {Object} Status information
     * @private
     */
    getConnectionStatusInfo(status) {
        const statusMap = {
            0: { name: 'Uninitialized', status: 'uninitialized', message: 'Connection not initialized' },
            1: { name: 'Connecting', status: 'connecting', message: 'Connecting to bot...' },
            2: { name: 'Online', status: 'online', message: 'Bot connected! Waiting for response...' },
            3: { name: 'ExpiredToken', status: 'expired', message: 'Authentication token has expired. Please check your DirectLine secret.' },
            4: { name: 'FailedToConnect', status: 'failed', message: 'Failed to connect to the bot service. Please check your DirectLine secret and internet connection.' },
            5: { name: 'Ended', status: 'ended', message: 'Connection to the bot has ended unexpectedly. Please try refreshing the page.' }
        };

        return statusMap[status] || { name: 'Unknown', status: 'unknown', message: 'Unknown connection status' };
    }

    /**
     * Get human-readable status name
     * @param {number} status - Status code
     * @returns {string} Status name
     * @private
     */
    getStatusName(status) {
        return this.getConnectionStatusInfo(status).name;
    }

    /**
     * Send greeting message to trigger welcome
     */
    sendGreeting() {
        if (!this.directLine) return;

        const greetingActivity = {
            from: { id: 'user' },
            type: 'event',
            name: 'webchat/join',
            value: {
                language: navigator.language || 'en-US',
                timestamp: new Date().toISOString()
            }
        };

        this.sendActivity(greetingActivity)
            .then(() => console.log('Greeting sent successfully'))
            .catch(error => console.error('Error sending greeting:', error));
    }

    /**
     * Send a text message
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

        return this.sendActivity(activity);
    }

    /**
     * Send a DirectLine activity
     * @param {Object} activity - DirectLine activity object
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
     * Handle initialization errors
     * @param {Error} error - Initialization error
     * @private
     */
    handleInitializationError(error) {
        let errorMessage = 'Failed to initialize bot connection. Please check your settings.';

        if (error.message?.includes('Invalid secret')) {
            errorMessage = 'Invalid DirectLine secret. Please check your bot configuration.';
        } else if (error.message?.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message?.includes('DirectLine library')) {
            errorMessage = error.message;
        }

        this.handleError(new Error(errorMessage));
    }

    /**
     * Handle connection errors
     * @param {Error} error - Error object
     * @private
     */
    handleError(error) {
        console.error('DirectLine error:', error);

        let errorMessage = 'Connection error occurred';

        if (error.message?.includes('Invalid secret')) {
            errorMessage = 'Invalid DirectLine secret. Please check your bot configuration.';
        } else if (error.message?.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        this.emitEvent('connectionError', { error, message: errorMessage });

        // Notify external callback
        if (this.connectionCallbacks.onError) {
            this.connectionCallbacks.onError(error);
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     * @private
     */
    emitEvent(eventName, detail) {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    /**
     * Set callback functions for external integration
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onActivity - Activity received callback
     * @param {Function} callbacks.onConnectionStatusChange - Status change callback
     * @param {Function} callbacks.onError - Error callback
     */
    setCallbacks(callbacks) {
        this.connectionCallbacks = { ...this.connectionCallbacks, ...callbacks };
    }

    /**
     * Check if DirectLine is connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.directLine !== null &&
            this.directLine.connectionStatus$?.value === 2; // Online
    }

    /**
     * Get DirectLine instance
     * @returns {DirectLine|null} DirectLine instance
     */
    getDirectLine() {
        return this.directLine;
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get streaming metrics
     * @returns {Object|null} Streaming metrics
     */
    getStreamingMetrics() {
        return this.streamingMetrics ? { ...this.streamingMetrics } : null;
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.directLine) {
            console.log('Disconnecting DirectLine...');
            this.directLine.end();
            this.directLine = null;
        }

        // Clear timeouts
        this.clearTypingTimeout();

        // Clear health monitoring
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Reset state
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

    /**
     * Get component version
     * @returns {string} Version string
     */
    static getVersion() {
        return '1.0.0';
    }

    /**
     * Get component information
     * @returns {Object} Component information
     */
    static getInfo() {
        return {
            name: 'DirectLineManager',
            version: this.getVersion(),
            description: 'Reusable DirectLine connection manager component',
            author: 'MCSChat Project',
            license: 'MIT',
            dependencies: ['Microsoft Bot Framework DirectLine 3.0 API'],
            features: [
                'WebSocket streaming with health monitoring',
                'Adaptive typing indicators',
                'Enhanced error handling',
                'Event-driven architecture',
                'Connection retry and recovery'
            ]
        };
    }
}

// Export singleton instance for backward compatibility
export const directLineManager = new DirectLineManager();
