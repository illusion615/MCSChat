/**
 * localStorage Protection Utility
 * Prevents JSON parsing errors by implementing safe storage operations
 * and automatic corruption detection/cleanup
 */

export class LocalStorageProtection {
    static initialized = false;
    static corruptionKeys = new Set();
    static originalSetItem = null;
    static originalGetItem = null;

    /**
     * Initialize localStorage protection
     */
    static initialize() {
        if (this.initialized) return;

        console.log('[LocalStorageProtection] Initializing localStorage protection...');

        // Store original methods
        this.originalSetItem = localStorage.setItem.bind(localStorage);
        this.originalGetItem = localStorage.getItem.bind(localStorage);

        // Override localStorage methods with safe versions
        this.overrideLocalStorageMethods();

        // Scan for existing corruption
        this.scanAndCleanCorruption();

        // Set up storage event listener for cross-tab protection
        this.setupStorageEventListener();

        this.initialized = true;
        console.log('[LocalStorageProtection] Protection initialized successfully');
    }

    /**
     * Override localStorage methods with protected versions
     */
    static overrideLocalStorageMethods() {
        // Safe setItem that ensures values are strings
        localStorage.setItem = (key, value) => {
            try {
                // Convert value to string if it's not already
                let stringValue;
                if (typeof value === 'string') {
                    stringValue = value;
                } else if (typeof value === 'object' && value !== null) {
                    stringValue = JSON.stringify(value);
                } else {
                    stringValue = String(value);
                }

                // Validate that we're not storing corrupted object strings
                if (this.isCorruptedObjectString(stringValue)) {
                    console.warn(`[LocalStorageProtection] Prevented storing corrupted value for key: ${key}`);
                    return;
                }

                this.originalSetItem(key, stringValue);
            } catch (error) {
                console.error(`[LocalStorageProtection] Error in setItem for key ${key}:`, error);
            }
        };

        // Safe getItem that validates returned values
        localStorage.getItem = (key) => {
            try {
                const value = this.originalGetItem(key);

                if (value === null) return null;

                // Check for corruption
                if (this.isCorruptedObjectString(value)) {
                    console.warn(`[LocalStorageProtection] Detected corrupted value for key ${key}, removing...`);
                    this.originalSetItem = localStorage.setItem; // Temporarily restore to avoid recursion
                    localStorage.removeItem(key);
                    localStorage.setItem = this.overrideLocalStorageMethods.bind(this); // Restore override
                    this.corruptionKeys.add(key);
                    return null;
                }

                return value;
            } catch (error) {
                console.error(`[LocalStorageProtection] Error in getItem for key ${key}:`, error);
                return null;
            }
        };
    }

    /**
     * Check if a value represents a corrupted object string
     */
    static isCorruptedObjectString(value) {
        if (typeof value !== 'string') return false;

        const corruptionPatterns = [
            '[object Object]',
            '[object Array]',
            '[object HTMLElement]',
            '[object Window]',
            '[object Document]',
            '[object Event]',
            '[object Function]'
        ];

        return corruptionPatterns.some(pattern => value === pattern);
    }

    /**
     * Scan localStorage for existing corruption and clean it up
     */
    static scanAndCleanCorruption() {
        const corruptedKeys = [];

        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (!key) continue;

                const value = this.originalGetItem(key);
                if (this.isCorruptedObjectString(value)) {
                    corruptedKeys.push(key);
                }
            }

            if (corruptedKeys.length > 0) {
                console.warn(`[LocalStorageProtection] Found ${corruptedKeys.length} corrupted entries, cleaning up...`);

                corruptedKeys.forEach(key => {
                    try {
                        localStorage.removeItem(key);
                        this.corruptionKeys.add(key);
                        console.log(`[LocalStorageProtection] Cleaned corrupted entry: ${key}`);
                    } catch (error) {
                        console.error(`[LocalStorageProtection] Error cleaning corrupted entry ${key}:`, error);
                    }
                });

                console.log(`[LocalStorageProtection] Cleanup complete. Removed ${corruptedKeys.length} corrupted entries.`);
            } else {
                console.log('[LocalStorageProtection] No corrupted entries found.');
            }
        } catch (error) {
            console.error('[LocalStorageProtection] Error during corruption scan:', error);
        }
    }

    /**
     * Set up storage event listener to handle cross-tab corruption
     */
    static setupStorageEventListener() {
        window.addEventListener('storage', (event) => {
            if (!event.key || !event.newValue) return;

            // Check if the new value is corrupted
            if (this.isCorruptedObjectString(event.newValue)) {
                console.warn(`[LocalStorageProtection] Detected corrupted value in storage event for key: ${event.key}`);

                try {
                    localStorage.removeItem(event.key);
                    this.corruptionKeys.add(event.key);
                } catch (error) {
                    console.error(`[LocalStorageProtection] Error removing corrupted value from storage event:`, error);
                }
            }
        });
    }

    /**
     * Safe JSON parse with fallback
     */
    static safeJSONParse(value, fallback = null) {
        if (value === null || value === undefined) return fallback;

        if (this.isCorruptedObjectString(value)) {
            console.warn('[LocalStorageProtection] Attempted to parse corrupted object string');
            return fallback;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn('[LocalStorageProtection] JSON parse failed:', error.message);
            return fallback;
        }
    }

    /**
     * Safe localStorage get with JSON parsing
     */
    static getJSON(key, fallback = null) {
        const value = localStorage.getItem(key);
        return this.safeJSONParse(value, fallback);
    }

    /**
     * Safe localStorage set with JSON stringification
     */
    static setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`[LocalStorageProtection] Error setting JSON for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Get corruption report
     */
    static getCorruptionReport() {
        return {
            corruptedKeysFound: Array.from(this.corruptionKeys),
            totalCorrupted: this.corruptionKeys.size,
            isProtectionActive: this.initialized
        };
    }

    /**
     * Manual corruption check for a specific key
     */
    static checkKey(key) {
        const value = this.originalGetItem(key);
        return {
            key,
            value,
            isCorrupted: this.isCorruptedObjectString(value),
            canParseJSON: value ? this.safeJSONParse(value) !== null : true
        };
    }

    /**
     * Emergency cleanup - removes all potentially corrupted entries
     */
    static emergencyCleanup() {
        const removedKeys = [];

        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (!key) continue;

                const value = this.originalGetItem(key);

                // Check for corruption or unparseable JSON
                if (this.isCorruptedObjectString(value) ||
                    (value && value.startsWith('{') && this.safeJSONParse(value) === null)) {
                    localStorage.removeItem(key);
                    removedKeys.push(key);
                }
            }

            console.log(`[LocalStorageProtection] Emergency cleanup removed ${removedKeys.length} entries:`, removedKeys);
            return removedKeys;
        } catch (error) {
            console.error('[LocalStorageProtection] Error during emergency cleanup:', error);
            return [];
        }
    }
}

// Auto-initialize on import if in browser environment
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    // Initialize after a short delay to ensure DOM is ready
    setTimeout(() => {
        LocalStorageProtection.initialize();
    }, 100);
}

export default LocalStorageProtection;
