/**
 * Unified Message Queue System
 * 
 * Provides loose coupling between DirectLine managers and message renderers
 * through a centralized message queue with event-driven architecture.
 */

export class MessageQueue {
    constructor() {
        this.queue = [];
        this.subscribers = new Map();
        this.messageId = 0;
        this.isProcessing = false;
        this.processingDelay = 50; // 50ms delay between messages
        
        console.log('📬 MessageQueue initialized');
    }

    /**
     * Subscribe to message events
     * @param {string} eventType - Type of event to subscribe to
     * @param {Function} callback - Callback function
     * @param {Object} options - Subscription options
     */
    subscribe(eventType, callback, options = {}) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        
        const subscription = {
            id: `sub_${this.messageId++}`,
            callback,
            priority: options.priority || 0,
            filter: options.filter || null
        };
        
        this.subscribers.get(eventType).push(subscription);
        
        // Sort by priority (higher priority first)
        this.subscribers.get(eventType).sort((a, b) => b.priority - a.priority);
        
        console.log(`📬 Subscribed to '${eventType}' with ID: ${subscription.id}`);
        return subscription.id;
    }

    /**
     * Unsubscribe from message events
     * @param {string} eventType - Type of event
     * @param {string} subscriptionId - Subscription ID to remove
     */
    unsubscribe(eventType, subscriptionId) {
        if (!this.subscribers.has(eventType)) return;
        
        const subscribers = this.subscribers.get(eventType);
        const index = subscribers.findIndex(sub => sub.id === subscriptionId);
        
        if (index !== -1) {
            subscribers.splice(index, 1);
            console.log(`📬 Unsubscribed from '${eventType}' ID: ${subscriptionId}`);
        }
    }

    /**
     * Enqueue a message for processing
     * @param {Object} message - Message to enqueue
     */
    enqueue(message) {
        const queuedMessage = {
            id: `msg_${this.messageId++}`,
            timestamp: Date.now(),
            source: message.source || 'unknown',
            type: message.type || 'message',
            data: message.data || {},
            priority: message.priority || 0,
            metadata: {
                queuedAt: new Date().toISOString(),
                ...message.metadata
            }
        };

        // Insert message based on priority
        const insertIndex = this.queue.findIndex(msg => msg.priority < queuedMessage.priority);
        if (insertIndex === -1) {
            this.queue.push(queuedMessage);
        } else {
            this.queue.splice(insertIndex, 0, queuedMessage);
        }

        console.log(`📬 Enqueued message: ${queuedMessage.type} from ${queuedMessage.source}`);
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        return queuedMessage.id;
    }

    /**
     * Process the message queue
     * @private
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        console.log(`📬 Processing queue (${this.queue.length} messages)`);

        while (this.queue.length > 0) {
            const message = this.queue.shift();
            
            try {
                await this.processMessage(message);
                
                // Small delay to prevent overwhelming the UI
                if (this.queue.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.processingDelay));
                }
            } catch (error) {
                console.error(`📬 Error processing message ${message.id}:`, error);
                this.emit('error', { message, error });
            }
        }

        this.isProcessing = false;
        console.log(`📬 Queue processing complete`);
    }

    /**
     * Process a single message
     * @private
     * @param {Object} message - Message to process
     */
    async processMessage(message) {
        const eventType = message.type;
        
        // Emit to all subscribers of this event type
        await this.emit(eventType, message);
        
        // Also emit to generic 'message' listeners
        if (eventType !== 'message') {
            await this.emit('message', message);
        }
    }

    /**
     * Emit event to all subscribers
     * @param {string} eventType - Event type to emit
     * @param {Object} data - Data to send to subscribers
     */
    async emit(eventType, data) {
        if (!this.subscribers.has(eventType)) return;
        
        const subscribers = this.subscribers.get(eventType);
        const promises = subscribers.map(async (subscription) => {
            try {
                // Apply filter if present
                if (subscription.filter && !subscription.filter(data)) {
                    return;
                }
                
                // Call the callback
                await subscription.callback(data);
            } catch (error) {
                console.error(`📬 Error in subscriber ${subscription.id}:`, error);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Get queue statistics
     * @returns {Object} Queue statistics
     */
    getStats() {
        const subscriberCounts = {};
        for (const [eventType, subs] of this.subscribers.entries()) {
            subscriberCounts[eventType] = subs.length;
        }

        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            totalSubscribers: Array.from(this.subscribers.values()).reduce((total, subs) => total + subs.length, 0),
            subscribersByType: subscriberCounts,
            nextMessageId: this.messageId
        };
    }

    /**
     * Clear the queue
     */
    clear() {
        this.queue = [];
        console.log('📬 Queue cleared');
    }

    /**
     * Get queue contents (for debugging)
     * @returns {Array} Current queue contents
     */
    getQueue() {
        return [...this.queue];
    }
}

/**
 * DirectLine Message Adapter
 * 
 * Adapts DirectLine activities to the unified message queue format
 */
export class DirectLineMessageAdapter {
    constructor(messageQueue) {
        this.messageQueue = messageQueue;
        this.directLineManager = null;
        
        console.log('🔌 DirectLineMessageAdapter initialized');
    }

    /**
     * Connect to a DirectLine manager
     * @param {Object} directLineManager - DirectLine manager instance
     */
    connect(directLineManager) {
        if (this.directLineManager) {
            console.log('🔌 Disconnecting from previous DirectLine manager');
        }

        this.directLineManager = directLineManager;
        
        // Set up DirectLine callbacks to feed the message queue
        directLineManager.setCallbacks({
            onActivity: (activity) => this.handleActivity(activity),
            onConnectionStatusChange: (status) => this.handleConnectionStatus(status),
            onError: (error) => this.handleError(error)
        });
        
        console.log('🔌 Connected to DirectLine manager');
    }

    /**
     * Handle DirectLine activity
     * @private
     * @param {Object} activity - DirectLine activity
     */
    handleActivity(activity) {
        console.log('🔌 Processing DirectLine activity:', activity.type, activity.id);
        
        // Convert DirectLine activity to message queue format
        const message = {
            source: 'directline',
            type: this.mapActivityType(activity),
            priority: this.getActivityPriority(activity),
            data: {
                originalActivity: activity,
                messageType: activity.type,
                from: activity.from,
                text: activity.text,
                attachments: activity.attachments || [],
                suggestedActions: activity.suggestedActions,
                timestamp: activity.timestamp || new Date().toISOString()
            },
            metadata: {
                directLineId: activity.id,
                conversationId: activity.conversation?.id,
                channelId: activity.channelId,
                serviceUrl: activity.serviceUrl
            }
        };

        // Enqueue the message
        this.messageQueue.enqueue(message);
    }

    /**
     * Handle DirectLine connection status changes
     * @private
     * @param {number} status - Connection status
     */
    handleConnectionStatus(status) {
        console.log('🔌 DirectLine connection status:', status);
        
        const statusNames = {
            0: 'Uninitialized',
            1: 'Connecting', 
            2: 'Online',
            3: 'ExpiredToken',
            4: 'FailedToConnect',
            5: 'Ended'
        };

        const message = {
            source: 'directline',
            type: 'connection-status',
            priority: 10, // High priority for connection events
            data: {
                status,
                statusName: statusNames[status] || 'Unknown',
                isConnected: status === 2
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        };

        this.messageQueue.enqueue(message);
    }

    /**
     * Handle DirectLine errors
     * @private
     * @param {Error} error - Error object
     */
    handleError(error) {
        console.error('🔌 DirectLine error:', error);
        
        const message = {
            source: 'directline',
            type: 'error',
            priority: 15, // Highest priority for errors
            data: {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                }
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        };

        this.messageQueue.enqueue(message);
    }

    /**
     * Map DirectLine activity type to message queue type
     * @private
     * @param {Object} activity - DirectLine activity
     * @returns {string} Mapped type
     */
    mapActivityType(activity) {
        switch (activity.type) {
            case 'message':
                // Differentiate between user and bot messages
                return activity.from?.id === 'user' ? 'user-message' : 'bot-message';
            case 'typing':
                return 'typing-indicator';
            case 'conversationUpdate':
                return 'conversation-update';
            case 'event':
                return 'bot-event';
            default:
                return 'unknown-activity';
        }
    }

    /**
     * Get priority for activity type
     * @private
     * @param {Object} activity - DirectLine activity
     * @returns {number} Priority (higher = more important)
     */
    getActivityPriority(activity) {
        switch (activity.type) {
            case 'message':
                return activity.from?.id === 'user' ? 8 : 5; // User messages higher than bot
            case 'typing':
                return 3;
            case 'conversationUpdate':
                return 2;
            case 'event':
                return 4;
            default:
                return 1;
        }
    }

    /**
     * Disconnect from DirectLine manager
     */
    disconnect() {
        if (this.directLineManager) {
            console.log('🔌 Disconnecting from DirectLine manager');
            this.directLineManager = null;
        }
    }
}

// Export singleton instances
export const messageQueue = new MessageQueue();
export const directLineAdapter = new DirectLineMessageAdapter(messageQueue);
