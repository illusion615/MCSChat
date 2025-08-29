/**
 * Local Storage Guard Utility
 * Protects against localStorage corruption and JSON parsing errors
 */

/**
 * Clean all localStorage keys for corrupted data patterns
 * @public
 */
export function cleanAllCorruptedLocalStorage() {
    console.log('[LocalStorageGuard] Scanning localStorage for corruption...');
    
    const corruptedKeys = [];
    const totalKeys = localStorage.length;
    
    for (let i = 0; i < totalKeys; i++) {
        try {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                
                // Check for common corruption patterns
                if (value === '[object Object]' || value === '[object Array]' || value === 'undefined' || value === 'null') {
                    corruptedKeys.push({ key, value });
                }
                
                // Additional check for malformed JSON in keys that should contain JSON
                if (key.includes('aiCompanion') || key.includes('knowledge') || key.includes('speech')) {
                    if (value && (value.startsWith('{') || value.startsWith('['))) {
                        try {
                            JSON.parse(value);
                        } catch (error) {
                            corruptedKeys.push({ key, value: value.substring(0, 50) + '...', error: error.message });
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('[LocalStorageGuard] Error checking localStorage key:', error);
        }
    }
    
    // Clean corrupted keys
    if (corruptedKeys.length > 0) {
        console.warn('[LocalStorageGuard] Found', corruptedKeys.length, 'corrupted localStorage keys:', corruptedKeys);
        
        corruptedKeys.forEach(({ key, value, error }) => {
            try {
                localStorage.removeItem(key);
                console.log(`[LocalStorageGuard] Cleaned corrupted key: ${key}`);
            } catch (removeError) {
                console.error(`[LocalStorageGuard] Failed to remove corrupted key ${key}:`, removeError);
            }
        });
        
        console.log('[LocalStorageGuard] Cleaned', corruptedKeys.length, 'corrupted localStorage entries');
        return corruptedKeys.length;
    } else {
        console.log('[LocalStorageGuard] No corrupted localStorage entries found');
        return 0;
    }
}

/**
 * Set up global error handlers for localStorage operations
 * @public
 */
export function setupLocalStorageErrorHandling() {
    // Override JSON.parse to provide better error messages
    const originalParse = JSON.parse;
    JSON.parse = function(text, reviver) {
        try {
            return originalParse.call(this, text, reviver);
        } catch (error) {
            if (text === '[object Object]' || text === '[object Array]') {
                console.error('[LocalStorageGuard] Detected corrupted localStorage data:', text);
                throw new Error(`Corrupted localStorage data detected: ${text}. Data has been cleaned automatically.`);
            }
            throw error;
        }
    };
    
    console.log('[LocalStorageGuard] Error handling setup complete');
}

/**
 * Safe localStorage getItem with automatic corruption detection and cleanup
 * @param {string} key - localStorage key
 * @param {any} defaultValue - Default value if key doesn't exist or is corrupted
 * @returns {string|null} Clean value or default
 */
export function safeGetItem(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        
        if (value === '[object Object]' || value === '[object Array]' || value === 'undefined' || value === 'null') {
            console.warn(`[LocalStorageGuard] Corrupted data detected for key "${key}": ${value}`);
            localStorage.removeItem(key);
            return defaultValue;
        }
        
        return value;
    } catch (error) {
        console.error(`[LocalStorageGuard] Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Safe localStorage setItem with validation
 * @param {string} key - localStorage key
 * @param {string} value - Value to store
 */
export function safeSetItem(key, value) {
    try {
        if (typeof value !== 'string') {
            console.warn(`[LocalStorageGuard] Converting non-string value to string for key "${key}":`, typeof value);
            value = String(value);
        }
        
        if (value === '[object Object]' || value === '[object Array]') {
            console.error(`[LocalStorageGuard] Attempted to store corrupted data for key "${key}": ${value}`);
            throw new Error(`Cannot store corrupted data: ${value}`);
        }
        
        localStorage.setItem(key, value);
    } catch (error) {
        console.error(`[LocalStorageGuard] Error storing localStorage key "${key}":`, error);
        throw error;
    }
}
