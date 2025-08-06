/**
 * Advanced Logging Manager for MCSChat
 * Provides comprehensive logging capabilities with categorization, filtering, and persistence
 */

class LoggingManager {
    constructor() {
        this.logs = [];
        this.maxLogs = 10000; // Maximum number of logs to keep in memory
        this.categories = ['speech', 'ai', 'directline', 'session', 'ui', 'worker', 'system'];
        this.levels = ['debug', 'info', 'warn', 'error'];
        this.listeners = new Set();
        this.storageKey = 'mcschat_logs';
        this.isInitialized = false;
        
        // Performance tracking
        this.performanceMetrics = new Map();
        
        // Auto-save interval
        this.autoSaveInterval = null;
        this.autoSaveDelay = 30000; // 30 seconds
        
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.loadLogsFromStorage();
            this.setupAutoSave();
            this.interceptConsole();
            this.isInitialized = true;
            
            this.log('system', 'info', 'Logging Manager initialized successfully', {
                totalLogs: this.logs.length,
                categories: this.categories,
                levels: this.levels
            });
        } catch (error) {
            console.error('Failed to initialize Logging Manager:', error);
        }
    }

    /**
     * Main logging method
     * @param {string} category - Log category (speech, ai, directline, etc.)
     * @param {string} level - Log level (debug, info, warn, error)
     * @param {string} message - Log message
     * @param {object} metadata - Additional metadata
     * @param {Error} error - Optional error object
     */
    log(category, level, message, metadata = {}, error = null) {
        if (!this.categories.includes(category)) {
            category = 'system';
        }
        
        if (!this.levels.includes(level)) {
            level = 'info';
        }

        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            category,
            level,
            message,
            metadata: metadata || {},
            error: error ? this.serializeError(error) : null,
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionId: this.getSessionId()
        };

        // Add performance data if available
        if (performance.now) {
            logEntry.performanceTimestamp = performance.now();
        }

        this.addLog(logEntry);
        this.notifyListeners('logAdded', logEntry);
        
        // Also log to console for development
        this.logToConsole(logEntry);
        
        return logEntry.id;
    }

    /**
     * Convenience methods for different log levels
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
     * Performance logging
     */
    startPerformanceTimer(operation) {
        const timerId = this.generateLogId();
        this.performanceMetrics.set(timerId, {
            operation,
            startTime: performance.now(),
            timestamp: new Date().toISOString()
        });
        return timerId;
    }

    endPerformanceTimer(timerId, metadata = {}) {
        const metric = this.performanceMetrics.get(timerId);
        if (!metric) return null;

        const endTime = performance.now();
        const duration = endTime - metric.startTime;
        
        this.performanceMetrics.delete(timerId);
        
        const perfLog = this.log('system', 'info', `Performance: ${metric.operation}`, {
            ...metadata,
            operation: metric.operation,
            duration: `${duration.toFixed(2)}ms`,
            startTime: metric.startTime,
            endTime
        });

        return { duration, logId: perfLog };
    }

    /**
     * Add log entry to the collection
     */
    addLog(logEntry) {
        this.logs.unshift(logEntry); // Add to beginning for newest first
        
        // Maintain max logs limit
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
    }

    /**
     * Get logs with filtering options
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        // Filter by level
        if (filters.level && filters.level !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === filters.level);
        }

        // Filter by category
        if (filters.category && filters.category !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.category === filters.category);
        }

        // Filter by time range
        if (filters.timeRange && filters.timeRange !== 'all') {
            const cutoffTime = this.getTimeRangeCutoff(filters.timeRange);
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= cutoffTime);
        }

        // Filter by search text
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => {
                return log.message.toLowerCase().includes(searchTerm) ||
                       log.category.toLowerCase().includes(searchTerm) ||
                       JSON.stringify(log.metadata).toLowerCase().includes(searchTerm);
            });
        }

        // Pagination
        if (filters.page && filters.pageSize) {
            const start = (filters.page - 1) * filters.pageSize;
            const end = start + filters.pageSize;
            filteredLogs = filteredLogs.slice(start, end);
        }

        return filteredLogs;
    }

    /**
     * Get log statistics
     */
    getLogStats(filters = {}) {
        const logs = this.getLogs({ ...filters, page: null, pageSize: null }); // Get all for stats
        
        const stats = {
            total: logs.length,
            error: 0,
            warn: 0,
            info: 0,
            debug: 0,
            categories: {},
            timeRange: {
                oldest: null,
                newest: null
            }
        };

        logs.forEach(log => {
            // Count by level
            stats[log.level]++;
            
            // Count by category
            stats.categories[log.category] = (stats.categories[log.category] || 0) + 1;
            
            // Track time range
            const logTime = new Date(log.timestamp);
            if (!stats.timeRange.oldest || logTime < new Date(stats.timeRange.oldest)) {
                stats.timeRange.oldest = log.timestamp;
            }
            if (!stats.timeRange.newest || logTime > new Date(stats.timeRange.newest)) {
                stats.timeRange.newest = log.timestamp;
            }
        });

        return stats;
    }

    /**
     * Delete logs
     */
    deleteLogs(logIds) {
        const deletedCount = this.logs.length;
        this.logs = this.logs.filter(log => !logIds.includes(log.id));
        const actualDeleted = deletedCount - this.logs.length;
        
        this.notifyListeners('logsDeleted', { deletedIds: logIds, count: actualDeleted });
        this.saveLogsToStorage();
        
        return actualDeleted;
    }

    /**
     * Clear all logs
     */
    clearAllLogs() {
        const count = this.logs.length;
        this.logs = [];
        this.notifyListeners('allLogsCleared', { count });
        this.saveLogsToStorage();
        return count;
    }

    /**
     * Clear logs by category
     */
    clearLogsByCategory(category) {
        const beforeCount = this.logs.length;
        this.logs = this.logs.filter(log => log.category !== category);
        const deletedCount = beforeCount - this.logs.length;
        
        this.notifyListeners('logsClearedByCategory', { category, count: deletedCount });
        this.saveLogsToStorage();
        
        return deletedCount;
    }

    /**
     * Clear logs by level
     */
    clearLogsByLevel(level) {
        const beforeCount = this.logs.length;
        this.logs = this.logs.filter(log => log.level !== level);
        const deletedCount = beforeCount - this.logs.length;
        
        this.notifyListeners('logsClearedByLevel', { level, count: deletedCount });
        this.saveLogsToStorage();
        
        return deletedCount;
    }

    /**
     * Export logs
     */
    exportLogs(filters = {}, format = 'json') {
        const logs = this.getLogs({ ...filters, page: null, pageSize: null });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        let content, mimeType, extension;
        
        switch (format) {
            case 'csv':
                content = this.convertToCsv(logs);
                mimeType = 'text/csv';
                extension = 'csv';
                break;
            case 'txt':
                content = this.convertToText(logs);
                mimeType = 'text/plain';
                extension = 'txt';
                break;
            default:
                content = JSON.stringify(logs, null, 2);
                mimeType = 'application/json';
                extension = 'json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `mcschat-logs-${timestamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.log('system', 'info', 'Logs exported', {
            format,
            count: logs.length,
            filters,
            filename: link.download
        });

        return logs.length;
    }

    /**
     * Event listeners
     */
    addEventListener(callback) {
        this.listeners.add(callback);
    }

    removeEventListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in log listener:', error);
            }
        });
    }

    /**
     * Storage operations
     */
    async saveLogsToStorage() {
        try {
            const dataToStore = {
                logs: this.logs.slice(0, 1000), // Only store last 1000 logs
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
        } catch (error) {
            console.error('Failed to save logs to storage:', error);
        }
    }

    async loadLogsFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.logs && Array.isArray(data.logs)) {
                    this.logs = data.logs;
                }
            }
        } catch (error) {
            console.error('Failed to load logs from storage:', error);
            this.logs = [];
        }
    }

    /**
     * Auto-save setup
     */
    setupAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(() => {
            this.saveLogsToStorage();
        }, this.autoSaveDelay);
    }

    /**
     * Console interception for automatic logging
     */
    interceptConsole() {
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        };

        console.error = (...args) => {
            originalConsole.error(...args);
            this.error('system', 'Console Error', { args: args.map(this.stringifyArg) });
        };

        console.warn = (...args) => {
            originalConsole.warn(...args);
            this.warn('system', 'Console Warning', { args: args.map(this.stringifyArg) });
        };

        // Store original methods for restoration if needed
        this.originalConsole = originalConsole;
    }

    /**
     * Utility methods
     */
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.sessionId;
    }

    serializeError(error) {
        if (!error) return null;
        
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
            toString: error.toString()
        };
    }

    stringifyArg(arg) {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return this.serializeError(arg);
        try {
            return JSON.stringify(arg);
        } catch {
            return String(arg);
        }
    }

    getTimeRangeCutoff(range) {
        const now = new Date();
        switch (range) {
            case '1h':
                return new Date(now.getTime() - 60 * 60 * 1000);
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
                return new Date(0);
        }
    }

    logToConsole(logEntry) {
        const style = this.getConsoleStyle(logEntry.level);
        const prefix = `[${logEntry.category.toUpperCase()}]`;
        
        switch (logEntry.level) {
            case 'error':
                console.error(`${prefix} ${logEntry.message}`, logEntry.metadata, logEntry.error);
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

    getConsoleStyle(level) {
        const styles = {
            error: 'color: #ff6b6b; font-weight: bold;',
            warn: 'color: #feca57; font-weight: bold;',
            info: 'color: #48dbfb;',
            debug: 'color: #9c88ff;'
        };
        return styles[level] || '';
    }

    convertToCsv(logs) {
        const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Metadata', 'Error'];
        const rows = logs.map(log => [
            log.timestamp,
            log.level,
            log.category,
            log.message,
            JSON.stringify(log.metadata),
            log.error ? JSON.stringify(log.error) : ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    convertToText(logs) {
        return logs.map(log => {
            let text = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category.toUpperCase()}] ${log.message}`;
            
            if (Object.keys(log.metadata).length > 0) {
                text += `\n  Metadata: ${JSON.stringify(log.metadata, null, 2)}`;
            }
            
            if (log.error) {
                text += `\n  Error: ${JSON.stringify(log.error, null, 2)}`;
            }
            
            return text;
        }).join('\n\n');
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.saveLogsToStorage();
        this.listeners.clear();
        this.performanceMetrics.clear();
        
        // Restore original console methods
        if (this.originalConsole) {
            Object.assign(console, this.originalConsole);
        }
    }
}

// Create global instance
export default LoggingManager;
