/**
 * Message Integration System
 * Integrates the unified message renderer into the existing application
 * Provides migration support and backward compatibility
 */

import { UnifiedMessageRenderer } from './unifiedMessageRenderer.js';
import { MessageMigrationAdapter } from './messageMigrationAdapter.js';
import { MessageAPI } from './messageAPI.js';

export class MessageIntegration {
    constructor() {
        this.renderer = null;
        this.adapter = null;
        this.initialized = false;
        this.migrationMode = true; // Start in migration mode for compatibility
    }

    /**
     * Initialize the unified message system
     * @param {HTMLElement} agentChatWindow - The agent chat window element
     * @param {HTMLElement} aiCompanionChatWindow - The AI companion chat window element
     * @param {Object} options - Configuration options
     */
    async initialize(agentChatWindow, aiCompanionChatWindow, options = {}) {
        try {
            console.log('MessageIntegration: Initializing unified message system...');

            // Initialize components
            this.renderer = new UnifiedMessageRenderer();

            this.adapter = new MessageMigrationAdapter();

            // Initialize renderer
            this.renderer.initializeRenderer();

            // Setup migration adapter
            this.adapter.initialize(this.renderer);

            this.initialized = true;
            console.log('MessageIntegration: Successfully initialized');

            // Dispatch initialization event
            window.dispatchEvent(new CustomEvent('unifiedMessageSystemReady', {
                detail: { integration: this, api: this.renderer }
            }));

            return true;
        } catch (error) {
            console.error('MessageIntegration: Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Add a message using the unified system
     * @param {string} type - Message type (user, agent, ai-companion, thinking, system, error)
     * @param {string} content - Message content
     * @param {Object} metadata - Message metadata
     * @param {Object} options - Rendering options
     */
    addMessage(type, content, metadata = {}, options = {}) {
        if (!this.initialized) {
            console.warn('MessageIntegration: System not initialized, queuing message');
            return this.queueMessage(type, content, metadata, options);
        }

        return this.renderer.addMessage({
            type: type,
            content: content,
            ...metadata,
            ...options
        });
    }

    /**
     * Queue a message for processing when system is ready
     */
    queueMessage(type, content, metadata = {}, options = {}) {
        if (!this._messageQueue) {
            this._messageQueue = [];
        }

        this._messageQueue.push({ type, content, metadata, options });

        // Process queue when system is ready
        if (this.initialized) {
            this.processMessageQueue();
        }
    }

    /**
     * Process queued messages
     */
    processMessageQueue() {
        if (!this._messageQueue || this._messageQueue.length === 0) return;

        const queue = this._messageQueue;
        this._messageQueue = [];

        queue.forEach(({ type, content, metadata, options }) => {
            this.renderer.addMessage({
                type: type,
                content: content,
                ...metadata,
                ...options
            });
        });
    }

    /**
     * Migrate from legacy message system
     * @param {HTMLElement} legacyContainer - Legacy message container
     */
    migrateLegacyMessages(legacyContainer) {
        if (!this.adapter) {
            console.warn('MessageIntegration: Migration adapter not available');
            return;
        }

        try {
            const migrated = this.adapter.migrateLegacyContainer(legacyContainer);
            console.log(`MessageIntegration: Migrated ${migrated} legacy messages`);
            return migrated;
        } catch (error) {
            console.error('MessageIntegration: Migration failed:', error);
            return 0;
        }
    }

    /**
     * Enable or disable migration mode
     * @param {boolean} enabled - Whether to enable migration mode
     */
    setMigrationMode(enabled) {
        this.migrationMode = enabled;
        if (this.adapter) {
            this.adapter.setCompatibilityMode(enabled);
        }
    }

    /**
     * Switch to professional mode
     * @param {boolean} enabled - Whether to enable professional mode
     */
    setProfessionalMode(enabled) {
        if (this.renderer) {
            this.renderer.setProfessionalMode(enabled);
        }
    }

    /**
     * Get message statistics
     */
    getStats() {
        if (!this.renderer) return null;
        return this.renderer.getStats();
    }

    /**
     * Clear all messages
     * @param {string} container - Container to clear ('agent', 'ai-companion', or 'all')
     */
    clearMessages(container = 'all') {
        if (this.renderer && this.renderer.elements.chatWindow) {
            this.renderer.elements.chatWindow.innerHTML = '';
        }
    }

    /**
     * Set up legacy compatibility bridges
     */
    setupLegacyBridge() {
        if (!window.unifiedMessageSystem) {
            window.unifiedMessageSystem = this;
        }

        // Bridge for existing message rendering functions
        this.bridgeLegacyFunctions();
    }

    /**
     * Create bridges for existing functions to use unified system
     */
    bridgeLegacyFunctions() {
        const self = this;

        // Bridge addMessage functions if they exist
        if (window.addMessage && !window.addMessage._unified) {
            const originalAddMessage = window.addMessage;
            window.addMessage = function (content, isUser = false, container = 'agent') {
                if (self.initialized && self.api) {
                    const type = isUser ? 'user' : (container === 'ai-companion' ? 'ai-companion' : 'agent');
                    return self.addMessage(type, content);
                } else {
                    return originalAddMessage.call(this, content, isUser, container);
                }
            };
            window.addMessage._unified = true;
        }

        // Bridge AI companion functions
        if (window.addAICompanionMessage && !window.addAICompanionMessage._unified) {
            const originalAddAICompanionMessage = window.addAICompanionMessage;
            window.addAICompanionMessage = function (content, type = 'ai-companion') {
                if (self.initialized && self.api) {
                    return self.addMessage(type, content);
                } else {
                    return originalAddAICompanionMessage.call(this, content, type);
                }
            };
            window.addAICompanionMessage._unified = true;
        }

        // Bridge typing indicator functions
        if (window.showTypingIndicator && !window.showTypingIndicator._unified) {
            const originalShowTyping = window.showTypingIndicator;
            window.showTypingIndicator = function (container = 'agent') {
                if (self.initialized && self.api) {
                    const type = container === 'ai-companion' ? 'ai-companion' : 'agent';
                    return self.addMessage('thinking', 'Thinking...', { temporary: true });
                } else {
                    return originalShowTyping.call(this, container);
                }
            };
            window.showTypingIndicator._unified = true;
        }

        // Bridge messageRenderer methods if available
        if (window.messageRenderer && !window.messageRenderer._unified) {
            const originalRenderer = window.messageRenderer;

            // Override renderCompleteMessage method
            if (originalRenderer.renderCompleteMessage) {
                const originalRenderCompleteMessage = originalRenderer.renderCompleteMessage.bind(originalRenderer);
                originalRenderer.renderCompleteMessage = function (activity) {
                    if (self.initialized && self.api) {
                        // Convert Bot Framework activity to unified message
                        const isUser = activity.from && activity.from.role === 'user';
                        const type = isUser ? 'user' : 'agent';
                        const content = activity.text || activity.speak || '';
                        const metadata = {
                            timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
                            activityId: activity.id,
                            channelData: activity.channelData
                        };
                        return self.addMessage(type, content, metadata);
                    } else {
                        return originalRenderCompleteMessage(activity);
                    }
                };
            }

            // Override renderCompleteMessageDirect method
            if (originalRenderer.renderCompleteMessageDirect) {
                const originalRenderCompleteMessageDirect = originalRenderer.renderCompleteMessageDirect.bind(originalRenderer);
                originalRenderer.renderCompleteMessageDirect = function (activity) {
                    if (self.initialized && self.api) {
                        const isUser = activity.from && activity.from.role === 'user';
                        const type = isUser ? 'user' : 'agent';
                        const content = activity.text || activity.speak || '';
                        const metadata = {
                            timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
                            activityId: activity.id,
                            channelData: activity.channelData
                        };
                        return self.addMessage(type, content, metadata);
                    } else {
                        return originalRenderCompleteMessageDirect(activity);
                    }
                };
            }

            window.messageRenderer._unified = true;
        }

        console.log('MessageIntegration: Legacy function bridges established');
    }

    /**
     * Remove legacy bridges and restore original functions
     */
    removeLegacyBridge() {
        // This would restore original functions if needed
        // Implementation depends on how the original functions were stored
        console.log('MessageIntegration: Legacy bridge removal not implemented');
    }

    /**
     * Get the unified message API
     */
    getAPI() {
        return this.renderer;
    }

    /**
     * Get the unified message renderer
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Get the migration adapter
     */
    getAdapter() {
        return this.adapter;
    }

    /**
     * Check if the system is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Destroy the integration system
     */
    destroy() {
        if (this.renderer) {
            this.renderer.destroy();
        }

        if (this.adapter) {
            this.adapter.destroy();
        }

        this.renderer = null;
        this.adapter = null;
        this.initialized = false;

        // Remove from global scope
        if (window.unifiedMessageSystem === this) {
            delete window.unifiedMessageSystem;
        }
    }
}

// Auto-initialize if containers are available
document.addEventListener('DOMContentLoaded', () => {
    const agentChatWindow = document.getElementById('chatWindow');
    const aiCompanionChatWindow = document.getElementById('llmChatWindow');

    if (agentChatWindow || aiCompanionChatWindow) {
        const integration = new MessageIntegration();

        // Check for initialization configuration
        const config = window.unifiedMessageConfig || {};

        integration.initialize(agentChatWindow, aiCompanionChatWindow, config)
            .then(success => {
                if (success) {
                    integration.setupLegacyBridge();
                    console.log('MessageIntegration: Auto-initialization successful');
                } else {
                    console.warn('MessageIntegration: Auto-initialization failed');
                }
            })
            .catch(error => {
                console.error('MessageIntegration: Auto-initialization error:', error);
            });
    }
});

// Export for module usage
export default MessageIntegration;

// Global access
if (typeof window !== 'undefined') {
    window.MessageIntegration = MessageIntegration;
}
