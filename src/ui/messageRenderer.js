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
            lastRequestId: null
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

                // Start speaking the complete content immediately - not connected to streaming
                await aiCompanion.speakText(cleanText, {
                    autoDetectLanguage: true,
                    forceSpeak: false
                });

                console.log(`[Speech] Successfully started speech for message ${messageId}`);
            }
        } catch (error) {
            console.error('[Speech] Error starting speech with complete content:', error);
        }
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
     * @returns {boolean} - True if likely mathematical, false otherwise
     * @private
     */
    isMathematicalExpression(text) {
        const trimmed = text.trim();

        // Mathematical indicators (strong positive signals)
        const mathIndicators = [
            // Mathematical operators
            /[+\-*/=<>≤≥≠≈∞]/,
            // Greek letters (common in math)
            /\\[a-zA-Z]+/,
            // Mathematical functions
            /\\(sin|cos|tan|log|ln|exp|sqrt|sum|int|lim|frac|binom)/,
            // Superscripts/subscripts
            /[\^_]/,
            // Mathematical symbols and structures
            /[{}()[\]]/,
            // Fractions
            /\//,
            // Mathematical relations with variables
            /[a-zA-Z]\s*[=<>≤≥≠≈]\s*[a-zA-Z0-9]/,
            // Variables with operators
            /[a-zA-Z]\s*[+\-*/]\s*[a-zA-Z0-9]/
        ];

        // Non-mathematical patterns (strong negative signals)
        const nonMathPatterns = [
            // Pure currency patterns
            /^\d+(\.\d+)?\s*[a-zA-Z]{1,3}$/,  // $3bn, $4.1bn, $38m
            // Numbers with common units
            /^\d+(\.\d+)?\s*(bn|million|billion|trillion|thousand|k|m|b|t)$/i,
            // Percentages
            /^\d+(\.\d+)?%$/,
            // Pure numbers
            /^\d+(\.\d+)?$/,
            // Simple words
            /^[a-zA-Z]+$/,
            // Time/date patterns
            /^\d{1,2}:\d{2}$/,
            /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
            // Common abbreviations and units
            /^\d+\s*(kg|lb|ft|in|cm|mm|mph|km\/h|°[CF]?)$/i
        ];

        // Context analysis weights
        let mathScore = 0;
        let nonMathScore = 0;

        // Check for mathematical indicators
        for (const pattern of mathIndicators) {
            if (pattern.test(trimmed)) {
                mathScore += 1;
            }
        }

        // Check for non-mathematical patterns
        for (const pattern of nonMathPatterns) {
            if (pattern.test(trimmed)) {
                nonMathScore += 2; // Higher weight for non-math patterns
            }
        }

        // Additional contextual analysis

        // If it's very short and alphanumeric only, likely not math
        if (trimmed.length <= 5 && /^[a-zA-Z0-9]+$/.test(trimmed)) {
            nonMathScore += 1;
        }

        // If it contains multiple consecutive letters without operators, likely text
        if (/[a-zA-Z]{3,}/.test(trimmed) && !/[+\-*/=^_{}\\]/.test(trimmed)) {
            nonMathScore += 1;
        }

        // If it starts with a digit and ends with letters (like currency), likely not math
        if (/^\d/.test(trimmed) && /[a-zA-Z]$/.test(trimmed)) {
            nonMathScore += 1;
        }

        // Mathematical expressions usually have structure
        if (mathScore > 0 && /[a-zA-Z]/.test(trimmed)) {
            mathScore += 0.5; // Bonus for having variables
        }

        // Decision logic: require clear mathematical intent
        return mathScore > nonMathScore && mathScore > 0;
    }

    /**
     * Process LaTeX math expressions in content
     * @param {string} content - Content that may contain LaTeX
     * @returns {string} - Content with LaTeX rendered as HTML
     * @private
     */
    processLatex(content) {
        if (typeof katex === 'undefined') {
            return content; // Return original content if KaTeX is not available
        }

        try {
            // Process display math first: $$...$$
            content = content.replace(/\$\$([^$]+?)\$\$/g, (match, math) => {
                try {
                    return katex.renderToString(math.trim(), {
                        displayMode: true,
                        throwOnError: false,
                        errorColor: '#cc0000'
                    });
                } catch (error) {
                    console.warn('KaTeX display math error:', error.message, 'for:', math);
                    return match; // Return original if rendering fails
                }
            });

            // Process inline math: $...$ with semantic analysis
            content = content.replace(/\$([^$\n]+?)\$/g, (match, math) => {
                const trimmed = math.trim();

                // Use comprehensive semantic analysis
                if (!this.isMathematicalExpression(trimmed)) {
                    return match; // Return original if not mathematical
                }

                try {
                    return katex.renderToString(trimmed, {
                        displayMode: false,
                        throwOnError: false,
                        errorColor: '#cc0000'
                    });
                } catch (error) {
                    console.warn('KaTeX inline math error:', error.message, 'for:', math);
                    return match; // Return original if rendering fails
                }
            });

            // Process LaTeX environments: \begin{...}\end{...}
            content = content.replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match, env, math) => {
                try {
                    const latexCode = `\\begin{${env}}${math}\\end{${env}}`;
                    return katex.renderToString(latexCode, {
                        displayMode: true,
                        throwOnError: false,
                        errorColor: '#cc0000'
                    });
                } catch (error) {
                    console.warn('KaTeX environment error:', error.message, 'for:', env);
                    return match; // Return original if rendering fails
                }
            });

        } catch (error) {
            console.error('Error processing LaTeX:', error);
        }

        return content;
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

            // *** Start speech immediately with complete content if this is an agent message ***
            if (!isUserMessage && activity.text && this.streamingSpeechState.isEnabled) {
                console.log(`[Speech] Starting speech immediately for complete message (${activity.text.length} chars)`);
                this.startSpeechWithCompleteContent(activity.text, messageId);
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
                    // User messages: content first, then icon (icon on right)
                    messageContainer.appendChild(messageDiv);
                    if (messageIcon) {
                        messageContainer.appendChild(messageIcon);
                    }
                } else if (isCompanionResponse) {
                    // Companion responses: icon first, then content (with AI companion icon)
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
                    messageContainer.appendChild(messageDiv);
                } else {
                    // Regular bot messages: icon first, then content (icon on left)
                    if (messageIcon) {
                        messageContainer.appendChild(messageIcon);
                    }

                    // Create a content wrapper for message content only
                    const contentWrapper = DOMUtils.createElement('div', {
                        className: 'message-content-wrapper',
                        style: 'display: flex; align-items: flex-start; flex: 1;'
                    });

                    contentWrapper.appendChild(messageDiv);

                    messageContainer.appendChild(contentWrapper);
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
            if (isUserMessage) {
                console.log('[MessageRenderer] Stopping ongoing speech due to user message in streaming');
            }
            await this.stopStreamingSpeech();

            // Create new streaming state for this message
            streamingState = {
                startTime: Date.now(),
                messageContainer: this.createMessageContainer(activity),
                messageDiv: this.createMessageDiv(activity),
                content: '',
                isStreaming: true,
                lastUpdate: Date.now()
            };

            const isUser = activity.from && activity.from.id === 'user';
            const messageIconsEnabled = localStorage.getItem('messageIconsEnabled') !== 'false';
            const messageIcon = messageIconsEnabled ? this.createMessageIcon(isUser) : null;

            // Add elements in correct order based on message type
            const isCompanionResponse = streamingState.messageContainer.classList.contains('companion-response');

            if (isUser) {
                // User messages: content first, then icon (icon on right)
                streamingState.messageContainer.appendChild(streamingState.messageDiv);
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }
            } else if (isCompanionResponse) {
                // Companion responses: icon first, then content (with AI companion icon)
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
                streamingState.messageContainer.appendChild(streamingState.messageDiv);
            } else {
                // Regular bot messages: icon first, then content (icon on left)
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }

                // Create a content wrapper for message content only
                const contentWrapper = DOMUtils.createElement('div', {
                    className: 'message-content-wrapper',
                    style: 'display: flex; align-items: flex-start; flex: 1;'
                });

                contentWrapper.appendChild(streamingState.messageDiv);

                streamingState.messageContainer.appendChild(contentWrapper);
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
    finalizeStreamingMessage(activity) {
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

            // No speech processing here - speech is handled separately at the beginning
            console.log(`[Streaming] Finalized streaming for message ${messageId} (speech handled separately)`);

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

            // *** STEP 1: Stop speech if user message, or start speech if agent message ***
            const isUserMessage = activity.from && activity.from.id === 'user';
            if (isUserMessage) {
                console.log('[MessageRenderer] Stopping ongoing speech due to user message in simulated streaming');
                await this.stopStreamingSpeech();
            } else if (activity.text && this.streamingSpeechState.isEnabled) {
                console.log(`[Speech] Starting speech immediately with complete content (${activity.text.length} chars)`);
                // Start speech with complete content immediately - separate from streaming
                this.startSpeechWithCompleteContent(activity.text, messageId);
            }

            // *** STEP 2: Start streaming display with the same complete content ***
            console.log(`[Streaming] Starting streaming display with complete content (${activity.text.length} chars)`);

            // Create isolated streaming state for this message
            const streamingState = {
                startTime: Date.now(),
                messageContainer: this.createMessageContainer(activity),
                messageDiv: this.createMessageDiv(activity),
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
                streamingState.messageContainer.appendChild(streamingState.messageDiv);
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }
            } else if (isCompanionResponse) {
                // Companion responses: icon first, then content (with AI companion icon)
                if (messageIcon) {
                    // Set AI companion icon for companion responses
                    messageIcon.style.backgroundImage = '';
                    messageIcon.setAttribute('data-icon', 'aiCompanion');
                    streamingState.messageContainer.appendChild(messageIcon);
                    // Initialize icon after setting data-icon
                    this.initializeMessageIcon(messageIcon);
                }
                streamingState.messageContainer.appendChild(streamingState.messageDiv);
            } else {
                if (messageIcon) {
                    streamingState.messageContainer.appendChild(messageIcon);
                }

                // Create a content wrapper for message content only
                const contentWrapper = DOMUtils.createElement('div', {
                    className: 'message-content-wrapper',
                    style: 'display: flex; align-items: flex-start; flex: 1;'
                });

                contentWrapper.appendChild(streamingState.messageDiv);

                streamingState.messageContainer.appendChild(contentWrapper);
            }

            // Insert at end to avoid reordering flicker
            this.elements.chatWindow.appendChild(streamingState.messageContainer);

            console.log('Streaming container created, starting character-by-character simulation');

            // Stream text character by character with improved timing
            const text = activity.text;
            let currentText = '';

            for (let i = 0; i < text.length; i++) {
                // Check if streaming was interrupted or queue processing stopped
                if (!this.streamingStates.has(messageId) || this.currentlyStreamingMessageId !== messageId) {
                    console.log('Streaming interrupted for message:', messageId);
                    break;
                }

                currentText += text[i];
                this.updateStreamingContent(streamingState.messageDiv, currentText);
                streamingState.content = currentText;
                streamingState.lastUpdate = Date.now();

                this.scrollToBottom();

                // Improved timing: faster overall to prevent timeouts
                const char = text[i];
                let delay;
                if (char === ' ') {
                    delay = 8; // Faster spaces
                } else if (char === '\n') {
                    delay = 20; // Faster line breaks
                } else if (/[.!?]/.test(char)) {
                    delay = 50; // Shorter sentence pauses
                } else {
                    delay = Math.random() * 3 + 1; // 1-4ms per character (faster)
                }

                await Utils.sleep(delay);
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
                    const iconSvgElement = window.Icon.create(iconName, { color: '#333', size: '28px' });
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

        // Process LaTeX math expressions first (before markdown)
        const latexProcessedText = this.processLatex(text);

        // Process markdown if available - exactly like legacy
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(latexProcessedText) :
                    marked(latexProcessedText);
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
                // For fallback, still ensure paragraph structure and LaTeX
                const paragraphText = this.ensureParagraphStructure(latexProcessedText, messageDiv, true);
                messageDiv.innerHTML = paragraphText;
            }
        } else {
            console.warn('Markdown libraries not available:', {
                marked: typeof marked,
                DOMPurify: typeof DOMPurify
            });
            // Even without markdown, ensure paragraph structure and process LaTeX
            const paragraphText = this.ensureParagraphStructure(latexProcessedText, messageDiv, true);
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
        // Handle URLs and markdown links specially during streaming
        const processedContent = this.handleStreamingUrls(content);

        // Process LaTeX math expressions first (before markdown)
        const latexProcessedContent = this.processLatex(processedContent);

        // Process markdown if available - removed typing cursor
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            try {
                // Check if marked.parse exists (v4+) or use marked() (v3 and below)
                const htmlContent = typeof marked.parse === 'function' ?
                    marked.parse(latexProcessedContent) :
                    marked(latexProcessedContent);
                const sanitizedContent = DOMPurify.sanitize(htmlContent);

                // Enhance inline references during streaming like in complete messages
                const enhancedContent = this.enhanceInlineReferences(sanitizedContent);

                // Ensure agent messages have proper paragraph structure during streaming
                const finalContent = this.ensureParagraphStructure(enhancedContent, messageDiv);
                messageDiv.innerHTML = finalContent;
            } catch (error) {
                console.warn('Error processing streaming markdown:', error);
                // For fallback, still ensure paragraph structure and process LaTeX
                const paragraphContent = this.ensureParagraphStructure(latexProcessedContent, messageDiv, true);
                messageDiv.innerHTML = paragraphContent;
            }
        } else {
            // Even without markdown, ensure paragraph structure and process LaTeX
            const paragraphContent = this.ensureParagraphStructure(latexProcessedContent, messageDiv, true);
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
     * @param {number} streamingStartTime - Start time for streaming calculation (optional)
     * @private
     */
    addResponseMetadata(messageContainer, activity = null, streamingStartTime = null) {
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
        const timeSpent = isUserMessage ? null : 'Response time: ' + this.calculateTimeSpent(activity, streamingStartTime);

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

        // Add speaker button and progress bar for non-user messages
        if (!isUserMessage && activity) {
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
     * @param {number} streamingStartTime - Optional streaming start time
     * @returns {string|null} Formatted time spent or null for user messages
     * @private
     */
    calculateTimeSpent(activity, streamingStartTime = null) {
        // User messages don't have response times since they're manually input
        if (activity.from && activity.from.id === 'user') {
            return null;
        }

        // Use streaming start time if provided (for streaming messages)
        if (streamingStartTime) {
            const duration = Date.now() - streamingStartTime;
            console.log(`[MessageRenderer] Streaming response time: ${duration}ms`);
            return this.formatDuration(duration);
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
            DOMUtils.addEventListener(closeSideBrowser, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SideBrowser] Close button clicked directly');
                this.closeSideBrowser();
            });
            closeSideBrowser.dataset.listenerAdded = 'true';
        }

        if (openExternalBtn && !openExternalBtn.dataset.listenerAdded) {
            console.log('[SideBrowser] Adding direct external button listener');
            DOMUtils.addEventListener(openExternalBtn, 'click', (e) => {
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
     * Add message to queue for sequential rendering
     * @param {Object} activity - Message activity
     * @param {string} renderType - 'complete', 'streaming', or 'simulate'
     */
    queueMessage(activity, renderType = 'complete') {
        const messageId = activity.id || `${activity.from?.id}-${activity.timestamp}-${Date.now()}`;

        // Add timestamp for proper ordering if not present
        if (!activity.timestamp) {
            activity.timestamp = new Date().toISOString();
        }

        const queueItem = {
            messageId,
            activity,
            renderType,
            queueTime: Date.now()
        };

        console.log('Queueing message:', messageId, 'Type:', renderType);
        this.messageQueue.push(queueItem);

        // Sort queue by timestamp to ensure proper order
        this.messageQueue.sort((a, b) => new Date(a.activity.timestamp) - new Date(b.activity.timestamp));

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
