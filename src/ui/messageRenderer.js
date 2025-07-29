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
            content: '',
            startTime: null
        };

        // Debug markdown libraries on initialization
        this.debugMarkdownLibraries();
    }

    /**
     * Set the target chat window for rendering
     * @param {string} windowId - ID of the chat window ('chatWindow' or 'llmChatWindow')
     */
    setTargetWindow(windowId) {
        const targetWindow = DOMUtils.getElementById(windowId);
        if (targetWindow) {
            this.elements.chatWindow = targetWindow;
        }
    }

    /**
     * Get the current target window ID
     * @returns {string} The ID of the current chat window
     */
    getCurrentWindowId() {
        return this.elements.chatWindow ? this.elements.chatWindow.id : 'chatWindow';
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
        const isCompanionResponse = messageContainer.classList.contains('companion-response');

        if (isUser) {
            // User messages: content first, then icon (icon on right)
            messageContainer.appendChild(messageDiv);
            messageContainer.appendChild(messageIcon);
        } else if (isCompanionResponse) {
            // Companion responses: only content, no icon (professor-like)
            messageContainer.appendChild(messageDiv);
        } else {
            // Regular bot messages: icon first, then content (icon on left)
            messageContainer.appendChild(messageIcon);
            messageContainer.appendChild(messageDiv);
        }

        // Ensure correct chronological order by checking existing messages
        this.insertMessageInOrder(messageContainer, activity);

        // Handle suggested actions
        if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
            console.log('Rendering suggested actions:', activity.suggestedActions.actions);
            this.renderSuggestedActions(activity.suggestedActions.actions);
        }

        // Add response metadata
        this.addResponseMetadata(messageContainer, activity);

        // Scroll to bottom
        this.scrollToBottom();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('messageRendered', {
            detail: { activity, element: messageContainer }
        }));
    }

    /**
     * Insert message in correct chronological order
     * @param {HTMLElement} messageContainer - Message container to insert
     * @param {Object} activity - Message activity for timestamp comparison
     * @private
     */
    insertMessageInOrder(messageContainer, activity) {
        const chatWindow = this.elements.chatWindow;
        const existingMessages = Array.from(chatWindow.children);

        // If no existing messages, just append
        if (existingMessages.length === 0) {
            chatWindow.appendChild(messageContainer);
            return;
        }

        // Get timestamp for this message with better error handling
        let messageTimestamp;
        try {
            messageTimestamp = new Date(activity.timestamp || Date.now()).getTime();
            // Validate the timestamp
            if (isNaN(messageTimestamp)) {
                console.warn('Invalid timestamp, using current time:', activity.timestamp);
                messageTimestamp = Date.now();
            }
        } catch (error) {
            console.warn('Error parsing timestamp, using current time:', activity.timestamp, error);
            messageTimestamp = Date.now();
        }

        // Debug logging for message ordering
        console.log('Inserting message with timestamp:', {
            activityTimestamp: activity.timestamp,
            parsedTimestamp: messageTimestamp,
            parsedTimestampDate: new Date(messageTimestamp).toLocaleTimeString(),
            activityFrom: activity.from?.id,
            activityText: activity.text?.substring(0, 50) + '...'
        });

        // Find the correct position to insert this message
        let insertPosition = existingMessages.length; // Default to end (for newest messages)

        // Iterate from beginning to find the first message that's newer than this one
        for (let i = 0; i < existingMessages.length; i++) {
            const existingMessage = existingMessages[i];
            let existingTimestamp;

            try {
                existingTimestamp = new Date(existingMessage.dataset.timestamp || 0).getTime();
                if (isNaN(existingTimestamp)) {
                    console.warn('Invalid existing timestamp, skipping comparison:', existingMessage.dataset.timestamp);
                    continue;
                }
            } catch (error) {
                console.warn('Error parsing existing timestamp, skipping:', existingMessage.dataset.timestamp, error);
                continue;
            }

            console.log(`Comparing with existing message ${i}:`, {
                existingDatasetTimestamp: existingMessage.dataset.timestamp,
                existingParsedTimestamp: existingTimestamp,
                existingParsedDate: new Date(existingTimestamp).toLocaleTimeString(),
                messageTimestamp: messageTimestamp,
                messageDate: new Date(messageTimestamp).toLocaleTimeString(),
                messageIsOlder: messageTimestamp < existingTimestamp,
                shouldInsertHere: messageTimestamp < existingTimestamp
            });

            // If this message is older than the existing message, insert before it
            if (messageTimestamp < existingTimestamp) {
                insertPosition = i;
                break;
            }

            // If timestamps are identical (within 1 second), use DOM order as tie-breaker
            if (Math.abs(messageTimestamp - existingTimestamp) < 1000) {
                console.log('Timestamps are very close, using DOM order for tie-breaking');
                // For messages with same/similar timestamps, maintain DOM insertion order
                insertPosition = i + 1;
                break;
            }
        }

        console.log('Final insert position:', insertPosition, 'of', existingMessages.length, 'messages');

        // Insert at the determined position
        if (insertPosition >= existingMessages.length) {
            chatWindow.appendChild(messageContainer);
            console.log(`Appended message at end (newest message)`);
        } else {
            chatWindow.insertBefore(messageContainer, existingMessages[insertPosition]);
            console.log(`Inserted message at position ${insertPosition} (before existing message)`);
        }

        console.log(`Final result: Inserted message at position ${insertPosition} of ${existingMessages.length} total messages`);
        console.log('Message order should be: oldest -> newest, with timestamps:', {
            newMessageTime: new Date(messageTimestamp).toISOString(),
            newMessageFrom: activity.from?.id
        });
    }

    /**
     * Handle streaming message
     * @param {Object} activity - DirectLine activity
     */
    handleStreamingMessage(activity) {
        console.log('Handling streaming message:', activity.text?.length || 0, 'chars');

        if (!this.streamingState.messageContainer) {
            // Set start time for duration calculation
            this.streamingState.startTime = Date.now();

            // Create initial message container like legacy
            this.streamingState.messageContainer = this.createMessageContainer(activity);
            this.streamingState.messageDiv = this.createMessageDiv(activity);
            const isUser = activity.from && activity.from.id === 'user';
            const messageIcon = this.createMessageIcon(isUser);

            // Add elements in correct order based on message type
            const isCompanionResponse = this.streamingState.messageContainer.classList.contains('companion-response');

            if (isUser) {
                // User messages: content first, then icon (icon on right)
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
                this.streamingState.messageContainer.appendChild(messageIcon);
            } else if (isCompanionResponse) {
                // Companion responses: only content, no icon (professor-like)
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
            } else {
                // Regular bot messages: icon first, then content (icon on left)
                this.streamingState.messageContainer.appendChild(messageIcon);
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
            }

            // Insert message in correct order
            this.insertMessageInOrder(this.streamingState.messageContainer, activity);
            this.streamingState.content = '';

            console.log('Streaming container created');
        }

        // Handle streaming content update
        if (activity.text) {
            // For real streaming, append new content
            if (activity.streamingMetadata?.isRealtime) {
                this.streamingState.content += activity.text;
            } else {
                // For simulated streaming, use the cumulative text directly
                this.streamingState.content = activity.text;
            }

            this.updateStreamingContent(this.streamingState.messageDiv, this.streamingState.content);
            console.log('Updated streaming content:', this.streamingState.content.length, 'chars');
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
            // Ensure final content is properly rendered with full activity text
            if (activity.text && activity.text !== this.streamingState.content) {
                console.log('Finalizing streaming with complete content:', activity.text.length, 'chars');
                // Update with the complete final content
                this.addTextContent(this.streamingState.messageDiv, activity.text);
            }

            // Add attachments if any
            if (activity.attachments && activity.attachments.length > 0) {
                this.addAttachments(this.streamingState.messageDiv, activity.attachments);
            }

            // Handle suggested actions
            if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
                this.renderSuggestedActions(activity.suggestedActions.actions);
            }

            // Add response metadata
            this.addResponseMetadata(this.streamingState.messageContainer, activity);

            // Clear streaming state
            this.clearStreamingState();

            // Scroll to bottom
            this.scrollToBottom();

            console.log('Streaming message finalized successfully');
        } else {
            console.warn('No streaming message to finalize, falling back to complete render');
            // Fallback: render as complete message if streaming state is lost
            this.renderCompleteMessage(activity);
        }
    }

    /**
     * Simulate streaming for non-streaming messages
     * @param {Object} activity - DirectLine activity
     */
    async simulateStreaming(activity) {
        try {
            console.log('simulateStreaming called with:', activity.text?.length || 0, 'chars');

            if (!activity.text) {
                console.log('No text content, rendering complete message');
                this.renderCompleteMessage(activity);
                return;
            }

            // Check if streaming is enabled
            const streamingEnabled = localStorage.getItem('enableStreaming') === 'true';
            if (!streamingEnabled) {
                console.log('Streaming disabled, rendering complete message');
                this.renderCompleteMessage(activity);
                return;
            }

            console.log('Starting streaming simulation for message:', activity.text.substring(0, 100) + '...');

            // Clear any existing streaming state to avoid conflicts
            this.clearStreamingState();

            // Set start time for duration calculation
            this.streamingState.startTime = Date.now();

            // Create message container and elements like legacy
            this.streamingState.messageContainer = this.createMessageContainer(activity);
            this.streamingState.messageDiv = this.createMessageDiv(activity);
            const isUser = activity.from && activity.from.id === 'user';
            const messageIcon = this.createMessageIcon(isUser);

            // Add elements in correct order based on message type
            const isCompanionResponse = this.streamingState.messageContainer.classList.contains('companion-response');

            if (isUser) {
                // User messages: content first, then icon (icon on right)
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
                this.streamingState.messageContainer.appendChild(messageIcon);
            } else if (isCompanionResponse) {
                // Companion responses: only content, no icon (professor-like)
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
            } else {
                // Regular bot messages: icon first, then content (icon on left)
                this.streamingState.messageContainer.appendChild(messageIcon);
                this.streamingState.messageContainer.appendChild(this.streamingState.messageDiv);
            }

            // Insert message in correct order
            this.insertMessageInOrder(this.streamingState.messageContainer, activity);

            console.log('Streaming container created, starting character-by-character simulation');

            // Stream text character by character
            const text = activity.text;
            let currentText = '';

            for (let i = 0; i < text.length; i++) {
                currentText += text[i];
                this.updateStreamingContent(this.streamingState.messageDiv, currentText);
                this.scrollToBottom();

                // Much faster delays for powerful AI feel
                const delay = text[i] === ' ' ? 15 : Math.random() * 8 + 3; // 3-11ms per character
                await Utils.sleep(delay);
            }

            console.log('Streaming simulation complete, finalizing message');

            // Finalize message
            this.finalizeStreamingMessage(activity);
        } catch (error) {
            console.error('Error in simulateStreaming:', error);
            // Fallback to complete message render if streaming fails
            console.log('Falling back to complete message render due to error');
            this.clearStreamingState();
            this.renderCompleteMessage(activity);
        }
    }

    /**
     * Create message container
     * @param {Object} activity - DirectLine activity
     * @returns {HTMLElement} Message container
     * @private
     */
    createMessageContainer(activity) {
        const isUser = activity.from && activity.from.id === 'user';
        const isCompanionResponse = this.isCompanionResponse(activity);

        let className = `messageContainer ${isUser ? 'userMessage' : 'botMessage'}`;

        // Add full-width styling for AI companion responses
        if (isCompanionResponse) {
            className += ' companion-response';
        }

        const container = DOMUtils.createElement('div', {
            className: className,
            dataset: {
                messageId: activity.id || Utils.generateId('msg'),
                timestamp: activity.timestamp || new Date().toISOString(),
                isCompanion: isCompanionResponse.toString()
            }
        });

        return container;
    }

    /**
     * Check if this is an AI companion response that should use full-width display
     * @param {Object} activity - DirectLine activity
     * @returns {boolean} True if this is a companion response
     * @private
     */
    isCompanionResponse(activity) {
        // Check if this is a bot message (not user)
        if (!activity.from || activity.from.id === 'user') {
            return false;
        }

        // Determine if we're rendering to the AI Companion chat window (right panel)
        // The AI Companion uses llmChatWindow, while Agent Chat uses chatWindow
        const currentWindowId = this.getCurrentWindowId();
        const isInCompanionWindow = currentWindowId === 'llmChatWindow';

        // Only apply companion styling if we're in the AI Companion window
        return isInCompanionWindow;
    }    /**
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

                // Enhance inline references
                const enhancedContent = this.enhanceInlineReferences(sanitizedContent);
                messageDiv.innerHTML = enhancedContent;
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
     * Enhance inline references in content
     * @param {string} content - HTML content
     * @returns {string} Enhanced content with styled references
     * @private
     */
    enhanceInlineReferences(content) {
        // Enhance [1], [2], etc. references with styling and make them clickable
        return content.replace(/\[(\d+)\]/g, (match, number) => {
            return `<span class="inline-reference" data-ref="${number}" title="Click to jump to reference ${number}">${match}</span>`;
        });
    }

    /**
     * Update streaming content
     * @param {HTMLElement} messageDiv - Message div element
     * @param {string} content - Current content
     * @private
     */
    updateStreamingContent(messageDiv, content) {
        // Process markdown if available - removed typing cursor
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(content) :
                    marked(content);
                const sanitizedContent = DOMPurify.sanitize(htmlContent);

                // Enhance inline references during streaming like in complete messages
                const enhancedContent = this.enhanceInlineReferences(sanitizedContent);
                messageDiv.innerHTML = enhancedContent;
            } catch (error) {
                console.warn('Error processing streaming markdown:', error);
                messageDiv.innerHTML = content;
            }
        } else {
            messageDiv.innerHTML = content;
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
     * Add response metadata outside the message bubble
     * @param {HTMLElement} messageContainer - Message container element  
     * @param {Object} activity - Activity object that might contain entities/citations
     * @private
     */
    addResponseMetadata(messageContainer, activity = null) {
        // Create wrapper for message and metadata
        const messageWrapper = DOMUtils.createElement('div', {
            className: 'message-wrapper'
        });

        // Move the message container into the wrapper
        const parent = messageContainer.parentNode;
        if (parent) {
            parent.insertBefore(messageWrapper, messageContainer);
            messageWrapper.appendChild(messageContainer);
        }

        // Create metadata element outside the message bubble
        const metadata = DOMUtils.createElement('div', {
            className: 'message-metadata'
        });

        // Calculate time spent (if we have timestamp info)
        const messageTime = activity?.timestamp ? new Date(activity.timestamp) : new Date();
        const timeSpent = this.calculateTimeSpent(activity);

        const timeSpan = DOMUtils.createElement('span', {
            className: 'metadata-time'
        }, messageTime.toLocaleTimeString());

        const timeSpentSpan = DOMUtils.createElement('span', {
            className: 'metadata-duration'
        }, timeSpent);

        const sourceSpan = DOMUtils.createElement('span', {
            className: 'metadata-source'
        }, 'Copilot Studio');

        metadata.appendChild(timeSpan);
        metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' • '));
        metadata.appendChild(timeSpentSpan);

        // Add metadata after the message container
        messageWrapper.appendChild(metadata);

        // Check for entities/citations in the activity - add to message container
        if (activity && this.hasCitations(activity)) {
            // Add citations to the messageContainer (after the entire message content)
            this.addCitationsSection(messageContainer, activity);
        }
    }

    /**
     * Calculate time spent for response
     * @param {Object} activity - Activity object
     * @returns {string} Formatted time spent
     * @private
     */
    calculateTimeSpent(activity) {
        // If we have streaming state and this is the end of a streaming message
        if (this.streamingState.startTime) {
            const duration = Date.now() - this.streamingState.startTime;
            this.streamingState.startTime = null; // Reset for next message
            return this.formatDuration(duration);
        }

        // For non-streaming messages, we can't calculate exact time, so show estimate
        return '~1s';
    }

    /**
     * Format duration in milliseconds to human readable format
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration
     * @private
     */
    formatDuration(ms) {
        if (ms < 1000) {
            return `${Math.round(ms)}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * Check if activity contains citations or entities data
     * @param {Object} activity - Activity object
     * @returns {boolean} True if citations are present
     * @private
     */
    hasCitations(activity) {
        // Check for DirectLine entities array (primary format)
        if (activity.entities && Array.isArray(activity.entities) && activity.entities.length > 0) {
            // Check if entities contain citation data
            const hasValidCitations = activity.entities.some(entity =>
                entity.type === 'https://schema.org/Message' &&
                entity.citation &&
                Array.isArray(entity.citation)
            );
            if (hasValidCitations) return true;

            // Check for Claim entities
            const hasClaims = activity.entities.some(entity =>
                entity.type === 'https://schema.org/Claim' &&
                entity.text
            );
            if (hasClaims) return true;
        }

        // Check for GPT feedback citations in channelData
        if (activity.channelData &&
            activity.channelData['pva:gpt-feedback'] &&
            activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse &&
            activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse.result &&
            activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse.result.textCitations &&
            Array.isArray(activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse.result.textCitations)) {
            return activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse.result.textCitations.length > 0;
        }

        // Check for entities in text content (JSON format) - legacy support
        if (activity.text) {
            try {
                // Look for JSON arrays in the text that might contain citation data
                const jsonMatch = activity.text.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const firstItem = parsed[0];
                        return firstItem.SourceDocument || firstItem.ReferencePath || firstItem.PageNum;
                    }
                }
            } catch (e) {
                // Not JSON, continue checking other formats
            }
        }

        // Check for attachments that might contain entities
        if (activity.attachments && activity.attachments.length > 0) {
            return activity.attachments.some(att =>
                att.contentType === 'application/json' ||
                att.contentType === 'application/vnd.microsoft.card.adaptive'
            );
        }

        return false;
    }

    /**
     * Add citations section to message
     * @param {HTMLElement} messageDiv - Message div element
     * @param {Object} activity - Activity containing citation data
     * @private
     */
    addCitationsSection(messageDiv, activity) {
        let citationData = [];

        // Extract DirectLine entities (primary format)
        if (activity.entities && Array.isArray(activity.entities)) {
            activity.entities.forEach(entity => {
                if (entity.type === 'https://schema.org/Message' && entity.citation && Array.isArray(entity.citation)) {
                    // Process citation array from Message entity
                    entity.citation.forEach(citation => {
                        if (citation.appearance) {
                            citationData.push({
                                content: citation.appearance.text || citation.appearance.abstract || '',
                                SourceDocument: this.extractSourceFromText(citation.appearance.text || citation.appearance.abstract || ''),
                                PageNum: this.extractPageFromText(citation.appearance.text || citation.appearance.abstract || ''),
                                ReferencePath: citation.appearance.url || citation['@id'] || '',
                                position: citation.position || 0,
                                type: 'DirectLine Citation'
                            });
                        }
                    });
                } else if (entity.type === 'https://schema.org/Claim' && entity.text) {
                    // Process Claim entities
                    citationData.push({
                        content: entity.text,
                        SourceDocument: this.extractSourceFromText(entity.text),
                        PageNum: this.extractPageFromText(entity.text),
                        ReferencePath: entity['@id'] || '',
                        position: citationData.length + 1,
                        type: 'Claim Entity'
                    });
                }
            });
        }

        // Extract from GPT feedback citations
        if (activity.channelData &&
            activity.channelData['pva:gpt-feedback'] &&
            activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse &&
            activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse.result &&
            activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse.result.textCitations) {

            const textCitations = activity.channelData['pva:gpt-feedback'].summarizationOpenAIResponse.result.textCitations;
            textCitations.forEach(citation => {
                citationData.push({
                    content: citation.text || '',
                    SourceDocument: this.extractSourceFromText(citation.text || ''),
                    PageNum: this.extractPageFromText(citation.text || ''),
                    ReferencePath: citation.url || citation.id || '',
                    position: citation.position || citationData.length + 1,
                    type: 'GPT Citation'
                });
            });
        }

        // Extract citation data from text (JSON format) - legacy support
        if (activity.text && citationData.length === 0) {
            try {
                const jsonMatch = activity.text.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        citationData = parsed.filter(item =>
                            item.SourceDocument || item.ReferencePath || item.PageNum
                        );
                    }
                }
            } catch (e) {
                console.log('Could not parse JSON from activity text');
            }
        }

        // Extract from attachments - legacy support
        if (activity.attachments && citationData.length === 0) {
            activity.attachments.forEach(att => {
                if (att.contentType === 'application/json' && att.content) {
                    try {
                        const content = typeof att.content === 'string' ?
                            JSON.parse(att.content) : att.content;
                        if (Array.isArray(content)) {
                            citationData.push(...content.filter(item =>
                                item.SourceDocument || item.ReferencePath || item.PageNum
                            ));
                        }
                    } catch (e) {
                        console.log('Could not parse attachment content');
                    }
                }
            });
        }

        if (citationData.length > 0) {
            // Remove duplicates based on source document and content
            const uniqueCitations = this.removeDuplicateCitations(citationData);
            this.renderCitations(messageDiv, uniqueCitations);
            this.setupInlineReferenceClickHandlers(messageDiv);
        }
    }

    /**
     * Remove duplicate citations based on source document and content
     * @param {Array} citations - Array of citation objects
     * @returns {Array} Array of unique citations
     * @private
     */
    removeDuplicateCitations(citations) {
        const uniqueCitations = [];
        const seen = new Set();

        citations.forEach(citation => {
            // Create a unique key based on source document, page number, and content
            const sourceDoc = citation.SourceDocument || 'Unknown Source';
            const pageNum = citation.PageNum || '';
            const content = (citation.content || '').trim();

            // Create a composite key for deduplication
            const key = `${sourceDoc}|${pageNum}|${content}`;

            if (!seen.has(key)) {
                seen.add(key);
                uniqueCitations.push(citation);
            }
        });

        return uniqueCitations;
    }

    /**
     * Extract source document name from citation text
     * @param {string} text - Citation text
     * @returns {string} Source document name
     * @private
     */
    extractSourceFromText(text) {
        if (!text) return 'Unknown Source';

        // Look for "source: filename" pattern
        const sourceMatch = text.match(/source:\s*([^,\n]+)/i);
        if (sourceMatch) {
            return sourceMatch[1].trim();
        }

        // Look for "Source: filename" pattern
        const sourceMatch2 = text.match(/Source:\s*([^,\n]+)/i);
        if (sourceMatch2) {
            return sourceMatch2[1].trim();
        }

        // Look for PDF filenames
        const pdfMatch = text.match(/([^\/\n]+\.pdf)/i);
        if (pdfMatch) {
            return pdfMatch[1].trim();
        }

        return 'Unknown Source';
    }

    /**
     * Extract page number from citation text
     * @param {string} text - Citation text
     * @returns {number|null} Page number
     * @private
     */
    extractPageFromText(text) {
        if (!text) return null;

        // Look for "pageNumber:XX" pattern
        const pageMatch1 = text.match(/pageNumber:\s*(\d+)/i);
        if (pageMatch1) {
            return parseInt(pageMatch1[1]);
        }

        // Look for "page XX" pattern
        const pageMatch2 = text.match(/page\s+(\d+)/i);
        if (pageMatch2) {
            return parseInt(pageMatch2[1]);
        }

        // Look for "Page XX" pattern
        const pageMatch3 = text.match(/Page\s+(\d+)/i);
        if (pageMatch3) {
            return parseInt(pageMatch3[1]);
        }

        return null;
    }

    /**
     * Setup click handlers for inline references
     * @param {HTMLElement} messageDiv - Message div element
     * @private
     */
    setupInlineReferenceClickHandlers(messageDiv) {
        const inlineReferences = messageDiv.querySelectorAll('.inline-reference');
        const citationsContainer = messageDiv.querySelector('.citations-container');

        inlineReferences.forEach(ref => {
            DOMUtils.addEventListener(ref, 'click', () => {
                const refNumber = ref.getAttribute('data-ref');

                if (citationsContainer) {
                    // First, expand citations if collapsed
                    const citationsList = citationsContainer.querySelector('.citations-list');
                    const toggleButton = citationsContainer.querySelector('.citations-toggle');

                    if (citationsList && citationsList.style.display === 'none') {
                        citationsList.style.display = 'block';
                        if (toggleButton) {
                            toggleButton.textContent = '▼';
                            toggleButton.setAttribute('aria-expanded', 'true');
                        }
                    }

                    // Scroll to the citation
                    const targetCitation = citationsContainer.querySelector(`[data-citation-number="${refNumber}"]`);
                    if (targetCitation) {
                        targetCitation.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });

                        // Highlight the citation briefly
                        targetCitation.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        setTimeout(() => {
                            targetCitation.style.backgroundColor = '';
                        }, 2000);
                    } else {
                        // If no specific citation found, scroll to citations container
                        citationsContainer.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }
                }
            });
        });
    }

    /**
     * Render citations in a user-friendly format
     * @param {HTMLElement} messageDiv - Message div element
     * @param {Array} citations - Array of citation objects
     * @private
     */
    renderCitations(messageDiv, citations) {
        const citationsContainer = DOMUtils.createElement('div', {
            className: 'citations-container'
        });

        const citationsHeader = DOMUtils.createElement('div', {
            className: 'citations-header'
        });

        const headerIcon = DOMUtils.createElement('span', {
            className: 'citations-icon'
        }, '📚');

        const headerText = DOMUtils.createElement('span', {
            className: 'citations-title'
        }, `References (${citations.length})`);

        const toggleButton = DOMUtils.createElement('button', {
            className: 'citations-toggle',
            type: 'button'
        }, '▼');

        citationsHeader.appendChild(headerIcon);
        citationsHeader.appendChild(headerText);
        citationsHeader.appendChild(toggleButton);

        const citationsList = DOMUtils.createElement('div', {
            className: 'citations-list'
        });

        // Group citations by source document
        const groupedCitations = this.groupCitationsBySource(citations);

        Object.entries(groupedCitations).forEach(([source, items], index) => {
            const citationItem = this.createCitationItem(source, items, index + 1);
            citationsList.appendChild(citationItem);
        });

        citationsContainer.appendChild(citationsHeader);
        citationsContainer.appendChild(citationsList);

        // Add toggle functionality
        DOMUtils.addEventListener(toggleButton, 'click', () => {
            const isExpanded = citationsList.style.display !== 'none';
            citationsList.style.display = isExpanded ? 'none' : 'block';
            toggleButton.textContent = isExpanded ? '▶' : '▼';
            toggleButton.setAttribute('aria-expanded', !isExpanded);
        });

        // Add to message
        messageDiv.appendChild(citationsContainer);
    }

    /**
     * Group citations by source document
     * @param {Array} citations - Array of citation objects
     * @returns {Object} Grouped citations
     * @private
     */
    groupCitationsBySource(citations) {
        const grouped = {};

        citations.forEach(citation => {
            const source = citation.SourceDocument || 'Unknown Source';
            if (!grouped[source]) {
                grouped[source] = [];
            }
            grouped[source].push(citation);
        });

        return grouped;
    }

    /**
     * Create citation item element
     * @param {string} source - Source document name
     * @param {Array} items - Citation items for this source
     * @param {number} index - Citation index number
     * @returns {HTMLElement} Citation item element
     * @private
     */
    createCitationItem(source, items, index) {
        const citationItem = DOMUtils.createElement('div', {
            className: 'citation-item',
            dataset: {
                citationNumber: index.toString()
            }
        });

        const citationHeader = DOMUtils.createElement('div', {
            className: 'citation-header'
        });

        const citationNumber = DOMUtils.createElement('span', {
            className: 'citation-number'
        }, `[${index}]`);

        const citationSource = DOMUtils.createElement('span', {
            className: 'citation-source'
        }, source);

        citationHeader.appendChild(citationNumber);
        citationHeader.appendChild(citationSource);

        const citationDetails = DOMUtils.createElement('div', {
            className: 'citation-details'
        });

        // Add details for each item from this source
        items.forEach(item => {
            const detailItem = DOMUtils.createElement('div', {
                className: 'citation-detail-item'
            });

            if (item.PageNum) {
                const pageInfo = DOMUtils.createElement('span', {
                    className: 'citation-page'
                }, `Page ${item.PageNum}`);
                detailItem.appendChild(pageInfo);
            }

            if (item.content) {
                const content = DOMUtils.createElement('div', {
                    className: 'citation-content'
                }, this.truncateText(item.content, 200));
                detailItem.appendChild(content);
            }

            if (item.ReferencePath) {
                const linkButton = DOMUtils.createElement('button', {
                    className: 'citation-link',
                    type: 'button'
                }, '🔗 View Source');

                DOMUtils.addEventListener(linkButton, 'click', () => {
                    this.handleCitationLink(item.ReferencePath);
                });

                detailItem.appendChild(linkButton);
            }

            citationDetails.appendChild(detailItem);
        });

        citationItem.appendChild(citationHeader);
        citationItem.appendChild(citationDetails);

        return citationItem;
    }

    /**
     * Handle citation link click
     * @param {string} url - Citation URL
     * @private
     */
    handleCitationLink(url) {
        const useSideBrowser = localStorage.getItem('enableSideBrowser') === 'true';

        if (useSideBrowser) {
            this.openSideBrowser(url);
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    /**
     * Open side browser with URL
     * @param {string} url - URL to load
     * @private
     */
    openSideBrowser(url) {
        const sideBrowser = DOMUtils.getElementById('sideBrowser');
        const sideBrowserFrame = DOMUtils.getElementById('sideBrowserFrame');
        const sideBrowserTitle = DOMUtils.getElementById('sideBrowserTitle');
        const sideBrowserLoader = DOMUtils.getElementById('sideBrowserLoader');
        const sideBrowserError = DOMUtils.getElementById('sideBrowserError');

        if (!sideBrowser || !sideBrowserFrame) {
            console.error('Side browser elements not found');
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        // Show the side browser
        DOMUtils.addClass(sideBrowser, 'open');

        // Reset state
        sideBrowserLoader.style.display = 'block';
        sideBrowserError.style.display = 'none';
        sideBrowserFrame.style.display = 'none';

        // Set title
        try {
            const urlObj = new URL(url);
            sideBrowserTitle.textContent = urlObj.hostname || 'Citation Source';
        } catch (e) {
            sideBrowserTitle.textContent = 'Citation Source';
        }

        // Store URL for external button
        sideBrowserError.dataset.url = url;

        // Load the URL in iframe
        sideBrowserFrame.onload = () => {
            sideBrowserLoader.style.display = 'none';
            sideBrowserFrame.style.display = 'block';
        };

        sideBrowserFrame.onerror = () => {
            sideBrowserLoader.style.display = 'none';
            sideBrowserError.style.display = 'block';
        };

        // Set a timeout for loading
        setTimeout(() => {
            if (sideBrowserLoader.style.display !== 'none') {
                sideBrowserLoader.style.display = 'none';
                sideBrowserError.style.display = 'block';
            }
        }, 10000); // 10 second timeout

        sideBrowserFrame.src = url;

        // Setup event listeners if not already done
        this.setupSideBrowserEventListeners();
    }

    /**
     * Setup side browser event listeners
     * @private
     */
    setupSideBrowserEventListeners() {
        const closeSideBrowser = DOMUtils.getElementById('closeSideBrowser');
        const openExternalBtn = DOMUtils.getElementById('openExternalBtn');
        const sideBrowser = DOMUtils.getElementById('sideBrowser');

        // Avoid duplicate listeners
        if (closeSideBrowser && !closeSideBrowser.dataset.listenerAdded) {
            DOMUtils.addEventListener(closeSideBrowser, 'click', () => {
                this.closeSideBrowser();
            });
            closeSideBrowser.dataset.listenerAdded = 'true';
        }

        if (openExternalBtn && !openExternalBtn.dataset.listenerAdded) {
            DOMUtils.addEventListener(openExternalBtn, 'click', () => {
                const sideBrowserError = DOMUtils.getElementById('sideBrowserError');
                const url = sideBrowserError.dataset.url;
                if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            });
            openExternalBtn.dataset.listenerAdded = 'true';
        }

        // Close on escape key
        if (sideBrowser && !sideBrowser.dataset.escapeListenerAdded) {
            DOMUtils.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && DOMUtils.hasClass(sideBrowser, 'open')) {
                    this.closeSideBrowser();
                }
            });
            sideBrowser.dataset.escapeListenerAdded = 'true';
        }
    }

    /**
     * Close side browser
     * @private
     */
    closeSideBrowser() {
        const sideBrowser = DOMUtils.getElementById('sideBrowser');
        const sideBrowserFrame = DOMUtils.getElementById('sideBrowserFrame');

        if (sideBrowser) {
            DOMUtils.removeClass(sideBrowser, 'open');
        }

        // Clear iframe after transition
        setTimeout(() => {
            if (sideBrowserFrame) {
                sideBrowserFrame.src = 'about:blank';
            }
        }, 300);
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     * @private
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
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
        console.log('Clearing streaming state:', {
            wasStreaming: this.streamingState.isStreaming,
            hadContainer: !!this.streamingState.messageContainer,
            hadContent: this.streamingState.content?.length || 0
        });

        this.streamingState = {
            currentMessage: null,
            messageContainer: null,
            messageDiv: null,
            content: '',
            startTime: null,
            isStreaming: false,
            lastUpdate: null
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
