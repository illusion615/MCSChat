/**
 * Enhanced Typing Indicator with Dynamic Status Messages
 * Provides intelligent, context-aware waiting experience during AI response delays
 */

import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';

export class EnhancedTypingIndicator {
    constructor() {
        this.startTime = null;
        this.currentPhase = 'IMMEDIATE';
        this.statusText = '';
        this.element = null;
        this.statusInterval = null;
        this.context = {};
        this.progressInterval = null;
        this.currentProgress = 0;

        // Cache for efficient LLM-style analysis
        this.analysisCache = {
            lastAnalysisTime: 0,
            lastMessageHash: '',
            cachedContext: null,
            cacheValidityMs: 2000 // Cache analysis for 2 seconds
        };

        // Track recent messages to avoid repetition
        this.recentMessages = [];

        // Configuration - Optimized for responsive feel
        this.config = {
            enableDetailedStatus: localStorage.getItem('enableDetailedWaitingStatus') !== 'false',
            showProgressBar: localStorage.getItem('showWaitingProgressBar') !== 'false',
            statusUpdateInterval: 800, // Much faster updates (was 2000ms)
            maxWaitTimeDisplay: 120000, // 2 minutes max display
            verbosity: localStorage.getItem('waitingStatusVerbosity') || 'medium',
            rushMode: localStorage.getItem('rushModeWaiting') === 'true', // For impatient users
            enableSmartAnalysis: true, // New: Enable LLM-style analysis
            analysisEfficiencyMode: true // New: Optimize analysis for speed
        };

        // Rush mode adjustments
        if (this.config.rushMode) {
            this.config.statusUpdateInterval = 400; // Even faster updates
        }

        // Status phase timing (in milliseconds) - More responsive for impatient users
        // Base timing with some randomness to feel more natural
        const timingVariation = () => Math.random() * 0.3 + 0.85; // ±15% variation

        this.phases = {
            IMMEDIATE: 0,      // 0-1.5 seconds (faster immediate response)
            PROCESSING: Math.floor(1500 * timingVariation()),  // 1.3-1.7 seconds variance
            THINKING: Math.floor(5000 * timingVariation()),    // 4.2-5.8 seconds variance  
            COMPLEX: Math.floor(15000 * timingVariation()),    // 12.8-17.3 seconds variance
            EXTENDED: Math.floor(35000 * timingVariation())    // 29.8-40.3 seconds variance
        };

        // Rush mode - even faster transitions for impatient users
        if (this.config.rushMode) {
            this.phases = {
                IMMEDIATE: 0,      // 0-0.8 seconds
                PROCESSING: Math.floor(800 * timingVariation()),   // 0.7-0.9 seconds variance
                THINKING: Math.floor(3000 * timingVariation()),    // 2.5-3.5 seconds variance
                COMPLEX: Math.floor(8000 * timingVariation()),     // 6.8-9.2 seconds variance
                EXTENDED: Math.floor(20000 * timingVariation())    // 17-23 seconds variance
            };
        }

        this.initializeMessageSets();
    }

    /**
     * Initialize all message sets for different contexts and phases
     */
    initializeMessageSets() {
        this.messageSets = {
            general: {
                IMMEDIATE: [
                    "Processing your request...",
                    "Getting ready to help...",
                    "Analyzing your message...",
                    "Starting to work on this...",
                    "Preparing response..."
                ],
                PROCESSING: [
                    "Working on your request...",
                    "Processing information...",
                    "Analyzing the details...",
                    "Gathering relevant data...",
                    "Organizing response...",
                    "Putting together information...",
                    "Reviewing your question...",
                    "Structuring my answer..."
                ],
                THINKING: [
                    "Thinking through this...",
                    "Considering different angles...",
                    "Working through the logic...",
                    "Evaluating the best approach...",
                    "Processing multiple factors...",
                    "Connecting relevant concepts...",
                    "Analyzing various aspects...",
                    "Weighing different options...",
                    "Developing comprehensive answer...",
                    "Ensuring accuracy and clarity...",
                    "Almost ready with response..."
                ],
                COMPLEX: [
                    "This requires careful consideration...",
                    "Working on detailed analysis...",
                    "Processing complex information...",
                    "Ensuring comprehensive coverage...",
                    "Analyzing multiple dimensions...",
                    "Taking time for thorough response...",
                    "Working through intricate details...",
                    "Considering all implications...",
                    "Developing nuanced explanation..."
                ],
                EXTENDED: [
                    "Still working on this complex topic...",
                    "Taking extra time for accuracy...",
                    "Processing extensive information...",
                    "Ensuring quality response...",
                    "Almost ready with detailed answer...",
                    "Finalizing comprehensive analysis...",
                    "Worth the wait for thoroughness...",
                    "Just a bit more time needed..."
                ]
            },

            code: {
                IMMEDIATE: [
                    "Analyzing code structure...",
                    "Parsing syntax elements...",
                    "Preparing code review...",
                    "Initializing code analysis...",
                    "Loading programming context..."
                ],
                PROCESSING: [
                    "Examining code patterns...",
                    "Checking syntax and logic...",
                    "Analyzing implementation...",
                    "Reviewing code structure...",
                    "Processing programming logic...",
                    "Evaluating code quality...",
                    "Understanding requirements...",
                    "Tracing execution flow..."
                ],
                THINKING: [
                    "Working through code logic...",
                    "Analyzing algorithm efficiency...",
                    "Considering edge cases...",
                    "Evaluating best practices...",
                    "Thinking about optimization...",
                    "Reviewing architectural decisions...",
                    "Checking for potential bugs...",
                    "Considering alternative approaches...",
                    "Analyzing code dependencies...",
                    "Ensuring maintainability...",
                    "Validating implementation strategy..."
                ],
                COMPLEX: [
                    "This code requires deep analysis...",
                    "Working through complex algorithms...",
                    "Analyzing intricate code relationships...",
                    "Evaluating system architecture...",
                    "Processing complex programming concepts...",
                    "Ensuring comprehensive code review...",
                    "Analyzing performance implications...",
                    "Working through technical complexity...",
                    "Examining scalability considerations..."
                ],
                EXTENDED: [
                    "This is quite a complex codebase...",
                    "Working on comprehensive code analysis...",
                    "Processing extensive programming logic...",
                    "Ensuring thorough technical review...",
                    "Almost ready with detailed code insights...",
                    "Finalizing technical recommendations...",
                    "Complex code deserves careful analysis...",
                    "Nearly finished with code evaluation..."
                ]
            },

            research: {
                IMMEDIATE: [
                    "Starting research task...",
                    "Accessing knowledge base...",
                    "Beginning information search..."
                ],
                PROCESSING: [
                    "Researching your topic...",
                    "Gathering factual information...",
                    "Consulting knowledge sources..."
                ],
                THINKING: [
                    "Cross-referencing multiple sources...",
                    "Verifying factual accuracy...",
                    "Analyzing research findings...",
                    "Synthesizing information...",
                    "Organizing comprehensive answer..."
                ],
                COMPLEX: [
                    "Conducting thorough research analysis...",
                    "Comparing multiple research perspectives...",
                    "Validating information accuracy...",
                    "Preparing evidence-based response...",
                    "Synthesizing complex research data..."
                ],
                EXTENDED: [
                    "Performing comprehensive research review...",
                    "This research is quite extensive...",
                    "Analyzing multiple research sources...",
                    "Preparing detailed research summary...",
                    "Almost ready with research findings..."
                ]
            },

            creative: {
                IMMEDIATE: [
                    "Sparking creative process...",
                    "Engaging imagination mode...",
                    "Preparing creative flow..."
                ],
                PROCESSING: [
                    "Generating creative ideas...",
                    "Crafting original content...",
                    "Exploring creative possibilities..."
                ],
                THINKING: [
                    "Developing creative concepts...",
                    "Exploring different creative approaches...",
                    "Refining creative expression...",
                    "Generating original content...",
                    "Polishing creative ideas..."
                ],
                COMPLEX: [
                    "Working on comprehensive creative piece...",
                    "Developing detailed creative content...",
                    "Exploring multiple creative directions...",
                    "Crafting engaging narrative...",
                    "Refining creative expression..."
                ],
                EXTENDED: [
                    "Creating comprehensive creative work...",
                    "This creative piece is quite detailed...",
                    "Developing rich creative content...",
                    "Almost finished with creative work...",
                    "Putting final touches on creation..."
                ]
            },

            complex: {
                IMMEDIATE: [
                    "Activating advanced processing...",
                    "Preparing deep analysis...",
                    "Engaging complex reasoning..."
                ],
                PROCESSING: [
                    "Conducting detailed analysis...",
                    "Processing complex requirements...",
                    "Breaking down multi-faceted query..."
                ],
                THINKING: [
                    "Working through complex problem...",
                    "Analyzing interconnected concepts...",
                    "Processing multifaceted information...",
                    "Evaluating different approaches...",
                    "Synthesizing complex solution..."
                ],
                COMPLEX: [
                    "This is quite a complex question...",
                    "Working on comprehensive analysis...",
                    "Processing multiple layers of information...",
                    "Developing thorough explanation...",
                    "Ensuring all aspects are covered..."
                ],
                EXTENDED: [
                    "This complex analysis is taking time...",
                    "Working on very detailed response...",
                    "Processing extensive information...",
                    "Almost ready with comprehensive answer...",
                    "Finalizing complex analysis..."
                ]
            },

            conversational: {
                IMMEDIATE: [
                    "Getting ready to chat...",
                    "Processing your message...",
                    "Thinking about your question..."
                ],
                PROCESSING: [
                    "Considering how to respond...",
                    "Putting together thoughts...",
                    "Working on a helpful answer...",
                    "Organizing my response...",
                    "Preparing to help you..."
                ],
                THINKING: [
                    "Let me think about this...",
                    "Considering the best way to help...",
                    "Working on a clear explanation...",
                    "Thinking through your question...",
                    "Almost ready with an answer...",
                    "Formulating a helpful response...",
                    "Just need a moment to think..."
                ],
                COMPLEX: [
                    "This is an interesting question...",
                    "Taking a moment to give you a good answer...",
                    "Want to make sure I'm helpful here...",
                    "Working on the best response...",
                    "Thinking this through carefully..."
                ],
                EXTENDED: [
                    "Still working on this for you...",
                    "Want to give you a thorough answer...",
                    "Almost have a good response ready...",
                    "Taking time to be comprehensive...",
                    "Nearly finished thinking this through..."
                ]
            }
        };
    }

    /**
     * Show the enhanced typing indicator
     * @param {Object} context - Context information about the request
     */
    show(context = {}) {
        this.startTime = Date.now();
        this.context = context;
        this.currentPhase = 'IMMEDIATE';
        this.currentProgress = 0;

        // Remove any existing indicator
        this.hide();

        // Create and show the indicator
        this.createElement();
        this.startStatusProgression();
        this.startProgressSimulation();

        console.log('[EnhancedTypingIndicator] Shown with context:', context);
    }

    /**
     * Hide the enhanced typing indicator
     */
    hide() {
        // Immediately clear all intervals
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }

        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        // Immediately hide the element if it exists
        if (this.element) {
            // Set opacity to 0 and display to none for immediate hiding
            this.element.style.opacity = '0';
            this.element.style.display = 'none';

            // Clean up the element reference immediately
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }

        // Reset state
        this.startTime = null;
        this.currentPhase = 'IMMEDIATE';
        this.currentProgress = 0;

        console.log('[EnhancedTypingIndicator] Hidden immediately');
    }

    /**
     * Create and return the enhanced typing indicator element
     * @param {Object} context - Context for the typing indicator
     * @returns {HTMLElement} The created indicator element
     */
    createIndicator(context = {}) {
        this.context = context;
        this.startTime = Date.now();
        this.currentPhase = 'IMMEDIATE';
        this.currentProgress = 0;

        // Create main container
        const container = DOMUtils.createElement('div', {
            className: 'enhanced-typing-indicator'
        });

        // Create dots container
        const dotsContainer = DOMUtils.createElement('div', {
            className: 'typing-dots-container'
        });

        // Create the three dots for typing animation
        for (let i = 0; i < 3; i++) {
            const dot = DOMUtils.createElement('span', {
                className: 'typing-dot'
            });
            dotsContainer.appendChild(dot);
        }

        // Create status area for dynamic messages
        const statusArea = DOMUtils.createElement('div', {
            className: 'typing-status-area'
        });

        // Create progress bar if enabled
        let progressBar = null;
        if (this.config.showProgressBar) {
            progressBar = DOMUtils.createElement('div', {
                className: 'typing-progress-bar'
            });

            const progressFill = DOMUtils.createElement('div', {
                className: 'typing-progress-fill'
            });

            progressBar.appendChild(progressFill);
        }

        // Assemble container
        container.appendChild(dotsContainer);
        container.appendChild(statusArea);
        if (progressBar) {
            container.appendChild(progressBar);
        }

        // Store element reference and start progression
        this.element = container;
        this.startStatusProgression();
        this.startProgressSimulation();

        return container;
    }

    /**
     * Create the enhanced typing indicator element (internal method)
     */
    createElement() {
        const chatWindow = DOMUtils.getElementById('chatWindow') || DOMUtils.getElementById('llmChatWindow');
        if (!chatWindow) return;

        // Create main container
        const container = DOMUtils.createElement('div', {
            className: 'messageContainer botMessage enhanced-typing-indicator',
            id: 'enhancedTypingIndicator'
        });

        // Create message icon
        const messageIcon = DOMUtils.createElement('div', {
            className: 'messageIcon'
        });
        messageIcon.style.backgroundImage = 'url("images/copilotstudio-icon.webp")';

        // Create content area
        const contentArea = DOMUtils.createElement('div', {
            className: 'enhanced-typing-content'
        });

        // Create main typing area with dots
        const mainArea = DOMUtils.createElement('div', {
            className: 'typing-main-area'
        });

        const dotsContainer = DOMUtils.createElement('div', {
            className: 'typingIndicator enhanced-dots'
        });

        // Create animated dots
        for (let i = 0; i < 3; i++) {
            const dot = DOMUtils.createElement('span');
            dotsContainer.appendChild(dot);
        }

        mainArea.appendChild(dotsContainer);

        // Create status text area (initially hidden)
        const statusArea = DOMUtils.createElement('div', {
            className: 'typing-status-area'
        });

        // Create progress bar (if enabled)
        let progressArea = null;
        if (this.config.showProgressBar) {
            progressArea = DOMUtils.createElement('div', {
                className: 'typing-progress-container'
            });

            const progressBar = DOMUtils.createElement('div', {
                className: 'typing-progress-bar'
            });

            const progressFill = DOMUtils.createElement('div', {
                className: 'typing-progress-fill'
            });

            progressBar.appendChild(progressFill);
            progressArea.appendChild(progressBar);
        }

        // Assemble the content
        contentArea.appendChild(mainArea);
        if (this.config.enableDetailedStatus) {
            contentArea.appendChild(statusArea);
        }
        if (progressArea) {
            contentArea.appendChild(progressArea);
        }

        // Assemble the container
        container.appendChild(messageIcon);
        container.appendChild(contentArea);

        // Add to chat window
        chatWindow.appendChild(container);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        this.element = container;

        // Safety timeout
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                console.log('[EnhancedTypingIndicator] Auto-removing after 2 minutes');
                this.hide();
            }
        }, this.config.maxWaitTimeDisplay);
    }

    /**
     * Start the status progression based on elapsed time
     */
    startStatusProgression() {
        if (!this.config.enableDetailedStatus) return;

        // Show immediate status right away
        this.updateStatusDisplay();

        this.statusInterval = setInterval(() => {
            if (!this.element || !this.element.parentNode) {
                clearInterval(this.statusInterval);
                return;
            }

            const elapsed = Date.now() - this.startTime;
            const newPhase = this.determinePhase(elapsed);

            if (newPhase !== this.currentPhase) {
                this.currentPhase = newPhase;
                this.updateStatusDisplay();
            }
        }, this.config.statusUpdateInterval);
    }

    /**
     * Start progress bar simulation
     */
    startProgressSimulation() {
        if (!this.config.showProgressBar) return;

        this.progressInterval = setInterval(() => {
            if (!this.element || !this.element.parentNode) {
                clearInterval(this.progressInterval);
                return;
            }

            const elapsed = Date.now() - this.startTime;
            this.updateProgress(elapsed);
        }, 100); // Much faster updates (was 500ms)
    }

    /**
     * Determine current phase based on elapsed time
     */
    determinePhase(elapsed) {
        if (elapsed >= this.phases.EXTENDED) return 'EXTENDED';
        if (elapsed >= this.phases.COMPLEX) return 'COMPLEX';
        if (elapsed >= this.phases.THINKING) return 'THINKING';
        if (elapsed >= this.phases.PROCESSING) return 'PROCESSING';
        return 'IMMEDIATE';
    }

    /**
     * Update the status display with phase-appropriate message
     */
    updateStatusDisplay() {
        if (!this.config.enableDetailedStatus || this.currentPhase === 'IMMEDIATE') return;

        const statusArea = this.element?.querySelector('.typing-status-area');
        if (!statusArea) return;

        const message = this.getStatusMessage();

        // Smooth transition
        statusArea.style.opacity = '0';
        setTimeout(() => {
            statusArea.textContent = message;
            statusArea.className = `typing-status-area phase-${this.currentPhase.toLowerCase()} visible`;
            statusArea.style.opacity = '1';
        }, 150);

        console.log(`[EnhancedTypingIndicator] Status: ${this.currentPhase} - ${message}`);
    }

    /**
     * Get appropriate status message based on context and phase
     */
    getStatusMessage() {
        const contextType = this.detectContextType();
        const conversationContext = this.analyzeConversationHistory();
        const messages = this.messageSets[contextType]?.[this.currentPhase] ||
            this.messageSets.general[this.currentPhase];

        if (!messages || messages.length === 0) {
            return "Processing...";
        }

        // Generate smart contextual messages using LLM-style analysis
        const dynamicMessages = this.generateContextualMessages(contextType, conversationContext);

        // Create weighted message pool for more natural selection
        const weightedMessages = this.createWeightedMessagePool(messages, dynamicMessages, conversationContext);

        // Use intelligent selection algorithm
        return this.selectOptimalMessage(weightedMessages, conversationContext);
    }

    /**
     * Create a weighted pool of messages based on relevance and naturalness
     */
    createWeightedMessagePool(staticMessages, dynamicMessages, conversationContext) {
        const pool = [];

        // Add static messages with base weight
        staticMessages.forEach(msg => {
            pool.push({ message: msg, weight: 1.0, source: 'static' });
        });

        // Add dynamic messages with higher weight (more natural and contextual)
        dynamicMessages.forEach(msg => {
            pool.push({ message: msg, weight: 1.5, source: 'dynamic' });
        });

        // Boost weights based on conversation characteristics
        pool.forEach(item => {
            // Boost urgent tone messages
            if (conversationContext.conversationTone === 'urgent' &&
                (item.message.includes('quick') || item.message.includes('efficient'))) {
                item.weight *= 1.3;
            }

            // Boost polite tone messages
            if (conversationContext.conversationTone === 'polite' &&
                (item.message.includes('care') || item.message.includes('ensure'))) {
                item.weight *= 1.2;
            }

            // Boost topic-relevant messages
            if (conversationContext.recentTopics.length > 0) {
                const topic = conversationContext.recentTopics[0];
                if (item.message.toLowerCase().includes(topic.toLowerCase())) {
                    item.weight *= 1.4;
                }
            }
        });

        return pool;
    }

    /**
     * Select optimal message using weighted random selection with anti-repetition
     */
    selectOptimalMessage(weightedPool, conversationContext) {
        if (weightedPool.length === 0) return "Processing...";

        // Avoid recently used messages to prevent repetition
        if (!this.recentMessages) this.recentMessages = [];

        // Filter out recently used messages
        const availableMessages = weightedPool.filter(item =>
            !this.recentMessages.includes(item.message)
        );

        // If all messages were recently used, reset and use full pool
        const finalPool = availableMessages.length > 0 ? availableMessages : weightedPool;

        // Calculate total weight
        const totalWeight = finalPool.reduce((sum, item) => sum + item.weight, 0);

        // Weighted random selection
        let randomValue = Math.random() * totalWeight;
        let selectedMessage = finalPool[0].message;

        for (const item of finalPool) {
            randomValue -= item.weight;
            if (randomValue <= 0) {
                selectedMessage = item.message;
                break;
            }
        }

        // Track recent messages (keep last 3 to avoid immediate repetition)
        this.recentMessages.push(selectedMessage);
        if (this.recentMessages.length > 3) {
            this.recentMessages.shift();
        }

        return selectedMessage;
    }

    /**
     * Generate contextual messages using LLM-style analysis
     */
    generateContextualMessages(contextType, conversationContext) {
        const { recentTopics, conversationTone } = conversationContext;
        const dynamicMessages = [];

        // Get the current user's message for more targeted analysis
        const currentMessage = this.context.message || '';

        // Use efficient pattern-based LLM-style analysis
        const messageIntent = this.analyzeMessageIntent(currentMessage, conversationContext);
        const complexityLevel = this.assessComplexity(currentMessage, conversationContext);

        // Generate natural, context-aware messages based on LLM analysis
        const naturalMessages = this.generateNaturalStatusMessages(
            messageIntent,
            complexityLevel,
            contextType,
            conversationTone,
            recentTopics
        );

        return naturalMessages;
    }

    /**
     * Analyze user message intent using efficient NLP-style patterns
     */
    analyzeMessageIntent(message, conversationContext) {
        const msg = message.toLowerCase();

        // Intent classification patterns (efficient keyword-based analysis)
        const intentPatterns = {
            'debug': ['error', 'bug', 'not working', 'broken', 'fix', 'problem', 'issue', 'debug'],
            'learn': ['explain', 'how', 'what is', 'why', 'understand', 'learn', 'teach me'],
            'create': ['make', 'create', 'build', 'generate', 'write', 'develop'],
            'optimize': ['improve', 'better', 'optimize', 'faster', 'efficient', 'performance'],
            'compare': ['difference', 'compare', 'vs', 'versus', 'which is better'],
            'implement': ['implement', 'code', 'function', 'class', 'method', 'algorithm'],
            'research': ['research', 'find', 'information', 'data', 'study', 'analysis']
        };

        for (const [intent, patterns] of Object.entries(intentPatterns)) {
            if (patterns.some(pattern => msg.includes(pattern))) {
                return intent;
            }
        }

        return 'general';
    }

    /**
     * Assess complexity using multiple factors
     */
    assessComplexity(message, conversationContext) {
        let complexity = 0;

        // Message length factor
        if (message.length > 200) complexity += 2;
        else if (message.length > 100) complexity += 1;

        // Technical keywords
        const technicalTerms = ['algorithm', 'architecture', 'design pattern', 'scalability', 'performance', 'optimization'];
        complexity += technicalTerms.filter(term => message.toLowerCase().includes(term)).length;

        // Multiple questions or requirements
        const questionMarks = (message.match(/\?/g) || []).length;
        if (questionMarks > 1) complexity += 1;

        // Code blocks or technical symbols
        if (/```|`[^`]+`|->|=>|::|\[|\]|\{|\}/.test(message)) complexity += 1;

        // Conversation context complexity
        if (conversationContext.isComplexDiscussion) complexity += 1;
        if (conversationContext.recentTopics.length > 2) complexity += 1;

        return Math.min(complexity, 5); // Cap at 5
    }

    /**
     * Generate natural status messages using LLM-style reasoning
     */
    generateNaturalStatusMessages(intent, complexity, contextType, tone, topics) {
        const messages = [];
        const phase = this.currentPhase;

        // Intent-specific natural messages
        const intentMessages = {
            'debug': {
                'PROCESSING': ['Analyzing the error pattern...', 'Examining the issue...', 'Investigating what went wrong...'],
                'THINKING': ['Tracing through the problem...', 'Looking for the root cause...', 'Checking potential solutions...'],
                'COMPLEX': ['This bug requires careful analysis...', 'Working through the debugging process...'],
                'EXTENDED': ['Still investigating this complex issue...', 'Debugging can take time for accuracy...']
            },
            'learn': {
                'PROCESSING': ['Gathering educational content...', 'Preparing clear explanation...', 'Organizing learning materials...'],
                'THINKING': ['Structuring the explanation...', 'Making sure this is easy to understand...', 'Breaking down complex concepts...'],
                'COMPLEX': ['This topic has many layers to explain...', 'Ensuring comprehensive understanding...'],
                'EXTENDED': ['Want to give you a thorough explanation...', 'Complex topics deserve detailed teaching...']
            },
            'create': {
                'PROCESSING': ['Initiating creative process...', 'Brainstorming possibilities...', 'Gathering creative inspiration...'],
                'THINKING': ['Crafting something unique...', 'Refining the creative concept...', 'Polishing the creation...'],
                'COMPLEX': ['This creative work needs attention to detail...', 'Building something comprehensive...'],
                'EXTENDED': ['Creative work is taking shape...', 'Quality creation requires patience...']
            },
            'implement': {
                'PROCESSING': ['Setting up code structure...', 'Planning the implementation...', 'Reviewing requirements...'],
                'THINKING': ['Designing the solution architecture...', 'Considering best practices...', 'Optimizing the approach...'],
                'COMPLEX': ['This implementation has many moving parts...', 'Ensuring robust code design...'],
                'EXTENDED': ['Complex implementations need careful planning...', 'Building solid, maintainable code...']
            }
        };

        // Get intent-specific messages if available
        const intentSet = intentMessages[intent]?.[phase];
        if (intentSet) {
            messages.push(...intentSet);
        }

        // Add complexity-aware messages
        if (complexity >= 3) {
            const complexMessages = [
                'Working through multiple considerations...',
                'This requires careful thought...',
                'Analyzing several factors...',
                'Ensuring thoroughness...'
            ];
            messages.push(...complexMessages);
        }

        // Add topic-specific natural messages
        if (topics.length > 0) {
            const topic = topics[0];
            const topicMessages = [
                `Drawing on ${topic} knowledge...`,
                `Considering ${topic} best practices...`,
                `Applying ${topic} principles...`,
                `Leveraging ${topic} expertise...`
            ];
            messages.push(...topicMessages.slice(0, 2)); // Limit to avoid overwhelming
        }

        // Add tone-responsive natural messages
        if (tone === 'urgent') {
            messages.push('Prioritizing speed while maintaining quality...', 'Working efficiently on this...');
        } else if (tone === 'polite') {
            messages.push('Taking care to be helpful...', 'Ensuring a quality response...');
        }

        // Return a selection of generated messages
        return messages.slice(0, 4); // Limit to keep performance good
    }

    /**
     * Detect context type based on provided context, message content, and conversation history
     */
    detectContextType() {
        const { message = '', isCode = false, isComplex = false } = this.context;

        // Analyze conversation history for better context
        const conversationContext = this.analyzeConversationHistory();

        // Check for code context
        if (isCode || /```|`[^`]+`|function|class|import|export|def |#include|<\w+>|error|bug|debug/.test(message) ||
            conversationContext.hasCodeDiscussion) {
            return 'code';
        }

        // Check for research context  
        if (/explain|why|how|what.*difference|compare|research|study|analysis|scientific|learn/.test(message.toLowerCase()) ||
            conversationContext.isResearchHeavy) {
            return 'research';
        }

        // Check for creative context
        if (/write|create|generate|story|poem|idea|creative|design|art|music|brainstorm/.test(message.toLowerCase()) ||
            conversationContext.isCreative) {
            return 'creative';
        }

        // Check for complex context
        if (isComplex || message.length > 300 ||
            /complex|detailed|comprehensive|in-depth|thorough|elaborate/.test(message.toLowerCase()) ||
            conversationContext.isComplexDiscussion) {
            return 'complex';
        }

        // Check for conversational context
        if (conversationContext.isCasualChat) {
            return 'conversational';
        }

        return 'general';
    }

    /**
     * Analyze recent conversation history to provide better context (with caching for efficiency)
     */
    analyzeConversationHistory() {
        // Use caching to improve performance for repeated analysis
        const currentTime = Date.now();
        const currentMessage = this.context.message || '';
        const messageHash = this.simpleHash(currentMessage);

        // Return cached result if still valid and message hasn't changed
        if (this.config.analysisEfficiencyMode &&
            this.analysisCache.cachedContext &&
            currentTime - this.analysisCache.lastAnalysisTime < this.analysisCache.cacheValidityMs &&
            messageHash === this.analysisCache.lastMessageHash) {
            return this.analysisCache.cachedContext;
        }

        const chatWindow = document.querySelector('#chatWindow') || document.querySelector('.chat-window');
        if (!chatWindow) {
            const defaultContext = {
                hasCodeDiscussion: false,
                isResearchHeavy: false,
                isCreative: false,
                isComplexDiscussion: false,
                isCasualChat: false,
                recentTopics: [],
                conversationTone: 'neutral'
            };

            // Cache the default result
            this.updateAnalysisCache(defaultContext, messageHash, currentTime);
            return defaultContext;
        }

        // Get recent messages (last 6 messages) - Optimized query
        const messageContainers = Array.from(chatWindow.querySelectorAll('.messageContainer')).slice(-6);
        const recentMessages = messageContainers.map(container => {
            const textElement = container.querySelector('.messageText, .message-text');
            return textElement ? textElement.textContent.toLowerCase() : '';
        }).filter(text => text.length > 0);

        const allText = recentMessages.join(' ');

        // Efficient analysis using optimized keyword matching
        const analysis = this.performEfficientContextAnalysis(allText, currentMessage, recentMessages);

        // Cache the result
        this.updateAnalysisCache(analysis, messageHash, currentTime);

        return analysis;
    }

    /**
     * Efficient context analysis using optimized patterns
     */
    performEfficientContextAnalysis(allText, currentMessage, recentMessages) {
        // Pre-compiled regex patterns for better performance
        const patterns = {
            code: /\b(function|class|import|export|var|let|const|def|code|programming|syntax|error|debug|algorithm|javascript|python|react|vue|angular|node|css|html|typescript)\b/g,
            research: /\b(explain|why|how|research|study|analysis|theory|concept|understand|learn|knowledge|scientific|academic)\b/g,
            creative: /\b(create|generate|write|story|idea|design|creative|imagine|brainstorm|artistic|art|music|poem)\b/g,
            complex: /\b(complex|detailed|comprehensive|elaborate|thorough|in-depth|sophisticated|advanced|intricate)\b/g,
            casual: /\b(hi|hello|thanks|please|help|quick|simple|just|wondering|curious|chat|talk)\b/g
        };

        const combinedText = (allText + ' ' + currentMessage.toLowerCase());

        // Count matches efficiently
        const counts = {};
        for (const [key, pattern] of Object.entries(patterns)) {
            const matches = combinedText.match(pattern);
            counts[key] = matches ? matches.length : 0;
        }

        // Determine characteristics based on match counts
        const hasCodeDiscussion = counts.code >= 2;
        const isResearchHeavy = counts.research >= 2;
        const isCreative = counts.creative >= 1;
        const isComplexDiscussion = counts.complex >= 1 || recentMessages.some(msg => msg.length > 200);
        const isCasualChat = counts.casual >= 2;

        // Extract topics efficiently
        const topics = this.extractTopics(combinedText);

        // Determine conversation tone efficiently
        const conversationTone = this.determineTone(combinedText);

        return {
            hasCodeDiscussion,
            isResearchHeavy,
            isCreative,
            isComplexDiscussion,
            isCasualChat,
            recentTopics: topics,
            conversationTone
        };
    }

    /**
     * Extract topics using efficient pattern matching
     */
    extractTopics(text) {
        const topicPatterns = [
            { pattern: /\b(javascript|js|typescript|ts|react|vue|angular|node)\b/g, category: 'frontend' },
            { pattern: /\b(python|django|flask|fastapi|pandas|numpy)\b/g, category: 'python' },
            { pattern: /\b(ai|machine learning|neural network|algorithm|data science|ml|llm)\b/g, category: 'ai' },
            { pattern: /\b(design|ux|ui|user experience|interface|figma)\b/g, category: 'design' },
            { pattern: /\b(database|sql|mongodb|api|backend|frontend|server)\b/g, category: 'backend' }
        ];

        const topics = [];
        topicPatterns.forEach(({ pattern, category }) => {
            if (pattern.test(text)) {
                topics.push(category);
            }
        });

        return [...new Set(topics)]; // Remove duplicates
    }

    /**
     * Determine conversation tone efficiently
     */
    determineTone(text) {
        if (/\b(urgent|quickly|asap|fast|immediate|rush)\b/.test(text)) {
            return 'urgent';
        } else if (/\b(please|thank|appreciate|kind|help|gentle)\b/.test(text)) {
            return 'polite';
        } else if (/\b(hi|hello|hey|chat|talk|casual|friendly)\b/.test(text)) {
            return 'casual';
        }
        return 'neutral';
    }

    /**
     * Update analysis cache
     */
    updateAnalysisCache(analysis, messageHash, currentTime) {
        this.analysisCache = {
            lastAnalysisTime: currentTime,
            lastMessageHash: messageHash,
            cachedContext: analysis,
            cacheValidityMs: 2000
        };
    }

    /**
     * Simple hash function for message comparison
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }

    /**
     * Update progress bar with simulated progress
     */
    updateProgress(elapsed) {
        const progressFill = this.element?.querySelector('.typing-progress-fill');
        if (!progressFill) return;

        // Simulate realistic progress based on phase
        let targetProgress = 0;

        switch (this.currentPhase) {
            case 'IMMEDIATE':
                targetProgress = 0;
                break;
            case 'PROCESSING':
                targetProgress = Math.min(25, (elapsed / this.phases.THINKING) * 25);
                break;
            case 'THINKING':
                targetProgress = Math.min(60, 25 + ((elapsed - this.phases.THINKING) / (this.phases.COMPLEX - this.phases.THINKING)) * 35);
                break;
            case 'COMPLEX':
                targetProgress = Math.min(85, 60 + ((elapsed - this.phases.COMPLEX) / (this.phases.EXTENDED - this.phases.COMPLEX)) * 25);
                break;
            case 'EXTENDED':
                // Slow progress in extended phase, but never quite reach 100%
                const extendedProgress = (elapsed - this.phases.EXTENDED) / 30000; // 30 second cycle
                targetProgress = Math.min(95, 85 + extendedProgress * 10);
                break;
        }

        // Smooth progress updates
        if (Math.abs(targetProgress - this.currentProgress) > 0.5) {
            this.currentProgress += (targetProgress - this.currentProgress) * 0.1;
            progressFill.style.width = `${Math.round(this.currentProgress)}%`;
        }
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Save to localStorage
        if (newConfig.enableDetailedStatus !== undefined) {
            localStorage.setItem('enableDetailedWaitingStatus', newConfig.enableDetailedStatus.toString());
        }
        if (newConfig.showProgressBar !== undefined) {
            localStorage.setItem('showWaitingProgressBar', newConfig.showProgressBar.toString());
        }
        if (newConfig.verbosity !== undefined) {
            localStorage.setItem('waitingStatusVerbosity', newConfig.verbosity.toString());
        }
    }

    /**
     * Get current status information (for debugging)
     */
    getStatus() {
        if (!this.startTime) return null;

        const elapsed = Date.now() - this.startTime;
        return {
            elapsed,
            phase: this.currentPhase,
            message: this.getStatusMessage(),
            progress: this.currentProgress,
            context: this.context
        };
    }
}
