/**
 * Safe localStorage utility to prevent JSON parsing errors
 * This utility ensures all values are properly stored as strings and provides safe retrieval
 */
class SafeLocalStorage {
    /**
     * Safely set an item in localStorage, ensuring the value is a string
     * @param {string} key - The storage key
     * @param {any} value - The value to store
     */
    static setItem(key, value) {
        try {
            // If it's already a string, use it directly
            if (typeof value === 'string') {
                localStorage.setItem(key, value);
                return;
            }

            // If it's an object or array, stringify it
            if (typeof value === 'object' && value !== null) {
                localStorage.setItem(key, JSON.stringify(value));
                return;
            }

            // For primitives (boolean, number, etc.), convert to string
            localStorage.setItem(key, value.toString());
        } catch (error) {
            console.error(`Error setting localStorage item ${key}:`, error);
        }
    }

    /**
     * Safely get an item from localStorage with JSON parsing attempt
     * @param {string} key - The storage key
     * @param {any} defaultValue - Default value if key doesn't exist or parsing fails
     * @returns {any} The parsed value or default
     */
    static getItem(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);

            if (value === null) {
                return defaultValue;
            }

            // Try to parse as JSON first
            try {
                return JSON.parse(value);
            } catch (jsonError) {
                // If JSON parsing fails, return the raw string
                // This handles cases where the value is a plain string
                return value;
            }
        } catch (error) {
            console.error(`Error getting localStorage item ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Check if a localStorage value appears to be corrupted (like "[object Object]")
     * @param {string} key - The storage key to check
     * @returns {boolean} True if the value appears corrupted
     */
    static isCorrupted(key) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return false;

            // Check for common corruption patterns
            return value === '[object Object]' ||
                value === '[object Array]' ||
                value === '[object HTMLElement]';
        } catch (error) {
            return true;
        }
    }

    /**
     * Clean up corrupted localStorage entries
     * @param {string[]} keys - Array of keys to check and clean (optional)
     */
    static cleanCorruptedEntries(keys = null) {
        const keysToCheck = keys || this.getAllKeys();
        const cleaned = [];

        keysToCheck.forEach(key => {
            if (this.isCorrupted(key)) {
                try {
                    localStorage.removeItem(key);
                    cleaned.push(key);
                    console.log(`Cleaned corrupted localStorage entry: ${key}`);
                } catch (error) {
                    console.error(`Error cleaning localStorage entry ${key}:`, error);
                }
            }
        });

        return cleaned;
    }

    /**
     * Get all localStorage keys
     * @returns {string[]} Array of all keys
     */
    static getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            keys.push(localStorage.key(i));
        }
        return keys;
    }

    /**
     * Safely remove an item from localStorage
     * @param {string} key - The storage key
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing localStorage item ${key}:`, error);
        }
    }

    /**
     * Check localStorage quota and available space
     * @returns {Object} Information about storage usage
     */
    static checkQuota() {
        try {
            let totalSize = 0;
            let itemCount = 0;

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += (localStorage[key].length + key.length);
                    itemCount++;
                }
            }

            // Try to estimate available space (rough approximation)
            const testKey = '_quota_test_' + Date.now();
            const testValue = 'a'.repeat(1024); // 1KB test
            let availableSpace = 0;

            try {
                let testSize = 1024;
                while (testSize < 5 * 1024 * 1024) { // Test up to 5MB
                    localStorage.setItem(testKey, 'a'.repeat(testSize));
                    availableSpace = testSize;
                    testSize *= 2;
                }
            } catch (e) {
                // Hit quota limit
            } finally {
                localStorage.removeItem(testKey);
            }

            return {
                totalSize,
                itemCount,
                availableSpace,
                estimatedQuota: totalSize + availableSpace
            };
        } catch (error) {
            console.error('Error checking localStorage quota:', error);
            return { error: error.message };
        }
    }
}

// Initialize cleanup on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Clean up any corrupted entries on startup
        SafeLocalStorage.cleanCorruptedEntries();
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeLocalStorage;
} else {
    window.SafeLocalStorage = SafeLocalStorage;
}
