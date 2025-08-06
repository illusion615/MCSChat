/**
 * Simple Logging Manager for MCSChat - Fixed Version
 * Basic logging with essential features to avoid initialization errors
 */

class LoggingManager {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.categories = ['speech', 'ai', 'directline', 'session', 'ui', 'worker', 'system'];
        this.levels = ['debug', 'info', 'warn', 'error'];
        this.storageKey = 'mcschat_logs';
        this.isInitialized = false;
        
        // Initialize synchronously to avoid async issues
        this.init();
    }

    init() {
        try {
            this.loadLogsFromStorage();
            this.isInitialized = true;
            console.log('[LoggingManager] Initialized successfully. Logs loaded:', this.logs.length);
        } catch (error) {
            console.error('[LoggingManager] Failed to initialize:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Main logging method
     */
    log(category, level, message, metadata = {}, error = null) {
        if (!this.isInitialized) {
            console.warn('[LoggingManager] Not initialized, using console fallback');
            console.log(`[${category.toUpperCase()}] ${message}`, metadata);
            return null;
        }

        try {
            const logEntry = {
                id: this.generateLogId(),
                timestamp: new Date().toISOString(),
                category: this.categories.includes(category) ? category : 'system',
                level: this.levels.includes(level) ? level : 'info',
                message,
                metadata: metadata || {},
                error: error ? this.serializeError(error) : null
            };

            this.addLog(logEntry);
            this.logToConsole(logEntry);
            
            // Save periodically
            if (this.logs.length % 10 === 0) {
                this.saveLogsToStorage();
            }
            
            return logEntry.id;
        } catch (err) {
            console.error('[LoggingManager] Error in log method:', err);
            return null;
        }
    }

    /**
     * Convenience methods
     */
    debug(category, message, metadata, error) {
        return this.log(category, 'debug', message, metadata, error);
    }

    info(category, message, metadata, error) {
        return this.log(category, 'info', message, metadata, error);
    }

    warn(category, message, metadata, error) {
        return this.log(category, 'warn', message, metadata, error);
    }

    error(category, message, metadata, error) {
        return this.log(category, 'error', message, metadata, error);
    }

    /**
     * Add log entry
     */
    addLog(logEntry) {
        this.logs.unshift(logEntry);
        console.log('[LoggingManager] Added log. Total logs:', this.logs.length, 'Entry:', logEntry);
        
        // Maintain max logs limit
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
    }

    /**
     * Get logs with basic filtering
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];
        console.log('[LoggingManager] getLogs called. Total logs available:', this.logs.length, 'Filters:', filters);

        if (filters.level && filters.level !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === filters.level);
            console.log('[LoggingManager] After level filter:', filteredLogs.length);
        }

        if (filters.category && filters.category !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.category === filters.category);
            console.log('[LoggingManager] After category filter:', filteredLogs.length);
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchTerm) ||
                log.category.toLowerCase().includes(searchTerm) ||
                log.level.toLowerCase().includes(searchTerm)
            );
            console.log('[LoggingManager] After search filter:', filteredLogs.length);
        }

        if (filters.timeLimit) {
            filteredLogs = filteredLogs.filter(log => {
                const logTime = new Date(log.timestamp);
                const timeLimit = new Date(filters.timeLimit);
                return logTime >= timeLimit;
            });
            console.log('[LoggingManager] After time filter:', filteredLogs.length);
        }

        console.log('[LoggingManager] Returning filtered logs:', filteredLogs.length);
        return filteredLogs;
    }

    /**
     * Debug method to check current state
     */
    debugState() {
        console.log('[LoggingManager] Debug State:', {
            isInitialized: this.isInitialized,
            logsArrayLength: this.logs.length,
            logsArray: this.logs,
            stats: this.getLogStats(),
            storageKey: this.storageKey,
            hasStorageData: !!localStorage.getItem(this.storageKey)
        });
        
        // Check what's in localStorage
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                console.log('[LoggingManager] Storage data:', parsed);
            } catch (e) {
                console.log('[LoggingManager] Invalid storage data:', stored);
            }
        } else {
            console.log('[LoggingManager] No data in storage');
        }
        
        return {
            logs: this.logs,
            stats: this.getLogStats()
        };
    }

    /**
     * Get log statistics
     */
    getLogStats() {
        const stats = {
            total: this.logs.length,
            error: 0,
            warn: 0,
            info: 0,
            debug: 0
        };

        this.logs.forEach(log => {
            if (stats.hasOwnProperty(log.level)) {
                stats[log.level]++;
            }
        });

        return stats;
    }

    /**
     * Clear logs
     */
    clearAllLogs() {
        const count = this.logs.length;
        this.logs = [];
        this.saveLogsToStorage();
        return count;
    }

    /**
     * Export logs as JSON
     */
    exportLogs() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const content = JSON.stringify(this.logs, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `mcschat-logs-${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return this.logs.length;
        } catch (error) {
            console.error('[LoggingManager] Export failed:', error);
            return 0;
        }
    }

    /**
     * Storage operations
     */
    saveLogsToStorage() {
        try {
            const dataToStore = {
                logs: this.logs.slice(0, 500), // Store only last 500 logs
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
        } catch (error) {
            console.warn('[LoggingManager] Failed to save to storage:', error);
        }
    }

    loadLogsFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.logs && Array.isArray(data.logs)) {
                    this.logs = data.logs;
                }
            }
        } catch (error) {
            console.warn('[LoggingManager] Failed to load from storage:', error);
            this.logs = [];
        }
    }

    /**
     * Utility methods
     */
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    serializeError(error) {
        if (!error) return null;
        
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }

    logToConsole(logEntry) {
        const prefix = `[${logEntry.category.toUpperCase()}]`;
        
        switch (logEntry.level) {
            case 'error':
                console.error(`${prefix} ${logEntry.message}`, logEntry.metadata);
                break;
            case 'warn':
                console.warn(`${prefix} ${logEntry.message}`, logEntry.metadata);
                break;
            case 'debug':
                console.debug(`${prefix} ${logEntry.message}`, logEntry.metadata);
                break;
            default:
                console.log(`${prefix} ${logEntry.message}`, logEntry.metadata);
        }
    }
}

export default LoggingManager;
