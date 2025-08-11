/**
 * Message System Migration Adapter
 * Provides compatibility layer between old and new message systems
 * Allows gradual migration to unified message renderer
 */

import { unifiedMessageRenderer, MessageTypes } from './unifiedMessageRenderer.js';

export class MessageMigrationAdapter {
    constructor() {
        this.isUnifiedMode = false; // Start with legacy mode
        this.legacyRenderer = null;
        console.log('[MessageMigrationAdapter] Initialized');
    }

    /**
     * Set legacy message renderer for fallback
     * @param {Object} renderer - Legacy message renderer instance
     */
    setLegacyRenderer(renderer) {
        this.legacyRenderer = renderer;
    }

    /**
     * Enable unified message renderer
     */
    enableUnifiedMode() {
        this.isUnifiedMode = true;
        console.log('[MessageMigrationAdapter] Switched to unified mode');
    }

    /**
     * Disable unified message renderer (fallback to legacy)
     */
    disablUnifiedMode() {
        this.isUnifiedMode = false;
        console.log('[MessageMigrationAdapter] Switched to legacy mode');
    }

    /**
     * Add message using appropriate renderer
     * @param {Object} messageData - Message data
     */
    async addMessage(messageData) {
        if (this.isUnifiedMode) {
            return await this.addUnifiedMessage(messageData);
        } else {
            return this.addLegacyMessage(messageData);
        }
    }

    /**
     * Add message using unified renderer
     * @param {Object} messageData - Message data
     */
    async addUnifiedMessage(messageData) {
        const normalizedData = this.normalizeForUnified(messageData);
        return await unifiedMessageRenderer.addMessage(normalizedData);
    }

    /**
     * Add message using legacy renderer
     * @param {Object} messageData - Message data
     */
    addLegacyMessage(messageData) {
        if (!this.legacyRenderer) {
            console.warn('[MessageMigrationAdapter] No legacy renderer set, using unified');
            return this.addUnifiedMessage(messageData);
        }

        // Route to appropriate legacy method based on data structure
        if (messageData.from && messageData.type === 'message') {
            // DirectLine format
            return this.legacyRenderer.renderMessage(messageData);
        } else if (messageData.sender) {
            // AI Companion format
            return this.legacyRenderer.renderMessage(messageData.sender, messageData.content || messageData.text);
        } else {
            // Generic format
            return this.legacyRenderer.addMessage(messageData);
        }
    }

    /**
     * Normalize legacy message data for unified renderer
     * @param {Object} messageData - Legacy message data
     * @returns {Object} Normalized data
     */
    normalizeForUnified(messageData) {
        // Handle DirectLine Bot Framework format
        if (messageData.from && messageData.type === 'message') {
            return {
                id: messageData.id,
                type: messageData.from.id === 'user' ? MessageTypes.USER : MessageTypes.AGENT,
                content: messageData.text || '',
                sender: messageData.from.name || messageData.from.id,
                timestamp: messageData.timestamp,
                metadata: {
                    isStreaming: false,
                    showMetadata: true,
                    showIcon: true,
                    responseTime: messageData.responseTime,
                    source: messageData.from.id === 'user' ? null : 'Copilot Studio'
                },
                originalData: messageData
            };
        }

        // Handle AI Companion format
        if (messageData.sender || messageData.type === 'ai-companion') {
            const isThinking = messageData.isThinking || messageData.sender === 'thinking';
            return {
                id: messageData.id,
                type: isThinking ? MessageTypes.AI_COMPANION_THINKING : MessageTypes.AI_COMPANION,
                content: messageData.content || messageData.text || messageData.message || '',
                sender: messageData.sender || 'AI Companion',
                timestamp: messageData.timestamp,
                metadata: {
                    isStreaming: messageData.isStreaming || false,
                    showMetadata: true,
                    showIcon: true,
                    source: isThinking ? 'AI Companion (Thinking)' : 'AI Companion'
                },
                originalData: messageData
            };
        }

        // Handle generic format
        return {
            id: messageData.id,
            type: this.detectMessageType(messageData),
            content: messageData.content || messageData.text || messageData.message || '',
            sender: messageData.sender || messageData.from?.name || 'Assistant',
            timestamp: messageData.timestamp,
            metadata: {
                isStreaming: messageData.isStreaming || false,
                showMetadata: messageData.showMetadata !== false,
                showIcon: messageData.showIcon !== false,
                responseTime: messageData.responseTime,
                source: messageData.source
            },
            originalData: messageData
        };
    }

    /**
     * Detect message type from legacy data
     * @param {Object} messageData - Message data
     * @returns {string} Message type
     */
    detectMessageType(messageData) {
        if (messageData.type) {
            switch (messageData.type.toLowerCase()) {
                case 'user':
                    return MessageTypes.USER;
                case 'agent':
                case 'bot':
                case 'assistant':
                    return MessageTypes.AGENT;
                case 'ai-companion':
                case 'companion':
                    return MessageTypes.AI_COMPANION;
                case 'thinking':
                    return MessageTypes.AI_COMPANION_THINKING;
                case 'system':
                    return MessageTypes.SYSTEM;
                case 'error':
                    return MessageTypes.ERROR;
            }
        }

        // Detect by sender
        if (messageData.sender) {
            switch (messageData.sender.toLowerCase()) {
                case 'user':
                    return MessageTypes.USER;
                case 'thinking':
                    return MessageTypes.AI_COMPANION_THINKING;
                case 'ai companion':
                case 'ai-companion':
                case 'companion':
                    return MessageTypes.AI_COMPANION;
                case 'system':
                    return MessageTypes.SYSTEM;
                case 'error':
                    return MessageTypes.ERROR;
            }
        }

        // Detect by from.id (Bot Framework)
        if (messageData.from?.id === 'user') {
            return MessageTypes.USER;
        }

        // Default to agent
        return MessageTypes.AGENT;
    }

    /**
     * Update streaming message
     * @param {string} messageId - Message ID
     * @param {string} content - New content
     * @param {boolean} isComplete - Whether streaming is complete
     */
    updateStreamingMessage(messageId, content, isComplete = false) {
        if (this.isUnifiedMode) {
            unifiedMessageRenderer.updateStreamingMessage(messageId, content, isComplete);
        } else if (this.legacyRenderer && this.legacyRenderer.updateStreamingMessage) {
            this.legacyRenderer.updateStreamingMessage(messageId, content, isComplete);
        }
    }

    /**
     * Remove message
     * @param {string} messageId - Message ID
     */
    removeMessage(messageId) {
        if (this.isUnifiedMode) {
            unifiedMessageRenderer.removeMessage(messageId);
        } else if (this.legacyRenderer && this.legacyRenderer.removeMessage) {
            this.legacyRenderer.removeMessage(messageId);
        }
    }

    /**
     * Clear all messages
     */
    clearAllMessages() {
        if (this.isUnifiedMode) {
            unifiedMessageRenderer.clearAllMessages();
        } else if (this.legacyRenderer && this.legacyRenderer.clearAllMessages) {
            this.legacyRenderer.clearAllMessages();
        }
    }

    /**
     * Convert all existing messages to unified format
     */
    async migrateExistingMessages() {
        if (!this.isUnifiedMode) {
            console.warn('[MessageMigrationAdapter] Cannot migrate in legacy mode');
            return;
        }

        const chatWindow = document.getElementById('chatWindow');
        if (!chatWindow) return;

        const existingMessages = chatWindow.querySelectorAll('.messageContainer');
        const messages = [];

        // Extract data from existing messages
        existingMessages.forEach((element, index) => {
            const messageData = this.extractLegacyMessageData(element);
            if (messageData) {
                messages.push(messageData);
            }
        });

        // Clear existing messages
        chatWindow.innerHTML = '';

        // Re-render using unified system
        for (const messageData of messages) {
            await this.addUnifiedMessage(messageData);
        }

        console.log(`[MessageMigrationAdapter] Migrated ${messages.length} existing messages`);
    }

    /**
     * Extract message data from legacy DOM element
     * @param {HTMLElement} element - Message element
     * @returns {Object|null} Extracted message data
     */
    extractLegacyMessageData(element) {
        try {
            const messageContent = element.querySelector('.messageContent');
            if (!messageContent) return null;

            const isUser = element.classList.contains('userMessage');
            const isCompanion = element.classList.contains('companion-response');
            const isThinking = element.classList.contains('thinking-message');
            const timestamp = element.dataset.timestamp || new Date().toISOString();

            let type = MessageTypes.AGENT;
            if (isUser) type = MessageTypes.USER;
            else if (isThinking) type = MessageTypes.AI_COMPANION_THINKING;
            else if (isCompanion) type = MessageTypes.AI_COMPANION;

            return {
                id: element.dataset.messageId || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type,
                content: messageContent.innerHTML || messageContent.textContent || '',
                sender: isUser ? 'User' : (isCompanion ? 'AI Companion' : 'Assistant'),
                timestamp,
                metadata: {
                    isStreaming: false,
                    showMetadata: true,
                    showIcon: true,
                    migrated: true
                }
            };
        } catch (error) {
            console.warn('[MessageMigrationAdapter] Error extracting legacy message:', error);
            return null;
        }
    }

    /**
     * Get current renderer mode
     * @returns {string} Current mode ('unified' or 'legacy')
     */
    getCurrentMode() {
        return this.isUnifiedMode ? 'unified' : 'legacy';
    }

    /**
     * Get renderer statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const stats = {
            mode: this.getCurrentMode(),
            legacyRenderer: !!this.legacyRenderer
        };

        if (this.isUnifiedMode) {
            stats.unifiedStats = {
                queueLength: unifiedMessageRenderer.messageQueue.length,
                streamingMessages: unifiedMessageRenderer.streamingStates.size,
                isProcessingQueue: unifiedMessageRenderer.isProcessingQueue
            };
        }

        return stats;
    }
}

// Global instance
export const messageMigrationAdapter = new MessageMigrationAdapter();
