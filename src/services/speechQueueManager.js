/**
 * Enhanced Speech Queue Manager
 * 
 * Manages speech synthesis with message queue integration,
 * proper ordering, and content type handling.
 */
export class SpeechQueueManager {
    constructor() {
        this.speechQueue = [];
        this.isProcessing = false;
        this.currentSpeech = null;
        this.processingDelay = 200; // 200ms delay between speech items
        this.settings = {
            playThinkingContent: false,
            autoSpeak: false,
            speechRate: 1.0,
            speechVolume: 1.0,
            selectedVoice: null,
            naturalness: 0.8,
            enableStreamingSync: false  // New setting for streaming sync
        };
        this.callbacks = {
            onStart: null,
            onProgress: null,
            onComplete: null,
            onError: null
        };
        
        this.loadSettings();
        console.log('🎵 SpeechQueueManager initialized');
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            this.settings.playThinkingContent = localStorage.getItem('speechPlayThinking') === 'true';
            this.settings.autoSpeak = localStorage.getItem('speechAutoSpeak') === 'true';
            this.settings.speechRate = parseFloat(localStorage.getItem('speechRate')) || 1.0;
            this.settings.speechVolume = parseFloat(localStorage.getItem('speechVolume')) || 1.0;
            this.settings.selectedVoice = localStorage.getItem('speechSelectedVoice');
            this.settings.naturalness = parseFloat(localStorage.getItem('speechNaturalness')) || 0.8;
            this.settings.enableStreamingSync = localStorage.getItem('speechStreamingSync') === 'true';
        } catch (error) {
            console.error('[SpeechQueue] Error loading settings:', error);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('speechPlayThinking', this.settings.playThinkingContent.toString());
            localStorage.setItem('speechAutoSpeak', this.settings.autoSpeak.toString());
            localStorage.setItem('speechRate', this.settings.speechRate.toString());
            localStorage.setItem('speechVolume', this.settings.speechVolume.toString());
            if (this.settings.selectedVoice) {
                localStorage.setItem('speechSelectedVoice', this.settings.selectedVoice);
            }
            localStorage.setItem('speechNaturalness', this.settings.naturalness.toString());
            localStorage.setItem('speechStreamingSync', this.settings.enableStreamingSync.toString());
        } catch (error) {
            console.error('[SpeechQueue] Error saving settings:', error);
        }
    }

    /**
     * Update setting and save
     */
    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            this.saveSettings();
            console.log(`[SpeechQueue] Setting ${key} updated to:`, value);
        }
    }

    /**
     * Enqueue a streaming speech message with synchronization support
     * @param {Object} message - Message object
     * @param {Function} onProgress - Progress callback for streaming sync
     * @returns {string} - Speech item ID
     */
    enqueueWithSync(message, onProgress = null) {
        if (!this.shouldSpeak(message)) {
            console.log('[SpeechQueue] Message filtered out, not speaking');
            return null;
        }

        // For streaming sync, calculate optimal streaming speed to match speech rate
        if (this.settings.enableStreamingSync && message.metadata?.isStreaming) {
            // Calculate how long speech will take at current rate
            const textLength = message.text?.length || 0;
            const wordsPerMinute = 150; // Average speaking speed
            const charactersPerWord = 5; // Average characters per word
            const speechDurationMs = (textLength / charactersPerWord) * (60000 / wordsPerMinute) / this.settings.speechRate;
            
            // Calculate target streaming speed (ms per character) - make streaming 25% faster than speech for better visual effect
            const baseStreamingSpeed = speechDurationMs / textLength;
            const targetStreamingSpeed = baseStreamingSpeed * 0.75; // 25% faster (multiply by 0.75)
            
            if (targetStreamingSpeed > 0) {
                message.targetStreamingSpeed = Math.max(8, Math.min(150, targetStreamingSpeed)); // Clamp between 8-150ms per char (faster range)
                console.log(`[SpeechQueue] Streaming sync: text=${textLength}chars, speech duration=${speechDurationMs.toFixed(0)}ms, base speed=${baseStreamingSpeed.toFixed(1)}ms/char, target speed=${message.targetStreamingSpeed.toFixed(1)}ms/char (25% faster)`);
            }
        }

        // Add progress callback for sync
        if (onProgress) {
            message.onSyncProgress = onProgress;
        }

        return this.enqueue(message);
    }

    /**
     * Enqueue a speech message with streaming deduplication
     * @param {Object} message - Message object
     * @param {string} message.text - Text to speak
     * @param {string} message.type - Message type
     * @param {string} message.id - Message ID
     * @param {Object} message.from - Message sender info
     * @param {number} message.timestamp - Message timestamp
     * @param {Object} message.metadata - Additional metadata
     * @param {boolean} message.forceSpeak - Force speech even if auto-speak disabled
     * @returns {string} - Speech item ID
     */
    enqueue(message) {
        if (!this.shouldSpeak(message)) {
            console.log('[SpeechQueue] Message filtered out, not speaking');
            return null;
        }

        const messageId = message.id || `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // **ENHANCED STREAMING DEDUPLICATION**: More aggressive detection
        const currentTime = Date.now();
        const recentTimeWindow = 5000; // 5 seconds window for streaming detection
        
        // Check for existing items with same or similar content in recent time window
        for (let i = this.speechQueue.length - 1; i >= 0; i--) {
            const existingItem = this.speechQueue[i];
            
            // Skip if outside time window
            if (currentTime - existingItem.timestamp > recentTimeWindow) continue;
            
            // Same message ID - definitely a duplicate/update
            if (existingItem.originalMessageId === messageId || existingItem.messageId === messageId) {
                console.log(`[SpeechQueue] Found exact message ID match, updating existing item: ${messageId}`);
                // Instead of removing and adding new, update the existing item
                existingItem.text = message.text;
                existingItem.timestamp = currentTime;
                existingItem.metadata = { ...existingItem.metadata, ...message.metadata };
                console.log(`[SpeechQueue] Updated existing item for message ID: ${messageId}`);
                return existingItem.id; // Return existing item ID
            }
            
            // Content similarity check - if new text contains old text as prefix, it's likely streaming
            if (existingItem.text && message.text && message.text.length > existingItem.text.length) {
                if (message.text.startsWith(existingItem.text.trim()) && existingItem.text.length > 20) {
                    console.log(`[SpeechQueue] Detected streaming update - old: "${existingItem.text.substring(0, 50)}...", new: "${message.text.substring(0, 50)}..."`);
                    
                    // Update existing item instead of creating new one
                    existingItem.text = message.text;
                    existingItem.timestamp = currentTime;
                    existingItem.metadata = { ...existingItem.metadata, ...message.metadata };
                    
                    return existingItem.id;
                }
            }
            
            // Reverse check - if old text contains new text as prefix (shouldn't happen but just in case)
            if (existingItem.text && message.text && existingItem.text.length > message.text.length) {
                if (existingItem.text.startsWith(message.text.trim()) && message.text.length > 20) {
                    console.log(`[SpeechQueue] Detected reverse streaming case, keeping existing longer content`);
                    return existingItem.id; // Keep the longer content
                }
            }
        }

        // If we're currently speaking and this looks like an update to the current speech
        if (this.currentSpeech && this.currentSpeech.text && message.text) {
            if (message.text.startsWith(this.currentSpeech.text.trim()) && this.currentSpeech.text.length > 20) {
                console.log(`[SpeechQueue] Currently speaking similar content, ignoring streaming update`);
                return this.currentSpeech.id;
            }
        }

        // Calculate priority based on message type
        let priority = 0;
        switch (message.type) {
            case 'error':
                priority = 3;
                break;
            case 'warning':
                priority = 2;
                break;
            case 'thinking':
                priority = 1;
                break;
            default:
                priority = 1;
        }

        const speechItem = {
            id: `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            originalMessageId: messageId, // Track original message ID for deduplication
            messageId: messageId,
            text: message.text,
            messageType: message.type || 'agent',
            priority: priority,
            timestamp: Date.now(),
            metadata: message.metadata || {},
            syncRate: message.syncRate, // For streaming sync
            onSyncProgress: message.onSyncProgress, // Progress callback for sync
            options: {
                autoDetectLanguage: message.autoDetectLanguage || false,
                rate: message.syncRate || this.settings.speechRate, // Use sync rate if available
                volume: this.settings.speechVolume,
                voice: this.settings.selectedVoice,
                naturalness: this.settings.naturalness
            }
        };

        this.speechQueue.push(speechItem);
        
        // Sort queue by priority and timestamp
        this.speechQueue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Higher priority first
            }
            return a.timestamp - b.timestamp; // Earlier timestamp first
        });

        console.log(`[SpeechQueue] Enqueued NEW speech item: ${speechItem.id} (type: ${speechItem.messageType}, priority: ${speechItem.priority})`);
        console.log(`[SpeechQueue] Queue length: ${this.speechQueue.length}`);

        // Start processing if not already running
        this.processQueue();
        
        return speechItem.id;
    }

    /**
     * Determine if message should be spoken
     * @param {Object} message - Message to check
     * @returns {boolean} - Whether message should be spoken
     */
    shouldSpeak(message) {
        // Don't speak if auto-speak is disabled and not forced
        if (!this.settings.autoSpeak && !message.forceSpeak) {
            return false;
        }

        // Don't speak user messages
        if (message.from && message.from.id === 'user') {
            return false;
        }

        // Don't speak empty messages
        if (!message.text || !message.text.trim()) {
            return false;
        }

        // Check thinking content setting
        if (message.type === 'thinking' && !this.settings.playThinkingContent) {
            return false;
        }

        return true;
    }

    /**
     * Get priority for message type
     * @param {Object} message - Message object
     * @returns {number} - Priority (higher = more important)
     */
    getPriority(message) {
        const priorityMap = {
            'error': 100,       // Highest priority
            'system': 90,       
            'agent': 80,        // Agent messages high priority
            'bot': 80,          // Bot messages high priority  
            'assistant': 80,    // Assistant messages high priority
            'thinking': 30,     // Lower priority for thinking
            'typing': 10,       // Lowest priority
            'unknown': 50       // Medium priority for unknown types
        };

        let priority = priorityMap[message.type] || priorityMap['unknown'];

        // Boost priority for forced speech
        if (message.forceSpeak) {
            priority += 20;
        }

        return priority;
    }

    /**
     * Process the speech queue
     */
    async processQueue() {
        if (this.isProcessing || this.speechQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`[SpeechQueue] Processing speech queue (${this.speechQueue.length} items)`);

        while (this.speechQueue.length > 0) {
            const speechItem = this.speechQueue.shift();
            
            try {
                await this.processSpeechItem(speechItem);
                
                // Add delay between speech items to prevent overlap
                if (this.speechQueue.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.processingDelay));
                }
            } catch (error) {
                console.error(`[SpeechQueue] Error processing speech item ${speechItem.id}:`, error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error, speechItem);
                }
            }
        }

        this.isProcessing = false;
        console.log('[SpeechQueue] Speech queue processing complete');
    }

    /**
     * Process individual speech item
     * @param {Object} speechItem - Speech item to process
     */
    async processSpeechItem(speechItem) {
        console.log(`[SpeechQueue] Processing speech item: ${speechItem.id} (${speechItem.messageType})`);
        
        this.currentSpeech = speechItem;

        try {
            // Import speech engine dynamically
            const { speechEngine } = await import('../services/speechEngine.js');
            
            if (!speechEngine) {
                throw new Error('Speech engine not available');
            }

            // Prepare speech options with callbacks
            const speechOptions = {
                ...speechItem.options,
                onProgress: (progress) => {
                    // Handle general progress callback
                    if (this.callbacks.onProgress) {
                        this.callbacks.onProgress(progress, speechItem);
                    }
                    // Handle sync progress callback for streaming synchronization
                    if (speechItem.onSyncProgress) {
                        speechItem.onSyncProgress(progress, speechItem);
                    }
                },
                onComplete: () => {
                    console.log(`[SpeechQueue] Speech item completed: ${speechItem.id}`);
                    if (this.callbacks.onComplete) {
                        this.callbacks.onComplete(speechItem);
                    }
                    this.currentSpeech = null;
                },
                onError: (error) => {
                    console.error(`[SpeechQueue] Speech synthesis error for ${speechItem.id}:`, error);
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error, speechItem);
                    }
                    this.currentSpeech = null;
                }
            };

            // Start speech with enhanced startup handling
            if (this.callbacks.onStart) {
                this.callbacks.onStart(speechItem);
            }

            // Add a small pre-synthesis delay to ensure speech engine is ready
            await new Promise(resolve => setTimeout(resolve, 50));

            const success = await speechEngine.speakText(speechItem.text, speechOptions);
            
            if (!success) {
                // Provide more detailed error information
                const errorDetails = {
                    speechItemId: speechItem.id,
                    textLength: speechItem.text?.length || 0,
                    textPreview: speechItem.text?.substring(0, 100) + (speechItem.text?.length > 100 ? '...' : ''),
                    speechOptions: {
                        voice: speechOptions.voice,
                        rate: speechOptions.rate,
                        volume: speechOptions.volume,
                        naturalness: speechOptions.naturalness
                    },
                    engineState: speechEngine?.state || 'unknown'
                };
                
                console.error('[SpeechQueue] Speech synthesis failed with details:', errorDetails);
                throw new Error(`Speech synthesis failed for item ${speechItem.id}. Text: "${errorDetails.textPreview}"`);
            }

        } catch (error) {
            console.error(`[SpeechQueue] Failed to process speech item ${speechItem.id}:`, error);
            this.currentSpeech = null;
            throw error;
        }
    }

    /**
     * Stop current speech and clear queue
     */
    stopAll() {
        console.log('[SpeechQueue] Stopping all speech and clearing queue');
        
        // Clear the queue
        this.speechQueue = [];
        
        // Stop current speech
        if (this.currentSpeech) {
            try {
                // Try to stop via speech engine
                import('../services/speechEngine.js').then(({ speechEngine }) => {
                    if (speechEngine && speechEngine.stopSpeaking) {
                        speechEngine.stopSpeaking();
                    }
                });
                
                // Also try browser speech synthesis
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
            } catch (error) {
                console.error('[SpeechQueue] Error stopping speech:', error);
            }
            
            this.currentSpeech = null;
        }
        
        this.isProcessing = false;
    }

    /**
     * Stop only the current speech item (allow queue to continue)
     */
    stopCurrent() {
        if (this.currentSpeech) {
            console.log(`[SpeechQueue] Stopping current speech: ${this.currentSpeech.id}`);
            try {
                import('../services/speechEngine.js').then(({ speechEngine }) => {
                    if (speechEngine && speechEngine.stopSpeaking) {
                        speechEngine.stopSpeaking();
                    }
                });
                
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
            } catch (error) {
                console.error('[SpeechQueue] Error stopping current speech:', error);
            }
            
            this.currentSpeech = null;
        }
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.speechQueue.length,
            currentSpeech: this.currentSpeech ? {
                id: this.currentSpeech.id,
                messageType: this.currentSpeech.messageType,
                text: this.currentSpeech.text.substring(0, 50) + '...'
            } : null,
            settings: { ...this.settings }
        };
    }

    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Clear all queued items of specific type
     */
    clearByType(messageType) {
        const beforeLength = this.speechQueue.length;
        this.speechQueue = this.speechQueue.filter(item => item.messageType !== messageType);
        const afterLength = this.speechQueue.length;
        
        if (beforeLength !== afterLength) {
            console.log(`[SpeechQueue] Cleared ${beforeLength - afterLength} items of type '${messageType}'`);
        }
    }
}

// Create singleton instance
export const speechQueueManager = new SpeechQueueManager();
