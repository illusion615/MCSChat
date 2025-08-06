/**
 * Language Detection Utility
 * Provides text language detection for multi-language TTS support
 */

export class LanguageDetector {
    constructor() {
        this.isInitialized = false;
        this.fallbackLanguage = 'en-US';
        
        // Language patterns for basic detection
        this.languagePatterns = {
            'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
            'es': /\b(el|la|y|o|pero|en|con|de|para|por|que|es|son)\b/gi,
            'fr': /\b(le|la|et|ou|mais|dans|sur|à|pour|de|avec|par|que|est|sont)\b/gi,
            'de': /\b(der|die|das|und|oder|aber|in|auf|zu|für|von|mit|bei|dass|ist|sind)\b/gi,
            'zh': /[\u4e00-\u9fff]/g,
            'ja': /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g,
            'ko': /[\uac00-\ud7af]/g,
            'ru': /[\u0400-\u04ff]/g,
            'ar': /[\u0600-\u06ff]/g,
            'hi': /[\u0900-\u097f]/g
        };
        
        // Map language codes to Azure voices
        this.languageVoiceMap = {
            'en-US': 'en-US-JennyNeural',
            'en-GB': 'en-GB-SoniaNeural',
            'en-AU': 'en-AU-NatashaNeural',
            'es-ES': 'es-ES-ElviraNeural',
            'es-MX': 'es-MX-DaliaNeural',
            'fr-FR': 'fr-FR-DeniseNeural',
            'fr-CA': 'fr-CA-SylvieNeural',
            'de-DE': 'de-DE-KatjaNeural',
            'it-IT': 'it-IT-ElsaNeural',
            'pt-BR': 'pt-BR-FranciscaNeural',
            'pt-PT': 'pt-PT-RaquelNeural',
            'zh-CN': 'zh-CN-XiaoxiaoNeural',
            'zh-TW': 'zh-TW-HsiaoyuNeural',
            'ja-JP': 'ja-JP-NanamiNeural',
            'ko-KR': 'ko-KR-SunHiNeural',
            'ru-RU': 'ru-RU-SvetlanaNeural',
            'ar-SA': 'ar-SA-ZariyahNeural',
            'hi-IN': 'hi-IN-SwaraNeural'
        };

        this.initializeDetector();
    }

    async initializeDetector() {
        try {
            console.log('[LanguageDetector] Initializing language detection...');
            this.isInitialized = true;
            console.log('[LanguageDetector] Language detection initialized successfully');
        } catch (error) {
            console.warn('[LanguageDetector] Failed to initialize language detection:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Detect the primary language of a text string
     * @param {string} text - Text to analyze
     * @returns {string} Detected language code (e.g., 'en-US')
     */
    detectLanguage(text) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return this.fallbackLanguage;
        }

        const cleanText = text.toLowerCase().trim();
        const scores = {};

        // Initialize scores
        for (const lang in this.languagePatterns) {
            scores[lang] = 0;
        }

        // Score based on character patterns
        for (const [lang, pattern] of Object.entries(this.languagePatterns)) {
            const matches = cleanText.match(pattern);
            if (matches) {
                scores[lang] = matches.length;
            }
        }

        // Find the language with the highest score
        let detectedLang = 'en';
        let maxScore = scores.en;

        for (const [lang, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedLang = lang;
            }
        }

        // Convert to full locale code
        const fullLocale = this.mapToFullLocale(detectedLang, text);
        
        console.log(`[LanguageDetector] Detected language: ${fullLocale} (score: ${maxScore})`);
        return fullLocale;
    }

    /**
     * Map basic language code to full locale
     * @param {string} basicLang - Basic language code (e.g., 'en', 'es')
     * @param {string} text - Original text for additional context
     * @returns {string} Full locale code (e.g., 'en-US', 'es-ES')
     */
    mapToFullLocale(basicLang, text = '') {
        const localeMap = {
            'en': 'en-US', // Default to US English
            'es': 'es-ES', // Default to Spain Spanish
            'fr': 'fr-FR', // Default to France French
            'de': 'de-DE', // Default to Germany German
            'it': 'it-IT',
            'pt': 'pt-BR', // Default to Brazilian Portuguese
            'zh': 'zh-CN', // Default to Simplified Chinese
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'ru': 'ru-RU',
            'ar': 'ar-SA', // Default to Saudi Arabia Arabic
            'hi': 'hi-IN'
        };

        // Special cases for regional variants
        if (basicLang === 'en') {
            // Simple heuristics for English variants
            if (/\b(colour|honour|favourite|centre|theatre)\b/i.test(text)) {
                return 'en-GB';
            } else if (/\b(g'day|mate|fair dinkum)\b/i.test(text)) {
                return 'en-AU';
            }
            return 'en-US';
        }

        if (basicLang === 'es') {
            // Simple heuristics for Spanish variants
            if (/\b(vosotros|vale|tío)\b/i.test(text)) {
                return 'es-ES';
            } else if (/\b(órale|güey|chido)\b/i.test(text)) {
                return 'es-MX';
            }
            return 'es-ES';
        }

        if (basicLang === 'fr') {
            // Simple heuristics for French variants
            if (/\b(pis|icitte|toé)\b/i.test(text)) {
                return 'fr-CA';
            }
            return 'fr-FR';
        }

        if (basicLang === 'pt') {
            // Simple heuristics for Portuguese variants
            if (/\b(você|tá|né)\b/i.test(text)) {
                return 'pt-BR';
            } else if (/\b(vós|estás)\b/i.test(text)) {
                return 'pt-PT';
            }
            return 'pt-BR';
        }

        if (basicLang === 'zh') {
            // Check for Traditional Chinese characters
            if (/[\u4e00-\u9fff]/.test(text)) {
                // Basic check for traditional vs simplified
                if (/[龍樞護]/u.test(text)) {
                    return 'zh-TW';
                }
            }
            return 'zh-CN';
        }

        return localeMap[basicLang] || this.fallbackLanguage;
    }

    /**
     * Get the appropriate Azure voice for a language
     * @param {string} languageCode - Language code (e.g., 'en-US')
     * @returns {string} Azure voice name
     */
    getVoiceForLanguage(languageCode) {
        const voice = this.languageVoiceMap[languageCode];
        if (voice) {
            console.log(`[LanguageDetector] Selected voice for ${languageCode}: ${voice}`);
            return voice;
        }

        // Fallback to base language if specific locale not found
        const baseLang = languageCode.split('-')[0];
        for (const [locale, voiceName] of Object.entries(this.languageVoiceMap)) {
            if (locale.startsWith(baseLang + '-')) {
                console.log(`[LanguageDetector] Fallback voice for ${languageCode}: ${voiceName}`);
                return voiceName;
            }
        }

        // Final fallback to English
        console.log(`[LanguageDetector] No voice found for ${languageCode}, using fallback: ${this.languageVoiceMap[this.fallbackLanguage]}`);
        return this.languageVoiceMap[this.fallbackLanguage];
    }

    /**
     * Get supported languages for Azure Speech Services language identification
     * @returns {Array<string>} Array of language codes for speech recognition
     */
    getSupportedLanguagesForSpeechRecognition() {
        return [
            'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
            'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL',
            'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH',
            'de-DE', 'de-AT', 'de-CH',
            'it-IT', 'pt-BR', 'pt-PT',
            'zh-CN', 'zh-TW', 'zh-HK',
            'ja-JP', 'ko-KR', 'ru-RU',
            'ar-SA', 'ar-EG', 'ar-JO', 'ar-KW', 'ar-LB',
            'hi-IN', 'th-TH', 'vi-VN',
            'nl-NL', 'nl-BE', 'sv-SE', 'da-DK', 'no-NO', 'fi-FI',
            'pl-PL', 'cs-CZ', 'sk-SK', 'hu-HU', 'ro-RO',
            'bg-BG', 'hr-HR', 'sl-SI', 'et-EE', 'lv-LV', 'lt-LT'
        ];
    }

    /**
     * Check if a language is supported by Azure Speech Services
     * @param {string} languageCode - Language code to check
     * @returns {boolean} True if supported
     */
    isLanguageSupported(languageCode) {
        return this.getSupportedLanguagesForSpeechRecognition().includes(languageCode) ||
               Object.keys(this.languageVoiceMap).includes(languageCode);
    }

    /**
     * Get language display name
     * @param {string} languageCode - Language code
     * @returns {string} Human-readable language name
     */
    getLanguageDisplayName(languageCode) {
        const displayNames = {
            'en-US': 'English (United States)',
            'en-GB': 'English (United Kingdom)',
            'en-AU': 'English (Australia)',
            'en-CA': 'English (Canada)',
            'en-IN': 'English (India)',
            'es-ES': 'Spanish (Spain)',
            'es-MX': 'Spanish (Mexico)',
            'es-AR': 'Spanish (Argentina)',
            'fr-FR': 'French (France)',
            'fr-CA': 'French (Canada)',
            'de-DE': 'German (Germany)',
            'de-AT': 'German (Austria)',
            'it-IT': 'Italian (Italy)',
            'pt-BR': 'Portuguese (Brazil)',
            'pt-PT': 'Portuguese (Portugal)',
            'zh-CN': 'Chinese (Simplified)',
            'zh-TW': 'Chinese (Traditional)',
            'ja-JP': 'Japanese (Japan)',
            'ko-KR': 'Korean (South Korea)',
            'ru-RU': 'Russian (Russia)',
            'ar-SA': 'Arabic (Saudi Arabia)',
            'hi-IN': 'Hindi (India)',
            'th-TH': 'Thai (Thailand)',
            'vi-VN': 'Vietnamese (Vietnam)',
            'nl-NL': 'Dutch (Netherlands)',
            'sv-SE': 'Swedish (Sweden)',
            'da-DK': 'Danish (Denmark)',
            'no-NO': 'Norwegian (Norway)',
            'fi-FI': 'Finnish (Finland)',
            'pl-PL': 'Polish (Poland)',
            'cs-CZ': 'Czech (Czech Republic)',
            'hu-HU': 'Hungarian (Hungary)'
        };

        return displayNames[languageCode] || languageCode;
    }
}

// Export singleton instance
export const languageDetector = new LanguageDetector();
