/**
 * Message Renderer
 * Handles rendering of chat messages, adaptive cards, and suggested actions
 * 
 * @version 2.1.0
 * @changelog
 *   2.1.0 (2025-10-04) - Added version tracking system with console output
 *   2.0.1 (2025-10-02) - Fixed duplicate speech by always tracking speech start (line 1076)
 *   2.0.0 (2025-10-01) - Major refactor with streaming and speech improvements
 */

import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';

const MESSAGE_RENDERER_VERSION = '2.1.0';

export class MessageRenderer {
    constructor() {
        // Log version for debugging
        console.log(`🎨 [MessageRenderer] Version ${MESSAGE_RENDERER_VERSION} loaded`);
        
        this.elements = {
            chatWindow: DOMUtils.getElementById('chatWindow'),
            suggestedActionsContainer: DOMUtils.getElementById('suggestedActionsContainer')
        };

        // Use Map to track multiple streaming messages by ID to prevent race conditions
        this.streamingStates = new Map();

        // Track messages being rendered to prevent duplicates
        this.renderingInProgress = new Set();

        // Message queue system for sequential rendering
        this.messageQueue = [];
        this.isProcessingQueue = false;
        this.currentlyStreamingMessageId = null;

        // Global response time tracking for accurate request-to-response timing
        this.responseTimeTracking = {
            requestStartTime: null,
            lastRequestId: null,
            ttftRecorded: false,
            ttft: null
        };

        // Initialize side browser state
        this.escapeListenerAdded = false;

        // Enhanced streaming speech system - simple immediate speech processing
        this.streamingSpeechState = {
            isEnabled: false
        };

        // Global speech state tracking
        this.globalSpeechState = {
            isPlaying: false,
            currentSpeakerButton: null,
            currentProgressContainer: null,
            currentProgressFill: null
        };

        // Debug markdown libraries on initialization
        this.debugMarkdownLibraries();

        // Initialize side browser immediately
        this.initializeSideBrowser();

        // Initialize streaming speech
        this.initializeStreamingSpeech();
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
     * Initialize streaming speech functionality
     * @private
     */
    initializeStreamingSpeech() {
        console.log('[MessageRenderer] Initializing streaming speech...');

        // Check if streaming speech is enabled
        this.streamingSpeechState.isEnabled = localStorage.getItem('speechAutoSpeak') === 'true';

        console.log('[MessageRenderer] Streaming speech enabled:', this.streamingSpeechState.isEnabled);
    }

    /**
     * Reset streaming speech state for new message
     * @private
     */
    resetStreamingSpeechState() {
        // No complex state to reset in the new simplified architecture
        console.log('[MessageRenderer] Reset streaming speech state');
    }

    /**
     * Start speech with complete content immediately - separate from streaming
     * @param {string} completeText - The complete text content to speak
     * @param {string} messageId - Message identifier
     * @returns {Promise<number|null>} Target streaming speed in ms per character, or null if no sync
     * @private
     */
    async startSpeechWithCompleteContent(completeText, messageId) {
        try {
            // Import dependencies dynamically
            const [{ aiCompanion }, { languageDetector }] = await Promise.all([
                import('../ai/aiCompanion.js'),
                import('../utils/languageDetector.js')
            ]);

            // Clean the text for speech
            const cleanText = this.cleanTextForSpeech(completeText);

            if (cleanText.trim().length > 0) {
                console.log(`[Speech] Processing complete content immediately: ${cleanText.length} characters`);

                // Detect language and log information
                const languageInfo = languageDetector.detectLanguageAndGetVoice?.(cleanText);
                if (languageInfo) {
                    console.log(`[Speech] Detected language: ${languageInfo.language} (${languageInfo.displayName}), using voice: ${languageInfo.voice}`);
                }

                // Create message for speech queue with sync support
                const message = {
                    text: cleanText,
                    type: 'agent',
                    id: messageId,
                    from: { id: 'assistant' },
                    metadata: {
                        isStreaming: true,
                        language: languageInfo?.language
                    }
                };

                // Check if streaming sync is enabled to determine whether to return speed calculation
                const streamingSyncEnabled = localStorage.getItem('speechStreamingSync') === 'true';
                
                // **UNIFIED SPEECH CALL**: Always use aiCompanion.speakTextWithSync to avoid duplication
                // This method handles both sync and non-sync cases internally
                const speechItemId = await aiCompanion.speakTextWithSync(message);
                
                // Get the calculated target streaming speed from the message if sync is enabled
                if (streamingSyncEnabled && message.targetStreamingSpeed) {
                    console.log(`[Speech] Target streaming speed calculated: ${message.targetStreamingSpeed.toFixed(1)}ms per character`);
                    return message.targetStreamingSpeed;
                }

                console.log(`[Speech] Successfully started speech for message ${messageId}`);
                return null; // No sync speed for non-sync mode
            }
        } catch (error) {
            console.error('[Speech] Error starting speech with complete content:', error);
        }
        return null;
    }

    /**
     * Clean text for speech synthesis
     * @private
     */
    cleanTextForSpeech(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
            .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
            .replace(/`(.*?)`/g, '$1')       // Remove code markdown
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
            .replace(/#{1,6}\s*/g, '')       // Remove heading markers
            .replace(/^\s*[-*+]\s+/gm, '')   // Remove list markers
            .replace(/^\s*\d+\.\s+/gm, '')   // Remove numbered list markers
            // Remove standalone URLs (http/https/ftp)
            .replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '')
            .replace(/ftp:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '')
            // Remove www URLs
            .replace(/www\.[^\s<>"{}|\\^`\[\]]+/gi, '')
            // Remove email addresses
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '')
            .replace(/\n{2,}/g, '. ')        // Convert multiple newlines to periods
            .replace(/\n/g, ' ')             // Convert single newlines to spaces
            .replace(/\s{2,}/g, ' ')         // Normalize multiple spaces
            .trim();
    }

    /**
     * Stop streaming speech processing
     * @private
     */
    async stopStreamingSpeech() {
        console.log('🔴 [MESSAGERENDERER-STOP] =================================');
        console.log('🔴 [MESSAGERENDERER-STOP] stopStreamingSpeech() called');
        console.log('🔴 [MESSAGERENDERER-STOP] =================================');

        try {
            // Use the new comprehensive disposal and reinitialization method
            if (window.speechEngine && window.speechEngine.disposeAndReinitialize) {
                console.log('🟡 [MESSAGERENDERER-STOP] Calling speechEngine.disposeAndReinitialize()');
                const startTime = performance.now();
                await window.speechEngine.disposeAndReinitialize();
                const endTime = performance.now();
                console.log(`🟢 [MESSAGERENDERER-STOP] speechEngine.disposeAndReinitialize() completed in ${(endTime - startTime).toFixed(2)}ms`);
                return; // Exit early if disposal worked
            }

            // Fallback to legacy methods if disposal method is not available
            console.log('🟡 [MESSAGERENDERER-STOP] Fallback: Using legacy stopping methods');

            let speechStopAttempts = 0;
            let speechStopSuccess = false;

            // Method 1: Use global aiCompanion for immediate access
            if (window.aiCompanion && window.aiCompanion.stopSpeaking) {
                console.log('🟡 [MESSAGERENDERER-STOP] Method 1: calling window.aiCompanion.stopSpeaking()');
                speechStopAttempts++;
                const startTime = performance.now();
                window.aiCompanion.stopSpeaking();
                const endTime = performance.now();
                speechStopSuccess = true;
                console.log(`🟢 [MESSAGERENDERER-STOP] Method 1: completed in ${(endTime - startTime).toFixed(2)}ms`);
            } else {
                console.log('🔴 [MESSAGERENDERER-STOP] Method 1: aiCompanion not available');
            }

            // Method 2: Try speechEngine if available (check for Azure provider)
            if (window.speechEngine) {
                console.log('🟡 [MESSAGERENDERER-STOP] Method 2: speechEngine available');
                const currentProvider = window.speechEngine.state?.currentProvider;
                const isAzureProvider = currentProvider && currentProvider.constructor.name === 'AzureSpeechProvider';
                console.log(`🟡 [MESSAGERENDERER-STOP] Current provider: ${currentProvider ? currentProvider.constructor.name : 'none'}`);
                console.log(`🟡 [MESSAGERENDERER-STOP] Is Azure provider: ${isAzureProvider}`);

                if (window.speechEngine.stopSpeaking) {
                    speechStopAttempts++;
                    const startTime = performance.now();
                    window.speechEngine.stopSpeaking();
                    const endTime = performance.now();
                    speechStopSuccess = true;
                    console.log(`🟢 [MESSAGERENDERER-STOP] Method 2: speechEngine.stopSpeaking() completed in ${(endTime - startTime).toFixed(2)}ms`);
                }
            } else {
                console.log('🔴 [MESSAGERENDERER-STOP] Method 2: speechEngine not available');
            }

            // Method 3: Direct browser speech synthesis cancellation
            if (typeof window.speechSynthesis !== 'undefined') {
                console.log('🟡 [MESSAGERENDERER-STOP] Method 3: browser speechSynthesis available');
                const speaking = window.speechSynthesis.speaking;
                const pending = window.speechSynthesis.pending;
                console.log(`🟡 [MESSAGERENDERER-STOP] Speech state before cancel: speaking=${speaking}, pending=${pending}`);
                speechStopAttempts++;
                window.speechSynthesis.cancel();
                speechStopSuccess = true;
                const speakingAfter = window.speechSynthesis.speaking;
                const pendingAfter = window.speechSynthesis.pending;
                console.log(`🟢 [MESSAGERENDERER-STOP] Speech state after cancel: speaking=${speakingAfter}, pending=${pendingAfter}`);
            } else {
                console.log('🔴 [MESSAGERENDERER-STOP] Method 3: speechSynthesis not available');
            }

            console.log('🔴 [MESSAGERENDERER-STOP] =================================');
            console.log(`🔴 [MESSAGERENDERER-STOP] SUMMARY: ${speechStopAttempts} methods attempted, success: ${speechStopSuccess}`);
            console.log('🔴 [MESSAGERENDERER-STOP] =================================');

            if (!speechStopSuccess) {
                console.warn('🔴 [MESSAGERENDERER-STOP] No immediate speech stopping method worked, trying async fallback');
                // Fallback: try async import as backup
                import('../ai/aiCompanion.js').then(({ aiCompanion }) => {
                    console.log('🟡 [MESSAGERENDERER-STOP] Fallback: Using async import to stop speech');
                    aiCompanion.stopSpeaking();
                    console.log('🟢 [MESSAGERENDERER-STOP] Fallback: async aiCompanion.stopSpeaking() called');
                }).catch(error => {
                    console.error('🔴 [MESSAGERENDERER-STOP] Fallback: Failed to stop speech via async import:', error);
                });
            }
        } catch (error) {
            console.error('🔴 [MESSAGERENDERER-STOP] CRITICAL ERROR during speech stopping:', error);
            console.error('🔴 [MESSAGERENDERER-STOP] Error stack:', error.stack);
        }
    }

    /**
     * Debug markdown libraries availability
     * @private
     */
    debugMarkdownLibraries() {
        console.log('MessageRenderer: Checking markdown libraries...');
        console.log('marked available:', typeof marked !== 'undefined');
        console.log('DOMPurify available:', typeof DOMPurify !== 'undefined');
        console.log('KaTeX available:', typeof katex !== 'undefined');

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

        if (typeof katex !== 'undefined') {
            console.log('KaTeX.render function:', typeof katex.render);
            console.log('KaTeX.renderToString function:', typeof katex.renderToString);

            // Test basic LaTeX rendering
            try {
                const testLatex = 'E = mc^2';
                const result = katex.renderToString(testLatex, { displayMode: false });
                console.log('KaTeX test successful:', result.length > 0);
            } catch (error) {
                console.error('KaTeX test failed:', error);
            }
        }
    }

    /**
     * Analyzes if a string represents a mathematical expression vs regular text
     * @param {string} text - The text to analyze
     * @returns {boolean} - True if clearly NOT mathematical (should skip KaTeX)
     * @private
     */
    isDefinitelyNotMath(text) {
        const trimmed = text.trim();
        if (!trimmed) return true;

        // Negative-only filter: reject patterns that are clearly not math.
        // Everything else will be tried by KaTeX — if KaTeX rejects it, we keep original.
        const notMathPatterns = [
            /^\d+(\.\d+)?\s*[a-zA-Z]{1,3}$/,           // $3bn, $4.1bn, $38m (currency)
            /^\d+(\.\d+)?\s*(bn|million|billion|trillion|thousand|k|m|b|t)$/i, // units
            /^\d+(\.\d+)?%$/,                            // percentages
            /^\d+(\.\d+)?$/,                             // pure numbers
            /^\d{1,2}:\d{2}$/,                           // time
            /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,              // dates
            /^\d+\s*(kg|lb|ft|in|cm|mm|mph|km\/h|°[CF]?)$/i  // units
        ];

        for (const pattern of notMathPatterns) {
            if (pattern.test(trimmed)) return true;
        }

        return false;
    }

    /**
     * Process LaTeX math expressions in content.
     * Uses placeholder isolation: KaTeX HTML is replaced with unique tokens
     * so that downstream marked/DOMPurify cannot corrupt it.
     * Call restoreLatexPlaceholders() after sanitization to swap them back.
     * @param {string} content - Content that may contain LaTeX
     * @returns {string} - Content with LaTeX replaced by placeholders
     * @private
     */
    processLatex(content) {
        // Reset placeholder store for this render pass
        this._latexPlaceholders = new Map();
        this._latexPlaceholderCounter = 0;

        if (typeof katex === 'undefined') {
            return content;
        }

        const storePlaceholder = (html) => {
            const id = `%%KATEX_${this._latexPlaceholderCounter++}%%`;
            this._latexPlaceholders.set(id, html);
            return id;
        };

        try {
            // 1. Process display math: $$...$$
            content = content.replace(/\$\$([^$]+?)\$\$/g, (match, math) => {
                try {
                    const html = katex.renderToString(math.trim(), {
                        displayMode: true,
                        throwOnError: true
                    });
                    return storePlaceholder(html);
                } catch (error) {
                    return match;
                }
            });

            // 2. Process inline math: $...$
            //    Minimal negative filter + KaTeX as authoritative judge
            content = content.replace(/\$([^$\n]+?)\$/g, (match, math) => {
                const trimmed = math.trim();
                if (this.isDefinitelyNotMath(trimmed)) {
                    return match;
                }
                try {
                    const html = katex.renderToString(trimmed, {
                        displayMode: false,
                        throwOnError: true
                    });
                    return storePlaceholder(html);
                } catch (error) {
                    // KaTeX cannot parse it — not valid LaTeX, keep original
                    return match;
                }
            });

            // 3. Process LaTeX environments: \begin{...}\end{...}
            content = content.replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match, env, math) => {
                try {
                    const latexCode = `\\begin{${env}}${math}\\end{${env}}`;
                    const html = katex.renderToString(latexCode, {
                        displayMode: true,
                        throwOnError: true
                    });
                    return storePlaceholder(html);
                } catch (error) {
                    return match;
                }
            });

        } catch (error) {
            console.error('Error processing LaTeX:', error);
        }

        return content;
    }

    /**
     * Restore KaTeX placeholders with actual rendered HTML.
     * Must be called AFTER marked.parse() and DOMPurify.sanitize().
     * @param {string} html - HTML string containing placeholders
     * @returns {string} - HTML with placeholders replaced by KaTeX output
     * @private
     */
    restoreLatexPlaceholders(html) {
        if (!this._latexPlaceholders || this._latexPlaceholders.size === 0) {
            return html;
        }
        for (const [placeholder, katexHtml] of this._latexPlaceholders) {
            html = html.replace(placeholder, katexHtml);
        }
        return html;
    }

    /**
     * Render a complete message
     * @param {Object} activity - DirectLine activity
     */
    async renderCompleteMessage(activity) {
        // Use queue for sequential processing with fallback
        try {
            this.queueMessage(activity, 'complete');
        } catch (error) {
            console.error('Error queueing message, rendering directly:', error);
            await this.renderCompleteMessageDirect(activity);
        }
    }

    /**
     * Render complete message directly (internal method)
     * @param {Object} activity - Message activity
     */
    async renderCompleteMessageDirect(activity) {
        // Check if this is an agent response that should be filtered
        const isAgentMessage = activity.from && activity.from.id !== 'user';
        // Only apply the text-quality filter to PURELY textual messages. A message
        // that carries attachments (e.g. an adaptive card) or suggested actions is
        // meaningful even with empty text — passing only activity.text to the filter
        // made such answers be dropped as "empty response" (D2E card answers).
        const hasNonTextContent = (activity.attachments && activity.attachments.length > 0)
            || (activity.suggestedActions && activity.suggestedActions.actions && activity.suggestedActions.actions.length > 0);
        if (isAgentMessage && !hasNonTextContent && window.aiCompanion && window.aiCompanion.shouldFilterAgentResponse) {
            const shouldFilter = window.aiCompanion.shouldFilterAgentResponse(activity.text || '');
            if (shouldFilter) {
                console.log('[MessageRenderer] Filtering agent response - no useful information');
                // Don't render the message, but still mark thinking as complete
                return;
            }
        }

        // Prevent duplicate rendering of the same message
        const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;

        if (this.renderingInProgress.has(messageId)) {
            console.log('Message already being rendered, skipping duplicate:', messageId);
            return;
        }

        this.renderingInProgress.add(messageId);

        try {
            console.log('Rendering complete message:', {
                id: messageId,
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

            // *** Stop any ongoing speech for user messages ***
            const isUserMessage = activity.from && activity.from.id === 'user';
            if (isUserMessage) {
                console.log('[MessageRenderer] Stopping ongoing speech due to user message rendering');
                await this.stopStreamingSpeech();
            }

            // *** Start speech immediately synchronized with message display ***
            if (!isUserMessage && activity.text && this.streamingSpeechState.isEnabled) {
                console.log(`[Speech] Starting speech immediately synchronized with complete message display (${activity.text.length} chars)`);
                try {
                    // Use the unified speech method to start speech at the same time as message rendering
                    await this.startSpeechWithCompleteContent(activity.text, messageId);
                } catch (error) {
                    console.error('[Speech] Failed to start synchronized speech:', error);
                }
            }

            // Check if there's actual content to display (text or attachments)
            const hasTextContent = activity.text && activity.text.trim();
            const hasAttachments = activity.attachments && activity.attachments.length > 0;
            const hasActualContent = hasTextContent || hasAttachments;

            // Only create message container if there's actual content to display
            let messageContainer = null;
            if (hasActualContent) {
                messageContainer = this.createMessageContainer(activity);
                const messageDiv = this.createMessageDiv(activity);
                const isUser = activity.from && activity.from.id === 'user';

                // Check if message icons are enabled
                const messageIconsEnabled = localStorage.getItem('messageIconsEnabled') !== 'false';
                const messageIcon = messageIconsEnabled ? this.createMessageIcon(isUser) : null;

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
                    // User messages: content first, then icon (icon on right) - ORIGINAL STRUCTURE
                    messageContainer.appendChild(messageDiv);
                    if (messageIcon) {
                        messageContainer.appendChild(messageIcon);
                    }
                } else {
                    // Bot messages use new wrapper structure
                    // Create message wrapper to contain content and metadata
                    const messageWrapper = DOMUtils.createElement('div', {
                        className: 'message-wrapper'
                    });

                    // Add messageDiv to wrapper
                    messageWrapper.appendChild(messageDiv);

                    if (isCompanionResponse) {
                        // Companion responses: icon first, then wrapper (with AI companion icon)
                        if (messageIcon) {
                            // Set AI companion icon for companion responses
                            messageIcon.style.backgroundImage = '';
                            messageIcon.setAttribute('data-icon', 'aiCompanion');
                            messageIcon.setAttribute('data-width', '28');
                            messageIcon.setAttribute('data-height', '28');
                            messageContainer.appendChild(messageIcon);
                            // Initialize icon after setting data-icon
                            this.initializeMessageIcon(messageIcon);
                        }
                        messageContainer.appendChild(messageWrapper);
                    } else {
                        // Regular bot messages: icon first, then wrapper (icon on left)
                        if (messageIcon) {
                            messageContainer.appendChild(messageIcon);
                        }
                        messageContainer.appendChild(messageWrapper);
                    }
                }

                // Insert at end to avoid reordering issues that cause flickering
                this.elements.chatWindow.appendChild(messageContainer);

                // Add response metadata (only if we have a message container)
                this.addResponseMetadata(messageContainer, activity);
            }

            // Handle suggested actions (always render these, even without message content)
            if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
                console.log('Rendering suggested actions:', activity.suggestedActions.actions);
                this.renderSuggestedActions(activity.suggestedActions.actions);
            }

            // No additional speech processing needed here - handled at the beginning
            console.log(`[Complete] Finished rendering complete message ${messageId} (speech handled separately)`);

            // Scroll to bottom
            this.scrollToBottom();
        } finally {
            // Always clean up tracking regardless of success/failure
            this.renderingInProgress.delete(messageId);

            // Dispatch messageRendered event for AI companion title updates
            window.dispatchEvent(new CustomEvent('messageRendered', {
                detail: {
                    messageId: messageId,
                    activity: activity
                }
            }));
            console.log('[MessageRenderer] Dispatched messageRendered event for complete message:', messageId);
        }
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
        // Use queue for sequential processing with fallback
        try {
            this.queueMessage(activity, 'streaming');
        } catch (error) {
            console.error('Error queueing streaming message, handling directly:', error);
            this.handleStreamingMessageDirect(activity);
        }
    }

    /**
     * Handle streaming message directly (internal method)
     * @param {Object} activity - DirectLine activity
     */
    async handleStreamingMessageDirect(activity) {
        const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;
        let streamingState = this.streamingStates.get(messageId);

        console.log('Handling streaming message:', messageId, activity.text?.length || 0, 'chars');

        // Immediately hide typing indicator when message rendering starts
        window.dispatchEvent(new CustomEvent('hideTypingIndicator', {
            detail: { reason: 'message-rendering-started' }
        }));

        if (!streamingState) {
            // Initialize streaming speech for new message
            this.initializeStreamingSpeech();
            this.resetStreamingSpeechState();

            // Stop any ongoing speech from previous messages OR if this is a user message
            const isUserMessage = activity.from && activity.from.id === 'user';
            // Alias used by the DOM-construction code further down. (Previously
            // referenced `isUser` which was never defined in this function — a
            // latent ReferenceError that only surfaced with real native streaming.)
            const isUser = isUserMessage;
            if (isUserMessage) {
                console.log('[MessageRenderer] Stopping ongoing speech due to user message in streaming');
                await this.stopStreamingSpeech();
            } else {
                // For agent messages, don't stop - let the queue handle ordering
                console.log('[MessageRenderer] Agent streaming message - using speech queue');
            }

            // *** START SPEECH IMMEDIATELY WITH STREAMING MESSAGE ***
            // Start speech as soon as we have any content, synchronized with streaming display
            if (!isUserMessage && activity.text && this.streamingSpeechState.isEnabled) {
                console.log(`[Speech] Starting speech immediately for streaming message (${activity.text.length} chars) - synchronized with streaming start`);
                try {
                    // Start speech with the current content immediately
                    const targetStreamingSpeed = await this.startSpeechWithCompleteContent(activity.text, messageId);
                    // Store target streaming speed for this message if sync is enabled
                    if (targetStreamingSpeed) {
                        this.streamingSpeedMap = this.streamingSpeedMap || new Map();
                        this.streamingSpeedMap.set(messageId, targetStreamingSpeed);
                        console.log(`[Speech] Streaming message speech started with sync speed: ${targetStreamingSpeed.toFixed(1)}ms per character`);
                    } else {
                        console.log(`[Speech] Streaming message speech started without sync`);
                    }
                } catch (error) {
                    console.error('[Speech] Failed to start speech for streaming message:', error);
                }
            }

            // Create new streaming state for this message
            const messageContainer = this.createMessageContainer(activity);
            const messageDiv = this.createMessageDiv(activity);

            let messageWrapper = null;
            if (!isUser) {
                // Only create wrapper for bot messages
                messageWrapper = DOMUtils.createElement('div', {
                    className: 'message-wrapper'
                });
                // Add messageDiv to wrapper
                messageWrapper.appendChild(messageDiv);
            }

            streamingState = {
                startTime: Date.now(),
                messageContainer: messageContainer,
                messageWrapper: messageWrapper, // null for user messages
                messageDiv: messageDiv,
                content: '',
                isStreaming: true,
                lastUpdate: Date.now()
            };

            const messageIconsEnabled = localStorage.getItem('messageIconsEnabled') !== 'false';
            const messageIcon = messageIconsEnabled ? this.createMessageIcon(isUser) : null;

            // Add elements in correct order based on message type
            const isCompanionResponse = streamingState.messageContainer.classList.contains('companion-response');

            if (isUser) {
                // User messages: content first, then icon (icon on right) - ORIGINAL STRUCTURE
                streamingState.messageContainer.appendChild(streamingState.messageDiv);
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }
            } else if (isCompanionResponse) {
                // Companion responses: icon first, then wrapper (with AI companion icon)
                if (messageIcon) {
                    // Set AI companion icon for companion responses
                    messageIcon.style.backgroundImage = '';
                    messageIcon.setAttribute('data-icon', 'aiCompanion');
                    messageIcon.setAttribute('data-width', '28');
                    messageIcon.setAttribute('data-height', '28');
                    streamingState.messageContainer.appendChild(messageIcon);
                    // Initialize icon after setting data-icon
                    this.initializeMessageIcon(messageIcon);
                }
                streamingState.messageContainer.appendChild(messageWrapper);
            } else {
                // Regular bot messages: icon first, then wrapper (icon on left)
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }
                streamingState.messageContainer.appendChild(messageWrapper);
            }

            // Insert at end to avoid reordering issues that cause flickering
            this.elements.chatWindow.appendChild(streamingState.messageContainer);

            // Store the streaming state
            this.streamingStates.set(messageId, streamingState);

            console.log('Streaming container created for message:', messageId);
        }

        // Handle streaming content update
        if (activity.text) {
            // For real streaming, append new content
            if (activity.streamingMetadata?.isRealtime) {
                streamingState.content += activity.text;
            } else {
                // For simulated streaming, use the cumulative text directly
                streamingState.content = activity.text;
            }

            this.updateStreamingContent(streamingState.messageDiv, streamingState.content);
            streamingState.lastUpdate = Date.now();
            console.log('Updated streaming content for', messageId, ':', streamingState.content.length, 'chars');
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Finalize streaming message
     * @param {Object} activity - Final activity
     */
    async finalizeStreamingMessage(activity) {
        const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;
        const streamingState = this.streamingStates.get(messageId);

        if (streamingState && streamingState.messageDiv) {
            console.log('Finalizing streaming message:', messageId);

            // Ensure final content is properly rendered with full activity text
            if (activity.text && activity.text !== streamingState.content) {
                console.log('Finalizing streaming with complete content:', activity.text.length, 'chars');
                // Update with the complete final content
                this.addTextContent(streamingState.messageDiv, activity.text);
            }

            // Add attachments if any
            if (activity.attachments && activity.attachments.length > 0) {
                this.addAttachments(streamingState.messageDiv, activity.attachments);
            }

            // Handle suggested actions
            if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
                this.renderSuggestedActions(activity.suggestedActions.actions);
            }

            // Add response metadata with timing from streaming state
            this.addResponseMetadata(streamingState.messageContainer, activity, streamingState.startTime);

            // Clear this specific streaming state
            this.streamingStates.delete(messageId);

            // *** Speech handling for streaming messages - avoid duplicate calls ***
            const isUserMessage = activity.from && activity.from.id === 'user';
            if (!isUserMessage && activity.text && this.streamingSpeechState.isEnabled) {
                // Check if speech was already started during streaming initialization
                const speechAlreadyStarted = this.streamingSpeedMap?.has(messageId);
                
                if (!speechAlreadyStarted) {
                    console.log(`[Speech] Starting speech for finalized streaming message (${activity.text.length} chars) - speech not started during streaming initialization`);
                    try {
                        // Use unified speech method - this handles cases where speech wasn't started at streaming beginning
                        await this.startSpeechWithCompleteContent(activity.text, messageId);
                    } catch (error) {
                        console.error('[Speech] Failed to start speech for finalized streaming message:', error);
                    }
                } else {
                    console.log(`[Speech] Speech already started during streaming initialization for message ${messageId}, skipping duplicate in finalize`);
                }
            }

            console.log(`[Streaming] Finalized streaming for message ${messageId} (speech handled via queue)`);

            // Scroll to bottom
            this.scrollToBottom();

            // Dispatch messageRendered event for AI companion title updates
            window.dispatchEvent(new CustomEvent('messageRendered', {
                detail: {
                    messageId: messageId,
                    activity: activity
                }
            }));
            console.log('[MessageRenderer] Dispatched messageRendered event for streaming message:', messageId);

            console.log('Streaming message finalized successfully for:', messageId);
        } else {
            console.warn('No streaming message to finalize for:', messageId, ', falling back to complete render');
            // Fallback: render as complete message if streaming state is lost
            this.renderCompleteMessage(activity);
        }
    }

    /**
     * Cancel and remove a streaming message bubble (e.g. a "regretted" livestream
     * where the bot concluded with no content). Removes both the DOM element and
     * the tracked streaming state.
     * @param {string} messageId - Stream/message id used when streaming started
     */
    cancelStreamingMessage(messageId) {
        const streamingState = this.streamingStates.get(messageId);
        if (streamingState && streamingState.messageContainer) {
            streamingState.messageContainer.remove();
        }
        this.streamingStates.delete(messageId);
        if (this.renderingInProgress?.has(messageId)) {
            this.renderingInProgress.delete(messageId);
        }
        console.log('[MessageRenderer] Cancelled streaming message:', messageId);
    }

    /**
     * Simulate streaming for non-streaming messages
     * Enhanced with race condition prevention and smooth rendering
     * @param {Object} activity - DirectLine activity
     */
    async simulateStreaming(activity) {
        // Use queue for sequential processing with fallback
        try {
            this.queueMessage(activity, 'simulate');
        } catch (error) {
            console.error('Error queueing simulate streaming, handling directly:', error);
            await this.simulateStreamingDirect(activity);
        }
    }

    /**
     * Simulate streaming directly (internal method)
     * @param {Object} activity - DirectLine activity
     */
    async simulateStreamingDirect(activity) {
        try {
            const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;

            // Prevent duplicate streaming of the same message
            if (this.renderingInProgress.has(messageId)) {
                console.log('Message already being rendered, skipping streaming:', messageId);
                return;
            }

            this.renderingInProgress.add(messageId);

            console.log('Starting enhanced streaming simulation for:', messageId);

            if (!activity.text) {
                console.log('No text content, rendering complete message');
                await this.renderCompleteMessageDirect(activity);
                return;
            }

            // Check if streaming is enabled
            const streamingEnabled = localStorage.getItem('enableStreaming') === 'true';
            if (!streamingEnabled) {
                console.log('Streaming disabled, rendering complete message');
                await this.renderCompleteMessageDirect(activity);
                return;
            }

            // *** STEP 1: Start speech immediately and synchronously with streaming display ***
            const isUserMessage = activity.from && activity.from.id === 'user';
            if (isUserMessage) {
                console.log('[MessageRenderer] Stopping ongoing speech due to user message in simulated streaming');
                await this.stopStreamingSpeech();
            } else if (activity.text && this.streamingSpeechState.isEnabled) {
                console.log(`[Speech] Starting speech immediately synchronized with streaming display (${activity.text.length} chars)`);
                // Start speech with complete content immediately - synchronized with streaming start
                const targetStreamingSpeed = await this.startSpeechWithCompleteContent(activity.text, messageId);
                
                // ALWAYS mark speech as started, even if no sync speed returned
                this.streamingSpeedMap = this.streamingSpeedMap || new Map();
                this.streamingSpeedMap.set(messageId, targetStreamingSpeed || true);
                
                // Store target streaming speed for this message to sync visual display with speech
                if (targetStreamingSpeed) {
                    console.log(`[Speech] Speech and streaming synchronized at ${targetStreamingSpeed.toFixed(1)}ms per character`);
                } else {
                    console.log(`[Speech] Speech started for message ${messageId} (no sync)`);
                }
            }

            // *** STEP 2: Start streaming display with the same complete content ***
            console.log(`[Streaming] Starting streaming display with complete content (${activity.text.length} chars)`);

            // Create isolated streaming state for this message
            const messageContainer = this.createMessageContainer(activity);
            const messageDiv = this.createMessageDiv(activity);

            let messageWrapper = null;
            if (!isUserMessage) {
                // Only create wrapper for bot messages
                messageWrapper = DOMUtils.createElement('div', {
                    className: 'message-wrapper'
                });
                // Add messageDiv to wrapper
                messageWrapper.appendChild(messageDiv);
            }

            const streamingState = {
                startTime: Date.now(),
                messageContainer: messageContainer,
                messageWrapper: messageWrapper, // null for user messages
                messageDiv: messageDiv,
                content: '',
                isStreaming: true,
                lastUpdate: Date.now()
            };

            // Store the streaming state
            this.streamingStates.set(messageId, streamingState);

            // Immediately hide typing indicator
            window.dispatchEvent(new CustomEvent('hideTypingIndicator', {
                detail: { reason: 'streaming-started' }
            }));

            const isUser = activity.from && activity.from.id === 'user';
            const messageIconsEnabled = localStorage.getItem('messageIconsEnabled') !== 'false';
            const messageIcon = messageIconsEnabled ? this.createMessageIcon(isUser) : null;
            const isCompanionResponse = streamingState.messageContainer.classList.contains('companion-response');

            // Build message structure
            if (isUser) {
                // User messages: content first, then icon (icon on right) - ORIGINAL STRUCTURE
                streamingState.messageContainer.appendChild(streamingState.messageDiv);
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }
            } else if (isCompanionResponse) {
                // Companion responses: icon first, then wrapper (with AI companion icon)
                if (messageIcon) {
                    // Set AI companion icon for companion responses
                    messageIcon.style.backgroundImage = '';
                    messageIcon.setAttribute('data-icon', 'aiCompanion');
                    streamingState.messageContainer.appendChild(messageIcon);
                    // Initialize icon after setting data-icon
                    this.initializeMessageIcon(messageIcon);
                }
                streamingState.messageContainer.appendChild(messageWrapper);
            } else {
                // Regular bot messages: icon first, then wrapper (icon on left)
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }
                streamingState.messageContainer.appendChild(messageWrapper);
            }

            // Insert at end to avoid reordering flicker
            this.elements.chatWindow.appendChild(streamingState.messageContainer);

            console.log('Streaming container created, starting character-by-character simulation');

            // Stream text with configurable style and speed
            const text = activity.text;
            let currentText = '';

            // Get streaming configuration
            const streamingStyle = localStorage.getItem('streamingStyle') || 'typewriter';
            const streamingSpeed = localStorage.getItem('streamingSpeed') || 'normal';

            // Speed multipliers
            const speedMultiplier = { slow: 3, normal: 1, fast: 0.4, ultra: 0.1 }[streamingSpeed] || 1;

            // Get target streaming speed from speech sync (if available)
            const targetStreamingSpeed = this.streamingSpeedMap?.get(messageId);
            const useSpeechSync = targetStreamingSpeed && localStorage.getItem('speechStreamingSync') === 'true';

            if (streamingStyle === 'instant') {
                // Instant: show everything at once
                this.updateStreamingContent(streamingState.messageDiv, text);
                streamingState.content = text;
                this.scrollToBottom();
            } else if (streamingStyle === 'smooth') {
                // Smooth light-rendering: words appear with glow, markdown rendered incrementally
                const words = text.split(/(\s+)/);
                let wordCount = 0;

                for (let i = 0; i < words.length; i++) {
                    if (!this.streamingStates.has(messageId) || this.currentlyStreamingMessageId !== messageId) break;
                    const word = words[i];
                    if (!word) continue;

                    currentText += word;
                    streamingState.content = currentText;

                    if (word.trim()) wordCount++;

                    // Re-render markdown every few words for smooth incremental formatting
                    if (word.trim()) {
                        this.updateStreamingContent(streamingState.messageDiv, currentText);

                        // Add glow animation to the last text node in the rendered HTML
                        this._applyGlowToLastWords(streamingState.messageDiv, word);

                        // Append cursor after content
                        let cursor = streamingState.messageDiv.querySelector('.streaming-cursor');
                        if (!cursor) {
                            cursor = document.createElement('span');
                            cursor.className = 'streaming-cursor';
                        }
                        streamingState.messageDiv.appendChild(cursor);

                        this.scrollToBottom();
                    }

                    // Variable delay based on punctuation
                    if (/[.!?]/.test(word)) {
                        await Utils.sleep(80 * speedMultiplier);
                    } else if (/[,;:]/.test(word)) {
                        await Utils.sleep(40 * speedMultiplier);
                    } else if (word.trim()) {
                        await Utils.sleep(18 * speedMultiplier);
                    }
                }

                // Final render without cursor
                const cursor = streamingState.messageDiv.querySelector('.streaming-cursor');
                if (cursor) cursor.remove();
                this.updateStreamingContent(streamingState.messageDiv, text);
                streamingState.content = text;
            } else if (streamingStyle === 'sentence') {
                // Sentence by sentence
                const sentences = text.match(/[^.!?\n]+[.!?\n]?\s*/g) || [text];
                for (let i = 0; i < sentences.length; i++) {
                    if (!this.streamingStates.has(messageId) || this.currentlyStreamingMessageId !== messageId) break;
                    currentText += sentences[i];
                    this.updateStreamingContent(streamingState.messageDiv, currentText);
                    streamingState.content = currentText;
                    this.scrollToBottom();
                    await Utils.sleep(120 * speedMultiplier);
                }
            } else if (streamingStyle === 'word') {
                // Word by word
                const words = text.split(/(\s+)/);
                for (let i = 0; i < words.length; i++) {
                    if (!this.streamingStates.has(messageId) || this.currentlyStreamingMessageId !== messageId) break;
                    currentText += words[i];
                    this.updateStreamingContent(streamingState.messageDiv, currentText);
                    streamingState.content = currentText;
                    this.scrollToBottom();
                    if (words[i].trim()) {
                        await Utils.sleep(30 * speedMultiplier);
                    }
                }
            } else {
                // Typewriter (character by character) — default
                for (let i = 0; i < text.length; i++) {
                    if (!this.streamingStates.has(messageId) || this.currentlyStreamingMessageId !== messageId) break;

                    currentText += text[i];
                    this.updateStreamingContent(streamingState.messageDiv, currentText);
                    streamingState.content = currentText;
                    streamingState.lastUpdate = Date.now();
                    this.scrollToBottom();

                    let delay;
                    if (useSpeechSync) {
                        delay = targetStreamingSpeed;
                        const char = text[i];
                        if (/[.!?]/.test(char)) delay *= 2;
                        else if (char === ' ') delay *= 0.8;
                        else if (char === '\n') delay *= 1.5;
                    } else {
                        const char = text[i];
                        if (char === ' ') delay = 5 * speedMultiplier;
                        else if (char === '\n') delay = 15 * speedMultiplier;
                        else if (/[.!?]/.test(char)) delay = 35 * speedMultiplier;
                        else if (/[,;:]/.test(char)) delay = 20 * speedMultiplier;
                        else delay = (Math.random() * 2 + 1) * speedMultiplier;
                    }
                    await Utils.sleep(delay);
                }
            }

            // Clean up streaming speed map for this message
            if (this.streamingSpeedMap?.has(messageId)) {
                this.streamingSpeedMap.delete(messageId);
            }

            console.log('Streaming simulation complete, finalizing message');

            // Finalize the message with metadata
            await this.finalizeStreamingMessage(activity);

        } catch (error) {
            console.error('Error in streaming simulation:', error);
            // Clean up and fallback
            const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;
            this.streamingStates.delete(messageId);
            this.renderingInProgress.delete(messageId);
            await this.renderCompleteMessageDirect(activity);
        } finally {
            // Always clean up tracking
            const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;
            this.renderingInProgress.delete(messageId);
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

        // Add special class for user messages when AI companion is active
        if (isUser && document.body.classList.contains('ai-companion-active')) {
            className += ' ai-companion-user-message';
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
            // Use SVG agent icon for agent messages
            iconElement.style.backgroundImage = '';
            iconElement.setAttribute('data-icon', 'agent');

            // Initialize this specific icon immediately
            this.initializeMessageIcon(iconElement);
        }

        return iconElement;
    }

    /**
     * Initialize a single message icon with SVG
     * @param {HTMLElement} iconElement - The icon element to initialize
     * @private
     */
    initializeMessageIcon(iconElement) {
        const iconName = iconElement.getAttribute('data-icon');
        console.log('Initializing message icon:', iconName, iconElement);

        if (iconName) {
            // Use the global Icon manager's create method directly
            setTimeout(() => {
                try {
                    // Use outline mode for user icons, auto mode for others
                    const iconOptions = { 
                        color: '#333', 
                        size: '28px',
                        fillMode: iconName === 'user' ? 'outline' : 'auto'
                    };
                    const iconSvgElement = window.Icon.create(iconName, iconOptions);
                    console.log('Created icon element for', iconName, iconSvgElement);
                    
                    // Clear any existing content and styles
                    iconElement.innerHTML = '';
                    iconElement.style.backgroundImage = '';
                    iconElement.style.backgroundSize = '';
                    iconElement.style.backgroundPosition = '';
                    iconElement.style.backgroundRepeat = '';
                    
                    // Add the created icon element
                    iconElement.appendChild(iconSvgElement);
                } catch (error) {
                    console.error('Failed to create SVG icon:', iconName, error);
                }
            }, 0);
        }
    }

    /**
     * Apply user icon to an element
     * @param {HTMLElement} element - The element to apply the icon to
     * @private
     */
    applyUserIconToElement(element) {
        // Use SVG user icon for all user messages instead of the old system
        element.style.backgroundImage = '';
        element.style.background = '';
        element.style.display = '';
        element.style.alignItems = '';
        element.style.justifyContent = '';
        element.style.fontSize = '';
        element.innerHTML = '';

        // Remove any existing avatar classes
        element.className = 'messageIcon';

        // Set SVG user icon
        element.setAttribute('data-icon', 'user');

        // Initialize this specific icon immediately
        this.initializeMessageIcon(element);
    }

    /**
     * Set speaker button icon based on state
     * @param {HTMLElement} speakerButton - Speaker button element
     * @param {string} state - Icon state: 'speaker', 'pause', 'stop'
     * @private
     */
    setSpeakerIcon(speakerButton, state) {
        let iconSvg = '';
        let title = '';
        let ariaLabel = '';

        switch (state) {
            case 'speaker':
                iconSvg = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                `;
                title = 'Read message aloud';
                ariaLabel = 'Read message aloud';
                speakerButton.classList.remove('speaking');
                break;

            case 'pause':
                iconSvg = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                `;
                title = 'Pause speaking';
                ariaLabel = 'Pause speaking';
                speakerButton.classList.add('speaking');
                break;

            case 'stop':
                iconSvg = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h12v12H6z"/>
                    </svg>
                `;
                title = 'Stop speaking';
                ariaLabel = 'Stop speaking';
                speakerButton.classList.add('speaking');
                break;

            default:
                // Default to speaker icon
                return this.setSpeakerIcon(speakerButton, 'speaker');
        }

        speakerButton.innerHTML = iconSvg;
        speakerButton.title = title;
        speakerButton.ariaLabel = ariaLabel;
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
     * Create enhanced speaker button with progress tracking for metadata section
     * @param {Object} activity - DirectLine activity
     * @param {HTMLElement} progressContainer - Progress bar container
     * @param {HTMLElement} progressFill - Progress bar fill element
     * @returns {HTMLElement} Enhanced speaker button
     * @private
     */
    createEnhancedSpeakerButton(activity, progressContainer, progressFill) {
        const speakerButton = DOMUtils.createElement('button', {
            className: 'message-speaker-btn metadata-speaker-btn',
            title: 'Read message aloud',
            ariaLabel: 'Read message aloud'
        });

        // Set initial speaker icon (clean SVG with transparent background)
        this.setSpeakerIcon(speakerButton, 'speaker');

        // Add click handler to speak the message with progress tracking
        DOMUtils.addEventListener(speakerButton, 'click', async () => {
            const messageText = activity.text || '';
            if (!messageText.trim()) return;

            // Check global speech state
            if (this.globalSpeechState.isPlaying) {
                // Stop currently playing speech
                console.log('[Enhanced Speaker] Stopping currently playing speech');
                try {
                    // Stop speech using the new disposal method
                    if (window.speechEngine && window.speechEngine.disposeAndReinitialize) {
                        await window.speechEngine.disposeAndReinitialize();
                    } else {
                        const { aiCompanion } = await import('../ai/aiCompanion.js');
                        aiCompanion.stopSpeaking();
                    }

                    // Reset all speaker button states
                    this.resetAllSpeakerButtons();

                } catch (error) {
                    console.warn('Failed to stop speech:', error);
                    this.resetAllSpeakerButtons();
                }
                return;
            }

            // Start speaking with progress tracking
            console.log('[Enhanced Speaker] Starting new speech synthesis');
            this.globalSpeechState.isPlaying = true;
            this.globalSpeechState.currentSpeakerButton = speakerButton;
            this.globalSpeechState.currentProgressContainer = progressContainer;
            this.globalSpeechState.currentProgressFill = progressFill;

            this.startSpeechProgress(speakerButton, progressContainer, progressFill, messageText);

            try {
                const { aiCompanion } = await import('../ai/aiCompanion.js');

                // Create progress callback
                const onProgress = (progress) => {
                    // Only update if this is still the current speech
                    if (this.globalSpeechState.currentProgressFill === progressFill) {
                        // Convert 0.0-1.0 progress to 0-100 percentage
                        const percentage = progress * 100;
                        console.log(`[Enhanced Speaker] Progress: ${Math.round(percentage)}%`);
                        this.updateSpeechProgress(progressFill, percentage);
                    }
                };

                // Create completion callback
                const onComplete = () => {
                    console.log('[Enhanced Speaker] Speech synthesis completed');
                    this.resetAllSpeakerButtons();
                };

                // Create error callback
                const onError = (error) => {
                    console.warn('[Enhanced Speaker] Speech synthesis error:', error);
                    this.resetAllSpeakerButtons();
                };

                // Start speaking with callbacks
                await aiCompanion.speakTextWithProgress(messageText, {
                    onProgress,
                    onComplete,
                    onError,
                    forceSpeak: true
                });
            } catch (error) {
                console.warn('Failed to speak message:', error);
                this.resetAllSpeakerButtons();
            }
        });

        return speakerButton;
    }

    /**
     * Start speech progress indication
     * @param {HTMLElement} speakerButton - Speaker button element
     * @param {HTMLElement} progressContainer - Progress container element
     * @param {HTMLElement} progressFill - Progress fill element
     * @param {string} text - Text being spoken
     * @private
     */
    startSpeechProgress(speakerButton, progressContainer, progressFill, text) {
        console.log('[MessageRenderer] Starting speech progress...');

        // Update button to pause icon with speaking state
        this.setSpeakerIcon(speakerButton, 'pause');

        // Show progress bar
        progressContainer.style.display = 'block';
        progressFill.style.width = '0%';

        console.log('[MessageRenderer] Progress container displayed, initial width set to 0%');
    }

    /**
     * Update speech progress
     * @param {HTMLElement} progressFill - Progress fill element
     * @param {number} progress - Progress percentage (0-100)
     * @private
     */
    updateSpeechProgress(progressFill, progress) {
        const clampedProgress = Math.max(0, Math.min(100, progress));
        console.log(`[MessageRenderer] Updating progress: ${progress}% -> ${clampedProgress}%`);

        if (progressFill) {
            const oldWidth = progressFill.style.width;
            progressFill.style.width = `${clampedProgress}%`;
            console.log(`[MessageRenderer] Progress bar width: ${oldWidth} -> ${progressFill.style.width}`);
        } else {
            console.warn('[MessageRenderer] Progress fill element is null!');
        }
    }

    /**
     * Reset speaker button to initial state
     * @param {HTMLElement} speakerButton - Speaker button element
     * @param {HTMLElement} progressContainer - Progress container element
     * @param {HTMLElement} progressFill - Progress fill element
     * @private
     */
    resetSpeakerButton(speakerButton, progressContainer, progressFill) {
        // Reset button to speaker icon
        this.setSpeakerIcon(speakerButton, 'speaker');

        // Hide progress bar
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
    }

    /**
     * Reset all speaker buttons to initial state using global state tracking
     * @private
     */
    resetAllSpeakerButtons() {
        // Reset global state
        this.globalSpeechState.isPlaying = false;

        // Reset the current speaker button if it exists
        if (this.globalSpeechState.currentSpeakerButton) {
            this.setSpeakerIcon(this.globalSpeechState.currentSpeakerButton, 'speaker');
        }

        // Reset the current progress elements if they exist
        if (this.globalSpeechState.currentProgressContainer) {
            this.globalSpeechState.currentProgressContainer.style.display = 'none';
        }

        if (this.globalSpeechState.currentProgressFill) {
            this.globalSpeechState.currentProgressFill.style.width = '0%';
        }

        // Clear current references
        this.globalSpeechState.currentSpeakerButton = null;
        this.globalSpeechState.currentProgressContainer = null;
        this.globalSpeechState.currentProgressFill = null;

        console.log('[Speaker] All speaker buttons reset to initial state');
    }

    /**
     * Create speaker button for agent messages
     * @param {Object} activity - DirectLine activity
     * @returns {HTMLElement} Speaker button
     * @private
     */
    createSpeakerButton(activity) {
        const speakerButton = DOMUtils.createElement('button', {
            className: 'message-speaker-btn',
            title: 'Read message aloud',
            ariaLabel: 'Read message aloud'
        });

        // Set initial speaker icon (clean SVG with transparent background)
        this.setSpeakerIcon(speakerButton, 'speaker');

        // Add click handler to speak the message
        DOMUtils.addEventListener(speakerButton, 'click', async () => {
            const messageText = activity.text || '';
            if (!messageText.trim()) return;

            // Check global speech state
            if (this.globalSpeechState.isPlaying) {
                // Stop currently playing speech
                console.log('[Speaker] Stopping currently playing speech');
                try {
                    // Stop speech using the new disposal method
                    if (window.speechEngine && window.speechEngine.disposeAndReinitialize) {
                        await window.speechEngine.disposeAndReinitialize();
                    } else {
                        const { aiCompanion } = await import('../ai/aiCompanion.js');
                        aiCompanion.stopSpeaking();
                    }

                    // Reset all speaker button states
                    this.resetAllSpeakerButtons();

                } catch (error) {
                    console.warn('Failed to stop speech:', error);
                    this.resetAllSpeakerButtons();
                }
                return;
            }

            // Start speaking
            console.log('[Speaker] Starting new speech synthesis');
            this.globalSpeechState.isPlaying = true;
            this.globalSpeechState.currentSpeakerButton = speakerButton;

            // Update current button to pause state
            this.setSpeakerIcon(speakerButton, 'pause');

            try {
                const { aiCompanion } = await import('../ai/aiCompanion.js');

                await aiCompanion.speakText(messageText, {
                    forceSpeak: true,
                    onComplete: () => {
                        console.log('[Speaker] Speech synthesis completed');
                        this.resetAllSpeakerButtons();
                    },
                    onError: (error) => {
                        console.warn('[Speaker] Speech synthesis error:', error);
                        this.resetAllSpeakerButtons();
                    }
                });
            } catch (error) {
                console.warn('Failed to speak message:', error);
                this.resetAllSpeakerButtons();
            }
        });

        return speakerButton;
    }

    /**
     * Add text content to message
     * @param {HTMLElement} messageDiv - Message div element
     * @param {string} text - Text content
     * @private
     */
    addTextContent(messageDiv, text) {
        console.log('MessageRenderer: addTextContent called with text length:', text?.length);

        // Process LaTeX math expressions first — placeholders protect KaTeX HTML
        const latexProcessedText = this.processLatex(text);

        // Process markdown if available - exactly like legacy
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(latexProcessedText) :
                    marked(latexProcessedText);
                const sanitizedContent = DOMPurify.sanitize(htmlContent);

                // Restore KaTeX HTML after sanitization
                const latexRestoredContent = this.restoreLatexPlaceholders(sanitizedContent);

                console.log('MessageRenderer: Processed markdown, checking for images in HTML:', latexRestoredContent.includes('<img'));

                // Enhance inline references
                const enhancedContent = this.enhanceInlineReferences(latexRestoredContent);

                // Ensure agent messages are properly wrapped in paragraphs
                const finalContent = this.ensureParagraphStructure(enhancedContent, messageDiv);
                messageDiv.innerHTML = finalContent;
                
                // Post-process to add target="_blank" to external links after DOM is set
                this.addTargetBlankToExternalLinks(messageDiv);
            } catch (error) {
                console.warn('Error processing markdown:', error);
                console.warn('Marked version check:', typeof marked.parse);
                // For fallback, still ensure paragraph structure and restore placeholders
                const restored = this.restoreLatexPlaceholders(latexProcessedText);
                const paragraphText = this.ensureParagraphStructure(restored, messageDiv, true);
                messageDiv.innerHTML = paragraphText;
            }
        } else {
            console.warn('Markdown libraries not available:', {
                marked: typeof marked,
                DOMPurify: typeof DOMPurify
            });
            // Even without markdown, restore placeholders and ensure paragraph structure
            const restored = this.restoreLatexPlaceholders(latexProcessedText);
            const paragraphText = this.ensureParagraphStructure(restored, messageDiv, true);
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
     * Add target="_blank" to external links in a message element
     * @param {HTMLElement} messageElement - Message element containing links
     * @private
     */
    addTargetBlankToExternalLinks(messageElement) {
        // Check if Citation Preview Panel is enabled
        const useSideBrowser = localStorage.getItem('enableSideBrowser') === 'true';
        
        const links = messageElement.querySelectorAll('a[href]');
        links.forEach(link => {
            try {
                const linkUrl = new URL(link.href, window.location.href);
                const currentUrl = new URL(window.location.href);
                
                // Only add target="_blank" for external links if Citation Preview Panel is disabled
                if (linkUrl.hostname !== currentUrl.hostname) {
                    if (!useSideBrowser) {
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                    } else {
                        // Remove target="_blank" if it was set, so Citation Preview Panel can intercept
                        link.removeAttribute('target');
                        // Still keep security attributes
                        link.rel = 'noopener noreferrer';
                    }
                }
            } catch (e) {
                // If URL parsing fails, only add target="_blank" if Citation Preview Panel is disabled
                if (!useSideBrowser) {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                } else {
                    link.removeAttribute('target');
                    link.rel = 'noopener noreferrer';
                }
            }
        });
    }

    /**
     * Update streaming content
     * @param {HTMLElement} messageDiv - Message div element
     * @param {string} content - Current content
     * @private
     */
    /**
     * Apply glow animation to the last occurrence of a word in the rendered HTML.
     * Wraps the final text match in a .streaming-word span for the CSS fade-in effect.
     * @param {HTMLElement} container - The message div
     * @param {string} word - The last word that was added
     * @private
     */
    _applyGlowToLastWords(container, word) {
        // Remove any existing glow spans from previous iterations
        container.querySelectorAll('.streaming-word').forEach(el => {
            el.replaceWith(...el.childNodes);
        });

        // Walk text nodes in reverse to find the last occurrence of this word
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        for (let i = textNodes.length - 1; i >= 0; i--) {
            const node = textNodes[i];
            const idx = node.textContent.lastIndexOf(word);
            if (idx === -1) continue;

            // Split the text node and wrap the matched word
            const before = node.textContent.substring(0, idx);
            const after = node.textContent.substring(idx + word.length);

            const span = document.createElement('span');
            span.className = 'streaming-word';
            span.textContent = word;

            const parent = node.parentNode;
            if (before) parent.insertBefore(document.createTextNode(before), node);
            parent.insertBefore(span, node);
            if (after) parent.insertBefore(document.createTextNode(after), node);
            parent.removeChild(node);
            break;
        }
    }

    updateStreamingContent(messageDiv, content) {
        // Handle URLs and markdown links specially during streaming
        const processedContent = this.handleStreamingUrls(content);

        // Process LaTeX math expressions first — placeholders protect KaTeX HTML
        const latexProcessedContent = this.processLatex(processedContent);

        // Process markdown if available - removed typing cursor
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(latexProcessedContent) :
                    marked(latexProcessedContent);
                const sanitizedContent = DOMPurify.sanitize(htmlContent);

                // Restore KaTeX HTML after sanitization
                const latexRestoredContent = this.restoreLatexPlaceholders(sanitizedContent);

                // Enhance inline references during streaming like in complete messages
                const enhancedContent = this.enhanceInlineReferences(latexRestoredContent);

                // Ensure agent messages have proper paragraph structure during streaming
                const finalContent = this.ensureParagraphStructure(enhancedContent, messageDiv);
                messageDiv.innerHTML = finalContent;
                
                // Post-process to add target="_blank" to external links after DOM is set
                this.addTargetBlankToExternalLinks(messageDiv);
            } catch (error) {
                console.warn('Error processing streaming markdown:', error);
                // For fallback, restore placeholders and ensure paragraph structure
                const restored = this.restoreLatexPlaceholders(latexProcessedContent);
                const paragraphContent = this.ensureParagraphStructure(restored, messageDiv, true);
                messageDiv.innerHTML = paragraphContent;
            }
        } else {
            // Even without markdown, restore placeholders and ensure paragraph structure
            const restored = this.restoreLatexPlaceholders(latexProcessedContent);
            const paragraphContent = this.ensureParagraphStructure(restored, messageDiv, true);
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

        // Process streaming speech for new content
        // Extract text content for speech processing (remove HTML tags)
        const textContent = messageDiv.textContent || messageDiv.innerText || '';
        const messageId = messageDiv.getAttribute('data-message-id') || `message-${Date.now()}`;

        // Speech is handled separately by the new architecture - no need to process here
    }

    /**
     * Handle URLs and markdown links during streaming to prevent broken rendering
     * @param {string} content - The streaming content
     * @returns {string} - Processed content with URLs handled appropriately
     * @private
     */
    handleStreamingUrls(content) {
        // Patterns for detecting incomplete markdown links and URLs
        const incompleteMarkdownLink = /\[[^\]]*$/; // [text without closing ]
        const incompleteMarkdownLinkWithParen = /\[[^\]]*\]\([^)]*$/; // [text](incomplete-url
        const incompleteUrl = /(^|\s)(https?:\/\/[^\s\])]*)$/; // URL at end without proper termination

        // If content ends with incomplete markdown link syntax, render as plain text
        if (incompleteMarkdownLink.test(content) || incompleteMarkdownLinkWithParen.test(content)) {
            // Replace incomplete markdown with escaped version to prevent markdown processing
            return content.replace(/\[([^\]]*)$/, '\\[$1')
                .replace(/\[([^\]]*)\]\(([^)]*)$/, '\\[$1\\]\\($2');
        }

        // If content ends with incomplete URL, don't process it as markdown yet
        if (incompleteUrl.test(content)) {
            const match = content.match(incompleteUrl);
            if (match && match[2]) {
                const url = match[2];
                // Only treat as incomplete if it doesn't end with common URL endings
                const commonEndings = ['.com', '.org', '.net', '.edu', '.gov', '.io', '.co', '.html', '.htm', '.php', '.asp', '.jsp'];
                const hasValidEnding = commonEndings.some(ending => url.toLowerCase().endsWith(ending));

                if (!hasValidEnding && url.length > 10) {
                    // Escape the URL to prevent auto-linking until complete
                    return content.replace(incompleteUrl, `$1\\${url}`);
                }
            }
        }

        return content;
    }

    /**
     * @deprecated - Replaced by handleStreamingUrls for better URL handling
     */
    preprocessStreamingContent(content) {
        return this.handleStreamingUrls(content);
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
            } else if (this._isDocumentAttachment(attachment)) {
                console.log('MessageRenderer: Rendering document attachment');
                this.renderDocumentAttachment(attachment, messageDiv);
            } else {
                console.log('MessageRenderer: Rendering generic attachment');
                this.renderGenericAttachment(attachment, messageDiv);
            }
        });
    }

    /**
     * Check if attachment is a known document type
     * @private
     */
    _isDocumentAttachment(attachment) {
        const docTypes = ['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'];
        if (attachment.contentType && docTypes.includes(attachment.contentType)) return true;
        if (attachment.name) {
            const ext = attachment.name.split('.').pop().toLowerCase();
            return ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt'].includes(ext);
        }
        return false;
    }

    /**
     * Render adaptive card
     * @param {Object} attachment - Adaptive card attachment
     * @param {HTMLElement} messageDiv - Message div element
     * @private
     */
    renderAdaptiveCard(attachment, messageDiv) {
        try {
            if (typeof AdaptiveCards !== 'undefined' && attachment.content) {
                // Create adaptive card container with preview and expand button
                const cardContainer = DOMUtils.createElement('div', {
                    className: 'adaptive-card-container'
                });

                // Create card preview
                const cardPreview = DOMUtils.createElement('div', {
                    className: 'adaptive-card-preview'
                });

                // Create expand button
                const expandButton = DOMUtils.createElement('button', {
                    className: 'adaptive-card-expand-btn',
                    textContent: 'View Interactive Card',
                    ariaLabel: 'Open adaptive card in modal'
                });

                // Add click handler to open modal
                expandButton.addEventListener('click', () => {
                    this.openAdaptiveCardModal(attachment.content);
                });

                // Create simplified preview content
                const previewContent = this.createAdaptiveCardPreview(attachment.content);
                cardPreview.appendChild(previewContent);
                cardPreview.appendChild(expandButton);

                cardContainer.appendChild(cardPreview);
                messageDiv.appendChild(cardContainer);
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
     * Create adaptive card preview
     * @param {Object} cardContent - Adaptive card content
     * @returns {HTMLElement} Preview element
     * @private
     */
    createAdaptiveCardPreview(cardContent) {
        const preview = DOMUtils.createElement('div', {
            className: 'adaptive-card-preview-content'
        });

        try {
            // Extract basic information from card content for preview
            const title = cardContent.body?.find(item => item.type === 'TextBlock' && item.size === 'Large')?.text ||
                         cardContent.body?.find(item => item.type === 'TextBlock')?.text ||
                         'Adaptive Card';
            
            const subtitle = cardContent.body?.filter(item => item.type === 'TextBlock')
                           .slice(1, 2)[0]?.text || '';

            // Create preview elements
            const titleElement = DOMUtils.createElement('div', {
                className: 'adaptive-card-preview-title',
                textContent: title
            });

            const subtitleElement = DOMUtils.createElement('div', {
                className: 'adaptive-card-preview-subtitle',
                textContent: subtitle
            });

            const actionsCount = cardContent.actions?.length || 0;
            const actionsInfo = DOMUtils.createElement('div', {
                className: 'adaptive-card-preview-info',
                textContent: `${actionsCount} action${actionsCount !== 1 ? 's' : ''} available`
            });

            preview.appendChild(titleElement);
            if (subtitle) preview.appendChild(subtitleElement);
            preview.appendChild(actionsInfo);

        } catch (error) {
            console.error('Error creating card preview:', error);
            preview.textContent = 'Interactive Card Available';
        }

        return preview;
    }

    /**
     * Open adaptive card in modal
     * @param {Object} cardContent - Adaptive card content
     * @private
     */
    /**
     * Open adaptive card modal using the common modal component
     * @param {Object} cardContent - Adaptive card content
     * @private
     */
    async openAdaptiveCardModal(cardContent) {
        try {
            // Initialize the global modal if not done already
            if (!globalAdaptiveCardModal.modal) {
                globalAdaptiveCardModal.init();
            }

            // Configure the modal with MCSChat specific behavior. Card submits are
            // routed through the active agent's connector (DirectLine or D2E) via
            // the application layer — the modal itself stays transport-agnostic.
            globalAdaptiveCardModal.updateOptions({
                onAction: async (action, modal) => {
                    if (action instanceof AdaptiveCards.SubmitAction) {
                        console.log('Adaptive card submitted:', action.data);
                        try {
                            if (window.MCSChatApp && typeof window.MCSChatApp.submitAdaptiveCard === 'function') {
                                await window.MCSChatApp.submitAdaptiveCard(action.data || {});
                            } else {
                                console.warn('[MessageRenderer] submitAdaptiveCard not available on app');
                            }
                        } catch (err) {
                            console.error('[MessageRenderer] Failed to submit Adaptive Card:', err);
                        }
                        // We handled the submit ourselves — stop the modal's default
                        // (legacy DirectLine) send path.
                        return false;
                    }
                    return true; // Continue with default handling for non-submit actions
                },
                onClose: () => {
                    console.log('Adaptive card modal closed');
                }
            });

            // Open the modal with the card content
            await globalAdaptiveCardModal.open(cardContent, {
                title: 'Interactive Card'
            });

        } catch (error) {
            console.error('Error opening adaptive card modal:', error);
            this.showErrorMessage('Failed to display interactive card');
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @private
     */
    showErrorMessage(message) {
        // Use existing error display mechanism if available
        if (window.MCSChatApp && typeof window.MCSChatApp.showErrorMessage === 'function') {
            window.MCSChatApp.showErrorMessage(message);
        } else {
            console.error(message);
            alert(message); // Fallback
        }
    }
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
            const openBtn = DOMUtils.createElement('button', {
                className: 'attachment-link',
                title: 'Preview file'
            }, 'Open');
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showDocumentPreview(attachment.contentUrl, attachment.name || 'Attachment', attachment.contentType);
            });
            attachmentContainer.appendChild(openBtn);
        }

        messageDiv.appendChild(attachmentContainer);
    }

    /**
     * Render document attachment (PDF and other documents) with a styled card
     * @param {Object} attachment - Document attachment
     * @param {HTMLElement} messageDiv - Message div element
     * @private
     */
    renderDocumentAttachment(attachment, messageDiv) {
        const name = attachment.name || 'Document';
        const ext = name.split('.').pop().toLowerCase();

        // SVG file-type icons by extension
        const iconSvg = this._getFileTypeIconSvg(ext);

        // Size info
        const sizeText = attachment._fileSize
            ? Utils.formatBytes(attachment._fileSize)
            : (attachment.contentType || ext.toUpperCase());

        const card = DOMUtils.createElement('div', {
            className: 'document-attachment'
        });

        const iconEl = DOMUtils.createElement('div', {
            className: `document-attachment-icon file-icon-${ext}`
        });
        iconEl.innerHTML = iconSvg;

        const infoEl = DOMUtils.createElement('div', {
            className: 'document-attachment-info'
        });
        infoEl.innerHTML = `
            <span class="document-attachment-name">${Utils.escapeHtml(name)}</span>
            <span class="document-attachment-meta">${Utils.escapeHtml(sizeText)}</span>
        `;

        card.appendChild(iconEl);
        card.appendChild(infoEl);

        if (attachment.contentUrl) {
            const openBtn = DOMUtils.createElement('button', {
                className: 'document-attachment-action',
                title: 'Preview file'
            }, 'Open');
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showDocumentPreview(attachment.contentUrl, name, attachment.contentType);
            });
            card.appendChild(openBtn);
        }

        messageDiv.appendChild(card);
    }

    /**
     * Get SVG icon markup for a file extension
     * @param {string} ext - lowercase file extension
     * @returns {string} SVG markup
     * @private
     */
    _getFileTypeIconSvg(ext) {
        const icons = {
            pdf: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#E5252A"/>
                <path d="M9 20h14M9 24h10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                <text x="16" y="15" text-anchor="middle" fill="#fff" font-size="8" font-weight="700" font-family="Arial">PDF</text>
            </svg>`,
            doc: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#2B579A"/>
                <path d="M9 20h14M9 24h10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                <text x="16" y="15" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" font-family="Arial">DOC</text>
            </svg>`,
            xls: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#217346"/>
                <path d="M9 20h14M9 24h10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                <text x="16" y="15" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" font-family="Arial">XLS</text>
            </svg>`,
            ppt: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#D24726"/>
                <path d="M9 20h14M9 24h10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                <text x="16" y="15" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" font-family="Arial">PPT</text>
            </svg>`,
            txt: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#6B7280"/>
                <path d="M9 12h14M9 16h14M9 20h14M9 24h10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
            </svg>`,
            default: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#9CA3AF"/>
                <path d="M9 14h14M9 18h14M9 22h10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M19 2v7h7" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>`
        };
        // Map variants to canonical keys
        const aliasMap = { docx: 'doc', xlsx: 'xls', pptx: 'ppt' };
        const key = aliasMap[ext] || ext;
        return icons[key] || icons.default;
    }

    /**
     * Render suggested actions
     * @param {Array} actions - Suggested actions array
     */
    renderSuggestedActions(actions) {
        console.log('renderSuggestedActions called with:', actions);

        const position = localStorage.getItem('suggestedActionsPosition') || 'aboveInput';

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

        if (position === 'inline') {
            // Append inside the last bot message's messageContent div
            const chatWindow = this.elements.chatWindow;
            if (chatWindow) {
                const botMessages = chatWindow.querySelectorAll('.messageContainer.botMessage');
                const lastBotMsg = botMessages.length > 0 ? botMessages[botMessages.length - 1] : null;
                const contentDiv = lastBotMsg?.querySelector('.messageContent');
                if (contentDiv) {
                    actionsDiv.classList.add('suggested-actions-inline');
                    const metadata = contentDiv.querySelector('.message-metadata');
                    if (metadata) {
                        contentDiv.insertBefore(actionsDiv, metadata);
                    } else {
                        contentDiv.appendChild(actionsDiv);
                    }
                } else {
                    this.elements.suggestedActionsContainer?.appendChild(actionsDiv);
                }
                this.scrollToBottom();
            }
        } else {
            // Default: above input
            if (!this.elements.suggestedActionsContainer) {
                console.error('suggestedActionsContainer not found!');
                return;
            }
            this.elements.suggestedActionsContainer.appendChild(actionsDiv);
        }

        console.log('Suggested actions rendered successfully (position:', position, ')');
    }

    /**
     * Clear suggested actions
     */
    clearSuggestedActions() {
        if (this.elements.suggestedActionsContainer) {
            this.elements.suggestedActionsContainer.innerHTML = '';
        }
        // Also clear any inline suggested actions in chatWindow
        if (this.elements.chatWindow) {
            this.elements.chatWindow.querySelectorAll('.suggested-actions-inline').forEach(el => el.remove());
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
     * Add response metadata - handles both old structure (user messages) and new structure (bot messages)
     * @param {HTMLElement} messageContainer - Message container element  
     * @param {Object} activity - Activity object that might contain entities/citations
     * @param {number} streamingStartTime - Start time for streaming calculation (optional)
     * @private
     */
    addResponseMetadata(messageContainer, activity = null, streamingStartTime = null) {
        const isUserMessage = activity?.from && activity.from.id === 'user';

        // For user messages, use the old structure (metadata outside message container)
        if (isUserMessage) {
            // Create wrapper for message and metadata (original structure for user messages)
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

            const messageTime = activity?.timestamp ? new Date(activity.timestamp) : new Date();
            const timeSpan = DOMUtils.createElement('span', {
                className: 'metadata-time'
            }, messageTime.toLocaleTimeString());

            metadata.appendChild(timeSpan);

            // Add metadata after the message container
            messageWrapper.appendChild(metadata);
        } else {
            // For bot messages, use the new structure (metadata inside message wrapper)
            const messageWrapper = messageContainer.querySelector('.message-wrapper');
            if (!messageWrapper) {
                console.warn('Message wrapper not found in bot message container');
                return;
            }

            // Create metadata element inside the message wrapper
            const metadata = DOMUtils.createElement('div', {
                className: 'message-metadata'
            });

            // Calculate time spent only for assistant messages
            const messageTime = activity?.timestamp ? new Date(activity.timestamp) : new Date();
            const timeSpent = 'Response time: ' + this.calculateTimeSpent(activity, streamingStartTime);

            const timeSpan = DOMUtils.createElement('span', {
                className: 'metadata-time'
            }, messageTime.toLocaleTimeString());

            const sourceSpan = DOMUtils.createElement('span', {
                className: 'metadata-source'
            }, 'Copilot Studio');

            metadata.appendChild(timeSpan);

            // Show response time for assistant messages
            if (timeSpent) {
                const timeSpentSpan = DOMUtils.createElement('span', {
                    className: 'metadata-duration'
                }, timeSpent);

                metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' · '));
                metadata.appendChild(timeSpentSpan);
            }

            // Show TTFT if available
            if (this.responseTimeTracking.ttft !== null) {
                const ttftSpan = DOMUtils.createElement('span', {
                    className: 'metadata-duration'
                }, `TTFT: ${this.formatDuration(this.responseTimeTracking.ttft)}`);

                metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' · '));
                metadata.appendChild(ttftSpan);

                // Reset TTFT after displaying
                this.responseTimeTracking.ttft = null;
                this.responseTimeTracking.ttftRecorded = false;
            }

            // Add speaker button and progress bar for bot messages
            if (activity) {
                // Add separator before speaker controls
                metadata.appendChild(DOMUtils.createElement('span', { className: 'metadata-separator' }, ' • '));

                // Create speaker controls container
                const speakerControls = DOMUtils.createElement('div', {
                    className: 'speaker-controls'
                });

                // Create progress bar container (initially hidden)
                const progressContainer = DOMUtils.createElement('div', {
                    className: 'speech-progress-container',
                    style: 'display: none;'
                });

                const progressBar = DOMUtils.createElement('div', {
                    className: 'speech-progress-bar'
                });

                const progressFill = DOMUtils.createElement('div', {
                    className: 'speech-progress-fill',
                    style: 'width: 0%;'
                });

                progressBar.appendChild(progressFill);
                progressContainer.appendChild(progressBar);

                // Create enhanced speaker button
                const speakerButton = this.createEnhancedSpeakerButton(activity, progressContainer, progressFill);

                speakerControls.appendChild(speakerButton);
                speakerControls.appendChild(progressContainer);

                metadata.appendChild(speakerControls);
            }

            // Add metadata inside the messageContent div (after text content)
            const messageContentDiv = messageWrapper.querySelector('.messageContent');
            if (messageContentDiv) {
                messageContentDiv.appendChild(metadata);
            } else {
                messageWrapper.appendChild(metadata);
            }
        }

        // Check for entities/citations in the activity - add to message content div
        if (activity && this.hasCitations(activity)) {
            // Find the messageDiv within the messageWrapper and add citations there
            const messageDiv = isUserMessage ? 
                messageContainer.querySelector('.messageContent') : 
                messageContainer.querySelector('.message-wrapper .messageContent');
            if (messageDiv) {
                this.addCitationsSection(messageDiv, activity);
            }
        }
    }

    /**
     * Calculate time spent for assistant response (not applicable for user messages)
     * @param {Object} activity - Activity object
     * @param {number} streamingStartTime - Optional streaming start time
     * @returns {string|null} Formatted time spent or null for user messages
     * @private
     */
    calculateTimeSpent(activity, streamingStartTime = null) {
        // User messages don't have response times since they're manually input
        if (activity.from && activity.from.id === 'user') {
            return null;
        }

        // Record TTFT fallback: if typing event was missed, record at message arrival
        if (this.responseTimeTracking.requestStartTime && !this.responseTimeTracking.ttftRecorded) {
            this.responseTimeTracking.ttft = Date.now() - this.responseTimeTracking.requestStartTime;
            this.responseTimeTracking.ttftRecorded = true;
            console.log(`[MessageRenderer] TTFT (fallback, no typing received): ${this.responseTimeTracking.ttft}ms`);
        }

        // Always prefer global request-to-response timing when available
        if (this.responseTimeTracking.requestStartTime) {
            const duration = Date.now() - this.responseTimeTracking.requestStartTime;

            // Reset tracking for next request
            this.responseTimeTracking.requestStartTime = null;
            this.responseTimeTracking.lastRequestId = null;

            console.log(`[MessageRenderer] Response time: ${duration}ms`);
            return this.formatDuration(duration);
        }

        // Fallback to streaming start time
        if (streamingStartTime) {
            const duration = Date.now() - streamingStartTime;
            console.log(`[MessageRenderer] Streaming response time (fallback): ${duration}ms`);
            return this.formatDuration(duration);
        }

        // Fallback: Use default timing when streaming state isn't available
        console.log(`[MessageRenderer] Using fallback response time`);
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
        this.responseTimeTracking.ttftRecorded = false;
        this.responseTimeTracking.ttft = null;
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
                            toggleButton.textContent = 'Hide Citations';
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
    /**
     * Open side browser with URL — delegates to app citation tab
     * @param {string} url - URL to load
     * @private
     */
    openSideBrowser(url) {
        if (window.MCSChatApp && typeof window.MCSChatApp.openCitationPreview === 'function') {
            console.log('[MessageRenderer] Opening citation in analysis panel tab:', url);
            window.MCSChatApp.openCitationPreview(url);
            return;
        }

        // Fallback: open in new window
        console.warn('[MessageRenderer] openCitationPreview not available, opening externally');
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    /**
     * Setup chat link interception listeners
     * @private
     */
    setupSideBrowserEventListeners() {
        if (this._chatLinkListenerAdded) return;
        this._chatLinkListenerAdded = true;

        // Use event delegation for link interception in chat messages
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link || !link.href) return;

            // Only handle links within chat messages
            const chatWindow = link.closest('#chatWindow, #llmChatWindow, .message-container, .markdown-content, .message-content, .messageContent');
            if (!chatWindow) return;

            // Skip special protocols
            const href = link.href.toLowerCase();
            if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || link.href.startsWith('#')) {
                return;
            }

            try {
                const linkUrl = new URL(link.href);
                const currentUrl = new URL(window.location.href);
                const isExternalLink = linkUrl.hostname !== currentUrl.hostname;
                const isHttpLink = linkUrl.protocol === 'http:' || linkUrl.protocol === 'https:';

                if (isExternalLink && isHttpLink) {
                    const useSideBrowser = localStorage.getItem('enableSideBrowser') === 'true';
                    if (useSideBrowser && window.MCSChatApp && typeof window.MCSChatApp.openCitationPreview === 'function') {
                        e.preventDefault();
                        window.MCSChatApp.openCitationPreview(link.href);
                    }
                }
            } catch (urlError) {
                console.warn('[MessageRenderer] Invalid URL in link:', link.href, urlError);
            }
        });
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
     * Show document preview in an overlay modal.
     * PDFs and images render inline; other types show a fallback with external link.
     * @param {string} url - Document URL (can be blob: URL)
     * @param {string} name - File name
     * @param {string} [contentType] - MIME type
     * @private
     */
    showDocumentPreview(url, name = 'Document', contentType = '') {
        // If "Open attachments in side browser" is enabled, open in analysis panel tab
        const useSideBrowser = localStorage.getItem('openAttachmentsSideBrowser') === 'true';
        if (useSideBrowser && window.MCSChatApp && typeof window.MCSChatApp.openAttachmentInPanel === 'function') {
            window.MCSChatApp.openAttachmentInPanel(url, name, contentType);
            return;
        }

        const modal = DOMUtils.getElementById('documentPreviewModal');
        const title = DOMUtils.getElementById('documentPreviewTitle');
        const body = DOMUtils.getElementById('documentPreviewBody');
        const openExternal = DOMUtils.getElementById('documentPreviewOpenExternal');
        const closeBtn = DOMUtils.getElementById('documentPreviewClose');

        if (!modal || !body) return;

        // Set title
        if (title) title.textContent = name;

        // Set external link
        if (openExternal) {
            openExternal.href = url;
        }

        // Clear previous content
        body.innerHTML = '';

        // Determine preview type
        const ext = name.split('.').pop().toLowerCase();
        const isPdf = contentType === 'application/pdf' || ext === 'pdf';
        const isImage = contentType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

        if (isPdf) {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.title = name;
            body.appendChild(iframe);
        } else if (isImage) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = name;
            body.appendChild(img);
        } else {
            // Fallback for non-previewable types
            const fallback = document.createElement('div');
            fallback.className = 'document-preview-fallback';
            fallback.innerHTML = `
                <div class="fallback-icon">📄</div>
                <p><strong>${Utils.escapeHtml(name)}</strong></p>
                <p>This file type cannot be previewed in the browser.</p>
                <a href="${Utils.escapeHtml(url)}" target="_blank" rel="noopener">Open in New Tab</a>
            `;
            body.appendChild(fallback);
        }

        // Show modal
        DOMUtils.addClass(modal, 'show');

        // Close handlers
        const closeModal = () => {
            DOMUtils.removeClass(modal, 'show');
            body.innerHTML = ''; // Clean up iframe/content
        };

        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        // Click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Add message to queue for sequential rendering
     * @param {Object} activity - Message activity
     * @param {string} renderType - 'complete', 'streaming', or 'simulate'
     */
    queueMessage(activity, renderType = 'complete') {
        const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;

        // Preserve original timestamp or use a sequence number for proper ordering
        if (!activity.timestamp) {
            // Use a sequential timestamp to preserve order for messages without timestamps
            const baseTime = Date.now();
            activity.timestamp = new Date(baseTime - (this.messageQueue.length * 100)).toISOString(); // Ensure earlier processing = earlier timestamp
            console.log(`[MessageRenderer] Assigned sequential timestamp to message ${messageId}: ${activity.timestamp}`);
        }

        const queueItem = {
            messageId,
            activity,
            renderType,
            queueTime: Date.now()
        };

        console.log('Queueing message:', messageId, 'Type:', renderType, 'Timestamp:', activity.timestamp);
        this.messageQueue.push(queueItem);

        // Sort queue by timestamp to ensure proper order (DISABLED during testing)
        // this.messageQueue.sort((a, b) => new Date(a.activity.timestamp) - new Date(b.activity.timestamp));
        
        // For now, process messages in arrival order to maintain sequence
        console.log(`[MessageRenderer] Queue length: ${this.messageQueue.length}, processing in arrival order`);

        // Start processing if not already running
        if (!this.isProcessingQueue) {
            this.processMessageQueue();
        }
    }

    /**
     * Process messages in queue sequentially
     */
    async processMessageQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        console.log('Starting queue processing. Queue length:', this.messageQueue.length);

        const maxProcessingTime = 60000; // 60 seconds max for entire queue
        const startTime = Date.now();

        while (this.messageQueue.length > 0) {
            // Safety check to prevent infinite processing
            if (Date.now() - startTime > maxProcessingTime) {
                console.warn('Queue processing timeout, clearing remaining messages');
                this.messageQueue = [];
                break;
            }

            const queueItem = this.messageQueue.shift();
            const { messageId, activity, renderType } = queueItem;

            console.log('Processing queued message:', messageId, 'Type:', renderType);

            try {
                // Set current streaming message
                this.currentlyStreamingMessageId = messageId;

                // Render based on type - no timeout for individual messages
                // Let streaming complete naturally
                await this.renderQueuedMessage(renderType, activity);

                // For streaming messages, wait for completion but with reasonable timeout
                if (renderType === 'simulate') {
                    const messageLength = activity.text?.length || 0;
                    const estimatedTime = Math.min(messageLength * 10, 30000); // 10ms per char, max 30s

                    const waitPromise = this.waitForStreamingComplete(messageId);
                    const waitTimeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Streaming completion timeout')), estimatedTime)
                    );

                    try {
                        await Promise.race([waitPromise, waitTimeoutPromise]);
                    } catch (timeoutError) {
                        console.warn(`Streaming completion timeout for message ${messageId}, continuing with next message`);
                        this.streamingStates.delete(messageId);
                        this.renderingInProgress.delete(messageId);
                    }
                }

            } catch (error) {
                console.error('Error processing queued message:', messageId, error);
                // Remove from tracking and continue
                this.streamingStates.delete(messageId);
                this.renderingInProgress.delete(messageId);
            }

            // Clear current streaming message
            this.currentlyStreamingMessageId = null;
        }

        this.isProcessingQueue = false;
        console.log('Queue processing completed');
    }

    /**
     * Render a queued message based on type
     * @param {string} renderType - Type of rendering
     * @param {Object} activity - Activity to render
     */
    async renderQueuedMessage(renderType, activity) {
        switch (renderType) {
            case 'streaming':
                await this.handleStreamingMessageDirect(activity);
                break;
            case 'simulate':
                await this.simulateStreamingDirect(activity);
                break;
            case 'complete':
            default:
                await this.renderCompleteMessageDirect(activity);
                break;
        }
    }

    /**
     * Wait for streaming message to complete
     * @param {string} messageId - Message ID to wait for
     */
    async waitForStreamingComplete(messageId) {
        return new Promise((resolve) => {
            const checkComplete = () => {
                if (!this.streamingStates.has(messageId) && !this.renderingInProgress.has(messageId)) {
                    resolve();
                } else {
                    setTimeout(checkComplete, 50); // Check every 50ms
                }
            };
            checkComplete();
        });
    }

    /**
     * Clear streaming state
     * @private
     */
    clearStreamingState() {
        console.log('Clearing all streaming states. Count:', this.streamingStates.size);

        this.streamingStates.forEach((state, messageId) => {
            console.log('Clearing streaming state for message:', messageId);
        });

        this.streamingStates.clear();
        this.renderingInProgress.clear();
    }

    /**
     * Clear message queue and reset processing state
     */
    clearMessageQueue() {
        console.log('Clearing message queue. Pending messages:', this.messageQueue.length);
        this.messageQueue = [];
        this.isProcessingQueue = false;
        this.currentlyStreamingMessageId = null;
        this.clearStreamingState();
    }

    /**
     * Scroll chat window to bottom
     * @private
     */
    scrollToBottom() {
        DOMUtils.scrollToBottom(this.elements.chatWindow);
    }

    /**
     * Clear chat window
     */
    clearMessages() {
        if (this.elements.chatWindow) {
            this.elements.chatWindow.innerHTML = '';
        }
        this.clearSuggestedActions();
        this.clearMessageQueue(); // Clear queue and streaming state
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
