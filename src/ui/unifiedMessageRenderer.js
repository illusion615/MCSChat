/**
 * Unified Message Renderer
 * Consolidates all message rendering logic into a single, extensible system
 * Handles message queue, unified layout, and type-based styling
 */

import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';

/**
 * Message Types
 */
export const MessageTypes = {
    USER: 'user',
    AGENT: 'agent',
    AI_COMPANION: 'ai-companion',
    SYSTEM: 'system',
    ERROR: 'error'
};

/**
 * Message Status
 */
export const MessageStatus = {
    QUEUED: 'queued',
    RENDERING: 'rendering',
    STREAMING: 'streaming',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

export class UnifiedMessageRenderer {
    constructor() {
        this.elements = {
            chatWindow: DOMUtils.getElementById('chatWindow'),
            suggestedActionsContainer: DOMUtils.getElementById('suggestedActionsContainer')
        };

        // Message queue system
        this.messageQueue = [];
        this.isProcessingQueue = false;
        this.streamingStates = new Map();
        this.renderingInProgress = new Set();

        // Global speech and timing state
        this.globalState = {
            speech: {
                isPlaying: false,
                currentSpeakerButton: null,
                currentProgressContainer: null,
                currentProgressFill: null
            },
            timing: {
                requestStartTime: null,
                lastRequestId: null
            }
        };

        // Initialize
        this.initializeRenderer();
    }

    /**
     * Initialize the renderer
     */
    initializeRenderer() {
        // Set up any global event listeners or initialization
        console.log('[UnifiedMessageRenderer] Initialized');
    }

    /**
     * Add message to queue and process
     * @param {Object} messageData - Message data object
     */
    async addMessage(messageData) {
        // Validate and normalize message data
        const normalizedMessage = this.normalizeMessageData(messageData);

        // Add to queue
        this.messageQueue.push(normalizedMessage);

        // Process queue if not already processing
        if (!this.isProcessingQueue) {
            await this.processMessageQueue();
        }

        return normalizedMessage.id;
    }

    /**
     * Normalize message data to standard format
     * @param {Object} messageData - Raw message data
     * @returns {Object} Normalized message data
     */
    normalizeMessageData(messageData) {
        const id = messageData.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
            id,
            type: messageData.type || MessageTypes.AGENT,
            content: messageData.content || messageData.text || '',
            sender: messageData.sender || messageData.from?.name || 'Assistant',
            timestamp: messageData.timestamp || new Date().toISOString(),
            status: MessageStatus.QUEUED,
            metadata: {
                isStreaming: messageData.isStreaming || false,
                showMetadata: messageData.showMetadata !== false, // Default true
                showIcon: messageData.showIcon !== false, // Default true
                responseTime: messageData.responseTime || null,
                source: messageData.source || null,
                ...messageData.metadata
            },
            originalData: messageData // Keep reference to original
        };
    }

    /**
     * Process message queue sequentially
     */
    async processMessageQueue() {
        if (this.isProcessingQueue) return;

        this.isProcessingQueue = true;

        try {
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                await this.renderSingleMessage(message);
            }
        } catch (error) {
            console.error('[UnifiedMessageRenderer] Error processing queue:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Render a single message
     * @param {Object} message - Normalized message data
     */
    async renderSingleMessage(message) {
        try {
            message.status = MessageStatus.RENDERING;

            // Create message container with unified layout
            const messageContainer = this.createUnifiedMessageContainer(message);

            // Determine target window based on message type or container metadata
            const targetWindow = this.getTargetWindow(message);

            // Add to DOM
            targetWindow.appendChild(messageContainer);

            // Scroll to bottom
            DOMUtils.scrollToBottom(targetWindow);

            // Handle streaming if needed
            if (message.metadata.isStreaming) {
                message.status = MessageStatus.STREAMING;
                await this.handleStreamingMessage(message, messageContainer);
            } else {
                message.status = MessageStatus.COMPLETED;
            }

        } catch (error) {
            console.error('[UnifiedMessageRenderer] Error rendering message:', error);
            message.status = MessageStatus.FAILED;
        }
    }

    /**
     * Determine target window based on message type or container metadata
     * @param {Object} message - Message data
     * @returns {HTMLElement} Target window element
     */
    getTargetWindow(message) {
        // Check container metadata first
        if (message.metadata?.container === 'ai-companion' || 
            message.originalData?.container === 'ai-companion') {
            const aiCompanionWindow = DOMUtils.getElementById('llmChatWindow');
            if (aiCompanionWindow) {
                return aiCompanionWindow;
            }
        }

        // Check message type
        if (message.type === MessageTypes.AI_COMPANION) {
            const aiCompanionWindow = DOMUtils.getElementById('llmChatWindow');
            if (aiCompanionWindow) {
                return aiCompanionWindow;
            }
        }

        // Default to main chat window
        return this.elements.chatWindow || DOMUtils.getElementById('chatWindow');
    }

    /**
     * Create unified message container with consistent layout
     * @param {Object} message - Message data
     * @returns {HTMLElement} Message container
     */
    createUnifiedMessageContainer(message) {
        // Main message container
        const messageContainer = DOMUtils.createElement('div', {
            className: this.getMessageContainerClasses(message),
            dataset: {
                messageId: message.id,
                messageType: message.type,
                timestamp: message.timestamp
            }
        });

        // Content wrapper (contains message body and metadata)
        const contentWrapper = DOMUtils.createElement('div', {
            className: 'message-content-wrapper'
        });

        // Message body
        const messageBody = this.createMessageBody(message);
        contentWrapper.appendChild(messageBody);

        // Metadata (if enabled)
        if (message.metadata.showMetadata) {
            const metadata = this.createMessageMetadata(message);
            if (metadata) {
                contentWrapper.appendChild(metadata);
            }
        }

        // For user messages: content first, then icon (icon on right)
        // For other messages: icon first, then content (icon on left)
        if (message.type === MessageTypes.USER) {
            // User message: content wrapper first, then icon
            messageContainer.appendChild(contentWrapper);

            // Icon (if enabled)
            if (message.metadata.showIcon) {
                const icon = this.createMessageIcon(message);
                if (icon) {
                    messageContainer.appendChild(icon);
                }
            }
        } else {
            // Other messages: icon first, then content wrapper
            // Icon (if enabled)
            if (message.metadata.showIcon) {
                const icon = this.createMessageIcon(message);
                if (icon) {
                    messageContainer.appendChild(icon);
                }
            }

            messageContainer.appendChild(contentWrapper);
        }

        return messageContainer;
    }

    /**
     * Get CSS classes for message container based on type
     * @param {Object} message - Message data
     * @returns {string} CSS class string
     */
    getMessageContainerClasses(message) {
        const classes = ['messageContainer', 'unified-message'];

        // Type-specific classes
        switch (message.type) {
            case MessageTypes.USER:
                classes.push('userMessage', 'user-type');
                break;
            case MessageTypes.AGENT:
                classes.push('botMessage', 'agent-type');
                break;
            case MessageTypes.AI_COMPANION:
                classes.push('botMessage', 'ai-companion-type');
                break;
            case MessageTypes.SYSTEM:
                classes.push('systemMessage', 'system-type');
                break;
            case MessageTypes.ERROR:
                classes.push('errorMessage', 'error-type');
                break;
            default:
                classes.push('botMessage', 'default-type');
        }

        // Status classes
        classes.push(`status-${message.status}`);

        return classes.join(' ');
    }

    /**
     * Create message icon based on type
     * @param {Object} message - Message data
     * @returns {HTMLElement|null} Icon element
     */
    createMessageIcon(message) {
        // Check if icons are globally enabled
        const iconsEnabled = localStorage.getItem('messageIconsEnabled') !== 'false';
        if (!iconsEnabled) return null;

        // Get Icons from global scope or fallback
        const Icons = window.Icons;
        if (!Icons) {
            console.warn('SVG Icons library not available');
            return null;
        }

        let iconName = 'send'; // default fallback
        let iconSize = 'medium';
        let iconTheme = 'default';

        // Map message types to icon names with fallbacks
        switch (message.type) {
            case MessageTypes.USER:
                iconName = 'user';
                iconSize = 'medium';
                iconTheme = 'outline';
                break;

            case MessageTypes.AGENT:
                iconName = 'agent';
                iconSize = 'medium';
                iconTheme = 'filled';
                break;

            case MessageTypes.AI_COMPANION:
                iconName = 'aiCompanion';
                iconSize = 'large'; // 28x28px as mentioned in requirements
                iconTheme = 'filled';
                break;

            case MessageTypes.SYSTEM:
                // Use a generic system icon, fallback to microphone if not available
                iconName = Icons.hasIcon && Icons.hasIcon('system') ? 'system' : 'microphone';
                iconSize = 'small';
                iconTheme = 'outline';
                break;

            case MessageTypes.ERROR:
                // Use error icon, fallback to delete if not available
                iconName = Icons.hasIcon && Icons.hasIcon('error') ? 'error' : 'delete';
                iconSize = 'medium';
                iconTheme = 'filled';
                break;

            default:
                iconName = 'send';
                iconSize = 'medium';
                iconTheme = 'default';
        }

        // Create the icon using the new SVG library
        try {
            // Determine icon size in pixels based on message type
            let iconPixelSize = '20px';
            if (message.type === MessageTypes.AI_COMPANION) {
                iconPixelSize = '20px'; // Slightly smaller icon inside 28x28 container
            }

            const iconElement = Icons.create(iconName, {
                size: iconSize,
                theme: iconTheme,
                style: {
                    width: iconPixelSize,
                    height: iconPixelSize,
                    display: 'block',
                    margin: '0 auto'
                }
            });

            if (iconElement) {
                // Create container with the expected classes for CSS styling
                const iconContainer = DOMUtils.createElement('div', {
                    className: 'unified-message-icon messageIcon'
                });
                
                // Add icon-specific styling based on message type
                if (message.type === MessageTypes.USER) {
                    iconContainer.style.color = '#ffffff';
                } else if (message.type === MessageTypes.AGENT) {
                    iconContainer.style.color = '#333333';
                    iconContainer.style.backgroundColor = 'transparent';
                } else if (message.type === MessageTypes.AI_COMPANION) {
                    iconContainer.style.color = '#667eea';
                } else if (message.type === MessageTypes.SYSTEM) {
                    iconContainer.style.color = '#ffffff';
                } else if (message.type === MessageTypes.ERROR) {
                    iconContainer.style.color = '#ffffff';
                }

                iconContainer.appendChild(iconElement);
                return iconContainer;
            }
        } catch (error) {
            console.warn('Error creating SVG icon:', error);
        }

        // Fallback: return empty container if icon creation fails
        return DOMUtils.createElement('div', {
            className: 'unified-message-icon messageIcon fallback-icon'
        });
    }

    /**
     * Create message body content
     * @param {Object} message - Message data
     * @returns {HTMLElement} Message body element
     */
    createMessageBody(message) {
        const messageBody = DOMUtils.createElement('div', {
            className: 'messageContent'
        });

        // Process content based on type and format
        if (message.type === MessageTypes.ERROR) {
            messageBody.textContent = message.content;
        } else {
            // Handle markdown processing
            this.setMessageContent(messageBody, message.content);
        }

        return messageBody;
    }

    /**
     * Set message content with proper processing
     * @param {HTMLElement} element - Target element
     * @param {string} content - Content to set
     */
    setMessageContent(element, content) {
        try {
            // Try markdown processing if available
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                const htmlContent = marked.parse(content);
                const sanitizedContent = DOMPurify.sanitize(htmlContent);
                element.innerHTML = sanitizedContent;
            } else {
                element.textContent = content;
            }
        } catch (error) {
            console.warn('[UnifiedMessageRenderer] Error processing content:', error);
            element.textContent = content;
        }
    }

    /**
     * Create message metadata
     * @param {Object} message - Message data
     * @returns {HTMLElement|null} Metadata element
     */
    createMessageMetadata(message) {
        const metadata = DOMUtils.createElement('div', {
            className: 'message-metadata'
        });

        // Timestamp
        const timestamp = new Date(message.timestamp);
        const timeSpan = DOMUtils.createElement('span', {
            className: 'metadata-time'
        }, timestamp.toLocaleTimeString());

        metadata.appendChild(timeSpan);

        // Source (for non-user messages)
        if (message.type !== MessageTypes.USER) {
            const source = this.getMessageSource(message);
            if (source) {
                const sourceSpan = DOMUtils.createElement('span', {
                    className: 'metadata-source'
                }, source);

                metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' • '));
                metadata.appendChild(sourceSpan);
            }
        }

        // Response time (if available)
        if (message.metadata.responseTime) {
            const responseSpan = DOMUtils.createElement('span', {
                className: 'metadata-duration'
            }, `Response time: ${message.metadata.responseTime}`);

            metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' • '));
            metadata.appendChild(responseSpan);
        }

        return metadata;
    }

    /**
     * Get message source label based on type
     * @param {Object} message - Message data
     * @returns {string|null} Source label
     */
    getMessageSource(message) {
        switch (message.type) {
            case MessageTypes.AGENT:
                return 'Copilot Studio';
            case MessageTypes.AI_COMPANION:
                return 'AI Companion';
            case MessageTypes.AI_COMPANION_THINKING:
                return 'AI Companion (Thinking)';
            case MessageTypes.SYSTEM:
                return 'System';
            case MessageTypes.ERROR:
                return 'Error';
            default:
                return message.metadata.source || 'Assistant';
        }
    }

    /**
     * Handle streaming message updates
     * @param {Object} message - Message data
     * @param {HTMLElement} messageContainer - Message container
     */
    async handleStreamingMessage(message, messageContainer) {
        // Store streaming state
        this.streamingStates.set(message.id, {
            message,
            container: messageContainer,
            contentElement: messageContainer.querySelector('.messageContent'),
            startTime: Date.now()
        });

        // Mark as streaming
        messageContainer.classList.add('streaming');
    }

    /**
     * Update streaming message content
     * @param {string} messageId - Message ID
     * @param {string} content - New content
     * @param {boolean} isComplete - Whether streaming is complete
     */
    updateStreamingMessage(messageId, content, isComplete = false) {
        const streamingState = this.streamingStates.get(messageId);
        if (!streamingState) return;

        // Update content
        this.setMessageContent(streamingState.contentElement, content);

        // Handle completion
        if (isComplete) {
            streamingState.container.classList.remove('streaming');
            streamingState.container.classList.add('completed');
            streamingState.message.status = MessageStatus.COMPLETED;
            this.streamingStates.delete(messageId);
        }

        // Scroll to bottom
        DOMUtils.scrollToBottom(this.elements.chatWindow);
    }

    /**
     * Remove message from DOM and queue
     * @param {string} messageId - Message ID
     */
    removeMessage(messageId) {
        // Remove from DOM
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }

        // Clean up streaming state
        this.streamingStates.delete(messageId);

        // Remove from queue if present
        this.messageQueue = this.messageQueue.filter(msg => msg.id !== messageId);
    }

    /**
     * Clear all messages
     */
    clearAllMessages() {
        // Clear main chat window
        this.elements.chatWindow.innerHTML = '';
        
        // Clear AI companion window if it exists
        const aiCompanionWindow = DOMUtils.getElementById('llmChatWindow');
        if (aiCompanionWindow) {
            aiCompanionWindow.innerHTML = '';
        }
        
        this.messageQueue = [];
        this.streamingStates.clear();
        this.renderingInProgress.clear();
    }

    /**
     * Get message by ID
     * @param {string} messageId - Message ID
     * @returns {Object|null} Message data
     */
    getMessage(messageId) {
        // Check queue
        const queuedMessage = this.messageQueue.find(msg => msg.id === messageId);
        if (queuedMessage) return queuedMessage;

        // Check streaming states
        const streamingState = this.streamingStates.get(messageId);
        if (streamingState) return streamingState.message;

        return null;
    }
}

// Global instance
export const unifiedMessageRenderer = new UnifiedMessageRenderer();
