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
        
        // Configuration - Optimized for responsive feel
        this.config = {
            enableDetailedStatus: localStorage.getItem('enableDetailedWaitingStatus') !== 'false',
            showProgressBar: localStorage.getItem('showWaitingProgressBar') !== 'false',
            statusUpdateInterval: 800, // Much faster updates (was 2000ms)
            maxWaitTimeDisplay: 120000, // 2 minutes max display
            verbosity: localStorage.getItem('waitingStatusVerbosity') || 'medium',
            rushMode: localStorage.getItem('rushModeWaiting') === 'true' // For impatient users
        };

        // Rush mode adjustments
        if (this.config.rushMode) {
            this.config.statusUpdateInterval = 400; // Even faster updates
        }

        // Status phase timing (in milliseconds) - More responsive for impatient users
        this.phases = {
            IMMEDIATE: 0,      // 0-1.5 seconds (faster immediate response)
            PROCESSING: 1500,  // 1.5-5 seconds (quicker processing phase)
            THINKING: 5000,    // 5-15 seconds (faster thinking phase)
            COMPLEX: 15000,    // 15-35 seconds (reduced complex phase)
            EXTENDED: 35000    // 35+ seconds (earlier extended phase)
        };

        // Rush mode - even faster transitions for impatient users
        if (this.config.rushMode) {
            this.phases = {
                IMMEDIATE: 0,      // 0-0.8 seconds
                PROCESSING: 800,   // 0.8-3 seconds
                THINKING: 3000,    // 3-8 seconds
                COMPLEX: 8000,     // 8-20 seconds
                EXTENDED: 20000    // 20+ seconds
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
                    "Received your message...",
                    "Starting to process...",
                    "Understanding your request..."
                ],
                PROCESSING: [
                    "Processing your request...",
                    "Analyzing your question...",
                    "Gathering information...",
                    "Preparing response..."
                ],
                THINKING: [
                    "Thinking deeply about your question...",
                    "Searching relevant knowledge...",
                    "Consolidating information...",
                    "Analyzing multiple perspectives...",
                    "Cross-referencing sources..."
                ],
                COMPLEX: [
                    "Working on comprehensive analysis...",
                    "Processing complex information...",
                    "Synthesizing detailed response...",
                    "Ensuring accuracy and completeness...",
                    "Reviewing multiple knowledge sources..."
                ],
                EXTENDED: [
                    "Generating comprehensive response...",
                    "Performing thorough analysis...",
                    "This is taking longer than usual...",
                    "Working on detailed explanation...",
                    "Almost ready with comprehensive answer..."
                ]
            },
            
            code: {
                IMMEDIATE: [
                    "Reading your code request...",
                    "Parsing programming query...",
                    "Initializing code analysis..."
                ],
                PROCESSING: [
                    "Analyzing code requirements...",
                    "Processing programming request..."
                ],
                THINKING: [
                    "Reviewing code best practices...",
                    "Searching programming resources...",
                    "Analyzing implementation patterns...",
                    "Checking for optimal solutions...",
                    "Validating code approaches..."
                ],
                COMPLEX: [
                    "Compiling comprehensive code solution...",
                    "Analyzing complex programming logic...",
                    "Testing different implementation approaches...",
                    "Generating detailed code examples...",
                    "Reviewing architectural patterns..."
                ],
                EXTENDED: [
                    "Working on complex code solution...",
                    "Generating comprehensive programming guide...",
                    "This complex code analysis is taking time...",
                    "Preparing detailed implementation...",
                    "Almost done with code analysis..."
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
        messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

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
        const messages = this.messageSets[contextType]?.[this.currentPhase] || 
                        this.messageSets.general[this.currentPhase];

        if (!messages || messages.length === 0) {
            return "Processing...";
        }

        // Select message based on time progression within phase
        const elapsed = Date.now() - this.startTime;
        const phaseStartTime = this.phases[this.currentPhase];
        const timeInPhase = elapsed - phaseStartTime;
        
        // Cycle through messages in the phase
        const messageIndex = Math.floor(timeInPhase / 5000) % messages.length;
        return messages[messageIndex];
    }

    /**
     * Detect context type based on provided context and message content
     */
    detectContextType() {
        const { message = '', isCode = false, isComplex = false } = this.context;

        // Check for code context
        if (isCode || /```|`[^`]+`|function|class|import|export|def |#include|<\w+>/.test(message)) {
            return 'code';
        }

        // Check for research context  
        if (/explain|why|how|what.*difference|compare|research|study|analysis|scientific/.test(message.toLowerCase())) {
            return 'research';
        }

        // Check for creative context
        if (/write|create|generate|story|poem|idea|creative|design|art|music/.test(message.toLowerCase())) {
            return 'creative';
        }

        // Check for complex context
        if (isComplex || message.length > 300 || /complex|detailed|comprehensive|in-depth|thorough/.test(message.toLowerCase())) {
            return 'complex';
        }

        return 'general';
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
            localStorage.setItem('enableDetailedWaitingStatus', newConfig.enableDetailedStatus);
        }
        if (newConfig.showProgressBar !== undefined) {
            localStorage.setItem('showWaitingProgressBar', newConfig.showProgressBar);
        }
        if (newConfig.verbosity !== undefined) {
            localStorage.setItem('waitingStatusVerbosity', newConfig.verbosity);
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
