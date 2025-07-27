/**
 * Message Renderer
 * Handles rendering of chat messages, adaptive cards, and suggested actions
 */

import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';

export class MessageRenderer {
    constructor() {
        this.elements = {
            chatWindow: DOMUtils.getElementById('chatWindow'),
            suggestedActionsContainer: DOMUtils.getElementById('suggestedActionsContainer')
        };
        this.streamingState = {
            currentMessage: null,
            messageContainer: null,
            messageDiv: null,
            content: ''
        };

        // Debug markdown libraries on initialization
        this.debugMarkdownLibraries();
    }

    /**
     * Debug markdown libraries availability
     * @private
     */
    debugMarkdownLibraries() {
        console.log('MessageRenderer: Checking markdown libraries...');
        console.log('marked available:', typeof marked !== 'undefined');
        console.log('DOMPurify available:', typeof DOMPurify !== 'undefined');

        if (typeof marked !== 'undefined') {
            console.log('marked.parse function:', typeof marked.parse);
            console.log('marked function:', typeof marked);

            // Test basic markdown parsing
            try {
                const testMarkdown = '**Bold text** and *italic text*';
                const result = typeof marked.parse === 'function' ?
                    marked.parse(testMarkdown) :
                    marked(testMarkdown);
                console.log('Markdown test successful:', result);
            } catch (error) {
                console.error('Markdown test failed:', error);
            }
        }

        if (typeof DOMPurify !== 'undefined') {
            console.log('DOMPurify.sanitize function:', typeof DOMPurify.sanitize);

            // Test basic sanitization
            try {
                const result = DOMPurify.sanitize('<p>Test <script>alert("xss")</script></p>');
                console.log('DOMPurify test successful:', result);
            } catch (error) {
                console.error('DOMPurify test failed:', error);
            }
        }
    }

    /**
     * Render a complete message
     * @param {Object} activity - DirectLine activity
     */
    renderCompleteMessage(activity) {
        console.log('Rendering complete message:', activity);

        const messageContainer = this.createMessageContainer(activity);
        const messageDiv = this.createMessageDiv(activity);
        const isUser = activity.from && activity.from.id === 'user';
        const messageIcon = this.createMessageIcon(isUser);

        // Add text content
        if (activity.text) {
            this.addTextContent(messageDiv, activity.text);
        }

        // Add attachments
        if (activity.attachments && activity.attachments.length > 0) {
            this.addAttachments(messageDiv, activity.attachments);
        }

        // Add elements in correct order based on message type
        if (isUser) {
            // User messages: content first, then icon (icon on right)
            messageContainer.appendChild(messageDiv);
            messageContainer.appendChild(messageIcon);
        } else {
            // Bot messages: icon first, then content (icon on left)
            messageContainer.appendChild(messageIcon);
            messageContainer.appendChild(messageDiv);
        }
        this.elements.chatWindow.appendChild(messageContainer);

        // Handle suggested actions
        if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
            console.log('Rendering suggested actions:', activity.suggestedActions.actions);
            this.renderSuggestedActions(activity.suggestedActions.actions);
        }

        // Add response metadata
        this.addResponseMetadata(messageDiv);

        // Scroll to bottom
        this.scrollToBottom();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('messageRendered', {
            detail: { activity, element: messageContainer }
        }));
    }

    /**
     * Handle streaming message
     * @param {Object} activity - DirectLine activity
     */
    handleStreamingMessage(activity) {
        if (!this.streamingState.messageContainer) {
            // Create initial message container like legacy
            this.streamingState.messageContainer = this.createMessageContainer(activity);
            this.streamingState.messageDiv = this.createMessageDiv(activity);
            const isUser = activity.from && activity.from.id === 'user';
            const messageIcon = this.createMessageIcon(isUser);

            // Add elements in correct order based on message type
            if (isUser) {
                // User messages: content first, then icon (icon on right)
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
                this.streamingState.messageContainer.appendChild(messageIcon);
            } else {
                // Bot messages: icon first, then content (icon on left)
                this.streamingState.messageContainer.appendChild(messageIcon);
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
            }
            this.elements.chatWindow.appendChild(this.streamingState.messageContainer);
            this.streamingState.content = '';
        }

        // Append new content
        if (activity.text) {
            this.streamingState.content += activity.text;
            this.updateStreamingContent(this.streamingState.messageDiv, this.streamingState.content);
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Finalize streaming message
     * @param {Object} activity - Final activity
     */
    finalizeStreamingMessage(activity) {
        if (this.streamingState.messageDiv) {
            // Add attachments if any
            if (activity.attachments && activity.attachments.length > 0) {
                this.addAttachments(this.streamingState.messageDiv, activity.attachments);
            }

            // Handle suggested actions
            if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
                this.renderSuggestedActions(activity.suggestedActions.actions);
            }

            // Add response metadata
            this.addResponseMetadata(this.streamingState.messageDiv);

            // Clear streaming state
            this.clearStreamingState();

            // Scroll to bottom
            this.scrollToBottom();
        }
    }

    /**
     * Simulate streaming for non-streaming messages
     * @param {Object} activity - DirectLine activity
     */
    async simulateStreaming(activity) {
        if (!activity.text) {
            this.renderCompleteMessage(activity);
            return;
        }

        // Check if streaming is enabled
        const streamingEnabled = localStorage.getItem('enableStreaming') === 'true';
        if (!streamingEnabled) {
            this.renderCompleteMessage(activity);
            return;
        }

        console.log('Simulating streaming for message:', activity.text);

        // Create message container and elements like legacy
        this.streamingState.messageContainer = this.createMessageContainer(activity);
        this.streamingState.messageDiv = this.createMessageDiv(activity);
        const isUser = activity.from && activity.from.id === 'user';
        const messageIcon = this.createMessageIcon(isUser);

        // Add elements in correct order based on message type
        if (isUser) {
            // User messages: content first, then icon (icon on right)
            this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
            this.streamingState.messageContainer.appendChild(messageIcon);
        } else {
            // Bot messages: icon first, then content (icon on left)
            this.streamingState.messageContainer.appendChild(messageIcon);
            this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
        }
        this.elements.chatWindow.appendChild(this.streamingState.messageContainer);

        // Stream text character by character
        const text = activity.text;
        let currentText = '';

        for (let i = 0; i < text.length; i++) {
            currentText += text[i];
            this.updateStreamingContent(this.streamingState.messageDiv, currentText);
            this.scrollToBottom();

            // Variable delay for more natural streaming
            const delay = text[i] === ' ' ? 50 : Math.random() * 30 + 10;
            await Utils.sleep(delay);
        }

        // Finalize message
        this.finalizeStreamingMessage(activity);
    }

    /**
     * Create message container
     * @param {Object} activity - DirectLine activity
     * @returns {HTMLElement} Message container
     * @private
     */
    createMessageContainer(activity) {
        const isUser = activity.from && activity.from.id === 'user';
        const container = DOMUtils.createElement('div', {
            className: `messageContainer ${isUser ? 'userMessage' : 'botMessage'}`,
            dataset: {
                messageId: activity.id || Utils.generateId('msg'),
                timestamp: activity.timestamp || new Date().toISOString()
            }
        });

        return container;
    }

    /**
     * Create message icon
     * @param {boolean} isUser - Whether message is from user
     * @returns {HTMLElement} Message icon
     * @private
     */
    createMessageIcon(isUser) {
        const iconElement = DOMUtils.createElement('div', {
            className: 'messageIcon'
        });

        // Set background image like legacy
        if (isUser) {
            iconElement.style.backgroundImage = 'url("images/carter_30k.png")';
        } else {
            iconElement.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';
        }

        return iconElement;
    }

    /**
     * Create message div
     * @param {Object} activity - DirectLine activity
     * @returns {HTMLElement} Message div
     * @private
     */
    createMessageDiv(activity) {
        return DOMUtils.createElement('div', {
            className: 'messageContent'
        });
    }

    /**
     * Add text content to message
     * @param {HTMLElement} messageDiv - Message div element
     * @param {string} text - Text content
     * @private
     */
    addTextContent(messageDiv, text) {
        // Process markdown if available - exactly like legacy
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(text) :
                    marked(text);
                const sanitizedContent = DOMPurify.sanitize(htmlContent);
                messageDiv.innerHTML = sanitizedContent;
            } catch (error) {
                console.warn('Error processing markdown:', error);
                console.warn('Marked version check:', typeof marked.parse);
                messageDiv.textContent = text;
            }
        } else {
            console.warn('Markdown libraries not available:', {
                marked: typeof marked,
                DOMPurify: typeof DOMPurify
            });
            messageDiv.textContent = text;
        }

        // Make images clickable for enlargement - exactly like legacy
        const images = messageDiv.querySelectorAll('img');
        images.forEach(img => {
            img.style.maxWidth = '100%';
            img.style.cursor = 'pointer';
            DOMUtils.addEventListener(img, 'click', () => {
                this.showEnlargedImage(img.src, img.alt || 'Image');
            });
        });
    }

    /**
     * Update streaming content
     * @param {HTMLElement} messageDiv - Message div element
     * @param {string} content - Current content
     * @private
     */
    updateStreamingContent(messageDiv, content) {
        // Add typing cursor for streaming effect
        const displayText = content + '<span class="typing-cursor">|</span>';

        // Process markdown if available - exactly like legacy streaming
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(content) :
                    marked(content);
                const sanitizedContentWithCursor = DOMPurify.sanitize(htmlContent) + '<span class="typing-cursor">|</span>';
                messageDiv.innerHTML = sanitizedContentWithCursor;
            } catch (error) {
                console.warn('Error processing streaming markdown:', error);
                messageDiv.innerHTML = displayText;
            }
        } else {
            messageDiv.innerHTML = displayText;
        }

        // Make images clickable for enlargement
        const images = messageDiv.querySelectorAll('img');
        images.forEach(img => {
            img.style.maxWidth = '100%';
            img.style.cursor = 'pointer';
            DOMUtils.addEventListener(img, 'click', () => {
                this.showEnlargedImage(img.src, img.alt || 'Image');
            });
        });
    }

    /**
     * Add attachments to message
     * @param {HTMLElement} messageDiv - Message div element
     * @param {Array} attachments - Attachments array
     * @private
     */
    addAttachments(messageDiv, attachments) {
        attachments.forEach(attachment => {
            if (attachment.contentType === 'application/vnd.microsoft.card.adaptive') {
                this.renderAdaptiveCard(attachment, messageDiv);
            } else if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                this.renderImageAttachment(attachment, messageDiv);
            } else {
                this.renderGenericAttachment(attachment, messageDiv);
            }
        });
    }

    /**
     * Render adaptive card
     * @param {Object} attachment - Adaptive card attachment
     * @param {HTMLElement} messageDiv - Message div element
     * @private
     */
    renderAdaptiveCard(attachment, messageDiv) {
        try {
            if (typeof AdaptiveCards !== 'undefined') {
                const adaptiveCard = new AdaptiveCards.AdaptiveCard();
                adaptiveCard.parse(attachment.content);

                const renderedCard = adaptiveCard.render();
                if (renderedCard) {
                    const cardContainer = DOMUtils.createElement('div', {
                        className: 'adaptive-card-container'
                    });
                    cardContainer.appendChild(renderedCard);
                    messageDiv.appendChild(cardContainer);
                }
            } else {
                console.warn('AdaptiveCards library not available');
                this.renderGenericAttachment(attachment, messageDiv);
            }
        } catch (error) {
            console.error('Error rendering adaptive card:', error);
            this.renderGenericAttachment(attachment, messageDiv);
        }
    }

    /**
     * Render image attachment
     * @param {Object} attachment - Image attachment
     * @param {HTMLElement} messageDiv - Message div element
     * @private
     */
    renderImageAttachment(attachment, messageDiv) {
        const imageContainer = DOMUtils.createElement('div', {
            className: 'image-attachment'
        });

        const img = DOMUtils.createElement('img', {
            src: attachment.contentUrl,
            alt: attachment.name || 'Image',
            className: 'attachment-image'
        });

        // Make image clickable for enlargement
        DOMUtils.addEventListener(img, 'click', () => {
            this.showEnlargedImage(attachment.contentUrl, attachment.name || 'Image');
        });

        img.style.cursor = 'pointer';
        img.title = 'Click to enlarge';

        imageContainer.appendChild(img);
        messageDiv.appendChild(imageContainer);
    }

    /**
     * Render generic attachment
     * @param {Object} attachment - Generic attachment
     * @param {HTMLElement} messageDiv - Message div element
     * @private
     */
    renderGenericAttachment(attachment, messageDiv) {
        const attachmentContainer = DOMUtils.createElement('div', {
            className: 'generic-attachment'
        }, `
            <div class="attachment-info">
                <span class="attachment-name">${Utils.escapeHtml(attachment.name || 'Attachment')}</span>
                <span class="attachment-type">${Utils.escapeHtml(attachment.contentType || 'Unknown')}</span>
            </div>
        `);

        if (attachment.contentUrl) {
            const link = DOMUtils.createElement('a', {
                href: attachment.contentUrl,
                target: '_blank',
                className: 'attachment-link'
            }, 'Open');
            attachmentContainer.appendChild(link);
        }

        messageDiv.appendChild(attachmentContainer);
    }

    /**
     * Render suggested actions
     * @param {Array} actions - Suggested actions array
     */
    renderSuggestedActions(actions) {
        console.log('renderSuggestedActions called with:', actions);

        if (!this.elements.suggestedActionsContainer) {
            console.error('suggestedActionsContainer not found!');
            return;
        }

        this.clearSuggestedActions();

        const actionsDiv = DOMUtils.createElement('div', {
            className: 'suggested-actions'
        });

        actions.forEach((action, index) => {
            const button = DOMUtils.createElement('button', {
                className: 'suggestedAction',
                dataset: { action: JSON.stringify(action) }
            }, Utils.escapeHtml(action.title || action.text || 'Action'));

            DOMUtils.addEventListener(button, 'click', () => {
                this.handleSuggestedAction(action);
            });

            actionsDiv.appendChild(button);
        });

        this.elements.suggestedActionsContainer.appendChild(actionsDiv);
        console.log('Suggested actions rendered successfully');
    }

    /**
     * Clear suggested actions
     */
    clearSuggestedActions() {
        if (this.elements.suggestedActionsContainer) {
            this.elements.suggestedActionsContainer.innerHTML = '';
        }
    }

    /**
     * Handle suggested action click
     * @param {Object} action - Suggested action
     * @private
     */
    handleSuggestedAction(action) {
        console.log('Suggested action clicked:', action);

        // Clear suggested actions
        this.clearSuggestedActions();

        // Dispatch event for handling
        window.dispatchEvent(new CustomEvent('suggestedActionClicked', {
            detail: { action }
        }));
    }

    /**
     * Add response metadata
     * @param {HTMLElement} messageDiv - Message div element
     * @private
     */
    addResponseMetadata(messageDiv) {
        const metadata = DOMUtils.createElement('div', {
            className: 'response-metadata'
        }, `
            <span class="response-time">${new Date().toLocaleTimeString()}</span>
            <span class="response-source">DirectLine</span>
        `);

        messageDiv.appendChild(metadata);
    }

    /**
     * Show enlarged image modal
     * @param {string} src - Image source URL
     * @param {string} alt - Image alt text
     */
    showEnlargedImage(src, alt = 'Image') {
        const modal = DOMUtils.getElementById('imageModal');
        const enlargedImage = DOMUtils.getElementById('enlargedImage');

        if (modal && enlargedImage) {
            enlargedImage.src = src;
            enlargedImage.alt = alt;
            DOMUtils.addClass(modal, 'show');
        }
    }

    /**
     * Clear streaming state
     * @private
     */
    clearStreamingState() {
        this.streamingState = {
            currentMessage: null,
            messageContainer: null,
            messageDiv: null,
            content: ''
        };
    }

    /**
     * Scroll chat window to bottom
     * @private
     */
    scrollToBottom() {
        if (this.elements.chatWindow) {
            this.elements.chatWindow.scrollTop = this.elements.chatWindow.scrollHeight;
        }
    }

    /**
     * Clear chat window
     */
    clearMessages() {
        if (this.elements.chatWindow) {
            this.elements.chatWindow.innerHTML = '';
        }
        this.clearSuggestedActions();
        this.clearStreamingState();
    }

    /**
     * Get chat window element
     * @returns {HTMLElement} Chat window element
     */
    getChatWindow() {
        return this.elements.chatWindow;
    }
}

// Create and export singleton instance
export const messageRenderer = new MessageRenderer();
