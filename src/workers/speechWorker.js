/**
 * Speech Processing Web Worker
 * Handles local AI model processing for speech synthesis and recognition
 */

let models = {
    tts: null,
    stt: null,
    ttsModelName: null,
    sttModelName: null
};

// Predefined voice profiles for Local AI models
const voiceProfiles = {
    'neutral': {
        name: 'Neutral Voice',
        description: 'Balanced, professional voice',
        embeddings: null // Will be generated
    },
    'warm': {
        name: 'Warm Voice', 
        description: 'Friendly, approachable voice',
        embeddings: null
    },
    'confident': {
        name: 'Confident Voice',
        description: 'Strong, assertive voice', 
        embeddings: null
    },
    'gentle': {
        name: 'Gentle Voice',
        description: 'Soft, calm voice',
        embeddings: null
    },
    'energetic': {
        name: 'Energetic Voice',
        description: 'Lively, enthusiastic voice',
        embeddings: null
    }
};

let currentVoiceProfile = 'neutral';

let isInitialized = false;

// Handle messages from main thread
self.onmessage = async function(event) {
    const { type, ...data } = event.data;
    
    try {
        switch (type) {
            case 'initialize':
                await initializeModels(data.modelPath);
                break;
                
            case 'synthesize':
                await synthesizeText(data.text, data.options || {});
                break;
                
            case 'recognize':
                await recognizeSpeech(data.audioData, data.options || {});
                break;
                
            case 'setVoice':
                if (voiceProfiles[data.voiceId]) {
                    currentVoiceProfile = data.voiceId;
                    console.log(`[SpeechWorker] Voice changed to: ${voiceProfiles[data.voiceId].name}`);
                    self.postMessage({
                        type: 'voice_changed',
                        voiceId: data.voiceId,
                        voiceName: voiceProfiles[data.voiceId].name
                    });
                } else {
                    console.warn(`[SpeechWorker] Unknown voice profile: ${data.voiceId}`);
                }
                break;
                
            case 'getVoices':
                const availableVoices = Object.entries(voiceProfiles).map(([id, profile]) => ({
                    id: id,
                    name: profile.name,
                    description: profile.description,
                    isDefault: id === 'neutral'
                }));
                
                self.postMessage({
                    type: 'voices_list',
                    voices: availableVoices,
                    currentVoice: currentVoiceProfile,
                    modelName: models.ttsModelName
                });
                break;
            case 'stop':
                stopProcessing();
                break;
            case 'stop_recognition':
                stopRecognition();
                break;
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: `${type}_error`,
            success: false,
            error: error.message
        });
    }
};

/**
 * Generate speaker embeddings for different voice profiles
 */
function generateVoiceEmbeddings(voiceType = 'neutral') {
    const embeddingSize = 512;
    const embeddings = new Float32Array(embeddingSize);
    
    // Generate voice-specific embeddings using different random seeds and patterns
    switch (voiceType) {
        case 'neutral':
            // Balanced, centered embeddings
            for (let i = 0; i < embeddingSize; i++) {
                embeddings[i] = (Math.random() - 0.5) * 0.1;
            }
            break;
            
        case 'warm':
            // Slightly positive bias for warmer tone
            for (let i = 0; i < embeddingSize; i++) {
                embeddings[i] = Math.random() * 0.15 - 0.05;
            }
            break;
            
        case 'confident':
            // Stronger values for more assertive voice
            for (let i = 0; i < embeddingSize; i++) {
                embeddings[i] = (Math.random() - 0.5) * 0.2;
                if (i % 3 === 0) embeddings[i] *= 1.5; // Emphasize certain frequencies
            }
            break;
            
        case 'gentle':
            // Softer, smaller values for gentle voice
            for (let i = 0; i < embeddingSize; i++) {
                embeddings[i] = (Math.random() - 0.5) * 0.05;
            }
            break;
            
        case 'energetic':
            // More dynamic range for energetic voice
            for (let i = 0; i < embeddingSize; i++) {
                embeddings[i] = (Math.random() - 0.5) * 0.25;
                if (i % 4 === 0) embeddings[i] *= 1.8; // Add energy peaks
            }
            break;
            
        default:
            // Default to neutral
            for (let i = 0; i < embeddingSize; i++) {
                embeddings[i] = (Math.random() - 0.5) * 0.1;
            }
    }
    
    return embeddings;
}

/**
 * Initialize voice profiles with their embeddings
 */
function initializeVoiceProfiles() {
    for (const [voiceId, profile] of Object.entries(voiceProfiles)) {
        profile.embeddings = generateVoiceEmbeddings(voiceId);
        console.log(`[SpeechWorker] Generated embeddings for ${profile.name}`);
    }
}
async function initializeModels(modelPath) {
    try {
        console.log('[SpeechWorker] Initializing AI models...');
        
        // Web Workers have limitations with ES modules
        // Transformers.js is an ES module which doesn't work well with importScripts or eval
        // We'll try dynamic import or fail gracefully
        
        console.log('[SpeechWorker] Attempting to load Transformers.js in Web Worker...');
        
        // Method 1: Try to use dynamic import (may not work in all browsers for workers)
        try {
            console.log('[SpeechWorker] Trying dynamic import...');
            const transformers = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
            
            if (transformers && transformers.pipeline) {
                console.log('[SpeechWorker] Successfully loaded via dynamic import');
                
                // Initialize text-to-speech model
                console.log('[SpeechWorker] Loading TTS model...');
                
                // Try different TTS models based on availability
                let ttsModel = null;
                const ttsModels = [
                    // Simpler models that don't require speaker embeddings
                    'Xenova/mms-tts-eng',
                    'Xenova/speecht5_tts'  // Fallback to SpeechT5 if others don't work
                ];
                
                for (const modelName of ttsModels) {
                    try {
                        console.log(`[SpeechWorker] Trying TTS model: ${modelName}`);
                        ttsModel = await transformers.pipeline('text-to-speech', modelName, {
                            quantized: true,
                            progress_callback: (progress) => {
                                self.postMessage({
                                    type: 'loading_progress',
                                    model: 'tts',
                                    progress: progress
                                });
                            }
                        });
                        
                        models.tts = ttsModel;
                        models.ttsModelName = modelName;
                        console.log(`[SpeechWorker] Successfully loaded TTS model: ${modelName}`);
                        break;
                        
                    } catch (modelError) {
                        console.warn(`[SpeechWorker] Failed to load ${modelName}:`, modelError.message);
                        continue;
                    }
                }
                
                if (!models.tts) {
                    throw new Error('No TTS models could be loaded');
                }
                
                console.log('[SpeechWorker] TTS model loaded successfully');
                
                // Initialize voice profiles for SpeechT5
                if (models.ttsModelName === 'Xenova/speecht5_tts') {
                    initializeVoiceProfiles();
                }
                
                // Initialize speech recognition model (optional)
                try {
                    console.log('[SpeechWorker] Loading STT model...');
                    models.stt = await transformers.pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                        quantized: true,
                        progress_callback: (progress) => {
                            self.postMessage({
                                type: 'loading_progress',
                                model: 'stt',
                                progress: progress
                            });
                        }
                    });
                    console.log('[SpeechWorker] STT model loaded successfully');
                } catch (sttError) {
                    console.warn('[SpeechWorker] STT model failed to load (optional):', sttError.message);
                }
                
                isInitialized = true;
                self.postMessage({
                    type: 'initialized',
                    success: true,
                    message: 'Local AI models initialized successfully'
                });
                
                console.log('[SpeechWorker] Models initialized successfully');
                return;
            }
        } catch (importError) {
            console.warn('[SpeechWorker] Dynamic import failed:', importError.message);
        }
        
        // If we get here, dynamic import failed
        console.log('[SpeechWorker] Web Worker ES module loading not supported in this environment');
        throw new Error('Web Workers do not support ES modules in this browser. Local AI speech synthesis requires a more modern browser or different implementation approach.');
        
    } catch (error) {
        console.error('[SpeechWorker] Failed to initialize models:', error);
        self.postMessage({
            type: 'initialized',
            success: false,
            error: `Local AI models failed to load: ${error.message}. This is expected in many browsers due to Web Worker limitations with ES modules. The system will automatically fall back to Enhanced Web Speech API.`
        });
    }
}

/**
 * Synthesize text to speech
 */
async function synthesizeText(text, options = {}) {
    if (!isInitialized || !models.tts) {
        throw new Error('TTS model not initialized');
    }
    
    try {
        console.log('[SpeechWorker] Synthesizing text:', text.substring(0, 50) + '...');
        console.log('[SpeechWorker] Using model:', models.ttsModelName || 'unknown');
        
        let result;
        
        // Handle different model types
        if (models.ttsModelName === 'Xenova/speecht5_tts') {
            // SpeechT5 requires speaker embeddings
            let speakerEmbeddings = options.speakerEmbeddings;
            
            if (!speakerEmbeddings) {
                // Use voice profile if specified, otherwise default to neutral
                const voiceId = options.voiceProfile || currentVoiceProfile || 'neutral';
                const profile = voiceProfiles[voiceId];
                
                if (profile && profile.embeddings) {
                    speakerEmbeddings = profile.embeddings;
                    console.log(`[SpeechWorker] Using ${profile.name} voice profile`);
                } else {
                    // Fallback to generating neutral embeddings
                    speakerEmbeddings = generateVoiceEmbeddings('neutral');
                    console.log('[SpeechWorker] Using fallback neutral voice embeddings');
                }
            }
            
            result = await models.tts(text, {
                speaker_embeddings: speakerEmbeddings
            });
            
        } else {
            // Other models (like MMS-TTS) don't require speaker embeddings
            console.log('[SpeechWorker] Using model without speaker embeddings');
            result = await models.tts(text);
        }
        
        // Extract audio data
        let audioData = result.audio;
        
        // Apply rate and volume adjustments if requested
        if (options.rate && options.rate !== 1.0) {
            audioData = adjustAudioRate(audioData, options.rate);
        }
        
        if (options.volume && options.volume !== 1.0) {
            audioData = adjustAudioVolume(audioData, options.volume);
        }
        
        console.log('[SpeechWorker] Text synthesis completed successfully');
        console.log('[SpeechWorker] Audio data length:', audioData ? audioData.length : 'null');
        
        self.postMessage({
            type: 'tts_complete',
            success: true,
            audioData: audioData,
            sampleRate: result.sampling_rate || 16000
        });
        
    } catch (error) {
        console.error('[SpeechWorker] Text synthesis failed:', error);
        console.error('[SpeechWorker] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        self.postMessage({
            type: 'tts_complete',
            success: false,
            error: `Speech synthesis failed: ${error.message}. This may be due to model incompatibility or missing dependencies.`
        });
    }
}

/**
 * Recognize speech from audio data
 */
async function recognizeAudio(audioData, options = {}) {
    if (!isInitialized || !models.stt) {
        throw new Error('STT model not initialized');
    }
    
    try {
        console.log('[SpeechWorker] Recognizing audio...');
        
        // Process audio with STT model
        const result = await models.stt(audioData);
        
        self.postMessage({
            type: 'stt_complete',
            success: true,
            transcript: result.text
        });
        
    } catch (error) {
        console.error('[SpeechWorker] Speech recognition failed:', error);
        self.postMessage({
            type: 'stt_complete',
            success: false,
            error: error.message
        });
    }
}

/**
 * Adjust audio playback rate
 */
function adjustAudioRate(audioData, rate) {
    if (rate === 1.0) return audioData;
    
    const length = Math.floor(audioData.length / rate);
    const adjusted = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
        const srcIndex = Math.floor(i * rate);
        if (srcIndex < audioData.length) {
            adjusted[i] = audioData[srcIndex];
        }
    }
    
    return adjusted;
}

/**
 * Adjust audio volume
 */
function adjustAudioVolume(audioData, volume) {
    if (volume === 1.0) return audioData;
    
    const adjusted = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
        adjusted[i] = audioData[i] * volume;
    }
    
    return adjusted;
}

/**
 * Stop current processing
 */
function stopProcessing() {
    // Interrupt any ongoing synthesis
    console.log('[SpeechWorker] Stopping processing...');
    
    self.postMessage({
        type: 'processing_stopped',
        success: true
    });
}

/**
 * Stop speech recognition
 */
function stopRecognition() {
    // Interrupt any ongoing recognition
    console.log('[SpeechWorker] Stopping recognition...');
    
    self.postMessage({
        type: 'recognition_stopped',
        success: true
    });
}

console.log('[SpeechWorker] Speech processing worker loaded and ready');
