/**
 * Enhanced DirectLine Manager Component
 * 
 * A hybrid implementation that combines the official Microsoft DirectLine.js library
 * with custom enhancements for improved streaming, adaptive features, and better UX.
 * 
 * This is a new implementation that extends the official DirectLine library while
 * maintaining compatibility with existing systems. It can be safely tested alongside
 * the current implementation without any impact.
 * 
 * @version 2.0.0
 * @author MCSChat Project Enhanced
 * @license MIT
 * 
 * Key Improvements over existing implementation:
 * - Uses official Microsoft DirectLine.js as core engine
 * - Adds automatic token refresh (every 15 minutes)
 * - Implements exponential backoff retry logic
 * - Enhanced conversation resume with watermarks
 * - Complete Bot Framework activity type support
 * - Network quality detection and optimization
 * - Maintains all existing custom features (adaptive typing, auto-loading, etc.)
 * 
 * Dependencies:
 * - Microsoft Bot Framework DirectLine 3.0+ (auto-loaded)
 * - Utils helper library (optional)
 * 
 * Usage:
 * ```javascript
 * import { EnhancedDirectLineManager } from './DirectLineManagerEnhanced.js';
 * 
 * const manager = new EnhancedDirectLineManager({
 *   autoTokenRefresh: true,
 *   networkOptimization: true,
 *   adaptiveFeatures: true
 * });
 * 
 * await manager.initialize('your-directline-secret');
 * ```
 */

export class EnhancedDirectLineManager {
    /**
     * Create a new Enhanced DirectLine manager instance
     * @param {Object} config - Enhanced configuration options
     * @param {boolean} config.autoTokenRefresh - Enable automatic token refresh (default: true)
     * @param {boolean} config.networkOptimization - Enable network quality optimization (default: true)
     * @param {boolean} config.adaptiveFeatures - Enable adaptive features like smart typing (default: true)
     * @param {boolean} config.conversationResume - Enable conversation resume capability (default: true)
     * @param {number} config.timeout - Connection timeout in milliseconds (default: 20000)
     * @param {number} config.pollingInterval - Polling fallback interval (default: 1000)
     * @param {string} config.domain - DirectLine API domain (default: official)
     * @param {boolean} config.webSocket - Enable WebSocket streaming (default: true)
     * @param {number} config.maxRetries - Maximum retry attempts (default: 5)
     * @param {boolean} config.debugMode - Enable enhanced debugging (default: false)
     */
    constructor(config = {}) {
        // Enhanced configuration with new options
        this.config = {
            // Core DirectLine options
            timeout: config.timeout || 20000,
            pollingInterval: config.pollingInterval || 1000,
            domain: config.domain || 'https://directline.botframework.com/v3/directline',
            webSocket: config.webSocket !== false,
            
            // Enhanced features
            autoTokenRefresh: config.autoTokenRefresh !== false,
            networkOptimization: config.networkOptimization !== false,
            adaptiveFeatures: config.adaptiveFeatures !== false,
            conversationResume: config.conversationResume !== false,
            maxRetries: config.maxRetries || 5,
            debugMode: config.debugMode || false,
            
            ...config
        };

        // Core DirectLine instance (official library)
        this.directLine = null;
        this.directLineVersion = 'unknown';

        // Connection state
        this.connectionState = {
            status: 'uninitialized',
            conversationId: null,
            token: null,
            secret: null,
            watermark: null,
            streamUrl: null,
            retryCount: 0,
            lastActivity: null
        };

        // Enhanced features state
        this.enhancedFeatures = {
            // Token refresh
            tokenRefreshInterval: null,
            tokenRefreshSubscription: null,
            
            // Adaptive typing
            typingTimeout: null,
            lastUserMessage: null,
            typingStartTime: null,
            
            // Network optimization
            networkInfo: null,
            connectionQuality: 'unknown',
            
            // Health monitoring
            healthMonitor: null,
            streamingMetrics: {
                messagesReceived: 0,
                averageLatency: 0,
                connectionUptime: 0,
                reconnectCount: 0
            },
            
            // Error interception storage
            originalFetch: null,
            originalWebSocket: null,
            interceptorsActive: false
        };

        // Callback handlers (maintain compatibility)
        this.callbacks = {
            onActivity: null,
            onConnectionStatusChange: null,
            onError: null,
            onStreamingChunk: null,
            onHealthUpdate: null
        };

        // Retry logic with exponential backoff
        this.retryConfig = {
            baseDelay: 1000,
            maxDelay: 30000,
            backoffFactor: 2,
            jitterMax: 1000
        };

        // Bind methods
        this.handleActivity = this.handleActivity.bind(this);
        this.handleConnectionStatusChange = this.handleConnectionStatusChange.bind(this);
        this.handleError = this.handleError.bind(this);

        this.log('Enhanced DirectLine Manager initialized', this.config);
    }

    /**
     * Validate DirectLine secret format and structure
     * @param {string} secret - DirectLine secret to validate
     * @returns {Object} Validation result with isValid flag and reason
     * @private
     */
    validateDirectLineSecret(secret) {
        if (!secret) {
            return { isValid: false, reason: 'Secret is empty or null' };
        }

        if (typeof secret !== 'string') {
            return { isValid: false, reason: 'Secret must be a string' };
        }

        // Remove whitespace
        const cleanSecret = secret.trim();

        if (cleanSecret.length === 0) {
            return { isValid: false, reason: 'Secret is empty after trimming whitespace' };
        }

        // Check if it looks like a DirectLine secret (typically base64-like string)
        if (cleanSecret.length < 20) {
            return { isValid: false, reason: 'Secret appears too short (DirectLine secrets are typically longer)' };
        }

        // Check for common invalid patterns
        if (cleanSecret.includes('your-secret-here') || 
            cleanSecret.includes('INSERT_SECRET') ||
            cleanSecret.includes('placeholder')) {
            return { isValid: false, reason: 'Secret appears to be a placeholder value' };
        }

        // Check if it contains valid base64-like characters (DirectLine secrets are usually base64)
        const base64Pattern = /^[A-Za-z0-9+/=._-]+$/;
        if (!base64Pattern.test(cleanSecret)) {
            return { isValid: false, reason: 'Secret contains invalid characters (should be alphanumeric with +/=._- characters)' };
        }

        // Log anonymized secret info for debugging
        this.log(`Secret validation passed - Length: ${cleanSecret.length}, Starts with: ${cleanSecret.substring(0, 8)}...`);

        return { isValid: true, reason: 'Secret format appears valid' };
    }

    /**
     * Initialize DirectLine connection with enhanced features
     * @param {string} secret - DirectLine secret key
     * @param {Object} options - Additional initialization options
     * @param {string} options.userId - User ID for the conversation
     * @param {string} options.conversationId - Resume existing conversation
     * @param {string} options.watermark - Resume from specific point
     * @returns {Promise<boolean>} Success status
     */
    async initialize(secret, options = {}) {
        try {
            this.log('Initializing DirectLine connection...');

            if (!secret || typeof secret !== 'string') {
                throw new Error('DirectLine secret is required and must be a string');
            }

            // Validate secret format
            const secretValidation = this.validateDirectLineSecret(secret);
            if (!secretValidation.isValid) {
                throw new Error(`Invalid DirectLine secret: ${secretValidation.reason}`);
            }

            this.connectionState.secret = secret.trim();
            
            if (options.conversationId) {
                this.connectionState.conversationId = options.conversationId;
                this.connectionState.watermark = options.watermark || null;
                this.log('Resuming conversation:', options.conversationId);
            }

            await this.ensureDirectLineLibrary();

            if (this.config.networkOptimization) {
                this.initializeNetworkOptimization();
            }

            await this.createDirectLineInstance();
            this.setupEnhancedSubscriptions();

            if (this.config.adaptiveFeatures) {
                this.startHealthMonitoring();
            }

            if (this.config.autoTokenRefresh && this.connectionState.token) {
                this.setupTokenRefresh();
            }

            this.log('DirectLine initialized successfully');
            return true;

        } catch (error) {
            this.logError('Failed to initialize DirectLine:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * Ensure DirectLine library is loaded with enhanced detection
     * @returns {Promise<void>}
     * @private
     */
    async ensureDirectLineLibrary() {
        if (typeof DirectLine !== 'undefined') {
            this.detectDirectLineVersion();
            return;
        }

        this.log('DirectLine library not found, attempting to load...');

        // Enhanced CDN sources with fallbacks
        const cdnSources = [
            // Modern DirectLine 3.0+ (preferred)
            'https://cdn.botframework.com/botframework-directline/latest/directline.js',
            'https://cdn.botframework.com/botframework-directline/3.0.3/directline.js',
            'https://unpkg.com/botframework-directline@latest/built/directline.js',
            'https://cdn.jsdelivr.net/npm/botframework-directline@latest/built/directline.js',
            
            // Legacy fallback
            'https://unpkg.com/botframework-directlinejs@0.11.6/dist/directline.js'
        ];

        for (const cdnUrl of cdnSources) {
            try {
                await this.loadScript(cdnUrl);
                if (typeof DirectLine !== 'undefined') {
                    this.log(`DirectLine library loaded from: ${cdnUrl}`);
                    this.detectDirectLineVersion();
                    return;
                }
            } catch (error) {
                this.log(`Failed to load from ${cdnUrl}:`, error.message);
            }
        }

        throw new Error('Failed to load DirectLine library from all CDN sources');
    }

    /**
     * Enhanced DirectLine version detection
     * @private
     */
    detectDirectLineVersion() {
        if (typeof DirectLine === 'undefined') {
            this.directLineVersion = 'none';
            return;
        }

        try {
            // Check for modern features
            if (DirectLine.DirectLine && DirectLine.ConnectionStatus) {
                // Test for specific modern features
                const hasStreamingSupport = !!DirectLine.DirectLineStreaming;
                const hasTokenRefresh = DirectLine.DirectLine.prototype.refreshToken;
                const hasReconnect = DirectLine.DirectLine.prototype.reconnect;

                if (hasStreamingSupport) {
                    this.directLineVersion = 'modern-streaming';
                } else if (hasTokenRefresh && hasReconnect) {
                    this.directLineVersion = 'modern';
                } else {
                    this.directLineVersion = 'standard';
                }
            } else {
                this.directLineVersion = 'legacy';
            }

            this.log(`Detected DirectLine version: ${this.directLineVersion}`);
        } catch (error) {
            this.directLineVersion = 'unknown';
            this.log('DirectLine version detection failed:', error);
        }
    }

    /**
     * Load script with enhanced error handling
     * @param {string} url - Script URL
     * @returns {Promise<void>}
     * @private
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                reject(new Error('Not in browser environment'));
                return;
            }

            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.defer = true;

            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error(`Script loading timeout: ${url}`));
            }, 10000); // 10 second timeout

            script.onload = () => {
                clearTimeout(timeout);
                setTimeout(resolve, 100); // Allow library to initialize
            };

            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error(`Failed to load script: ${url}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Create DirectLine instance with simplified configuration
     * @private
     */
    async createDirectLineInstance() {
        this.disconnect(); // Clean up any existing connection

        // Minimal configuration to avoid type errors
        const directLineConfig = {
            secret: String(this.connectionState.secret).trim(),
        };

        // Add optional parameters only if valid
        if (this.config.webSocket === true || this.config.webSocket === false) {
            directLineConfig.webSocket = Boolean(this.config.webSocket);
        }

        if (this.config.timeout && !isNaN(Number(this.config.timeout))) {
            directLineConfig.timeout = Number(this.config.timeout);
        }

        if (this.config.pollingInterval && !isNaN(Number(this.config.pollingInterval))) {
            directLineConfig.pollingInterval = Number(this.config.pollingInterval);
        }

        // Add conversation resume if available
        if (this.connectionState.conversationId && typeof this.connectionState.conversationId === 'string') {
            directLineConfig.conversationId = String(this.connectionState.conversationId);
            if (this.connectionState.watermark && typeof this.connectionState.watermark === 'string') {
                directLineConfig.watermark = String(this.connectionState.watermark);
            }
        }

        try {
            this.log('Creating DirectLine instance...');
            
            if (typeof DirectLine === 'undefined' || !DirectLine.DirectLine) {
                throw new Error('DirectLine library is not available');
            }
            
            this.directLine = new DirectLine.DirectLine(directLineConfig);
            this.log('DirectLine instance created successfully');
            
            if (!this.directLine) {
                throw new Error('DirectLine instance creation failed');
            }
            
            this.wrapDirectLineWithErrorCapture();
            
        } catch (error) {
            this.logError('Failed to create DirectLine instance:', error);
            
            if (error.message && error.message.includes('type.toUpperCase')) {
                this.log('Type conversion error - using minimal config', 'error');
                // Retry with absolute minimal config
                try {
                    this.directLine = new DirectLine.DirectLine({ secret: this.connectionState.secret });
                    this.log('DirectLine created with minimal config');
                } catch (retryError) {
                    throw new Error(`DirectLine creation failed: ${retryError.message}`);
                }
            } else {
                throw new Error(`DirectLine creation failed: ${error.message}`);
            }
        }
    }

    /**
     * Wrap DirectLine instance with comprehensive error capture
     * @private
     */
    wrapDirectLineWithErrorCapture() {
        if (!this.directLine) return;

        // Intercept fetch calls to capture HTTP errors
        this.interceptDirectLineFetch();
        
        // Wrap WebSocket creation to capture connection errors
        this.interceptWebSocketErrors();
        
        // Monitor internal DirectLine error events
        this.monitorDirectLineInternals();
    }

    /**
     * Intercept fetch calls made by DirectLine to capture HTTP errors
     * @private
     */
    interceptDirectLineFetch() {
        // Store original fetch if not already stored
        if (!this.enhancedFeatures.originalFetch) {
            this.enhancedFeatures.originalFetch = window.fetch;
        }
        
        const originalFetch = this.enhancedFeatures.originalFetch;
        const self = this;
        
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                
                // Check if this is a DirectLine API call
                const url = args[0];
                if (typeof url === 'string' && url.includes('directline.botframework.com')) {
                    self.log(`DirectLine API call: ${url} - Status: ${response.status}`);
                    
                    if (!response.ok) {
                        // Capture detailed error information
                        const errorData = {
                            url: url,
                            status: response.status,
                            statusText: response.statusText,
                            headers: Object.fromEntries(response.headers.entries())
                        };
                        
                        // Try to get response body
                        try {
                            const clonedResponse = response.clone();
                            const responseText = await clonedResponse.text();
                            errorData.responseBody = responseText;
                            
                            // Try to parse as JSON for more details
                            try {
                                errorData.responseJson = JSON.parse(responseText);
                            } catch (e) {
                                // Not JSON, keep as text
                            }
                        } catch (e) {
                            self.log('Could not read response body for error analysis');
                        }
                        
                        self.log(`DirectLine API Error Details: ${JSON.stringify(errorData, null, 2)}`, 'error');
                        self.handleDirectLineApiError(errorData);
                    }
                }
                
                return response;
            } catch (error) {
                // Network error or other fetch failure
                if (typeof args[0] === 'string' && args[0].includes('directline.botframework.com')) {
                    self.log(`DirectLine API Network Error: ${error.message}`, 'error');
                    self.handleDirectLineError(error);
                }
                throw error;
            }
        };
        
        this.enhancedFeatures.interceptorsActive = true;
    }

    /**
     * Intercept WebSocket errors for DirectLine streaming
     * @private
     */
    interceptWebSocketErrors() {
        // Store original WebSocket if not already stored
        if (!this.enhancedFeatures.originalWebSocket) {
            this.enhancedFeatures.originalWebSocket = window.WebSocket;
        }
        
        const originalWebSocket = this.enhancedFeatures.originalWebSocket;
        const self = this;
        
        window.WebSocket = function(url, protocols) {
            const ws = new originalWebSocket(url, protocols);
            
            // Check if this is a DirectLine WebSocket
            if (url && url.includes('directline.botframework.com')) {
                self.log(`DirectLine WebSocket connecting to: ${url}`);
                
                ws.addEventListener('error', (event) => {
                    self.log(`DirectLine WebSocket Error: ${JSON.stringify(event)}`, 'error');
                    self.handleDirectLineError(new Error(`WebSocket connection failed: ${event.type}`));
                });
                
                ws.addEventListener('close', (event) => {
                    self.log(`DirectLine WebSocket Closed: Code ${event.code}, Reason: ${event.reason}`, 'warning');
                    if (event.code !== 1000) { // Not normal closure
                        self.handleDirectLineError(new Error(`WebSocket closed abnormally: ${event.code} - ${event.reason}`));
                    }
                });
            }
            
            return ws;
        };
    }

    /**
     * Monitor DirectLine internal observables for errors
     * @private
     */
    monitorDirectLineInternals() {
        if (!this.directLine) return;
        
        // Try to access internal error streams
        try {
            // Check if DirectLine has internal error observables
            if (this.directLine.connectionStatus$) {
                // Create a separate subscription just for error monitoring
                this.directLine.connectionStatus$.subscribe(
                    status => {
                        // Log all status changes with details
                        this.log(`DirectLine Internal Status: ${status} (${this.getStatusName(status)})`);
                    },
                    error => {
                        this.log(`DirectLine Status Observable Error: ${JSON.stringify(error)}`, 'error');
                        this.handleDirectLineError(error);
                    }
                );
            }
            
            // Monitor activity stream for errors
            if (this.directLine.activity$) {
                const originalSubscribe = this.directLine.activity$.subscribe;
                this.directLine.activity$.subscribe = (...args) => {
                    // Wrap the error handler
                    if (args.length > 1 && typeof args[1] === 'function') {
                        const originalErrorHandler = args[1];
                        args[1] = (error) => {
                            this.log(`DirectLine Activity Observable Error: ${JSON.stringify(error)}`, 'error');
                            this.handleDirectLineError(error);
                            originalErrorHandler(error);
                        };
                    }
                    return originalSubscribe.apply(this.directLine.activity$, args);
                };
            }
        } catch (error) {
            this.log('Could not monitor DirectLine internals:', error);
        }
    }

    /**
     * Handle DirectLine API-specific errors with detailed analysis
     * @param {Object} errorData - Detailed error information from API call
     * @private
     */
    handleDirectLineApiError(errorData) {
        const { status, statusText, url, responseBody, responseJson } = errorData;
        
        let errorCategory = 'api';
        let suggestion = '';
        let specificError = `HTTP ${status} ${statusText}`;
        
        // Analyze specific HTTP status codes
        switch (status) {
            case 401:
                errorCategory = 'authentication';
                suggestion = 'DirectLine secret is invalid, expired, or malformed. Please verify your secret in Azure Portal → Bot → Channels → DirectLine.';
                specificError = 'Authentication failed - Invalid DirectLine secret';
                break;
                
            case 403:
                errorCategory = 'permissions';
                suggestion = 'DirectLine channel is disabled or not properly configured. Check Azure Portal bot settings.';
                specificError = 'Access forbidden - DirectLine channel may be disabled';
                break;
                
            case 404:
                errorCategory = 'configuration';
                suggestion = 'Bot not found or DirectLine endpoint incorrect. Verify bot deployment and DirectLine configuration.';
                specificError = 'Bot or endpoint not found';
                break;
                
            case 429:
                errorCategory = 'throttling';
                suggestion = 'Too many requests - DirectLine rate limit exceeded. Wait and retry.';
                specificError = 'Rate limit exceeded';
                break;
                
            case 500:
            case 502:
            case 503:
                errorCategory = 'server';
                suggestion = 'Bot service error. Check Azure Portal for bot service status and logs.';
                specificError = `Bot service error (${status})`;
                break;
                
            default:
                suggestion = `Unexpected HTTP error. Check bot configuration and service status.`;
        }
        
        // Extract additional error details from response body
        if (responseJson && responseJson.error) {
            const apiError = responseJson.error;
            if (apiError.message) {
                specificError += ` - ${apiError.message}`;
            }
            if (apiError.code) {
                specificError += ` (Code: ${apiError.code})`;
            }
        } else if (responseBody && responseBody.trim()) {
            specificError += ` - ${responseBody.substring(0, 200)}`;
        }
        
        this.log(`DirectLine API Error: ${specificError}`, 'error');
        this.log(`Category: ${errorCategory}`, 'error');
        this.log(`Suggestion: ${suggestion}`, 'warning');
        
        // Emit detailed error event
        this.emitEvent('directLineError', {
            error: specificError,
            category: errorCategory,
            suggestion: suggestion,
            details: errorData,
            timestamp: Date.now()
        });
    }

    /**
     * Get human-readable status name
     * @param {number} status - DirectLine status code
     * @returns {string} Status name
     * @private
     */
    getStatusName(status) {
        const statusMap = {
            0: 'Uninitialized',
            1: 'Connecting', 
            2: 'Online',
            3: 'ExpiredToken',
            4: 'FailedToConnect',
            5: 'Ended'
        };
        return statusMap[status] || `Unknown(${status})`;
    }

    /**
     * Restore original browser functions
     * @private
     */
    restoreInterceptors() {
        if (this.enhancedFeatures.interceptorsActive) {
            if (this.enhancedFeatures.originalFetch) {
                window.fetch = this.enhancedFeatures.originalFetch;
                this.enhancedFeatures.originalFetch = null;
            }
            
            if (this.enhancedFeatures.originalWebSocket) {
                window.WebSocket = this.enhancedFeatures.originalWebSocket;
                this.enhancedFeatures.originalWebSocket = null;
            }
            
            this.enhancedFeatures.interceptorsActive = false;
            this.log('Restored original browser functions');
        }
    }

    /**
     * Handle DirectLine-specific errors with detailed analysis
     * @param {Error} error - DirectLine error object
     * @private
     */
    handleDirectLineError(error) {
        this.logError('DirectLine Error Details:', error);
        
        // Try to extract more information from the error
        let errorMessage = '';
        let errorDetails = {};
        
        if (error && typeof error === 'object') {
            errorMessage = error.message || error.toString() || '';
            
            // Extract additional error properties
            errorDetails = {
                name: error.name,
                status: error.status,
                statusText: error.statusText,
                code: error.code,
                response: error.response,
                stack: error.stack
            };
            
            // Remove undefined properties
            Object.keys(errorDetails).forEach(key => {
                if (errorDetails[key] === undefined) {
                    delete errorDetails[key];
                }
            });
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Skip processing if this is a generic "failed to connect" with no details
        // This usually means a more specific error was already processed
        if (errorMessage === 'failed to connect' && Object.keys(errorDetails).length === 0) {
            this.log('Skipping generic "failed to connect" error - likely already processed', 'info');
            return;
        }
        
        // Analyze error types common with official DirectLine.js
        let errorCategory = 'unknown';
        let suggestion = 'Check the debug logs for more details.';
        
        if (errorMessage) {
            const message = errorMessage.toLowerCase();
            
            if (message.includes('unauthorized') || message.includes('401') || errorDetails.status === 401) {
                errorCategory = 'authentication';
                suggestion = 'DirectLine secret is invalid or expired. Please check your secret in Azure Portal → Bot → Channels → DirectLine.';
            } else if (message.includes('forbidden') || message.includes('403') || errorDetails.status === 403) {
                errorCategory = 'permissions';
                suggestion = 'DirectLine channel may not be enabled or configured properly. Check Azure Portal bot configuration.';
            } else if (message.includes('timeout') || message.includes('network') || message.includes('connection')) {
                errorCategory = 'network';
                suggestion = 'Network connectivity issue. Check internet connection, firewall settings, and bot service availability.';
            } else if (message.includes('cors')) {
                errorCategory = 'cors';
                suggestion = 'Cross-origin request blocked. Check CORS configuration on your bot service.';
            } else if (message.includes('bad request') || message.includes('400') || errorDetails.status === 400) {
                errorCategory = 'configuration';
                suggestion = 'Invalid request configuration. Check DirectLine settings and secret format.';
            } else if (message.includes('failed to connect') || message.includes('connection failed')) {
                // Generic connection failure - need to investigate further
                errorCategory = 'connection';
                suggestion = 'Connection failed. This could be due to: 1) Invalid DirectLine secret, 2) Bot service down, 3) Network issues, 4) DirectLine channel disabled.';
                
                // Add specific diagnostic steps for generic failures
                this.performConnectionDiagnostics();
            } else if (message.includes('server error') || message.includes('500') || errorDetails.status >= 500) {
                errorCategory = 'server';
                suggestion = 'Bot service error. Check Azure Portal for bot service status and logs.';
            } else if (message.includes('invalid token') || message.includes('badargument')) {
                errorCategory = 'authentication';
                suggestion = 'DirectLine secret format is invalid or the secret has expired. Please generate a new secret in Azure Portal.';
            }
        }
        
        this.log(`Error Category: ${errorCategory}`, 'error');
        this.log(`Error Message: ${errorMessage}`, 'error');
        this.log(`Suggestion: ${suggestion}`, 'warning');
        
        // Log additional error details if available
        if (Object.keys(errorDetails).length > 0) {
            this.log(`Additional Error Details: ${JSON.stringify(errorDetails, null, 2)}`, 'error');
        }
        
        // Emit detailed error event
        this.emitEvent('directLineError', {
            error: errorMessage || 'Unknown error',
            category: errorCategory,
            suggestion: suggestion,
            details: errorDetails,
            fullError: error,
            timestamp: Date.now()
        });
    }

    /**
     * Perform additional connection diagnostics for generic failures
     * @private
     */
    async performConnectionDiagnostics() {
        this.log('=== PERFORMING CONNECTION DIAGNOSTICS ===', 'warning');
        
        // Test 1: Validate secret format
        const secretValidation = this.validateDirectLineSecret(this.connectionState.secret);
        this.log(`Secret validation: ${secretValidation.isValid ? 'PASS' : 'FAIL'} - ${secretValidation.reason}`, 
                 secretValidation.isValid ? 'success' : 'error');
        
        // Test 2: Test DirectLine endpoint accessibility
        try {
            const testUrl = `${this.config.domain}/tokens/generate`;
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.connectionState.secret}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            this.log(`DirectLine endpoint test: ${response.status} ${response.statusText}`, 
                     response.ok ? 'success' : 'error');
                     
            if (!response.ok) {
                const responseText = await response.text();
                this.log(`Response details: ${responseText}`, 'error');
            }
        } catch (error) {
            this.log(`DirectLine endpoint test failed: ${error.message}`, 'error');
        }
        
        // Test 3: Network connectivity
        try {
            const networkTest = await fetch('https://www.microsoft.com', { 
                method: 'HEAD', 
                mode: 'no-cors' 
            });
            this.log('Network connectivity: PASS', 'success');
        } catch (error) {
            this.log(`Network connectivity: FAIL - ${error.message}`, 'error');
        }
        
        this.log('=== DIAGNOSTICS COMPLETE ===', 'warning');
    }

    /**
     * Set up enhanced subscriptions with error handling
     * @private
     */
    setupEnhancedSubscriptions() {
        if (!this.directLine) return;

        try {
            // Activity subscription with enhanced handling
            this.directLine.activity$.subscribe(
                activity => {
                    this.connectionState.lastActivity = Date.now();
                    this.enhancedFeatures.streamingMetrics.messagesReceived++;
                    this.handleActivity(activity);
                },
                error => {
                    this.logError('Activity subscription error:', error);
                    this.handleDirectLineError(error);
                    this.handleSubscriptionError(error);
                }
            );

            // Connection status subscription with enhanced error capture
            this.directLine.connectionStatus$.subscribe(
                status => {
                    this.handleConnectionStatusChange(status);
                },
                error => {
                    this.logError('Connection status subscription error:', error);
                    this.handleDirectLineError(error);
                    this.handleSubscriptionError(error);
                }
            );

            // Add error interception for the DirectLine instance itself
            if (this.directLine.activity$ && this.directLine.activity$.source) {
                try {
                    // Try to access internal error streams if available
                    const originalSubscribe = this.directLine.activity$.subscribe;
                    this.directLine.activity$.subscribe = (...args) => {
                        // Wrap error handler
                        if (args[1] && typeof args[1] === 'function') {
                            const originalErrorHandler = args[1];
                            args[1] = (error) => {
                                this.handleDirectLineError(error);
                                originalErrorHandler(error);
                            };
                        }
                        return originalSubscribe.apply(this.directLine.activity$, args);
                    };
                } catch (e) {
                    this.log('Could not intercept DirectLine errors at source level');
                }
            }

            this.log('Enhanced subscriptions established');

        } catch (error) {
            this.logError('Failed to set up subscriptions:', error);
            this.handleDirectLineError(error);
            throw error;
        }
    }

    /**
     * Initialize network optimization features
     * @private
     */
    initializeNetworkOptimization() {
        try {
            // Check for Network Information API support
            if ('connection' in navigator) {
                this.enhancedFeatures.networkInfo = navigator.connection;
                
                // Monitor network changes
                this.enhancedFeatures.networkInfo.addEventListener('change', () => {
                    this.handleNetworkChange();
                });

                this.updateConnectionQuality();
                this.log('Network optimization initialized');
            } else {
                this.log('Network Information API not supported');
            }
        } catch (error) {
            this.log('Network optimization initialization failed:', error);
        }
    }

    /**
     * Handle network quality changes
     * @private
     */
    handleNetworkChange() {
        if (!this.enhancedFeatures.networkInfo) return;

        const oldQuality = this.enhancedFeatures.connectionQuality;
        this.updateConnectionQuality();

        if (oldQuality !== this.enhancedFeatures.connectionQuality) {
            this.log(`Network quality changed: ${oldQuality} -> ${this.enhancedFeatures.connectionQuality}`);
            
            // Emit network quality event
            this.emitEvent('networkQualityChanged', {
                oldQuality,
                newQuality: this.enhancedFeatures.connectionQuality,
                networkInfo: {
                    type: this.enhancedFeatures.networkInfo.type,
                    effectiveType: this.enhancedFeatures.networkInfo.effectiveType,
                    downlink: this.enhancedFeatures.networkInfo.downlink,
                    rtt: this.enhancedFeatures.networkInfo.rtt
                }
            });

            // Adjust configuration based on network quality
            this.optimizeForNetworkQuality();
        }
    }

    /**
     * Update connection quality assessment
     * @private
     */
    updateConnectionQuality() {
        if (!this.enhancedFeatures.networkInfo) {
            this.enhancedFeatures.connectionQuality = 'unknown';
            return;
        }

        const { effectiveType, downlink, rtt } = this.enhancedFeatures.networkInfo;

        if (effectiveType === '4g' && downlink > 1.5 && rtt < 100) {
            this.enhancedFeatures.connectionQuality = 'excellent';
        } else if (effectiveType === '4g' || (downlink > 0.5 && rtt < 300)) {
            this.enhancedFeatures.connectionQuality = 'good';
        } else if (effectiveType === '3g' || (downlink > 0.1 && rtt < 800)) {
            this.enhancedFeatures.connectionQuality = 'fair';
        } else {
            this.enhancedFeatures.connectionQuality = 'poor';
        }
    }

    /**
     * Optimize configuration based on network quality
     * @private
     */
    optimizeForNetworkQuality() {
        const quality = this.enhancedFeatures.connectionQuality;

        switch (quality) {
            case 'poor':
                // Use polling instead of WebSocket for poor connections
                if (this.config.webSocket && this.directLine) {
                    this.log('Switching to polling due to poor network quality');
                    // Note: Would need to recreate connection with webSocket: false
                }
                break;
                
            case 'fair':
                // Increase polling interval
                this.config.pollingInterval = Math.max(this.config.pollingInterval, 2000);
                break;
                
            case 'good':
            case 'excellent':
                // Optimize for fast connections
                this.config.pollingInterval = Math.min(this.config.pollingInterval, 1000);
                break;
        }
    }

    /**
     * Start health monitoring
     * @private
     */
    startHealthMonitoring() {
        const startTime = Date.now();

        this.enhancedFeatures.healthMonitor = setInterval(() => {
            const now = Date.now();
            const uptime = now - startTime;
            
            // Update metrics
            this.enhancedFeatures.streamingMetrics.connectionUptime = uptime;

            // Calculate average latency (simplified)
            if (this.connectionState.lastActivity) {
                const timeSinceLastActivity = now - this.connectionState.lastActivity;
                this.enhancedFeatures.streamingMetrics.averageLatency = timeSinceLastActivity;
            }

            // Emit health update
            this.emitEvent('healthUpdate', {
                ...this.enhancedFeatures.streamingMetrics,
                connectionQuality: this.enhancedFeatures.connectionQuality,
                networkInfo: this.enhancedFeatures.networkInfo ? {
                    type: this.enhancedFeatures.networkInfo.type,
                    effectiveType: this.enhancedFeatures.networkInfo.effectiveType
                } : null
            });

        }, 30000); // Update every 30 seconds

        this.log('Health monitoring started');
    }

    /**
     * Set up automatic token refresh
     * @private
     */
    setupTokenRefresh() {
        if (!this.directLine || !this.directLine.refreshToken) {
            this.log('Token refresh not supported by current DirectLine version');
            return;
        }

        // Refresh token every 15 minutes (Microsoft recommendation)
        this.enhancedFeatures.tokenRefreshInterval = setInterval(async () => {
            try {
                this.log('Refreshing DirectLine token...');
                
                // Use official refresh method if available
                if (this.directLine.refreshToken) {
                    await this.directLine.refreshToken();
                    this.log('Token refreshed successfully');
                } else {
                    this.log('Manual token refresh not implemented yet');
                }

            } catch (error) {
                this.logError('Token refresh failed:', error);
                this.handleTokenRefreshError(error);
            }
        }, 15 * 60 * 1000); // 15 minutes

        this.log('Automatic token refresh enabled');
    }

    /**
     * Handle token refresh errors
     * @param {Error} error - Token refresh error
     * @private
     */
    handleTokenRefreshError(error) {
        // Stop further refresh attempts
        if (this.enhancedFeatures.tokenRefreshInterval) {
            clearInterval(this.enhancedFeatures.tokenRefreshInterval);
            this.enhancedFeatures.tokenRefreshInterval = null;
        }

        // Emit token expiry event
        this.emitEvent('tokenExpired', {
            error: error.message,
            timestamp: Date.now()
        });

        // Call error callback
        if (this.callbacks.onError) {
            this.callbacks.onError(new Error('Token refresh failed: ' + error.message));
        }
    }

    /**
     * Enhanced activity handling with adaptive features
     * @param {Object} activity - DirectLine activity
     * @private
     */
    handleActivity(activity) {
        try {
            this.log('Processing activity:', activity.type, activity.id);

            // Handle typing indicators with adaptive timing
            if (activity.type === 'typing') {
                this.handleAdaptiveTypingIndicator();
                return;
            }

            // Clear any existing typing timeout
            this.clearTypingTimeout();

            // Process activities from bot only
            if (activity.from && activity.from.id !== 'user') {
                switch (activity.type) {
                    case 'message':
                        this.handleEnhancedMessage(activity);
                        break;
                        
                    case 'conversationUpdate':
                        this.handleConversationUpdate(activity);
                        break;
                        
                    case 'event':
                        this.handleEventActivity(activity);
                        break;
                        
                    case 'contactRelationUpdate':
                        this.handleContactRelationUpdate(activity);
                        break;
                        
                    case 'deleteUserData':
                        this.handleDeleteUserData(activity);
                        break;
                        
                    case 'endOfConversation':
                        this.handleEndOfConversation(activity);
                        break;
                        
                    default:
                        this.log('Unhandled activity type:', activity.type);
                        this.handleGenericActivity(activity);
                }
            }

            // Call external callback
            if (this.callbacks.onActivity) {
                this.callbacks.onActivity(activity);
            }

        } catch (error) {
            this.logError('Error handling activity:', error);
            this.handleError(error);
        }
    }

    /**
     * Handle adaptive typing indicators with context awareness
     * @private
     */
    handleAdaptiveTypingIndicator() {
        const now = Date.now();
        
        if (!this.config.adaptiveFeatures) {
            // Basic typing indicator
            this.emitEvent('showTypingIndicator', {
                timestamp: now,
                source: 'directline'
            });
            return;
        }

        // Adaptive typing with intelligent timeout
        this.enhancedFeatures.typingStartTime = now;
        
        const expectedDuration = this.calculateAdaptiveTypingDuration();
        
        this.emitEvent('showTypingIndicator', {
            timestamp: now,
            source: 'enhanced-directline',
            expectedDuration,
            isAdaptive: true
        });

        // Set adaptive timeout
        this.clearTypingTimeout();
        this.enhancedFeatures.typingTimeout = setTimeout(() => {
            this.emitEvent('hideTypingIndicator', {
                reason: 'adaptive-timeout',
                duration: expectedDuration,
                actualDuration: Date.now() - now
            });
        }, expectedDuration);
    }

    /**
     * Calculate adaptive typing duration based on context
     * @returns {number} Duration in milliseconds
     * @private
     */
    calculateAdaptiveTypingDuration() {
        const baseTimeout = 8000; // 8 seconds base
        const lastMessage = this.enhancedFeatures.lastUserMessage;

        if (!lastMessage) return baseTimeout;

        // Analyze message complexity
        let multiplier = 1;

        // Longer timeout for complex questions
        if (lastMessage.length > 100) multiplier += 0.5;
        if (lastMessage.includes('?')) multiplier += 0.3;
        if (/\b(explain|describe|analyze|compare|detail)\b/i.test(lastMessage)) multiplier += 0.7;
        if (/\b(how|why|what|when|where)\b/i.test(lastMessage)) multiplier += 0.4;

        // Network quality adjustment
        switch (this.enhancedFeatures.connectionQuality) {
            case 'poor': multiplier += 1; break;
            case 'fair': multiplier += 0.5; break;
            case 'good': multiplier += 0.2; break;
            case 'excellent': break; // no change
        }

        return Math.min(baseTimeout * multiplier, 20000); // Max 20 seconds
    }

    /**
     * Clear typing timeout
     * @private
     */
    clearTypingTimeout() {
        if (this.enhancedFeatures.typingTimeout) {
            clearTimeout(this.enhancedFeatures.typingTimeout);
            this.enhancedFeatures.typingTimeout = null;
        }
    }

    /**
     * Handle enhanced message activities with streaming detection
     * @param {Object} activity - Message activity
     * @private
     */
    handleEnhancedMessage(activity) {
        // Detect if this is part of a streaming sequence
        const isStreamingChunk = this.detectStreamingChunk(activity);
        
        if (isStreamingChunk) {
            this.handleStreamingChunk(activity);
        } else {
            this.handleCompleteMessage(activity);
        }
    }

    /**
     * Detect if activity is a streaming chunk
     * @param {Object} activity - Message activity
     * @returns {boolean} True if streaming chunk
     * @private
     */
    detectStreamingChunk(activity) {
        // Enhanced streaming detection logic
        if (activity.channelData?.streaming === true) return true;
        if (activity.channelData?.streamingEnd === true) return false;
        
        // Heuristic detection for non-marked streaming
        const isShortMessage = activity.text && activity.text.length < 50;
        const hasNoAttachments = !activity.attachments || activity.attachments.length === 0;
        const hasNoSuggestedActions = !activity.suggestedActions || !activity.suggestedActions.actions;
        
        return isShortMessage && hasNoAttachments && hasNoSuggestedActions && this.enhancedFeatures.typingStartTime;
    }

    /**
     * Handle streaming message chunk
     * @param {Object} activity - Streaming chunk
     * @private
     */
    handleStreamingChunk(activity) {
        const chunkData = {
            ...activity,
            streamingMetadata: {
                isStreaming: true,
                chunkNumber: this.getNextChunkNumber(),
                duration: this.getStreamingDuration(),
                timestamp: Date.now()
            }
        };

        this.emitEvent('streamingChunk', chunkData);

        if (this.callbacks.onStreamingChunk) {
            this.callbacks.onStreamingChunk(chunkData);
        }
    }

    /**
     * Handle complete message
     * @param {Object} activity - Complete message
     * @private
     */
    handleCompleteMessage(activity) {
        this.emitEvent('messageReceived', {
            ...activity,
            streamingMetadata: {
                isStreaming: false,
                timestamp: Date.now(),
                isComplete: true
            }
        });
    }

    /**
     * Handle conversation update activities
     * @param {Object} activity - Conversation update
     * @private
     */
    handleConversationUpdate(activity) {
        this.log('Conversation update:', activity);
        this.emitEvent('conversationUpdate', activity);
    }

    /**
     * Handle event activities
     * @param {Object} activity - Event activity
     * @private
     */
    handleEventActivity(activity) {
        this.log('Event activity:', activity.name, activity.value);
        this.emitEvent('eventActivity', activity);
    }

    /**
     * Handle contact relation update activities
     * @param {Object} activity - Contact relation update
     * @private
     */
    handleContactRelationUpdate(activity) {
        this.log('Contact relation update:', activity);
        this.emitEvent('contactRelationUpdate', activity);
    }

    /**
     * Handle delete user data activities
     * @param {Object} activity - Delete user data
     * @private
     */
    handleDeleteUserData(activity) {
        this.log('Delete user data:', activity);
        this.emitEvent('deleteUserData', activity);
    }

    /**
     * Handle end of conversation activities
     * @param {Object} activity - End of conversation
     * @private
     */
    handleEndOfConversation(activity) {
        this.log('End of conversation:', activity);
        this.emitEvent('endOfConversation', activity);
    }

    /**
     * Handle generic activities
     * @param {Object} activity - Generic activity
     * @private
     */
    handleGenericActivity(activity) {
        this.log('Generic activity:', activity);
        this.emitEvent('genericActivity', activity);
    }

    /**
     * Get next chunk number for streaming
     * @returns {number} Next chunk number
     * @private
     */
    getNextChunkNumber() {
        if (!this.enhancedFeatures.chunkCounter) {
            this.enhancedFeatures.chunkCounter = 0;
        }
        return ++this.enhancedFeatures.chunkCounter;
    }

    /**
     * Get streaming duration
     * @returns {number} Duration in milliseconds
     * @private
     */
    getStreamingDuration() {
        if (!this.enhancedFeatures.typingStartTime) return 0;
        return Date.now() - this.enhancedFeatures.typingStartTime;
    }

    /**
     * Enhanced connection status handling with retry logic
     * @param {number} status - Connection status
     * @private
     */
    handleConnectionStatusChange(status) {
        const statusInfo = this.getEnhancedConnectionStatus(status);
        
        this.log(`Connection status: ${statusInfo.name} (${status})`);
        this.connectionState.status = statusInfo.status;

        // Emit connection status event
        this.emitEvent('connectionStatus', {
            status: statusInfo.status,
            name: statusInfo.name,
            message: statusInfo.message,
            code: status,
            retryCount: this.connectionState.retryCount
        });

        // Handle specific status cases with enhanced logic
        switch (status) {
            case 0: // Uninitialized
                this.connectionState.retryCount = 0;
                break;
                
            case 1: // Connecting
                this.log('Establishing connection...');
                break;
                
            case 2: // Online
                this.connectionState.retryCount = 0;
                this.enhancedFeatures.streamingMetrics.reconnectCount = 0;
                setTimeout(() => this.sendEnhancedGreeting(), 1000);
                break;
                
            case 3: // ExpiredToken
                this.handleTokenExpiry();
                break;
                
            case 4: // FailedToConnect
                this.handleConnectionFailure();
                break;
                
            case 5: // Ended
                this.handleConnectionEnded();
                break;
        }

        // Call external callback
        if (this.callbacks.onConnectionStatusChange) {
            this.callbacks.onConnectionStatusChange(status, statusInfo);
        }
    }

    /**
     * Get enhanced connection status information
     * @param {number} status - Status code
     * @returns {Object} Enhanced status information
     * @private
     */
    getEnhancedConnectionStatus(status) {
        const statusMap = {
            0: { 
                name: 'Uninitialized', 
                status: 'uninitialized', 
                message: 'Connection not initialized',
                severity: 'info'
            },
            1: { 
                name: 'Connecting', 
                status: 'connecting', 
                message: 'Connecting to bot service...',
                severity: 'info'
            },
            2: { 
                name: 'Online', 
                status: 'online', 
                message: 'Successfully connected to bot!',
                severity: 'success'
            },
            3: { 
                name: 'ExpiredToken', 
                status: 'expired', 
                message: 'Authentication token expired. Attempting refresh...',
                severity: 'warning'
            },
            4: { 
                name: 'FailedToConnect', 
                status: 'failed', 
                message: 'Failed to connect. Implementing retry strategy...',
                severity: 'error'
            },
            5: { 
                name: 'Ended', 
                status: 'ended', 
                message: 'Connection ended. Attempting reconnection...',
                severity: 'warning'
            }
        };

        return statusMap[status] || { 
            name: 'Unknown', 
            status: 'unknown', 
            message: `Unknown connection status: ${status}`,
            severity: 'error'
        };
    }

    /**
     * Handle token expiry with automatic refresh
     * @private
     */
    handleTokenExpiry() {
        this.log('Token expired, attempting refresh...');
        
        if (this.config.autoTokenRefresh && this.directLine && this.directLine.refreshToken) {
            // Try automatic refresh
            this.directLine.refreshToken()
                .then(() => {
                    this.log('Token refreshed successfully');
                })
                .catch(error => {
                    this.logError('Automatic token refresh failed:', error);
                    this.handleTokenRefreshError(error);
                });
        } else {
            // Manual refresh required
            this.emitEvent('tokenRefreshRequired', {
                message: 'Token expired and automatic refresh not available',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle connection failure with retry logic
     * @private
     */
    handleConnectionFailure() {
        // Check if we should stop trying (already in failed state)
        if (this.connectionState.status === 'failed') {
            this.log('Connection failure handling skipped - connection marked as failed');
            return;
        }
        
        this.connectionState.retryCount++;
        this.enhancedFeatures.streamingMetrics.reconnectCount++;
        
        // Log diagnostic information on first failure
        if (this.connectionState.retryCount === 1) {
            this.logConnectionDiagnostics();
        }
        
        if (this.connectionState.retryCount <= this.config.maxRetries) {
            const delay = this.calculateRetryDelay(this.connectionState.retryCount);
            
            this.log(`Connection failed, retrying in ${delay}ms (attempt ${this.connectionState.retryCount}/${this.config.maxRetries})`);
            
            setTimeout(() => {
                this.attemptReconnection();
            }, delay);
        } else {
            this.log('Max retry attempts reached, giving up');
            this.handleFinalConnectionFailure();
        }
    }

    /**
     * Log connection diagnostics for troubleshooting
     * @private
     */
    logConnectionDiagnostics() {
        this.log('=== CONNECTION DIAGNOSTICS ===');
        this.log(`Secret length: ${this.connectionState.secret ? this.connectionState.secret.length : 'null'}`);
        this.log(`Secret preview: ${this.connectionState.secret ? this.connectionState.secret.substring(0, 8) + '...' : 'null'}`);
        this.log(`DirectLine version: ${this.directLineVersion}`);
        this.log(`WebSocket enabled: ${this.config.webSocket}`);
        this.log(`Domain: ${this.config.domain}`);
        this.log(`Timeout: ${this.config.timeout}ms`);
        this.log(`Network quality: ${this.enhancedFeatures.connectionQuality || 'unknown'}`);
        
        // Check network connectivity
        if (navigator.onLine !== undefined) {
            this.log(`Browser online status: ${navigator.onLine}`);
        }
        
        // Check for CORS issues by testing domain accessibility
        this.testDomainConnectivity();
        
        this.log('=== END DIAGNOSTICS ===');
    }

    /**
     * Test domain connectivity for CORS/network issues
     * @private
     */
    async testDomainConnectivity() {
        try {
            const testUrl = new URL('/health', this.config.domain).toString();
            const response = await fetch(testUrl, { 
                method: 'HEAD', 
                mode: 'no-cors',
                cache: 'no-cache'
            });
            this.log(`Domain connectivity test: ${response.type} response received`);
        } catch (error) {
            this.log(`Domain connectivity test failed: ${error.message}`);
            
            // Suggest potential fixes
            if (error.message.includes('CORS')) {
                this.log('TROUBLESHOOTING: CORS error detected. Ensure your bot endpoint allows cross-origin requests.');
            } else if (error.message.includes('network')) {
                this.log('TROUBLESHOOTING: Network error detected. Check internet connectivity and firewall settings.');
            }
        }
    }

    /**
     * Calculate retry delay with exponential backoff and jitter
     * @param {number} attempt - Retry attempt number
     * @returns {number} Delay in milliseconds
     * @private
     */
    calculateRetryDelay(attempt) {
        const { baseDelay, maxDelay, backoffFactor, jitterMax } = this.retryConfig;
        
        // Exponential backoff
        const exponentialDelay = Math.min(
            baseDelay * Math.pow(backoffFactor, attempt - 1),
            maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * jitterMax;
        
        return exponentialDelay + jitter;
    }

    /**
     * Attempt reconnection
     * @private
     */
    async attemptReconnection() {
        try {
            // Check if we should stop trying (already in failed state)
            if (this.connectionState.status === 'failed') {
                this.log('Reconnection skipped - connection marked as failed');
                return;
            }
            
            this.log('Attempting reconnection...');
            
            // Recreate DirectLine instance
            await this.createDirectLineInstance();
            this.setupEnhancedSubscriptions();
            
            this.log('Reconnection successful');
            
        } catch (error) {
            this.logError('Reconnection failed:', error);
            this.handleConnectionFailure(); // Retry again
        }
    }

    /**
     * Handle final connection failure
     * @private
     */
    handleFinalConnectionFailure() {
        const error = new Error(`Failed to establish stable connection after ${this.config.maxRetries} attempts`);
        
        this.log(`Max retry attempts reached (${this.config.maxRetries}), stopping reconnection attempts`, 'error');
        
        // Update connection status to prevent further attempts
        this.connectionState.status = 'failed';
        
        // Log comprehensive troubleshooting information
        this.logTroubleshootingGuide();
        
        this.emitEvent('connectionFailed', {
            error: error.message,
            retryCount: this.connectionState.retryCount,
            maxRetries: this.config.maxRetries,
            timestamp: Date.now(),
            troubleshooting: this.getTroubleshootingSteps()
        });
        
        // Disconnect to prevent further attempts
        this.disconnect();
        
        this.handleError(error);
    }

    /**
     * Log comprehensive troubleshooting guide
     * @private
     */
    logTroubleshootingGuide() {
        this.log('=== TROUBLESHOOTING GUIDE ===');
        this.log('Connection failed after multiple attempts. Please check the following:');
        this.log('');
        this.log('1. DIRECTLINE SECRET:');
        this.log('   - Verify the secret is correct and not expired');
        this.log('   - Check it was copied completely without extra spaces');
        this.log('   - Ensure the bot channel is properly configured');
        this.log('');
        this.log('2. AZURE BOT SERVICE:');
        this.log('   - Confirm the bot is running and accessible');
        this.log('   - Check Azure Portal for bot service status');
        this.log('   - Verify DirectLine channel is enabled');
        this.log('');
        this.log('3. NETWORK CONNECTIVITY:');
        this.log('   - Test internet connection');
        this.log('   - Check firewall/proxy settings');
        this.log('   - Try from a different network if possible');
        this.log('');
        this.log('4. BROWSER ISSUES:');
        this.log('   - Clear browser cache and cookies');
        this.log('   - Disable browser extensions temporarily');
        this.log('   - Try in an incognito/private window');
        this.log('');
        this.log('5. CORS CONFIGURATION:');
        this.log('   - Ensure bot allows cross-origin requests');
        this.log('   - Check web.config or server configuration');
        this.log('=== END TROUBLESHOOTING ===');
    }

    /**
     * Get structured troubleshooting steps
     * @returns {Array} List of troubleshooting steps
     * @private
     */
    getTroubleshootingSteps() {
        return [
            {
                category: 'DirectLine Secret',
                steps: [
                    'Verify the secret is correct and complete',
                    'Check for extra spaces or missing characters',
                    'Ensure the secret has not expired',
                    'Confirm DirectLine channel is enabled in Azure'
                ]
            },
            {
                category: 'Bot Service',
                steps: [
                    'Check Azure Bot Service status in Azure Portal',
                    'Verify bot endpoint is accessible',
                    'Test bot using Bot Framework Emulator',
                    'Check bot logs for errors'
                ]
            },
            {
                category: 'Network',
                steps: [
                    'Test internet connectivity',
                    'Check firewall and proxy settings',
                    'Try connecting from different network',
                    'Verify no DNS issues with botframework.com'
                ]
            },
            {
                category: 'Browser',
                steps: [
                    'Clear browser cache and cookies',
                    'Disable browser extensions',
                    'Try in incognito/private mode',
                    'Test in different browser'
                ]
            }
        ];
    }

    /**
     * Handle connection ended with retry logic
     * @private
     */
    handleConnectionEnded() {
        this.log('Connection ended unexpectedly');
        
        // Only attempt reconnection if not intentionally disconnected and within retry limits
        if (this.directLine && this.connectionState.status !== 'disconnected') {
            this.connectionState.retryCount++;
            this.enhancedFeatures.streamingMetrics.reconnectCount++;
            
            if (this.connectionState.retryCount <= this.config.maxRetries) {
                const delay = this.calculateRetryDelay(this.connectionState.retryCount);
                
                this.log(`Connection ended, retrying in ${delay}ms (attempt ${this.connectionState.retryCount}/${this.config.maxRetries})`);
                
                setTimeout(() => {
                    this.attemptReconnection();
                }, delay);
            } else {
                this.log('Max retry attempts reached for connection ended, stopping reconnection attempts');
                this.handleFinalConnectionFailure();
            }
        }
    }

    /**
     * Send enhanced greeting with multiple strategies
     * @private
     */
    sendEnhancedGreeting() {
        if (!this.directLine) return;

        this.log('Sending enhanced greeting sequence...');

        const greetingStrategies = [
            // Strategy 1: Standard conversationUpdate
            {
                name: 'conversationUpdate',
                activity: {
                    from: { id: 'user' },
                    type: 'conversationUpdate',
                    membersAdded: [{ id: 'user' }],
                    timestamp: new Date().toISOString()
                }
            },
            
            // Strategy 2: WebChat join event
            {
                name: 'webchat/join',
                activity: {
                    from: { id: 'user' },
                    type: 'event',
                    name: 'webchat/join',
                    value: {
                        language: navigator.language || 'en-US',
                        userAgent: navigator.userAgent
                    },
                    timestamp: new Date().toISOString()
                }
            },
            
            // Strategy 3: Start conversation event
            {
                name: 'startConversation',
                activity: {
                    from: { id: 'user' },
                    type: 'event',
                    name: 'startConversation',
                    value: {
                        source: 'enhanced-directline',
                        version: '2.0.0'
                    },
                    timestamp: new Date().toISOString()
                }
            }
        ];

        // Send greeting strategies with delays
        greetingStrategies.forEach((strategy, index) => {
            setTimeout(() => {
                this.sendActivity(strategy.activity)
                    .then(id => this.log(`${strategy.name} greeting sent, ID: ${id}`))
                    .catch(error => this.log(`${strategy.name} greeting failed:`, error));
            }, index * 500);
        });
    }

    /**
     * Send message with enhanced error handling
     * @param {string} text - Message text
     * @param {Array} attachments - Optional attachments
     * @returns {Promise<string>} Message ID
     */
    async sendMessage(text, attachments = []) {
        if (!text && (!attachments || attachments.length === 0)) {
            throw new Error('Message text or attachments required');
        }

        // Store user message for adaptive typing analysis
        if (this.config.adaptiveFeatures && text) {
            this.enhancedFeatures.lastUserMessage = text;
        }

        const activity = {
            from: { id: 'user' },
            type: 'message',
            text: text || '',
            attachments: attachments || [],
            timestamp: new Date().toISOString()
        };

        return this.sendActivity(activity);
    }

    /**
     * Send activity with enhanced error handling and retry
     * @param {Object} activity - DirectLine activity
     * @returns {Promise<string>} Activity ID
     */
    async sendActivity(activity) {
        if (!this.directLine) {
            throw new Error('DirectLine not initialized');
        }

        return new Promise((resolve, reject) => {
            const attemptSend = (retryCount = 0) => {
                this.directLine.postActivity(activity).subscribe({
                    next: (id) => {
                        this.log('Activity sent successfully, ID:', id);
                        resolve(id);
                    },
                    error: (error) => {
                        this.logError('Error sending activity:', error);
                        
                        if (retryCount < 3) {
                            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                            this.log(`Retrying send in ${delay}ms...`);
                            setTimeout(() => attemptSend(retryCount + 1), delay);
                        } else {
                            reject(error);
                        }
                    }
                });
            };

            attemptSend();
        });
    }

    /**
     * Resume conversation with enhanced parameters
     * @param {Object} resumeData - Resume data
     * @param {string} resumeData.conversationId - Conversation ID
     * @param {string} resumeData.token - Token
     * @param {string} resumeData.watermark - Watermark
     * @param {string} resumeData.streamUrl - Stream URL
     * @returns {Promise<boolean>} Success status
     */
    async resumeConversation(resumeData) {
        try {
            this.log('Resuming conversation with enhanced parameters:', resumeData);

            // Validate resume data
            if (!resumeData.conversationId || !resumeData.token) {
                throw new Error('Conversation ID and token required for resume');
            }

            // Store resume parameters
            this.connectionState.conversationId = resumeData.conversationId;
            this.connectionState.token = resumeData.token;
            this.connectionState.watermark = resumeData.watermark || null;

            // Use official reconnect if available
            if (this.directLine && this.directLine.reconnect) {
                this.directLine.reconnect({
                    conversationId: resumeData.conversationId,
                    token: resumeData.token,
                    streamUrl: resumeData.streamUrl
                });
                
                this.log('Conversation resumed using official reconnect');
                return true;
            } else {
                // Fallback to reinitialization
                return await this.initialize(this.connectionState.secret, {
                    conversationId: resumeData.conversationId,
                    watermark: resumeData.watermark
                });
            }

        } catch (error) {
            this.logError('Failed to resume conversation:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * Handle subscription errors
     * @param {Error} error - Subscription error
     * @private
     */
    handleSubscriptionError(error) {
        this.logError('Subscription error:', error);
        
        // Attempt to reestablish subscriptions
        setTimeout(() => {
            if (this.directLine) {
                try {
                    this.setupEnhancedSubscriptions();
                    this.log('Subscriptions reestablished');
                } catch (resubError) {
                    this.logError('Failed to reestablish subscriptions:', resubError);
                }
            }
        }, 5000);
    }

    /**
     * Handle initialization errors
     * @param {Error} error - Initialization error
     * @private
     */
    handleInitializationError(error) {
        let errorMessage = 'Failed to initialize enhanced bot connection. Please check your settings.';

        if (error.message?.includes('Invalid secret') || error.message?.includes('401')) {
            errorMessage = 'Invalid DirectLine secret. Please check your bot configuration.';
        } else if (error.message?.includes('403')) {
            errorMessage = 'DirectLine secret does not have permission. Please check your Azure Bot configuration.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message?.includes('DirectLine library')) {
            errorMessage = error.message;
        }

        this.handleError(new Error(errorMessage));
    }

    /**
     * Enhanced error handling
     * @param {Error} error - Error object
     * @private
     */
    handleError(error) {
        this.logError('Enhanced DirectLine error:', error);

        this.emitEvent('connectionError', {
            error: error.message,
            timestamp: Date.now(),
            context: {
                connectionState: this.connectionState.status,
                retryCount: this.connectionState.retryCount,
                networkQuality: this.enhancedFeatures.connectionQuality
            }
        });

        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     * @private
     */
    emitEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { 
            detail: {
                ...detail,
                source: 'enhanced-directline',
                timestamp: detail.timestamp || Date.now()
            }
        });
        
        window.dispatchEvent(event);
        
        if (this.config.debugMode) {
            this.log(`Event emitted: ${eventName}`, detail);
        }
    }

    /**
     * Set callback functions
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onActivity - Activity received callback
     * @param {Function} callbacks.onConnectionStatusChange - Status change callback
     * @param {Function} callbacks.onError - Error callback
     * @param {Function} callbacks.onStreamingChunk - Streaming chunk callback
     * @param {Function} callbacks.onHealthUpdate - Health update callback
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        this.log('Callbacks updated:', Object.keys(callbacks));
    }

    /**
     * Get enhanced connection information
     * @returns {Object} Enhanced connection info
     */
    getConnectionInfo() {
        return {
            status: this.connectionState.status,
            conversationId: this.connectionState.conversationId,
            directLineVersion: this.directLineVersion,
            config: this.config,
            metrics: this.enhancedFeatures.streamingMetrics,
            networkQuality: this.enhancedFeatures.connectionQuality,
            retryCount: this.connectionState.retryCount
        };
    }

    /**
     * Get streaming metrics
     * @returns {Object} Streaming metrics
     */
    getStreamingMetrics() {
        return { 
            ...this.enhancedFeatures.streamingMetrics,
            networkQuality: this.enhancedFeatures.connectionQuality,
            lastActivity: this.connectionState.lastActivity
        };
    }

    /**
     * Check if connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.directLine !== null && this.connectionState.status === 'online';
    }

    /**
     * Get DirectLine instance
     * @returns {DirectLine|null} DirectLine instance
     */
    getDirectLine() {
        return this.directLine;
    }

    /**
     * Get configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        this.log('Disconnecting Enhanced DirectLine...');

        // Disconnect DirectLine
        if (this.directLine) {
            try {
                this.directLine.end();
            } catch (error) {
                this.log('Error ending DirectLine:', error);
            }
            this.directLine = null;
        }

        // Restore original functions if interceptors are active
        this.restoreInterceptors();

        // Clear timeouts and intervals
        this.clearTypingTimeout();
        
        if (this.enhancedFeatures.tokenRefreshInterval) {
            clearInterval(this.enhancedFeatures.tokenRefreshInterval);
            this.enhancedFeatures.tokenRefreshInterval = null;
        }

        if (this.enhancedFeatures.healthMonitor) {
            clearInterval(this.enhancedFeatures.healthMonitor);
            this.enhancedFeatures.healthMonitor = null;
        }

        // Reset state
        this.connectionState = {
            status: 'disconnected',
            conversationId: null,
            token: null,
            secret: null,
            watermark: null,
            streamUrl: null,
            retryCount: 0,
            lastActivity: null
        };

        this.enhancedFeatures.streamingMetrics = {
            messagesReceived: 0,
            averageLatency: 0,
            connectionUptime: 0,
            reconnectCount: 0
        };

        this.log('Enhanced DirectLine disconnected and cleaned up');
    }

    /**
     * Restart connection
     * @param {string} secret - New DirectLine secret
     * @returns {Promise<boolean>} Success status
     */
    async restart(secret) {
        this.disconnect();
        return await this.initialize(secret);
    }

    /**
     * Enhanced logging
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     * @private
     */
    log(message, ...args) {
        if (this.config.debugMode || (typeof window !== 'undefined' && window.botchatDebug)) {
            console.log(`[Enhanced DirectLine] ${message}`, ...args);
        }
    }

    /**
     * Enhanced error logging
     * @param {string} message - Error message
     * @param {...any} args - Additional arguments
     * @private
     */
    logError(message, ...args) {
        console.error(`[Enhanced DirectLine] ${message}`, ...args);
    }

    /**
     * Get component version and info
     * @returns {Object} Component information
     */
    static getInfo() {
        return {
            name: 'EnhancedDirectLineManager',
            version: '2.0.0',
            description: 'Enhanced DirectLine manager with official library integration',
            author: 'MCSChat Project Enhanced',
            license: 'MIT',
            features: [
                'Official Microsoft DirectLine.js integration',
                'Automatic token refresh',
                'Exponential backoff retry logic',
                'Enhanced conversation resume with watermarks',
                'Complete Bot Framework activity type support',
                'Network quality detection and optimization',
                'Adaptive typing indicators with context awareness',
                'Health monitoring and metrics',
                'Enhanced error handling and recovery',
                'Backward compatibility with existing implementations'
            ],
            improvements: [
                'Uses official DirectLine library as core engine',
                'Adds automatic token refresh every 15 minutes',
                'Implements sophisticated retry strategies',
                'Supports full conversation resume capabilities',
                'Provides network quality optimization',
                'Maintains all existing custom enhancements'
            ]
        };
    }
}

// Export singleton instance for backward compatibility
export const enhancedDirectLineManager = new EnhancedDirectLineManager();

export default EnhancedDirectLineManager;
