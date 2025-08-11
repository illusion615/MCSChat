/**
 * Message System Integration
 * Easy integration of the unified message system
 */

import { unifiedMessageRenderer, MessageTypes } from './unifiedMessageRenderer.js';
import { messageMigrationAdapter } from './messageMigrationAdapter.js';

/**
 * Simple API for adding messages
 */
export class MessageAPI {
    /**
     * Add a user message
     * @param {string} content - Message content
     * @param {Object} options - Additional options
     */
    static async addUserMessage(content, options = {}) {
        return await unifiedMessageRenderer.addMessage({
            type: MessageTypes.USER,
            content,
            ...options
        });
    }

    /**
     * Add an agent message
     * @param {string} content - Message content
     * @param {Object} options - Additional options
     */
    static async addAgentMessage(content, options = {}) {
        return await unifiedMessageRenderer.addMessage({
            type: MessageTypes.AGENT,
            content,
            ...options
        });
    }

    /**
     * Add an AI companion message
     * @param {string} content - Message content
     * @param {Object} options - Additional options
     */
    static async addAICompanionMessage(content, options = {}) {
        return await unifiedMessageRenderer.addMessage({
            type: MessageTypes.AI_COMPANION,
            content,
            ...options
        });
    }

    /**
     * Add an AI companion thinking message
     * @param {string} content - Message content
     * @param {Object} options - Additional options
     */
    static async addThinkingMessage(content, options = {}) {
        return await unifiedMessageRenderer.addMessage({
            type: MessageTypes.AI_COMPANION_THINKING,
            content,
            ...options
        });
    }

    /**
     * Add a system message
     * @param {string} content - Message content
     * @param {Object} options - Additional options
     */
    static async addSystemMessage(content, options = {}) {
        return await unifiedMessageRenderer.addMessage({
            type: MessageTypes.SYSTEM,
            content,
            ...options
        });
    }

    /**
     * Add an error message
     * @param {string} content - Message content
     * @param {Object} options - Additional options
     */
    static async addErrorMessage(content, options = {}) {
        return await unifiedMessageRenderer.addMessage({
            type: MessageTypes.ERROR,
            content,
            ...options
        });
    }

    /**
     * Start streaming message
     * @param {string} type - Message type
     * @param {Object} options - Additional options
     * @returns {string} Message ID for updates
     */
    static async startStreamingMessage(type, options = {}) {
        return await unifiedMessageRenderer.addMessage({
            type,
            content: '',
            metadata: {
                isStreaming: true,
                ...options.metadata
            },
            ...options
        });
    }

    /**
     * Update streaming message
     * @param {string} messageId - Message ID
     * @param {string} content - New content
     * @param {boolean} isComplete - Whether streaming is complete
     */
    static updateStreaming(messageId, content, isComplete = false) {
        unifiedMessageRenderer.updateStreamingMessage(messageId, content, isComplete);
    }

    /**
     * Remove message
     * @param {string} messageId - Message ID
     */
    static removeMessage(messageId) {
        unifiedMessageRenderer.removeMessage(messageId);
    }

    /**
     * Clear all messages
     */
    static clearAll() {
        unifiedMessageRenderer.clearAllMessages();
    }
}

/**
 * Legacy compatibility functions
 * Drop-in replacements for existing message functions
 */
export class LegacyCompatibility {
    /**
     * Initialize with existing renderer for fallback
     * @param {Object} legacyRenderer - Existing message renderer
     */
    static init(legacyRenderer) {
        messageMigrationAdapter.setLegacyRenderer(legacyRenderer);
    }

    /**
     * Enable unified mode
     */
    static enableUnified() {
        messageMigrationAdapter.enableUnifiedMode();
    }

    /**
     * Render message (Bot Framework compatible)
     * @param {Object} activity - Bot Framework activity
     */
    static async renderMessage(activity) {
        return await messageMigrationAdapter.addMessage(activity);
    }

    /**
     * Add AI companion message (compatible with existing function)
     * @param {string} sender - Sender type
     * @param {string} message - Message content
     */
    static async addAICompanionMessage(sender, message) {
        return await messageMigrationAdapter.addMessage({
            sender,
            content: message,
            type: sender === 'thinking' ? 'ai-companion-thinking' : 'ai-companion'
        });
    }

    /**
     * Update streaming content
     * @param {string} messageId - Message ID
     * @param {string} content - Content
     * @param {boolean} isComplete - Is complete
     */
    static updateStreaming(messageId, content, isComplete = false) {
        messageMigrationAdapter.updateStreamingMessage(messageId, content, isComplete);
    }

    /**
     * Migrate existing messages to unified system
     */
    static async migrate() {
        messageMigrationAdapter.enableUnifiedMode();
        await messageMigrationAdapter.migrateExistingMessages();
    }
}

// Export instances
export { unifiedMessageRenderer, messageMigrationAdapter, MessageTypes };
