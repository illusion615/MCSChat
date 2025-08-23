/**
 * Enhanced Speech Engine with Multi-Language Support
 * Supports multiple speech providers: Enhanced Web Speech API and Azure Speech Services
 * Features: Language auto-detection, voice switching, continuous recognition with language identification
 */

import { languageDetector } from '../utils/languageDetector.js';

// Get global logging manager instance (will be set by application)
let loggingManager = null;
export function setLoggingManager(logger) {
    loggingManager = logger;
}

export class SpeechEngine {
    constructor() {
        this.providers = {
            WEB_SPEECH: 'web_speech',
            AZURE: 'azure'
        };

        this.settings = {
            provider: this.providers.WEB_SPEECH,
            autoSpeak: false,
            voiceInput: false,
            selectedVoice: '',
            speechRate: 1.0,
            speechVolume: 1.0,
            naturalness: 0.8,

            // Multi-language settings
            autoDetectLanguage: false,
            enableLanguageDetection: false,
            continuousLanguageDetection: false,
            candidateLanguages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN'],
            fallbackLanguage: 'en-US',

            azureSettings: {
                subscriptionKey: '',
                region: 'eastus',
                voiceName: 'en-US-JennyNeural'
            }
        };

        this.state = {
            isInitialized: false,
            currentProvider: null,
            isProcessing: false,
            isRecording: false,
            currentUtterance: null,
            availableVoices: [],
            localModelsLoaded: false
        };

        this.webSpeechProvider = null;
        this.azureProvider = null;

        this.initialize();
    }

    /**
     * Initialize the speech engine
     */
    async initialize() {
        console.log('[SpeechEngine] Initializing speech engine...');

        await this.loadSettings();
        await this.initializeProviders();

        this.state.isInitialized = true;
        console.log('[SpeechEngine] Speech engine initialized successfully');
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        const savedSettings = localStorage.getItem('speechEngineSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsed };
            } catch (error) {
                console.warn('[SpeechEngine] Failed to parse saved settings:', error);
            }
        }
    }

    /**
     * Save settings to storage
     */
    saveSettings() {
        localStorage.setItem('speechEngineSettings', JSON.stringify(this.settings));
    }

    /**
     * Initialize all speech providers
     */
    async initializeProviders() {
        console.log('[SpeechEngine] Initializing speech providers...');

        // Initialize Enhanced Web Speech API (always available)
        this.webSpeechProvider = new EnhancedWebSpeechProvider();
        await this.webSpeechProvider.initialize();

        // Initialize Azure Provider if requested and configured
        if (this.settings.provider === this.providers.AZURE && this.settings.azureSettings.subscriptionKey) {
            try {
                this.azureProvider = new AzureSpeechProvider(this.settings.azureSettings);
                await this.azureProvider.initialize();
                console.log('[SpeechEngine] Azure provider initialized successfully');
            } catch (error) {
                console.warn('[SpeechEngine] Azure provider failed to initialize, falling back to Web Speech API:', error);
                // Fallback to Web Speech API
                this.settings.provider = this.providers.WEB_SPEECH;
                this.saveSettings();

                // Show user notification about fallback
                this.showProviderFallbackNotification('Azure Speech Services failed to initialize. Using Web Speech API instead.');
            }
        }

        this.state.currentProvider = this.getCurrentProvider();

        // Load available voices from the current provider
        await this.loadAvailableVoices();
    }

    /**
     * Load available voices from current provider
     */
    async loadAvailableVoices() {
        const provider = this.state.currentProvider;
        if (provider && provider.getVoices) {
            try {
                this.state.availableVoices = await provider.getVoices();
                console.log(`[SpeechEngine] Loaded ${this.state.availableVoices.length} voices from ${this.settings.provider}`);
            } catch (error) {
                console.warn('[SpeechEngine] Failed to load voices:', error);
                this.state.availableVoices = [];
            }
        } else {
            this.state.availableVoices = [];
        }
    }

    /**
     * Show provider fallback notification to user
     * @param {string} message - Notification message
     */
    showProviderFallbackNotification(message) {
        console.warn('[SpeechEngine] Provider fallback:', message);

        // Try to show a user-friendly notification
        if (typeof window !== 'undefined') {
            // Dispatch custom event for UI to handle
            window.dispatchEvent(new CustomEvent('speechProviderFallback', {
                detail: { message }
            }));
        }
    }

    /**
     * Validate Azure configuration
     * @returns {boolean} True if Azure configuration is valid
     * @private
     */
    isAzureConfigurationValid() {
        const { subscriptionKey, region } = this.settings.azureSettings;
        return !!(subscriptionKey && subscriptionKey.trim() !== '' && region && region.trim() !== '');
    }

    /**
     * Get the current active provider
     */
    getCurrentProvider() {
        switch (this.settings.provider) {
            case this.providers.AZURE:
                return this.azureProvider || this.webSpeechProvider;
            default:
                return this.webSpeechProvider;
        }
    }

    /**
     * Get current engine status
     */
    getStatus() {
        const provider = this.state.currentProvider;
        return {
            isInitialized: this.state.isInitialized,
            currentProvider: this.settings.provider,
            isProcessing: this.state.isProcessing,
            isRecording: this.state.isRecording,
            availableVoices: this.state.availableVoices.length,
            selectedVoice: this.settings.selectedVoice || 'Default',
            autoSpeak: this.settings.autoSpeak,
            speechRate: this.settings.speechRate,
            speechVolume: this.settings.speechVolume,
            naturalness: this.settings.naturalness,
            providerCapabilities: provider ? {
                quality: provider.quality,
                isOffline: provider.isOffline,
                supportsNaturalness: provider.supportsNaturalness,
                supportsSSML: provider.supportsSSML
            } : null
        };
    }

    /**
     * Switch speech provider
     */
    async switchProvider(providerName) {
        if (this.settings.provider === providerName) return;

        console.log(`[SpeechEngine] Switching to provider: ${providerName}`);

        // Validate provider before switching
        if (providerName === this.providers.AZURE && !this.isAzureConfigurationValid()) {
            console.warn('[SpeechEngine] Cannot switch to Azure: invalid configuration');
            this.showProviderFallbackNotification('Azure Speech Services requires a valid subscription key and region. Please configure your Azure settings in the speech options.');
            return;
        }

        this.settings.provider = providerName;

        // Initialize new provider if not already done
        if (providerName === this.providers.AZURE && !this.azureProvider) {
            // Validate Azure configuration before attempting initialization
            if (!this.settings.azureSettings.subscriptionKey || this.settings.azureSettings.subscriptionKey.trim() === '') {
                console.warn('[SpeechEngine] Azure Speech provider requires a subscription key');
                // Fallback to Web Speech API
                this.settings.provider = this.providers.WEB_SPEECH;
                this.showProviderFallbackNotification('Azure Speech Services requires a valid subscription key. Please configure your Azure settings. Falling back to Web Speech API.');
            } else {
                try {
                    this.azureProvider = new AzureSpeechProvider(this.settings.azureSettings);
                    await this.azureProvider.initialize();
                } catch (error) {
                    console.warn('[SpeechEngine] Azure provider failed to initialize during switch:', error.message);
                    // Fallback to Web Speech API
                    this.settings.provider = this.providers.WEB_SPEECH;
                    this.showProviderFallbackNotification('Azure Speech Services failed to initialize. Please check your subscription key and region. Falling back to Web Speech API.');
                }
            }
        }

        this.state.currentProvider = this.getCurrentProvider();
        this.saveSettings();
    }

    /**
     * Speak text using the current provider with multi-language support
     */
    async speakText(text, options = {}) {
        if (!this.state.isInitialized || this.state.isProcessing) {
            console.warn('[SpeechEngine] Engine not ready or already processing');
            loggingManager?.warn('speech', 'Speech engine not ready or already processing', {
                isInitialized: this.state.isInitialized,
                isProcessing: this.state.isProcessing,
                provider: this.settings.provider
            });
            return false;
        }

        const provider = this.state.currentProvider;
        if (!provider) {
            console.error('[SpeechEngine] No speech provider available');
            loggingManager?.error('speech', 'No speech provider available', {
                provider: this.settings.provider,
                availableProviders: Object.values(this.providers)
            });
            return false;
        }

        try {
            this.state.isProcessing = true;

            loggingManager?.info('speech', 'Starting speech synthesis', {
                provider: this.settings.provider,
                textLength: text.length,
                voice: this.settings.selectedVoice,
                rate: this.settings.speechRate,
                volume: this.settings.speechVolume,
                autoDetectLanguage: this.settings.autoDetectLanguage || options.autoDetectLanguage,
                hasProgressCallback: !!options.onProgress
            });

            const speechOptions = {
                rate: this.settings.speechRate,
                volume: this.settings.speechVolume,
                voice: this.settings.selectedVoice,
                naturalness: this.settings.naturalness,

                // Add multi-language support options
                autoDetectLanguage: this.settings.autoDetectLanguage || options.autoDetectLanguage,
                languageDetector: languageDetector,

                // Pass through progress callbacks to providers
                onProgress: options.onProgress,
                onComplete: options.onComplete,
                onError: options.onError,

                ...options
            };

            await provider.speak(text, speechOptions);
            return true;
        } catch (error) {
            // Don't log interruption as an error - it's normal behavior
            if (error.message && error.message.includes('interrupted')) {
                console.log('[SpeechEngine] Speech interrupted (normal behavior)');
                return true; // Return success for interruptions
            }

            console.error('[SpeechEngine] Speech synthesis failed:', error);

            // Provide user-friendly error message for audio context issues
            if (error.message && error.message.includes('user interaction')) {
                console.warn('[SpeechEngine] Speech requires user interaction');
            }

            return false;
        } finally {
            this.state.isProcessing = false;
        }
    }

    /**
     * Start speech recognition with multi-language support
     */
    async startSpeechRecognition(options = {}) {
        if (!this.state.isInitialized || this.state.isRecording) {
            console.warn('[SpeechEngine] Engine not ready or already recording');
            return false;
        }

        const provider = this.state.currentProvider;
        if (!provider || !provider.supportsSpeechRecognition) {
            console.error('[SpeechEngine] Speech recognition not supported by current provider');
            return false;
        }

        try {
            this.state.isRecording = true;

            // Add multi-language recognition options
            const recognitionOptions = {
                enableLanguageDetection: this.settings.enableLanguageDetection || options.enableLanguageDetection,
                candidateLanguages: this.settings.candidateLanguages || options.candidateLanguages,
                continuousLanguageDetection: this.settings.continuousLanguageDetection || options.continuousLanguageDetection,
                ...options
            };

            const result = await provider.recognize(recognitionOptions);
            return result;
        } catch (error) {
            console.error('[SpeechEngine] Speech recognition failed:', error);
            return null;
        } finally {
            this.state.isRecording = false;
        }
    }

    /**
     * Stop current speech synthesis
     */
    stopSpeaking() {
        console.log('🔴 [SPEECHENGINE-STOP] =================================');
        console.log('🔴 [SPEECHENGINE-STOP] stopSpeaking() called');
        console.log('🔴 [SPEECHENGINE-STOP] =================================');

        const currentProvider = this.state.currentProvider;
        console.log('🟡 [SPEECHENGINE-STOP] Current provider:', currentProvider ? currentProvider.constructor.name : 'none');
        console.log('🟡 [SPEECHENGINE-STOP] Has stop method:', !!(currentProvider && currentProvider.stop));
        console.log('🟡 [SPEECHENGINE-STOP] isProcessing:', this.state.isProcessing);

        if (currentProvider && currentProvider.stop) {
            try {
                console.log('🟡 [SPEECHENGINE-STOP] Calling provider.stop()');
                const startTime = performance.now();
                currentProvider.stop();
                const endTime = performance.now();
                console.log(`🟢 [SPEECHENGINE-STOP] provider.stop() completed in ${(endTime - startTime).toFixed(2)}ms`);
            } catch (error) {
                console.error('🔴 [SPEECHENGINE-STOP] Error calling provider.stop():', error);
            }
        } else {
            console.log('🔴 [SPEECHENGINE-STOP] No current provider or stop method available');
        }

        // Update processing state
        const wasProcessing = this.state.isProcessing;
        this.state.isProcessing = false;
        console.log(`🟢 [SPEECHENGINE-STOP] Processing state: ${wasProcessing} → ${this.state.isProcessing}`);

        console.log('🔴 [SPEECHENGINE-STOP] Speech synthesis stopped successfully');
        console.log('🔴 [SPEECHENGINE-STOP] =================================');
    }

    /**
     * Completely dispose all speech providers and reinitialize them fresh
     * This ensures a completely clean state for all speaking services
     */
    async disposeAndReinitialize() {
        console.log('🟣 [SPEECHENGINE-DISPOSE] ===============================');
        console.log('🟣 [SPEECHENGINE-DISPOSE] Starting complete disposal and reinitialization');
        console.log('🟣 [SPEECHENGINE-DISPOSE] ===============================');

        const startTime = performance.now();

        // First, stop any ongoing speech
        this.stopSpeaking();
        this.stopRecognition();

        // Dispose of all providers completely
        await this.disposeAllProviders();

        // Reset state
        this.resetEngineState();

        // Reinitialize all providers from scratch
        await this.initializeProviders();

        const endTime = performance.now();
        console.log(`🟢 [SPEECHENGINE-DISPOSE] Complete disposal and reinitialization completed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log('🟣 [SPEECHENGINE-DISPOSE] ===============================');
    }

    /**
     * Dispose of all speech providers completely
     * @private
     */
    async disposeAllProviders() {
        console.log('🟡 [SPEECHENGINE-DISPOSE] Disposing all providers...');

        // Dispose Azure provider
        if (this.azureProvider) {
            try {
                console.log('🟡 [SPEECHENGINE-DISPOSE] Disposing Azure provider...');

                // Stop any ongoing synthesis
                if (this.azureProvider.stop) {
                    this.azureProvider.stop();
                }

                // Close synthesizer if it exists
                if (this.azureProvider.synthesizer) {
                    try {
                        this.azureProvider.synthesizer.close();
                        this.azureProvider.synthesizer = null;
                    } catch (error) {
                        console.warn('🟡 [SPEECHENGINE-DISPOSE] Error closing Azure synthesizer:', error);
                    }
                }

                // Close recognizer if it exists
                if (this.azureProvider.recognizer) {
                    try {
                        this.azureProvider.recognizer.close();
                        this.azureProvider.recognizer = null;
                    } catch (error) {
                        console.warn('🟡 [SPEECHENGINE-DISPOSE] Error closing Azure recognizer:', error);
                    }
                }

                // Reset Azure provider state
                this.azureProvider.shouldStop = false;
                this.azureProvider.isActivelyPlaying = false;

                console.log('🟢 [SPEECHENGINE-DISPOSE] Azure provider disposed');
            } catch (error) {
                console.error('🔴 [SPEECHENGINE-DISPOSE] Error disposing Azure provider:', error);
            }
        }

        // Dispose Web Speech provider
        if (this.webSpeechProvider) {
            try {
                console.log('🟡 [SPEECHENGINE-DISPOSE] Disposing Web Speech provider...');

                if (this.webSpeechProvider.stop) {
                    this.webSpeechProvider.stop();
                }

                if (this.webSpeechProvider.stopRecognition) {
                    this.webSpeechProvider.stopRecognition();
                }

                console.log('🟢 [SPEECHENGINE-DISPOSE] Web Speech provider disposed');
            } catch (error) {
                console.error('🔴 [SPEECHENGINE-DISPOSE] Error disposing Web Speech provider:', error);
            }
        }

        // Clear all provider references
        this.webSpeechProvider = null;
        this.azureProvider = null;

        console.log('🟢 [SPEECHENGINE-DISPOSE] All providers disposed and references cleared');
    }

    /**
     * Reset the engine state to initial values
     * @private
     */
    resetEngineState() {
        console.log('🟡 [SPEECHENGINE-DISPOSE] Resetting engine state...');

        this.state = {
            isInitialized: false,
            currentProvider: null,
            isProcessing: false,
            isRecording: false,
            currentUtterance: null,
            availableVoices: [],
            localModelsLoaded: false
        };

        console.log('🟢 [SPEECHENGINE-DISPOSE] Engine state reset');
    }

    /**
     * Stop speech recognition
     */
    stopRecognition() {
        if (this.state.currentProvider && this.state.currentProvider.stopRecognition) {
            this.state.currentProvider.stopRecognition();
        }
        this.state.isRecording = false;
    }

    /**
     * Get available voices for current provider
     */
    getAvailableVoices() {
        const provider = this.state.currentProvider;
        return provider ? provider.getVoices() : [];
    }

    /**
     * Set speech provider
     */
    async setProvider(providerName) {
        return await this.switchProvider(providerName);
    }

    /**
     * Set selected voice
     */
    setVoice(voiceName) {
        this.settings.selectedVoice = voiceName;
        this.saveSettings();

        // Update current provider if it supports voice selection
        const provider = this.state.currentProvider;
        if (provider && provider.setVoice) {
            provider.setVoice(voiceName);
        }
    }

    /**
     * Set speech rate
     */
    setSpeechRate(rate) {
        this.settings.speechRate = Math.max(0.1, Math.min(3.0, rate));
        this.saveSettings();

        // Update current provider
        const provider = this.state.currentProvider;
        if (provider && provider.setRate) {
            provider.setRate(this.settings.speechRate);
        }
    }

    /**
     * Set speech volume
     */
    setSpeechVolume(volume) {
        this.settings.speechVolume = Math.max(0.0, Math.min(1.0, volume));
        this.saveSettings();

        // Update current provider
        const provider = this.state.currentProvider;
        if (provider && provider.setVolume) {
            provider.setVolume(this.settings.speechVolume);
        }
    }

    /**
     * Set auto-speak enabled/disabled
     */
    setAutoSpeak(enabled) {
        this.settings.autoSpeak = Boolean(enabled);
        this.saveSettings();
    }

    /**
     * Set naturalness level (for providers that support it)
     */
    setNaturalness(level) {
        this.settings.naturalness = Math.max(0.0, Math.min(1.0, level));
        this.saveSettings();

        // Update current provider if it supports naturalness
        const provider = this.state.currentProvider;
        if (provider && provider.setNaturalness) {
            provider.setNaturalness(this.settings.naturalness);
        }
    }

    /**
     * Get provider capabilities
     */
    getCapabilities() {
        const provider = this.state.currentProvider;
        if (!provider) return {};

        return {
            supportsTextToSpeech: !!provider.speak,
            supportsSpeechRecognition: !!provider.recognize,
            supportsVoiceSelection: !!provider.getVoices,
            supportsNaturalness: !!provider.supportsNaturalness,
            supportsSSML: !!provider.supportsSSML,
            isOffline: provider.isOffline || false,
            quality: provider.quality || 'standard'
        };
    }

    /**
     * Get provider configuration status
     * @returns {Object} Configuration status for each provider
     */
    getProviderStatus() {
        return {
            [this.providers.WEB_SPEECH]: {
                available: true,
                configured: true,
                name: 'Enhanced Web Speech API',
                description: 'Built-in browser speech with enhanced features'
            },
            [this.providers.AZURE]: {
                available: true,
                configured: this.isAzureConfigurationValid(),
                name: 'Azure Speech Services',
                description: 'Premium cloud-based neural voices',
                configurationRequired: 'Subscription key and region required'
            }
        };
    }

    /**
     * Set language auto-detection for text-to-speech
     */
    setAutoDetectLanguage(enabled) {
        this.settings.autoDetectLanguage = enabled;
        this.saveSettings();
        console.log(`[SpeechEngine] Language auto-detection ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set language detection for speech recognition
     */
    setLanguageDetection(enabled, candidateLanguages = null) {
        this.settings.enableLanguageDetection = enabled;
        if (candidateLanguages && Array.isArray(candidateLanguages)) {
            this.settings.candidateLanguages = candidateLanguages;
        }
        this.saveSettings();
        console.log(`[SpeechEngine] Speech recognition language detection ${enabled ? 'enabled' : 'disabled'}`);

        if (enabled && candidateLanguages) {
            console.log(`[SpeechEngine] Candidate languages:`, candidateLanguages);
        }
    }

    /**
     * Set continuous language detection for speech recognition
     */
    setContinuousLanguageDetection(enabled) {
        this.settings.continuousLanguageDetection = enabled;
        this.saveSettings();
        console.log(`[SpeechEngine] Continuous language detection ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get supported languages for current provider
     */
    getSupportedLanguages() {
        const provider = this.state.currentProvider;

        if (this.settings.provider === this.providers.AZURE) {
            return languageDetector.getSupportedLanguagesForSpeechRecognition();
        }

        // Web Speech API has limited language support
        return ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'zh-CN', 'ja-JP'];
    }

    /**
     * Detect language of text and get appropriate voice
     */
    detectLanguageAndGetVoice(text) {
        const detectedLanguage = languageDetector.detectLanguage(text);
        const appropriateVoice = languageDetector.getVoiceForLanguage(detectedLanguage);

        return {
            language: detectedLanguage,
            voice: appropriateVoice,
            displayName: languageDetector.getLanguageDisplayName(detectedLanguage)
        };
    }

    /**
     * Get multi-language settings
     */
    getMultiLanguageSettings() {
        return {
            autoDetectLanguage: this.settings.autoDetectLanguage,
            enableLanguageDetection: this.settings.enableLanguageDetection,
            continuousLanguageDetection: this.settings.continuousLanguageDetection,
            candidateLanguages: this.settings.candidateLanguages,
            fallbackLanguage: this.settings.fallbackLanguage,
            supportedLanguages: this.getSupportedLanguages()
        };
    }

    /**
     * Test speech functionality
     */
    async testSpeech() {
        const testText = "This is a test of the enhanced speech engine. The current provider is configured to deliver natural-sounding speech with optimized settings.";
        return await this.speakText(testText, { forceSpeak: true });
    }
}

/**
 * Enhanced Web Speech API Provider
 */
class EnhancedWebSpeechProvider {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.recognition = null;
        this.voices = [];
        this.isOffline = false;
        this.quality = 'standard';
        this.supportsNaturalness = true;
        this.supportsSSML = false;
    }

    async initialize() {
        console.log('[EnhancedWebSpeech] Initializing enhanced web speech...');

        if (!this.synthesis) {
            throw new Error('Speech Synthesis not supported');
        }

        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.setupSpeechRecognition();
        }

        await this.loadVoices();
        console.log('[EnhancedWebSpeech] Enhanced web speech initialized');
    }

    async loadVoices() {
        return new Promise((resolve) => {
            const loadVoicesCallback = () => {
                try {
                    const allVoices = this.synthesis.getVoices() || [];
                    // Filter out any invalid voice objects
                    this.voices = allVoices.filter(voice =>
                        voice &&
                        typeof voice === 'object' &&
                        voice.name &&
                        voice.lang
                    );
                    this.rankVoicesByNaturalness();
                    console.log(`[EnhancedWebSpeech] Loaded ${this.voices.length} valid voices out of ${allVoices.length} total`);
                } catch (error) {
                    console.error('[EnhancedWebSpeech] Error loading voices:', error);
                    this.voices = []; // Fallback to empty array
                }
                resolve();
            };

            if (this.synthesis.getVoices().length > 0) {
                loadVoicesCallback();
            } else {
                this.synthesis.onvoiceschanged = loadVoicesCallback;
            }
        });
    }

    rankVoicesByNaturalness() {
        // Enhanced voice ranking algorithm
        this.voices = this.voices.filter(voice => voice && voice.name && voice.lang).map(voice => {
            let naturalness = 0.5; // Base score

            // Prefer neural/high-quality voices
            if (voice.name.toLowerCase().includes('neural') ||
                voice.name.toLowerCase().includes('premium') ||
                voice.name.toLowerCase().includes('enhanced')) {
                naturalness += 0.3;
            }

            // Prefer specific high-quality voice engines
            if (voice.name.includes('Google') ||
                voice.name.includes('Microsoft') ||
                voice.name.includes('Apple')) {
                naturalness += 0.2;
            }

            // Language preference (prefer native language voices)
            if (voice.lang.startsWith(navigator.language.split('-')[0])) {
                naturalness += 0.2;
            }

            // Gender diversity (slight preference for female voices as they tend to be clearer)
            if (voice.name.toLowerCase().includes('female') ||
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('jenny') ||
                voice.name.toLowerCase().includes('aria')) {
                naturalness += 0.1;
            }

            return { ...voice, naturalness: Math.min(naturalness, 1.0) };
        }).sort((a, b) => b.naturalness - a.naturalness);
    }

    setupSpeechRecognition() {
        if (!this.recognition) return;

        this.recognition.lang = navigator.language || 'en-US';

        this.recognition.onstart = () => {
            console.log('[EnhancedWebSpeech] Speech recognition started');
        };

        this.recognition.onend = () => {
            console.log('[EnhancedWebSpeech] Speech recognition ended');
        };

        this.recognition.onerror = (event) => {
            console.error('[EnhancedWebSpeech] Speech recognition error:', event.error);
        };
    }

    async speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!text?.trim()) {
                resolve();
                return;
            }

            // Stop any current speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(this.cleanTextForSpeech(text));

            // Enhanced voice selection
            if (options.voice) {
                const voice = this.voices.find(v => v && v.name === options.voice);
                if (voice) utterance.voice = voice;
            } else {
                // Auto-select best voice based on naturalness
                const bestVoice = this.getBestVoiceForLanguage(navigator.language);
                if (bestVoice) utterance.voice = bestVoice;
            }

            // Enhanced speech parameters for naturalness
            utterance.rate = this.optimizeRate(options.rate || 1.0, options.naturalness || 0.8);
            utterance.pitch = this.optimizePitch(options.naturalness || 0.8);
            utterance.volume = options.volume || 1.0;

            // Progress tracking using boundary events
            if (options.onProgress) {
                const textLength = text.length;
                let spokenChars = 0;

                // Track word boundaries to estimate progress
                utterance.onboundary = (event) => {
                    if (event.name === 'word') {
                        spokenChars = event.charIndex || 0;
                        const progress = Math.min(0.95, spokenChars / textLength); // Cap at 95% until completion
                        console.log(`[WebSpeech] Progress: ${Math.round(progress * 100)}% (${spokenChars}/${textLength} chars)`);
                        options.onProgress(progress);
                    }
                };
            }

            utterance.onend = () => {
                // Set progress to 100% on completion
                if (options.onProgress) {
                    console.log('[WebSpeech] Speech completed - setting progress to 100%');
                    options.onProgress(1.0);
                }
                if (options.onComplete) {
                    options.onComplete();
                }
                resolve();
            };

            utterance.onerror = (event) => {
                // Handle interruption as normal behavior, not an error
                if (event.error === 'interrupted') {
                    console.log('[WebSpeech] Speech interrupted (normal behavior)');
                    if (options.onComplete) {
                        options.onComplete();
                    }
                    resolve(); // Resolve normally for interruptions
                    return;
                }

                // Handle actual errors
                const error = new Error(`Speech synthesis error: ${event.error}`);
                console.error('[WebSpeech] Speech synthesis error:', error);
                if (options.onError) {
                    options.onError(error);
                }
                reject(error);
            };

            // Initial progress for immediate feedback
            if (options.onProgress) {
                console.log('[WebSpeech] Starting speech - setting initial progress');
                options.onProgress(0.05); // 5% to show it has started
            }

            this.synthesis.speak(utterance);
        });
    }

    optimizeRate(baseRate, naturalness) {
        // Adjust rate for more natural speech
        const naturalRate = baseRate * (0.85 + (naturalness * 0.15));
        return Math.max(0.5, Math.min(2.0, naturalRate));
    }

    optimizePitch(naturalness) {
        // Slight pitch variation for more natural speech
        return 1.0 + ((naturalness - 0.5) * 0.2);
    }

    getBestVoiceForLanguage(language) {
        if (!language || !this.voices || this.voices.length === 0) {
            return null;
        }

        const langCode = language.split('-')[0];
        const matchingVoices = this.voices.filter(voice =>
            voice && voice.lang && voice.lang.startsWith(langCode)
        );

        return matchingVoices.length > 0 ? matchingVoices[0] : (this.voices[0] || null);
    }

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

    async recognize(options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.recognition) {
                reject(new Error('Speech recognition not available'));
                return;
            }

            this.recognition.onresult = (event) => {
                const result = event.results[0][0].transcript;
                resolve(result);
            };

            this.recognition.onerror = (event) => {
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            this.recognition.start();
        });
    }

    stop() {
        if (this.synthesis) {
            try {
                console.log('[WebSpeech] Stopping speech synthesis');
                this.synthesis.cancel();
            } catch (error) {
                console.warn('[WebSpeech] Error stopping speech synthesis:', error);
            }
        }
    }

    stopRecognition() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    getVoices() {
        return this.voices;
    }

    get supportsSpeechRecognition() {
        return !!this.recognition;
    }
}

/**
 * Azure Speech Services Provider
 */
class AzureSpeechProvider {
    constructor(settings) {
        this.settings = settings;
        this.isOffline = false;
        this.quality = 'premium';
        this.supportsNaturalness = true;
        this.supportsSSML = true;
        this.speechConfig = null;
        this.synthesizer = null;
        this.recognizer = null;

        // Tracking flags for proper stop handling
        this.shouldStop = false;
        this.isActivelyPlaying = false;
    }

    async initialize() {
        console.log('[AzureSpeech] Initializing Azure Speech Services...');

        try {
            // Load Azure Speech SDK
            await this.loadAzureSpeechSDK();

            // Initialize speech configuration
            this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                this.settings.subscriptionKey,
                this.settings.region
            );

            this.speechConfig.speechSynthesisVoiceName = this.settings.voiceName;

            console.log('[AzureSpeech] Azure Speech Services initialized');
        } catch (error) {
            console.error('[AzureSpeech] Failed to initialize Azure Speech:', error);
            throw error;
        }
    }

    async loadAzureSpeechSDK() {
        if (window.SpeechSDK) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://aka.ms/csspeech/jsbrowserpackageraw';
            script.onload = () => {
                window.SpeechSDK = window.SpeechSDK || window.Microsoft.CognitiveServices.Speech;
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Azure Speech SDK'));
            document.head.appendChild(script);
        });
    }

    async speak(text, options = {}) {
        if (!this.speechConfig) {
            throw new Error('Azure Speech not initialized');
        }

        // Reset stop flag for new synthesis
        this.shouldStop = false;
        this.isActivelyPlaying = true;

        // Initial progress for preparation
        if (options.onProgress) {
            console.log('[Azure] Starting speech preparation...');
            options.onProgress(0.1); // 10% - Starting preparation
        }

        return new Promise((resolve, reject) => {
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();

            // Auto-detect language and select appropriate voice if enabled
            if (options.autoDetectLanguage) {
                try {
                    const languageDetector = options.languageDetector;
                    if (languageDetector) {
                        const detectedLanguage = languageDetector.detectLanguage(text);
                        const appropriateVoice = languageDetector.getVoiceForLanguage(detectedLanguage);

                        console.log(`[AzureSpeech] Auto-detected language: ${detectedLanguage}, using voice: ${appropriateVoice}`);

                        // Update speech config with detected language voice
                        this.speechConfig.speechSynthesisVoiceName = appropriateVoice;
                        this.settings.voiceName = appropriateVoice;
                    }
                } catch (error) {
                    console.warn('[AzureSpeech] Language auto-detection failed, using default voice:', error);
                }
            }

            if (options.onProgress) {
                console.log('[Azure] Voice configuration ready');
                options.onProgress(0.2); // 20% - Voice configured
            }

            // Create a NEW synthesizer for each synthesis to ensure clean state
            if (this.synthesizer) {
                try {
                    this.synthesizer.close();
                } catch (e) {
                    console.warn('[AzureSpeech] Error closing previous synthesizer:', e);
                }
            }

            this.synthesizer = new SpeechSDK.SpeechSynthesizer(this.speechConfig, audioConfig);

            // Set up Azure synthesis event handlers for real progress tracking
            let synthesisComplete = false;
            let audioStartTime = null;
            let estimatedDuration = 0;

            if (options.onProgress) {
                console.log('[Azure] Setting up synthesis event handlers...');

                // Calculate estimated duration for playback progress
                const wordsPerMinute = 150; // Typical Azure voice speed
                const words = text.trim().split(/\s+/).length;
                estimatedDuration = (words / wordsPerMinute) * 60 * 1000; // in milliseconds
                console.log(`[Azure] Estimated audio duration: ${Math.round(estimatedDuration)}ms for ${words} words`);

                // Track synthesis start
                this.synthesizer.synthesisStarted = (s, e) => {
                    console.log('[Azure] Synthesis started');
                    options.onProgress(0.4); // 40% - Synthesis started
                };

                // Track synthesis progress through audio data events
                this.synthesizer.synthesizing = (s, e) => {
                    if (!synthesisComplete) {
                        console.log('[Azure] Synthesizing audio data...');
                        // Progressive increase during synthesis (40-60%)
                        const synthProgress = Math.min(0.6, 0.4 + (Math.random() * 0.15));
                        options.onProgress(synthProgress);
                    }
                };

                // Track when synthesis completes but before audio starts playing
                this.synthesizer.synthesisCompleted = (s, e) => {
                    synthesisComplete = true;
                    audioStartTime = Date.now();
                    console.log('[Azure] Synthesis completed, audio starting playback');
                    options.onProgress(0.7); // 70% - Audio ready and starting playback

                    // Start playback progress tracking - reduced frequency for better performance
                    const playbackInterval = setInterval(() => {
                        if (!this.isActivelyPlaying) {
                            clearInterval(playbackInterval);
                            return;
                        }

                        const elapsed = Date.now() - audioStartTime;
                        const playbackProgress = Math.min(0.95, elapsed / estimatedDuration);
                        const totalProgress = 0.7 + (playbackProgress * 0.25); // 70-95% during playback

                        console.log(`[Azure] Playback progress: ${Math.round(totalProgress * 100)}%`);
                        options.onProgress(totalProgress);

                        if (elapsed >= estimatedDuration) {
                            clearInterval(playbackInterval);
                        }
                    }, 1000); // Increased from 200ms to 1000ms to reduce CPU usage
                };
            }

            let ssmlText = text;

            // Use SSML for enhanced naturalness
            if (options.naturalness > 0.7) {
                ssmlText = this.createSSML(text, options);
            }

            if (options.onProgress) {
                console.log('[Azure] SSML prepared, starting synthesis...');
                options.onProgress(0.3); // 30% - SSML prepared
            }

            console.log('🟢 [AZURE-SPEECH-START] =================================');
            console.log('🟢 [AZURE-SPEECH-START] Starting Azure speech synthesis');
            console.log(`🟢 [AZURE-SPEECH-START] Text length: ${text.length} characters`);
            console.log(`🟢 [AZURE-SPEECH-START] Voice: ${this.settings.voiceName}`);
            console.log(`🟢 [AZURE-SPEECH-START] Using SSML: ${options.naturalness > 0.7}`);
            console.log('🟢 [AZURE-SPEECH-START] =================================');

            this.synthesizer.speakSsmlAsync(
                ssmlText,
                (result) => {
                    // Check if we should stop before processing result
                    if (this.shouldStop) {
                        console.log('🟡 [AZURE-SPEECH-INTERRUPTED] Speech was stopped before completion');
                        this.isActivelyPlaying = false;
                        this.synthesizer.close();
                        this.synthesizer = null;
                        resolve(); // Resolve even if stopped
                        return;
                    }

                    console.log('🟢 [AZURE-SPEECH-COMPLETE] Speech synthesis completed successfully');
                    console.log(`🟢 [AZURE-SPEECH-COMPLETE] Result reason: ${result.reason}`);

                    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                        this.isActivelyPlaying = false;

                        // Complete progress
                        if (options.onProgress) {
                            console.log('[Azure] Speech synthesis and playback completed');
                            options.onProgress(1.0); // 100% - Complete
                        }
                        if (options.onComplete) {
                            options.onComplete();
                        }

                        resolve();
                    } else {
                        console.error('🔴 [AZURE-SPEECH-ERROR] Speech synthesis failed:', result.errorDetails);
                        this.isActivelyPlaying = false;
                        const error = new Error(`Speech synthesis failed: ${result.errorDetails}`);
                        if (options.onError) {
                            options.onError(error);
                        }
                        reject(error);
                    }

                    console.log('🟡 [AZURE-SPEECH-CLEANUP] Closing synthesizer after completion');
                    this.synthesizer.close();
                    this.synthesizer = null; // Clear reference
                },
                (error) => {
                    console.error('🔴 [AZURE-SPEECH-ERROR] Speech synthesis error:', error);
                    this.isActivelyPlaying = false;

                    if (!this.shouldStop) {
                        const synthError = new Error(`Speech synthesis error: ${error}`);
                        if (options.onError) {
                            options.onError(synthError);
                        }
                        reject(synthError);
                    } else {
                        console.log('🟡 [AZURE-SPEECH-STOPPED] Error occurred but synthesis was intentionally stopped');
                        resolve(); // Resolve if we intentionally stopped
                    }

                    console.log('🟡 [AZURE-SPEECH-CLEANUP] Closing synthesizer after error');
                    if (this.synthesizer) {
                        this.synthesizer.close();
                        this.synthesizer = null; // Clear reference
                    }
                }
            );
        });
    }

    stopContinuousRecognition() {
        if (this.recognizer) {
            return new Promise((resolve) => {
                this.recognizer.stopContinuousRecognitionAsync(
                    () => {
                        console.log('[AzureSpeech] Continuous recognition stopped');
                        this.recognizer.close();
                        this.recognizer = null;
                        resolve();
                    },
                    (error) => {
                        console.error('[AzureSpeech] Error stopping continuous recognition:', error);
                        this.recognizer.close();
                        this.recognizer = null;
                        resolve(); // Resolve anyway to prevent hanging
                    }
                );
            });
        }
        return Promise.resolve();
    }

    createSSML(text, options) {
        const rate = this.mapRateToSSML(options.rate || 1.0);
        const volume = this.mapVolumeToSSML(options.volume || 1.0);
        const style = options.naturalness > 0.8 ? 'conversational' : 'general';

        return `
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
                   xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
                <voice name="${this.settings.voiceName}">
                    <mstts:express-as style="${style}">
                        <prosody rate="${rate}" volume="${volume}">
                            ${this.escapeSSML(text)}
                        </prosody>
                    </mstts:express-as>
                </voice>
            </speak>
        `;
    }

    mapRateToSSML(rate) {
        if (rate < 0.7) return 'x-slow';
        if (rate < 0.9) return 'slow';
        if (rate > 1.3) return 'fast';
        if (rate > 1.1) return 'medium';
        return 'default';
    }

    mapVolumeToSSML(volume) {
        if (volume < 0.3) return 'x-soft';
        if (volume < 0.6) return 'soft';
        if (volume > 0.9) return 'loud';
        if (volume > 0.7) return 'medium';
        return 'default';
    }

    escapeSSML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    async recognize(options = {}) {
        if (!this.speechConfig) {
            throw new Error('Azure Speech not initialized');
        }

        return new Promise((resolve, reject) => {
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

            // Use language identification if enabled
            if (options.enableLanguageDetection && options.candidateLanguages && options.candidateLanguages.length > 0) {
                const autoDetectConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(
                    options.candidateLanguages
                );

                this.recognizer = SpeechSDK.SpeechRecognizer.FromConfig(
                    this.speechConfig,
                    autoDetectConfig,
                    audioConfig
                );
            } else {
                this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);
            }

            this.recognizer.recognizeOnceAsync(
                (result) => {
                    if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                        let response = { text: result.text };

                        // Include detected language if language identification was used
                        if (options.enableLanguageDetection) {
                            try {
                                const autoDetectResult = SpeechSDK.AutoDetectSourceLanguageResult.fromResult(result);
                                response.detectedLanguage = autoDetectResult.language;
                                console.log('[AzureSpeech] Detected language:', response.detectedLanguage);
                            } catch (error) {
                                console.warn('[AzureSpeech] Could not extract detected language:', error);
                            }
                        }

                        resolve(response);
                    } else {
                        reject(new Error(`Speech recognition failed: ${result.errorDetails}`));
                    }
                    this.recognizer.close();
                },
                (error) => {
                    reject(new Error(`Speech recognition error: ${error}`));
                    this.recognizer.close();
                }
            );
        });
    }

    async startContinuousRecognition(options = {}) {
        if (!this.speechConfig) {
            throw new Error('Azure Speech not initialized');
        }

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

        // Configure for continuous language identification if enabled
        if (options.enableLanguageDetection && options.candidateLanguages) {
            const autoDetectConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(
                options.candidateLanguages
            );

            // Enable continuous language identification
            if (options.continuousLanguageDetection) {
                this.speechConfig.setProperty(
                    SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode,
                    "Continuous"
                );
            }

            this.recognizer = new SpeechSDK.SpeechRecognizer(
                this.speechConfig,
                autoDetectConfig,
                audioConfig
            );
        } else {
            this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);
        }

        return new Promise((resolve, reject) => {
            // Set up event handlers
            this.recognizer.recognizing = (s, e) => {
                if (options.onRecognizing) {
                    let data = { text: e.result.text };

                    // Include detected language for continuous recognition
                    if (options.enableLanguageDetection) {
                        try {
                            const autoDetectResult = SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result);
                            data.detectedLanguage = autoDetectResult.language;
                        } catch (error) {
                            // Language detection might not be available for intermediate results
                        }
                    }

                    options.onRecognizing(data);
                }
            };

            this.recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && options.onRecognized) {
                    let data = { text: e.result.text };

                    // Include detected language
                    if (options.enableLanguageDetection) {
                        try {
                            const autoDetectResult = SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result);
                            data.detectedLanguage = autoDetectResult.language;
                            console.log('[AzureSpeech] Continuous recognition detected language:', data.detectedLanguage);
                        } catch (error) {
                            console.warn('[AzureSpeech] Could not extract detected language:', error);
                        }
                    }

                    options.onRecognized(data);
                }
            };

            this.recognizer.canceled = (s, e) => {
                console.log('[AzureSpeech] Recognition canceled:', e.reason);
                if (options.onError) {
                    options.onError(new Error(`Recognition canceled: ${e.errorDetails}`));
                }
            };

            this.recognizer.sessionStopped = (s, e) => {
                console.log('[AzureSpeech] Session stopped');
                if (options.onStopped) {
                    options.onStopped();
                }
            };

            // Start continuous recognition
            this.recognizer.startContinuousRecognitionAsync(
                () => {
                    console.log('[AzureSpeech] Continuous recognition started');
                    resolve();
                },
                (error) => {
                    console.error('[AzureSpeech] Failed to start continuous recognition:', error);
                    reject(new Error(`Failed to start continuous recognition: ${error}`));
                }
            );
        });
    }

    stop() {
        console.log('🔴 [AZURE-PROVIDER-STOP] Azure speech provider stop() called');
        console.log('🔴 [AZURE-PROVIDER-STOP] Synthesizer available:', !!this.synthesizer);
        console.log('🔴 [AZURE-PROVIDER-STOP] Active synthesis in progress:', this.isActivelyPlaying);

        // Set flag to indicate we want to stop
        this.shouldStop = true;

        if (this.synthesizer) {
            try {
                console.log('🟡 [AZURE-PROVIDER-STOP] Attempting advanced audio stopping technique');
                const startTime = performance.now();

                // SOLUTION FROM GITHUB ISSUE #2647: Access internal audio object
                // https://github.com/Azure-Samples/cognitive-services-speech-sdk/issues/2647
                const audio = this.synthesizer.privAdapter?.privSessionAudioDestination?.privDestination?.privAudio;

                if (audio) {
                    console.log('🟢 [AZURE-PROVIDER-STOP] Found internal audio object, stopping playback');

                    // Pause the audio immediately
                    audio.pause();

                    // Reset audio position to beginning
                    audio.currentTime = 0;

                    console.log('🟢 [AZURE-PROVIDER-STOP] Audio paused and reset to beginning');
                } else {
                    console.warn('🟡 [AZURE-PROVIDER-STOP] Internal audio object not found, using fallback method');
                }

                // Close the synthesizer
                this.synthesizer.close();

                const endTime = performance.now();
                console.log(`🟢 [AZURE-PROVIDER-STOP] Stop sequence completed in ${(endTime - startTime).toFixed(2)}ms`);

                // Clear the synthesizer reference
                this.synthesizer = null;
                this.isActivelyPlaying = false;
                console.log('🟢 [AZURE-PROVIDER-STOP] Synthesizer reference cleared and state reset');
            } catch (error) {
                console.error('🔴 [AZURE-PROVIDER-STOP] Error during advanced stop sequence:', error);

                // Fallback: try basic close() method
                try {
                    if (this.synthesizer) {
                        this.synthesizer.close();
                        this.synthesizer = null;
                        this.isActivelyPlaying = false;
                        console.log('🟡 [AZURE-PROVIDER-STOP] Fallback close() method succeeded');
                    }
                } catch (fallbackError) {
                    console.error('🔴 [AZURE-PROVIDER-STOP] Even fallback close() failed:', fallbackError);
                }
            }
        } else {
            console.log('🔴 [AZURE-PROVIDER-STOP] No synthesizer to stop');
        }

        // Additional cleanup: try to stop any audio playback at browser level
        try {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                console.log('🟡 [AZURE-PROVIDER-STOP] Also calling window.speechSynthesis.cancel() as extra fallback');
                window.speechSynthesis.cancel();
            }
        } catch (fallbackError) {
            console.error('🔴 [AZURE-PROVIDER-STOP] Error in browser speechSynthesis.cancel():', fallbackError);
        }

        console.log('🟢 [AZURE-PROVIDER-STOP] Azure provider stop() completed');
    }

    stopRecognition() {
        if (this.recognizer) {
            this.recognizer.close();
        }
    }

    /**
     * Pause current Azure TTS playback (if supported)
     * Uses the same internal audio object access technique
     */
    pause() {
        console.log('🟡 [AZURE-PROVIDER-PAUSE] Attempting to pause Azure TTS playback');

        if (this.synthesizer) {
            try {
                const audio = this.synthesizer.privAdapter?.privSessionAudioDestination?.privDestination?.privAudio;

                if (audio && !audio.paused) {
                    audio.pause();
                    console.log('🟢 [AZURE-PROVIDER-PAUSE] Audio playback paused successfully');
                    return true;
                } else if (audio && audio.paused) {
                    console.log('🟡 [AZURE-PROVIDER-PAUSE] Audio is already paused');
                    return true;
                } else {
                    console.warn('🟡 [AZURE-PROVIDER-PAUSE] Internal audio object not accessible');
                    return false;
                }
            } catch (error) {
                console.error('🔴 [AZURE-PROVIDER-PAUSE] Error pausing audio:', error);
                return false;
            }
        } else {
            console.log('🔴 [AZURE-PROVIDER-PAUSE] No synthesizer available to pause');
            return false;
        }
    }

    /**
     * Resume paused Azure TTS playback (if supported)
     * Uses the same internal audio object access technique
     */
    resume() {
        console.log('🟡 [AZURE-PROVIDER-RESUME] Attempting to resume Azure TTS playback');

        if (this.synthesizer) {
            try {
                const audio = this.synthesizer.privAdapter?.privSessionAudioDestination?.privDestination?.privAudio;

                if (audio && audio.paused) {
                    audio.play();
                    console.log('🟢 [AZURE-PROVIDER-RESUME] Audio playback resumed successfully');
                    return true;
                } else if (audio && !audio.paused) {
                    console.log('🟡 [AZURE-PROVIDER-RESUME] Audio is already playing');
                    return true;
                } else {
                    console.warn('🟡 [AZURE-PROVIDER-RESUME] Internal audio object not accessible');
                    return false;
                }
            } catch (error) {
                console.error('🔴 [AZURE-PROVIDER-RESUME] Error resuming audio:', error);
                return false;
            }
        } else {
            console.log('🔴 [AZURE-PROVIDER-RESUME] No synthesizer available to resume');
            return false;
        }
    }

    getVoices() {
        // Azure provides many neural voices
        return [
            { name: 'en-US-JennyNeural', lang: 'en-US', naturalness: 0.95 },
            { name: 'en-US-AriaNeural', lang: 'en-US', naturalness: 0.95 },
            { name: 'en-US-GuyNeural', lang: 'en-US', naturalness: 0.95 },
            { name: 'en-US-DavisNeural', lang: 'en-US', naturalness: 0.9 },
            { name: 'en-GB-SoniaNeural', lang: 'en-GB', naturalness: 0.95 },
            { name: 'en-AU-NatashaNeural', lang: 'en-AU', naturalness: 0.95 }
        ];
    }

    get supportsSpeechRecognition() {
        return true;
    }
}

// Export the main speech engine
export const speechEngine = new SpeechEngine();
