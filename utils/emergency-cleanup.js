/**
 * Emergency localStorage Cleanup Script
 * Run this immediately to fix JSON parsing errors
 */

(function () {
    console.log('[Emergency Cleanup] Starting localStorage cleanup...');

    function isCorruptedValue(value) {
        if (value === null) return false;

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

    function safeJSONParse(value) {
        try {
            JSON.parse(value);
            return true;
        } catch (e) {
            return false;
        }
    }

    const corruptedKeys = [];
    const unparsableKeys = [];

    try {
        // Scan all localStorage entries
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key) continue;

            const value = localStorage.getItem(key);

            // Check for corrupted object strings
            if (isCorruptedValue(value)) {
                corruptedKeys.push(key);
                continue;
            }

            // Check for unparsable JSON (if it looks like JSON but isn't valid)
            if (value && (value.startsWith('{') || value.startsWith('['))) {
                if (!safeJSONParse(value)) {
                    unparsableKeys.push(key);
                }
            }
        }

        console.log(`[Emergency Cleanup] Found ${corruptedKeys.length} corrupted entries and ${unparsableKeys.length} unparsable JSON entries`);

        // Remove corrupted entries
        corruptedKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
                console.log(`[Emergency Cleanup] Removed corrupted entry: ${key}`);
            } catch (error) {
                console.error(`[Emergency Cleanup] Error removing corrupted entry ${key}:`, error);
            }
        });

        // Remove unparsable JSON entries
        unparsableKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
                console.log(`[Emergency Cleanup] Removed unparsable JSON entry: ${key}`);
            } catch (error) {
                console.error(`[Emergency Cleanup] Error removing unparsable entry ${key}:`, error);
            }
        });

        const totalCleaned = corruptedKeys.length + unparsableKeys.length;
        if (totalCleaned > 0) {
            console.log(`[Emergency Cleanup] Successfully cleaned ${totalCleaned} problematic localStorage entries`);
        } else {
            console.log('[Emergency Cleanup] No problematic entries found');
        }

    } catch (error) {
        console.error('[Emergency Cleanup] Error during cleanup:', error);
    }
})();
