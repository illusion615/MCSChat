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

        // Global response time tracking for accurate request-to-response timing
        this.responseTimeTracking = {
            requestStartTime: null,
            lastRequestId: null
        };

        // Initialize side browser state
        this.escapeListenerAdded = false;

        // Debug markdown libraries on initialization
        this.debugMarkdownLibraries();
        
        // Initialize side browser immediately
        this.initializeSideBrowser();
    }

    /**
     * Initialize side browser functionality
     * @public
     */
    initializeSideBrowser() {
        console.log('[MessageRenderer] Initializing side browser...');
        
        // Set up event listeners immediately if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupSideBrowserEventListeners();
            });
        } else {
            // DOM is already ready
            this.setupSideBrowserEventListeners();
        }
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
        console.log('Rendering complete message:', {
            id: activity.id,
            from: activity.from?.id,
            textLength: activity.text?.length,
            hasAttachments: !!(activity.attachments && activity.attachments.length > 0),
            attachmentCount: activity.attachments?.length || 0,
            attachments: activity.attachments
        });

        // Immediately hide typing indicator when message rendering starts
        window.dispatchEvent(new CustomEvent('hideTypingIndicator', {
            detail: { reason: 'complete-message-rendering-started' }
        }));

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
            console.log('MessageRenderer: Processing', activity.attachments.length, 'attachments');
            this.addAttachments(messageDiv, activity.attachments);
        } else {
            console.log('MessageRenderer: No attachments to process');
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

        // Immediately hide typing indicator when message rendering starts
        window.dispatchEvent(new CustomEvent('hideTypingIndicator', {
            detail: { reason: 'message-rendering-started' }
        }));

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
                const delay = text[i] === ' ' ? 15 : Math.random() * 4 + 1; // 3-11ms per character
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

        if (isUser) {
            // Apply the selected user icon
            this.applyUserIconToElement(iconElement);
        } else {
            iconElement.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';
        }

        return iconElement;
    }

    /**
     * Apply user icon to an element
     * @param {HTMLElement} element - The element to apply the icon to
     * @private
     */
    applyUserIconToElement(element) {
        const selectedIcon = localStorage.getItem('userIcon') || 'carter-avatar';
        
        // Clear all existing styles first
        element.style.backgroundImage = '';
        element.style.background = '';
        element.style.display = '';
        element.style.alignItems = '';
        element.style.justifyContent = '';
        element.style.fontSize = '';
        element.innerHTML = '';
        
        // Remove any existing avatar classes
        element.className = 'messageIcon';
        
        // Apply the selected icon style
        switch (selectedIcon) {
            case 'friendly-avatar':
                element.style.display = 'flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
                element.style.fontSize = '20px';
                element.innerHTML = '😊';
                break;
            case 'robot-avatar':
                element.style.display = 'flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
                element.style.fontSize = '20px';
                element.innerHTML = '🤖';
                break;
            case 'assistant-avatar':
                element.classList.add('assistant-avatar');
                break;
            case 'smart-avatar':
                element.classList.add('smart-avatar');
                break;
            case 'modern-avatar':
                element.classList.add('modern-avatar');
                break;
            case 'cute-avatar':
                element.classList.add('cute-avatar');
                break;
            case 'professional-avatar':
                element.classList.add('professional-avatar');
                break;
            case 'gaming-avatar':
                element.classList.add('gaming-avatar');
                break;
            case 'minimal-avatar':
                element.classList.add('minimal-avatar');
                break;
            case 'custom-avatar':
                const customIcon = localStorage.getItem('customUserIconData');
                if (customIcon) {
                    element.style.backgroundImage = `url(${customIcon})`;
                    element.style.backgroundSize = 'cover';
                    element.style.backgroundPosition = 'center';
                } else {
                    // Fallback to carter if no custom icon
                    element.style.backgroundImage = 'url("images/carter_30k.png")';
                }
                break;
            case 'carter-avatar':
            default:
                element.style.backgroundImage = 'url("images/carter_30k.png")';
                break;
        }
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
        console.log('MessageRenderer: addTextContent called with text length:', text?.length);
        
        // Process markdown if available - exactly like legacy
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(text) :
                    marked(text);
                const sanitizedContent = DOMPurify.sanitize(htmlContent);

                console.log('MessageRenderer: Processed markdown, checking for images in HTML:', sanitizedContent.includes('<img'));

                // Enhance inline references
                const enhancedContent = this.enhanceInlineReferences(sanitizedContent);
                
                // Ensure agent messages are properly wrapped in paragraphs
                const finalContent = this.ensureParagraphStructure(enhancedContent, messageDiv);
                messageDiv.innerHTML = finalContent;
            } catch (error) {
                console.warn('Error processing markdown:', error);
                console.warn('Marked version check:', typeof marked.parse);
                // For fallback, still ensure paragraph structure
                const paragraphText = this.ensureParagraphStructure(text, messageDiv, true);
                messageDiv.innerHTML = paragraphText;
            }
        } else {
            console.warn('Markdown libraries not available:', {
                marked: typeof marked,
                DOMPurify: typeof DOMPurify
            });
            // Even without markdown, ensure paragraph structure for agent messages
            const paragraphText = this.ensureParagraphStructure(text, messageDiv, true);
            messageDiv.innerHTML = paragraphText;
        }

        // Make images clickable for enlargement - exactly like legacy
        const images = messageDiv.querySelectorAll('img');
        console.log('MessageRenderer: Found', images.length, 'images in message content');
        images.forEach((img, index) => {
            console.log(`MessageRenderer: Processing image ${index}:`, {
                src: img.src,
                alt: img.alt,
                complete: img.complete,
                naturalWidth: img.naturalWidth
            });
            img.style.maxWidth = '100%';
            img.style.cursor = 'pointer';
            DOMUtils.addEventListener(img, 'click', () => {
                this.showEnlargedImage(img.src, img.alt || 'Image');
            });
        });
    }

    /**
     * Ensure content has proper paragraph structure for agent messages
     * @param {string} content - HTML or text content
     * @param {HTMLElement} messageDiv - Message div element to check message type
     * @param {boolean} isPlainText - Whether content is plain text (no HTML)
     * @returns {string} Content with proper paragraph structure
     * @private
     */
    ensureParagraphStructure(content, messageDiv, isPlainText = false) {
        // Check if this is an agent message (not user message)
        const messageContainer = messageDiv.closest('.messageContainer');
        const isUserMessage = messageContainer && messageContainer.classList.contains('userMessage');
        
        // Only apply paragraph structure to agent messages
        if (isUserMessage) {
            return content;
        }

        // If it's plain text, wrap in paragraph
        if (isPlainText) {
            // Handle line breaks in plain text
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length === 1) {
                return `<p>${content.trim()}</p>`;
            } else {
                return lines.map(line => `<p>${line.trim()}</p>`).join('');
            }
        }

        // For HTML content, check if it already has proper paragraph structure
        const trimmedContent = content.trim();
        
        // If content already starts with a block element, leave it as is
        if (trimmedContent.match(/^<(p|div|h[1-6]|ul|ol|blockquote|pre|table)/i)) {
            return content;
        }

        // If content has no block elements, wrap the entire content in a paragraph
        if (!trimmedContent.match(/<(p|div|h[1-6]|ul|ol|blockquote|pre|table|br)[^>]*>/i)) {
            return `<p>${trimmedContent}</p>`;
        }

        // If content has some structure but doesn't start with a block element,
        // check if the first non-tag content should be wrapped
        const firstTextMatch = trimmedContent.match(/^([^<]+)(<|$)/);
        if (firstTextMatch && firstTextMatch[1].trim()) {
            // Wrap the initial text in a paragraph
            const initialText = firstTextMatch[1].trim();
            const restOfContent = trimmedContent.substring(firstTextMatch[1].length);
            return `<p>${initialText}</p>${restOfContent}`;
        }

        return content;
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
                
                // Ensure agent messages have proper paragraph structure during streaming
                const finalContent = this.ensureParagraphStructure(enhancedContent, messageDiv);
                messageDiv.innerHTML = finalContent;
            } catch (error) {
                console.warn('Error processing streaming markdown:', error);
                // For fallback, still ensure paragraph structure
                const paragraphContent = this.ensureParagraphStructure(content, messageDiv, true);
                messageDiv.innerHTML = paragraphContent;
            }
        } else {
            // Even without markdown, ensure paragraph structure for agent messages
            const paragraphContent = this.ensureParagraphStructure(content, messageDiv, true);
            messageDiv.innerHTML = paragraphContent;
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
        console.log('MessageRenderer: Processing attachments:', attachments);
        attachments.forEach((attachment, index) => {
            console.log(`MessageRenderer: Processing attachment ${index}:`, {
                contentType: attachment.contentType,
                contentUrl: attachment.contentUrl,
                name: attachment.name
            });
            
            if (attachment.contentType === 'application/vnd.microsoft.card.adaptive') {
                console.log('MessageRenderer: Rendering adaptive card');
                this.renderAdaptiveCard(attachment, messageDiv);
            } else if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                console.log('MessageRenderer: Rendering image attachment');
                this.renderImageAttachment(attachment, messageDiv);
            } else {
                console.log('MessageRenderer: Rendering generic attachment');
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
        console.log('MessageRenderer: renderImageAttachment called with:', attachment);
        
        const imageContainer = DOMUtils.createElement('div', {
            className: 'image-attachment'
        });

        const img = DOMUtils.createElement('img', {
            src: attachment.contentUrl,
            alt: attachment.name || 'Image',
            className: 'attachment-image'
        });

        console.log('MessageRenderer: Created image element:', {
            src: img.src,
            alt: img.alt,
            className: img.className
        });

        // Make image clickable for enlargement
        DOMUtils.addEventListener(img, 'click', () => {
            this.showEnlargedImage(attachment.contentUrl, attachment.name || 'Image');
        });

        img.style.cursor = 'pointer';
        img.title = 'Click to enlarge';

        imageContainer.appendChild(img);
        messageDiv.appendChild(imageContainer);
        
        console.log('MessageRenderer: Image attachment rendered and appended to messageDiv');
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

        // Calculate time spent only for assistant messages
        const messageTime = activity?.timestamp ? new Date(activity.timestamp) : new Date();
        const isUserMessage = activity.from && activity.from.id === 'user';
        const timeSpent = isUserMessage ? null : 'Response time: ' + this.calculateTimeSpent(activity);

        const timeSpan = DOMUtils.createElement('span', {
            className: 'metadata-time'
        }, messageTime.toLocaleTimeString());

        const sourceSpan = DOMUtils.createElement('span', {
            className: 'metadata-source'
        }, 'Copilot Studio');

        metadata.appendChild(timeSpan);
        
        // Only show response time for assistant messages, not user messages
        if (!isUserMessage && timeSpent) {
            const timeSpentSpan = DOMUtils.createElement('span', {
                className: 'metadata-duration'
            }, timeSpent);
            
            metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' • '));
            metadata.appendChild(timeSpentSpan);
        }

        // Add metadata after the message container
        messageWrapper.appendChild(metadata);

        // Check for entities/citations in the activity - add to message content div
        if (activity && this.hasCitations(activity)) {
            // Find the messageDiv within the messageContainer and add citations there
            const messageDiv = messageContainer.querySelector('.messageContent');
            if (messageDiv) {
                this.addCitationsSection(messageDiv, activity);
            }
        }
    }

    /**
     * Calculate time spent for assistant response (not applicable for user messages)
     * @param {Object} activity - Activity object
     * @returns {string|null} Formatted time spent or null for user messages
     * @private
     */
    calculateTimeSpent(activity) {
        // User messages don't have response times since they're manually input
        if (activity.from && activity.from.id === 'user') {
            return null;
        }

        // Use global response time tracking for accurate request-to-response timing
        if (this.responseTimeTracking.requestStartTime) {
            // This is an assistant response, calculate full request-to-response time
            const duration = Date.now() - this.responseTimeTracking.requestStartTime;
            
            // Reset tracking for next request
            this.responseTimeTracking.requestStartTime = null;
            this.responseTimeTracking.lastRequestId = null;
            
            console.log(`[MessageRenderer] Assistant response time: ${duration}ms`);
            return this.formatDuration(duration);
        }

        // Fallback: If we have streaming state and this is the end of a streaming message
        if (this.streamingState.startTime) {
            const duration = Date.now() - this.streamingState.startTime;
            this.streamingState.startTime = null; // Reset for next message
            console.log(`[MessageRenderer] Streaming render time: ${duration}ms (fallback)`);
            return this.formatDuration(duration);
        }

        // For assistant messages when timing isn't available
        return '~1s';
    }

    /**
     * Start response time tracking when user sends a message
     * @param {string} requestId - Optional request identifier
     * @public
     */
    startResponseTimeTracking(requestId = null) {
        this.responseTimeTracking.requestStartTime = Date.now();
        this.responseTimeTracking.lastRequestId = requestId;
        console.log(`[MessageRenderer] Started response time tracking at ${this.responseTimeTracking.requestStartTime}`);
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
     * Create column layout with message content and citations
     * @param {HTMLElement} messageDiv - Message div element
     * @param {Array} citations - Array of citation objects
     * @private
     */
    createColumnLayoutWithCitations(messageDiv, citations) {
        // Create the column container for horizontal layout (icon + content)
        const columnContainer = DOMUtils.createElement('div', {
            className: 'message-column-container'
        });

        // Create the content column for vertical layout (content + citations)
        const contentColumn = DOMUtils.createElement('div', {
            className: 'message-content-column'
        });

        // Move all existing content from messageDiv to contentColumn
        const existingContent = Array.from(messageDiv.childNodes);
        existingContent.forEach(node => {
            contentColumn.appendChild(node);
        });

        // Group citations by source document and remove duplicates
        const groupedCitations = this.groupCitationsBySource(citations);

        // Create citations container
        const citationsContainer = DOMUtils.createElement('div', {
            className: 'simplified-citations'
        });

        Object.entries(groupedCitations).forEach(([source, items], index) => {
            const citationItem = this.createSimplifiedCitationItem(source, items, index + 1);
            citationsContainer.appendChild(citationItem);
        });

        // Add citations below the content in the same column
        contentColumn.appendChild(citationsContainer);

        // Find the message icon (should be a sibling of messageDiv)
        const messageContainer = messageDiv.parentNode;
        const messageIcon = messageContainer ? messageContainer.querySelector('.messageIcon') : null;

        if (messageIcon && messageContainer) {
            // Remove icon from its current position
            messageIcon.parentNode.removeChild(messageIcon);
            
            // Remove messageDiv from its current position
            messageDiv.parentNode.removeChild(messageDiv);
            
            // Add icon first, then content column to the column container
            columnContainer.appendChild(messageIcon);
            columnContainer.appendChild(contentColumn);
            
            // Replace messageDiv with the column container
            messageContainer.appendChild(columnContainer);
        } else {
            // Fallback: if no icon found, just add content column
            columnContainer.appendChild(contentColumn);
            messageDiv.appendChild(columnContainer);
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
     * Render citations in a simplified, user-friendly format
     * @param {HTMLElement} messageDiv - Message div element
     * @param {Array} citations - Array of citation objects
     * @private
     */
    renderCitations(messageDiv, citations) {
        // Group citations by source document and remove duplicates
        const groupedCitations = this.groupCitationsBySource(citations);

        // Add a line break before citations if there's existing content
        if (messageDiv.textContent.trim()) {
            messageDiv.appendChild(DOMUtils.createElement('br'));
            messageDiv.appendChild(DOMUtils.createElement('br'));
        }

        // Add citations text
        const citationsText = DOMUtils.createElement('div', {
            style: 'margin-top: 8px; font-size: 0.9em; color: #6b7280;'
        });

        const citationsLabel = DOMUtils.createElement('strong', {}, 'Sources: ');
        citationsText.appendChild(citationsLabel);
        citationsText.appendChild(document.createTextNode(' '));

        Object.entries(groupedCitations).forEach(([source, items], index) => {
            if (index > 0) {
                citationsText.appendChild(document.createTextNode(', '));
                citationsText.appendChild(DOMUtils.createElement('br'));
            }

            // Extract page numbers from items
            const pageNumbers = items
                .map(item => item.PageNum)
                .filter(page => page !== null && page !== undefined)
                .sort((a, b) => a - b);

            // Create page range display
            let pageDisplay = '';
            if (pageNumbers.length > 0) {
                if (pageNumbers.length === 1) {
                    pageDisplay = ` (page ${pageNumbers[0]})`;
                } else if (pageNumbers.length === 2) {
                    pageDisplay = ` (pages ${pageNumbers[0]}, ${pageNumbers[1]})`;
                } else {
                    const firstPage = pageNumbers[0];
                    const lastPage = pageNumbers[pageNumbers.length - 1];
                    pageDisplay = ` (pages ${firstPage}-${lastPage})`;
                }
            }

            // Create clickable citation
            const citationLink = DOMUtils.createElement('a', {
                href: '#',
                style: 'color: #3b82f6; text-decoration: underline; cursor: pointer;',
                dataset: {
                    citationIndex: (index + 1).toString()
                }
            }, `[${index + 1}] ${source}${pageDisplay}`);

            // Add click handler
            DOMUtils.addEventListener(citationLink, 'click', (e) => {
                e.preventDefault();
                this.handleCitationClick(items);
            });

            citationsText.appendChild(citationLink);
        });

        // Append citations directly to the message content
        messageDiv.appendChild(citationsText);
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
     * Create simplified citation item element with hover tooltip
     * @param {string} source - Source document name
     * @param {Array} items - Citation items for this source
     * @param {number} index - Citation index number
     * @returns {HTMLElement} Citation item element
     * @private
     */
    createSimplifiedCitationItem(source, items, index) {
        // Extract page numbers from items
        const pageNumbers = items
            .map(item => item.PageNum)
            .filter(page => page !== null && page !== undefined)
            .sort((a, b) => a - b);

        // Create page range display
        let pageDisplay = '';
        if (pageNumbers.length > 0) {
            if (pageNumbers.length === 1) {
                pageDisplay = `, page ${pageNumbers[0]}`;
            } else if (pageNumbers.length === 2) {
                pageDisplay = `, page ${pageNumbers[0]}, ${pageNumbers[1]}`;
            } else {
                const firstPage = pageNumbers[0];
                const lastPage = pageNumbers[pageNumbers.length - 1];
                pageDisplay = `, page ${firstPage}-${lastPage}`;
            }
        }

        // Create clickable citation title
        const citationLink = DOMUtils.createElement('a', {
            className: 'simplified-citation-item',
            href: '#',
            dataset: {
                citationIndex: index.toString()
            }
        }, `[${index}] ${source}${pageDisplay}`);

        // Create hover tooltip with citation snippets
        const tooltip = this.createCitationTooltip(items);
        citationLink.appendChild(tooltip);

        // Add click handler
        DOMUtils.addEventListener(citationLink, 'click', (e) => {
            e.preventDefault();
            this.handleCitationClick(items);
        });

        // Add hover handlers for tooltip
        DOMUtils.addEventListener(citationLink, 'mouseenter', () => {
            this.showTooltip(citationLink, tooltip);
        });

        DOMUtils.addEventListener(citationLink, 'mouseleave', () => {
            this.hideTooltip(tooltip);
        });

        return citationLink;
    }

    /**
     * Create citation tooltip with content snippets
     * @param {Array} items - Citation items
     * @returns {HTMLElement} Tooltip element
     * @private
     */
    createCitationTooltip(items) {
        const tooltip = DOMUtils.createElement('div', {
            className: 'citation-tooltip'
        });

        items.forEach((item, index) => {
            if (item.content) {
                const contentDiv = DOMUtils.createElement('div', {
                    className: 'citation-tooltip-content'
                }, this.truncateText(item.content, 150));

                tooltip.appendChild(contentDiv);

                // Add separator if not the last item
                if (index < items.length - 1 && items[index + 1].content) {
                    const separator = DOMUtils.createElement('hr', {
                        style: 'margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;'
                    });
                    tooltip.appendChild(separator);
                }
            }
        });

        return tooltip;
    }

    /**
     * Show citation tooltip
     * @param {HTMLElement} citationItem - Citation item element
     * @param {HTMLElement} tooltip - Tooltip element
     * @private
     */
    showTooltip(citationItem, tooltip) {
        // Position tooltip relative to citation item
        const rect = citationItem.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position above the citation if there's space, otherwise below
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        
        if (spaceAbove > 200 || spaceAbove > spaceBelow) {
            tooltip.style.top = 'auto';
            tooltip.style.bottom = '100%';
            tooltip.style.marginBottom = '8px';
        } else {
            tooltip.style.top = '100%';
            tooltip.style.bottom = 'auto';
            tooltip.style.marginTop = '8px';
        }

        // Show tooltip
        tooltip.classList.add('visible');
    }

    /**
     * Hide citation tooltip
     * @param {HTMLElement} tooltip - Tooltip element
     * @private
     */
    hideTooltip(tooltip) {
        tooltip.classList.remove('visible');
    }

    /**
     * Handle citation click - open source if available
     * @param {Array} items - Citation items
     * @private
     */
    handleCitationClick(items) {
        // Find first item with a reference path
        const itemWithPath = items.find(item => item.ReferencePath);
        
        if (itemWithPath && itemWithPath.ReferencePath) {
            this.handleCitationLink(itemWithPath.ReferencePath);
        } else {
            // Show a message if no source is available
            console.log('No source URL available for this citation');
        }
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
     * Check if URL is from a domain that likely has CSP frame-ancestors restrictions
     * @param {string} url - URL to check
     * @returns {boolean} True if domain likely has CSP restrictions
     * @private
     */
    isCSPRestrictedDomain(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // Only block the most problematic domains that definitely don't allow framing
            const restrictedDomains = [
                'sharepoint.com',
                'sharepointonline.com',
                'login.microsoft.com',
                'account.microsoft.com'
            ];
            
            return restrictedDomains.some(domain => 
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch (e) {
            // If URL parsing fails, assume it's safe to try
            console.warn('Failed to parse URL for CSP check:', url);
            return false;
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

        // Show the side browser with loading state
        DOMUtils.addClass(sideBrowser, 'open');
        DOMUtils.addClass(sideBrowser, 'loading');

        // Reset state and add loading class to content
        const sideBrowserContent = DOMUtils.getElementById('sideBrowserContent') || 
                                 sideBrowser.querySelector('.side-browser-content');
        if (sideBrowserContent) {
            DOMUtils.addClass(sideBrowserContent, 'loading');
        }
        
        sideBrowserLoader.style.display = 'block';
        sideBrowserError.style.display = 'none';
        sideBrowserFrame.style.display = 'none';
        DOMUtils.removeClass(sideBrowserFrame, 'loaded');

        // Set title with enhanced formatting
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname || 'Citation Source';
            sideBrowserTitle.textContent = hostname.replace('www.', '');
        } catch (e) {
            sideBrowserTitle.textContent = 'Citation Source';
        }

        // Store URL for external button
        sideBrowserError.dataset.url = url;

        // Check if URL might have CSP issues before loading
        if (this.isCSPRestrictedDomain(url)) {
            console.warn('URL likely has CSP restrictions, opening in external browser instead:', url);
            this.showSideBrowserError(sideBrowser, sideBrowserLoader, sideBrowserError, 
                'This content cannot be displayed in a frame due to security policies.', url);
            return;
        }

        // Enhanced iframe loading with better feedback
        sideBrowserFrame.onload = () => {
            console.log('Side browser iframe loaded successfully');
            setTimeout(() => {
                sideBrowserLoader.style.display = 'none';
                sideBrowserFrame.style.display = 'block';
                DOMUtils.addClass(sideBrowserFrame, 'loaded');
                DOMUtils.removeClass(sideBrowser, 'loading');
                if (sideBrowserContent) {
                    DOMUtils.removeClass(sideBrowserContent, 'loading');
                }
            }, 300); // Small delay for smooth transition
        };

        sideBrowserFrame.onerror = () => {
            console.warn('Failed to load URL in iframe:', url);
            this.showSideBrowserError(sideBrowser, sideBrowserLoader, sideBrowserError, 
                'Unable to load citation source. This content may be blocked by security policies.', url);
        };

        // Monitor for CSP violations and other frame loading issues
        const cspErrorHandler = (event) => {
            if (event.data && typeof event.data === 'string' && 
                (event.data.includes('frame-ancestors') || event.data.includes('CSP'))) {
                console.warn('CSP violation detected for iframe:', url);
                this.showSideBrowserError(sideBrowser, sideBrowserLoader, sideBrowserError, 
                    'Content blocked by security policy.', url);
            }
        };
        window.addEventListener('message', cspErrorHandler, { once: true });

        // Enhanced timeout with better feedback
        const loadingTimeout = setTimeout(() => {
            if (sideBrowserLoader.style.display !== 'none') {
                console.warn('Iframe loading timeout for URL:', url);
                this.showSideBrowserError(sideBrowser, sideBrowserLoader, sideBrowserError, 
                    'Loading timeout. This content may be taking too long to load.', url);
                window.removeEventListener('message', cspErrorHandler);
            }
        }, 10000); // 10 second timeout

        // Clear timeout on successful load
        const originalOnload = sideBrowserFrame.onload;
        sideBrowserFrame.onload = () => {
            clearTimeout(loadingTimeout);
            window.removeEventListener('message', cspErrorHandler);
            originalOnload();
        };

        try {
            sideBrowserFrame.src = url;
        } catch (error) {
            console.error('Error setting iframe src:', error);
            clearTimeout(loadingTimeout);
            this.showSideBrowserError(sideBrowser, sideBrowserLoader, sideBrowserError, 
                'Failed to load citation source.', url);
        }

        // Setup event listeners if not already done
        this.setupSideBrowserEventListeners();
    }

    /**
     * Show error state in side browser with consistent styling
     * @param {HTMLElement} sideBrowser - Side browser container
     * @param {HTMLElement} loader - Loader element
     * @param {HTMLElement} errorElement - Error element
     * @param {string} message - Error message to display
     * @param {string} url - URL for external button
     * @private
     */
    showSideBrowserError(sideBrowser, loader, errorElement, message, url) {
        // Update loading states
        DOMUtils.removeClass(sideBrowser, 'loading');
        const sideBrowserContent = sideBrowser.querySelector('.side-browser-content');
        if (sideBrowserContent) {
            DOMUtils.removeClass(sideBrowserContent, 'loading');
        }

        // Show error with message
        loader.style.display = 'none';
        errorElement.style.display = 'block';
        const errorParagraph = errorElement.querySelector('p');
        if (errorParagraph) {
            errorParagraph.textContent = message;
        }
        errorElement.dataset.url = url;
    }

    /**
     * Setup side browser event listeners
     * @private
     */
    setupSideBrowserEventListeners() {
        console.log('[SideBrowser] Setting up event listeners...');
        
        // Use event delegation for better reliability
        document.addEventListener('click', (e) => {
            // Handle close button clicks
            if (e.target.id === 'closeSideBrowser' || e.target.closest('#closeSideBrowser')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SideBrowser] Close button clicked via delegation');
                this.closeSideBrowser();
                return;
            }
            
            // Handle external button clicks
            if (e.target.id === 'openExternalBtn' || e.target.closest('#openExternalBtn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SideBrowser] External button clicked via delegation');
                
                // Try multiple ways to get the URL
                const sideBrowserError = DOMUtils.getElementById('sideBrowserError');
                let url = sideBrowserError?.dataset?.url;
                
                // Fallback: look for URL in button itself
                if (!url) {
                    const button = e.target.closest('#openExternalBtn') || e.target;
                    url = button?.dataset?.url;
                }
                
                // Fallback: look for URL in any parent elements
                if (!url) {
                    const errorContainer = e.target.closest('.side-browser-error');
                    url = errorContainer?.dataset?.url;
                }
                
                console.log('[SideBrowser] External button URL found:', url);
                console.log('[SideBrowser] sideBrowserError element:', sideBrowserError);
                console.log('[SideBrowser] sideBrowserError dataset:', sideBrowserError?.dataset);
                
                if (url) {
                    console.log('[SideBrowser] Opening URL in external browser:', url);
                    window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                    console.warn('[SideBrowser] No URL found for external button');
                    console.warn('[SideBrowser] All available data:', {
                        sideBrowserError: sideBrowserError,
                        errorDataset: sideBrowserError?.dataset,
                        buttonTarget: e.target,
                        buttonDataset: e.target.dataset
                    });
                }
                return;
            }
        });

        // Also try direct event listeners as backup
        const closeSideBrowser = DOMUtils.getElementById('closeSideBrowser');
        const openExternalBtn = DOMUtils.getElementById('openExternalBtn');
        const sideBrowser = DOMUtils.getElementById('sideBrowser');

        console.log('[SideBrowser] Elements found:', {
            closeSideBrowser: !!closeSideBrowser,
            openExternalBtn: !!openExternalBtn,
            sideBrowser: !!sideBrowser
        });

        // Direct listeners as backup
        if (closeSideBrowser && !closeSideBrowser.dataset.listenerAdded) {
            console.log('[SideBrowser] Adding direct close button listener');
            closeSideBrowser.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SideBrowser] Close button clicked directly');
                this.closeSideBrowser();
            });
            closeSideBrowser.dataset.listenerAdded = 'true';
        }

        if (openExternalBtn && !openExternalBtn.dataset.listenerAdded) {
            console.log('[SideBrowser] Adding direct external button listener');
            openExternalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SideBrowser] External button clicked directly');
                
                // Try multiple ways to get the URL
                const sideBrowserError = DOMUtils.getElementById('sideBrowserError');
                let url = sideBrowserError?.dataset?.url;
                
                // Fallback: look for URL in button itself
                if (!url) {
                    url = openExternalBtn?.dataset?.url;
                }
                
                // Fallback: look for URL in any parent elements
                if (!url) {
                    const errorContainer = openExternalBtn.closest('.side-browser-error');
                    url = errorContainer?.dataset?.url;
                }
                
                console.log('[SideBrowser] External button URL found:', url);
                console.log('[SideBrowser] sideBrowserError element:', sideBrowserError);
                console.log('[SideBrowser] sideBrowserError dataset:', sideBrowserError?.dataset);
                
                if (url) {
                    console.log('[SideBrowser] Opening URL in external browser:', url);
                    window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                    console.warn('[SideBrowser] No URL found for external button');
                    console.warn('[SideBrowser] All available data:', {
                        sideBrowserError: sideBrowserError,
                        errorDataset: sideBrowserError?.dataset,
                        buttonElement: openExternalBtn,
                        buttonDataset: openExternalBtn.dataset
                    });
                }
            });
            openExternalBtn.dataset.listenerAdded = 'true';
        }

        // Close on escape key
        if (sideBrowser && !this.escapeListenerAdded) {
            console.log('[SideBrowser] Adding escape key listener');
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && DOMUtils.hasClass(sideBrowser, 'open')) {
                    console.log('[SideBrowser] Escape key pressed');
                    this.closeSideBrowser();
                }
            });
            this.escapeListenerAdded = true;
        }

        console.log('[SideBrowser] Event listeners setup complete');
    }

    /**
     * Close side browser
     * @private
     */
    closeSideBrowser() {
        console.log('[SideBrowser] Closing side browser...');
        
        const sideBrowser = DOMUtils.getElementById('sideBrowser');
        const sideBrowserFrame = DOMUtils.getElementById('sideBrowserFrame');

        if (sideBrowser) {
            console.log('[SideBrowser] Removing classes and closing...');
            // Remove all loading states
            DOMUtils.removeClass(sideBrowser, 'open');
            DOMUtils.removeClass(sideBrowser, 'loading');
            
            const sideBrowserContent = sideBrowser.querySelector('.side-browser-content');
            if (sideBrowserContent) {
                DOMUtils.removeClass(sideBrowserContent, 'loading');
            }
        } else {
            console.warn('[SideBrowser] Could not find sideBrowser element to close');
        }

        // Clear iframe and reset states after transition
        setTimeout(() => {
            if (sideBrowserFrame) {
                console.log('[SideBrowser] Clearing iframe content');
                sideBrowserFrame.src = 'about:blank';
                DOMUtils.removeClass(sideBrowserFrame, 'loaded');
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
