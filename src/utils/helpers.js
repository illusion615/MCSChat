/**
 * General utility functions used throughout the application
 */

export const Utils = {
    /**
     * Generate a unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on first call
     * @returns {Function} Debounced function
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Format file size in bytes to human readable format
     * @param {number} bytes - File size in bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted file size
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} File extension
     */
    getFileExtension(filename) {
        if (!filename || typeof filename !== 'string') return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },

    /**
     * Escape HTML entities
     * @param {string} unsafe - Unsafe HTML string
     * @returns {string} Safe HTML string
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    /**
     * Deep clone an object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    /**
     * Wait for specified time
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Promise that resolves after timeout
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Check if value is empty (null, undefined, empty string, empty array, empty object)
     * @param {any} value - Value to check
     * @returns {boolean} True if empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    /**
     * Truncate string to specified length
     * @param {string} str - String to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to add when truncated
     * @returns {string} Truncated string
     */
    truncate(str, length, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substr(0, length) + suffix;
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL format
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Strip markdown formatting from text
     * @param {string} text - Text with markdown formatting
     * @returns {string} Plain text without markdown
     */
    stripMarkdown(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            // Remove headers (# ## ### ...)
            .replace(/^#{1,6}\s+/gm, '')
            // Remove bold (**text** or __text__)
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            // Remove italic (*text* or _text_)
            .replace(/(\*|_)(.*?)\1/g, '$2')
            // Remove strikethrough (~~text~~)
            .replace(/~~(.*?)~~/g, '$1')
            // Remove inline code (`text`)
            .replace(/`([^`]+)`/g, '$1')
            // Remove code blocks (```text```)
            .replace(/```[\s\S]*?```/g, '')
            // Remove links [text](url)
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove images ![alt](url)
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
            // Remove reference links [text][ref]
            .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
            // Remove horizontal rules (--- or ***)
            .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '')
            // Remove blockquotes (> text)
            .replace(/^>\s*/gm, '')
            // Remove list markers (* + - or 1.)
            .replace(/^[\s]*[-*+]\s+/gm, '')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            // Remove line breaks and normalize whitespace
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Safely parse JSON from localStorage with corruption detection
     * @param {string} key - localStorage key
     * @param {any} defaultValue - Default value if parsing fails
     * @param {string} expectedType - Expected type ('object', 'array')
     * @returns {any} Parsed value or default
     */
    safeParseLocalStorage(key, defaultValue = null, expectedType = 'object') {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return defaultValue;
            
            // Check for corrupted data patterns
            if (stored === '[object Object]' || stored === '[object Array]') {
                console.warn(`[Utils] Detected corrupted localStorage data for key "${key}": ${stored}`);
                localStorage.removeItem(key);
                return defaultValue;
            }
            
            // Validate JSON format based on expected type
            const isValidFormat = expectedType === 'array' 
                ? (stored.startsWith('[') && stored.endsWith(']'))
                : (stored.startsWith('{') && stored.endsWith('}'));
                
            if (!isValidFormat) {
                console.warn(`[Utils] Invalid JSON format for key "${key}", expected ${expectedType}:`, stored);
                localStorage.removeItem(key);
                return defaultValue;
            }
            
            const parsed = JSON.parse(stored);
            
            // Validate parsed type matches expected
            const actualType = Array.isArray(parsed) ? 'array' : typeof parsed;
            if (actualType !== expectedType) {
                console.warn(`[Utils] Type mismatch for key "${key}", expected ${expectedType}, got ${actualType}`);
                localStorage.removeItem(key);
                return defaultValue;
            }
            
            return parsed;
        } catch (error) {
            console.error(`[Utils] Failed to parse localStorage key "${key}":`, error);
            localStorage.removeItem(key);
            return defaultValue;
        }
    }
};
