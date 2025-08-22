/**
 * DirectLine Logs Service
 * Handles logging and analysis of DirectLine interactions for debugging escalation issues
 */

class DirectLineLogsService {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // Keep last 1000 entries
        this.isLoggingEnabled = true;
        this.conversationId = null;
        this.watermark = null;
        
        // Initialize after DOM is ready if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeLogsViewer();
                this.bindEvents();
            });
        } else {
            this.initializeLogsViewer();
            this.bindEvents();
        }
    }

    /**
     * Initialize the logs viewer components
     */
    addTestLogs() {
        const testLogs = [
            {
                type: 'connection',
                direction: 'system',
                data: { event: 'connected', status: 'DirectLine connection established' },
                timestamp: Date.now() - 5000,
                size: 0
            },
            {
                type: 'message',
                direction: 'outgoing',
                data: { text: 'Hello, this is a test message', type: 'message' },
                timestamp: Date.now() - 3000,
                size: 45
            },
            {
                type: 'message',
                direction: 'incoming',
                data: { text: 'This is a response from the bot', type: 'message' },
                timestamp: Date.now() - 1000,
                size: 38
            }
        ];

        testLogs.forEach(log => {
            log.id = Date.now() + Math.random();
            this.logs.push(log);
        });

        console.log('📋 Added', testLogs.length, 'test logs');
    }

    /**
     * Clear all logs
     */
    clearLogs() {         document.addEventListener('DOMContentLoaded', () => {
                this.initializeLogsViewer();
                this.bindEvents();
            });
        } else {
            this.initializeLogsViewer();
            this.bindEvents();
        }
    }

    /**
     * Initialize the logs viewer components
     */
    initializeLogsViewer() {
        this.elements = {
            container: document.getElementById('directLineLogsContainer'),
            display: document.getElementById('logsDisplay'),
            typeFilter: document.getElementById('logsTypeFilter'),
            clearBtn: document.getElementById('clearLogsBtn'),
            exportBtn: document.getElementById('exportLogsBtn'),
            showBtn: document.getElementById('showLogsButton')
        };

        console.log('📋 DirectLine logs viewer elements:', {
            container: !!this.elements.container,
            display: !!this.elements.display,
            typeFilter: !!this.elements.typeFilter,
            clearBtn: !!this.elements.clearBtn,
            exportBtn: !!this.elements.exportBtn,
            showBtn: !!this.elements.showBtn
        });
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Show/hide logs viewer
        if (this.elements.showBtn) {
            this.elements.showBtn.addEventListener('click', () => {
                console.log('📋 Log button clicked');
                this.toggleLogsViewer();
            });
            console.log('📋 Log button event bound successfully');
        } else {
            console.warn('📋 Log button not found - cannot bind event');
        }

        // Filter logs by type
        this.elements.typeFilter?.addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });

        // Clear logs
        this.elements.clearBtn?.addEventListener('click', () => {
            this.clearLogs();
        });

        // Export logs
        this.elements.exportBtn?.addEventListener('click', () => {
            this.exportLogs();
        });

        console.log('📋 DirectLine logs service events bound');
    }

    /**
     * Log a DirectLine event
     * @param {string} type - Event type (message, activity, connection, error)
     * @param {string} direction - 'incoming' or 'outgoing'
     * @param {object} data - Event data
     * @param {object} context - Additional context
     */
    log(type, direction, data, context = {}) {
        if (!this.isLoggingEnabled) return;

        const entry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type,
            direction,
            conversationId: this.conversationId,
            watermark: this.watermark,
            data: this.sanitizeData(data),
            context,
            size: JSON.stringify(data).length
        };

        this.logs.unshift(entry);

        // Maintain max logs limit
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Update display if viewer is open
        if (this.isViewerVisible()) {
            this.refreshDisplay();
        }

        // Check for escalation patterns
        this.analyzeForEscalation(entry);
    }

    /**
     * Set current conversation context
     * @param {string} conversationId - Current conversation ID
     * @param {number} watermark - Current watermark
     */
    setConversationContext(conversationId, watermark) {
        this.conversationId = conversationId;
        this.watermark = watermark;
        
        this.log('connection', 'system', {
            event: 'conversation_context_updated',
            conversationId,
            watermark
        });
    }

    /**
     * Log DirectLine message
     * @param {string} direction - 'outgoing' or 'incoming'
     * @param {object} message - Message object
     */
    logMessage(direction, message) {
        this.log('message', direction, message, {
            messageType: message.type,
            hasText: !!message.text,
            hasAttachments: !!(message.attachments && message.attachments.length),
            hasSuggestedActions: !!(message.suggestedActions && message.suggestedActions.actions.length)
        });
    }

    /**
     * Log DirectLine activity
     * @param {string} direction - 'outgoing' or 'incoming'
     * @param {object} activity - Activity object
     */
    logActivity(direction, activity) {
        this.log('activity', direction, activity, {
            activityType: activity.type,
            hasId: !!activity.id,
            hasFrom: !!activity.from,
            hasRecipient: !!activity.recipient,
            hasChannelData: !!activity.channelData
        });
    }

    /**
     * Log connection events
     * @param {string} event - Connection event type
     * @param {object} data - Event data
     */
    logConnection(event, data = {}) {
        this.log('connection', 'system', {
            event,
            ...data
        });
    }

    /**
     * Log errors
     * @param {string} source - Error source
     * @param {Error|object} error - Error object or data
     */
    logError(source, error) {
        this.log('error', 'system', {
            source,
            message: error.message || error,
            stack: error.stack,
            timestamp: Date.now()
        });
    }

    /**
     * Sanitize data for logging (remove sensitive info)
     * @param {object} data - Raw data
     * @returns {object} Sanitized data
     */
    sanitizeData(data) {
        if (!data) return data;

        try {
            const sanitized = JSON.parse(JSON.stringify(data));
            
            // Remove sensitive fields
            const sensitiveFields = ['token', 'authorization', 'secret', 'key', 'password'];
            
            const sanitizeObject = (obj) => {
                if (typeof obj !== 'object' || obj === null) return obj;
                
                for (const key in obj) {
                    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                        obj[key] = '[REDACTED]';
                    } else if (typeof obj[key] === 'object') {
                        sanitizeObject(obj[key]);
                    }
                }
                return obj;
            };

            return sanitizeObject(sanitized);
        } catch (e) {
            return { error: 'Failed to sanitize data', original: String(data) };
        }
    }

    /**
     * Analyze log entry for escalation patterns
     * @param {object} entry - Log entry
     */
    analyzeForEscalation(entry) {
        // Check for greeting escalation pattern
        if (entry.type === 'activity' && entry.direction === 'outgoing') {
            const recentGreetings = this.logs
                .filter(log => 
                    log.type === 'activity' && 
                    log.direction === 'outgoing' &&
                    log.conversationId === entry.conversationId &&
                    Date.now() - new Date(log.timestamp).getTime() < 5000 // Last 5 seconds
                )
                .length;

            if (recentGreetings > 2) {
                console.warn('⚠️ Multiple greeting activities detected - potential escalation trigger');
                this.log('error', 'system', {
                    warning: 'multiple_greetings_detected',
                    count: recentGreetings,
                    conversationId: entry.conversationId
                });
            }
        }

        // Check for empty message pattern
        if (entry.type === 'message' && entry.direction === 'outgoing') {
            if (!entry.data.text || entry.data.text.trim() === '') {
                console.warn('⚠️ Empty message sent - potential escalation trigger');
                this.log('error', 'system', {
                    warning: 'empty_message_sent',
                    conversationId: entry.conversationId
                });
            }
        }
    }

    /**
     * Toggle logs viewer visibility
     */
    toggleLogsViewer() {
        console.log('📋 toggleLogsViewer called');
        const rightPanel = document.getElementById('rightPanel');
        const logsContainer = this.elements.container;
        const mainContentContainer = document.getElementById('mainContentContainer');

        console.log('📋 Elements found:', {
            rightPanel: !!rightPanel,
            logsContainer: !!logsContainer,
            mainContentContainer: !!mainContentContainer,
            isViewerVisible: this.isViewerVisible()
        });

        if (rightPanel) {
            console.log('📋 Right panel current state:', {
                display: rightPanel.style.display,
                hasCollapsedClass: rightPanel.classList.contains('collapsed'),
                computedDisplay: window.getComputedStyle(rightPanel).display,
                computedVisibility: window.getComputedStyle(rightPanel).visibility
            });
        }

        if (this.isViewerVisible()) {
            console.log('📋 Hiding logs, showing KPI');
            // Hide logs, show KPI
            if (logsContainer) {
                logsContainer.style.display = 'none';
            }
            if (mainContentContainer) {
                mainContentContainer.style.display = 'block';
            }
            if (this.elements.showBtn) {
                this.elements.showBtn.title = 'Show DirectLine Logs';
            }
        } else {
            console.log('📋 Showing logs, hiding KPI');
            // Show logs, hide KPI
            if (mainContentContainer) {
                mainContentContainer.style.display = 'none';
                console.log('📋 Hidden main content container');
            }
            if (logsContainer) {
                logsContainer.style.display = 'block';
                console.log('📋 Shown logs container');
            }
            if (this.elements.showBtn) {
                this.elements.showBtn.title = 'Hide DirectLine Logs';
            }

            // Add some test logs if empty (for debugging)
            if (this.logs.length === 0) {
                console.log('📋 No logs found, adding test logs');
                this.addTestLogs();
            }
            
            // Make sure right panel is visible using aiCompanion if available
            if (rightPanel) {
                console.log('📋 Attempting to show right panel...');
                
                // Remove collapsed class to trigger CSS :not(.collapsed) rule
                rightPanel.classList.remove('collapsed');
                
                // Clear any inline display style that might override CSS
                rightPanel.style.display = '';
                
                console.log('📋 Right panel after modifications:', {
                    display: rightPanel.style.display,
                    hasCollapsedClass: rightPanel.classList.contains('collapsed'),
                    computedDisplay: window.getComputedStyle(rightPanel).display,
                    computedVisibility: window.getComputedStyle(rightPanel).visibility
                });
                
                // Also ensure agentChatPanel has proper classes
                const agentChatPanel = document.getElementById('agentChatPanel');
                if (agentChatPanel) {
                    agentChatPanel.classList.remove('companion-hidden');
                    console.log('📋 Removed companion-hidden from agentChatPanel');
                }
                
                // If aiCompanion is available globally, use its method
                if (window.aiCompanion && window.aiCompanion.togglePanel) {
                    console.log('📋 Using aiCompanion.togglePanel to show panel');
                    window.aiCompanion.togglePanel(true);
                } else {
                    console.log('📋 aiCompanion not available, manually ensuring panel visibility');
                    // Ensure panel is visible even if CSS doesn't work
                    if (window.getComputedStyle(rightPanel).display === 'none') {
                        rightPanel.style.display = 'block';
                    }
                    rightPanel.style.visibility = 'visible';
                }
                
                console.log('📋 Final right panel state:', {
                    display: rightPanel.style.display,
                    visibility: rightPanel.style.visibility,
                    hasCollapsedClass: rightPanel.classList.contains('collapsed'),
                    computedDisplay: window.getComputedStyle(rightPanel).display,
                    computedVisibility: window.getComputedStyle(rightPanel).visibility
                });
            }

            this.refreshDisplay();
        }
    }

    /**
     * Show KPI analysis (hide logs)
     */
    showKPIAnalysis() {
        const logsContainer = this.elements.container;
        const mainContentContainer = document.getElementById('mainContentContainer');

        if (logsContainer) {
            logsContainer.style.display = 'none';
        }
        
        if (mainContentContainer) {
            mainContentContainer.style.display = 'block';
        }

        if (this.elements.showBtn) {
            this.elements.showBtn.title = 'Show DirectLine Logs';
        }
    }

    /**
     * Check if logs viewer is currently visible
     * @returns {boolean}
     */
    isViewerVisible() {
        const isVisible = this.elements.container?.style.display !== 'none';
        console.log('📋 isViewerVisible check:', {
            container: !!this.elements.container,
            containerDisplay: this.elements.container?.style.display,
            isVisible: isVisible
        });
        return isVisible;
    }

    /**
     * Filter logs by type
     * @param {string} type - Log type to filter by
     */
    filterLogs(type) {
        const filteredLogs = type === 'all' ? this.logs : this.logs.filter(log => log.type === type);
        this.displayLogs(filteredLogs);
    }

    /**
     * Refresh the logs display
     */
    refreshDisplay() {
        console.log('📋 refreshDisplay called');
        const selectedType = this.elements.typeFilter?.value || 'all';
        console.log('📋 Refreshing display with filter:', selectedType);
        this.filterLogs(selectedType);
    }

    /**
     * Display logs in the viewer
     * @param {Array} logs - Logs to display
     */
    displayLogs(logs) {
        console.log('📋 displayLogs called with', logs.length, 'logs');
        if (!this.elements.display) {
            console.warn('📋 No display element found');
            return;
        }

        const html = logs.map(log => this.formatLogEntry(log)).join('');
        this.elements.display.innerHTML = html;
        console.log('📋 Logs HTML set, display element updated');
    }

    /**
     * Format a single log entry for display
     * @param {object} log - Log entry
     * @returns {string} HTML string
     */
    formatLogEntry(log) {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const typeClass = `log-${log.type}`;
        const directionClass = `log-${log.direction}`;
        
        return `
            <div class="log-entry ${typeClass} ${directionClass}" data-log-id="${log.id}">
                <div class="log-header">
                    <span class="log-time">${time}</span>
                    <span class="log-type">${log.type.toUpperCase()}</span>
                    <span class="log-direction">${log.direction}</span>
                    <span class="log-size">${log.size} bytes</span>
                </div>
                <div class="log-content">
                    <pre>${JSON.stringify(log.data, null, 2)}</pre>
                </div>
                ${log.context && Object.keys(log.context).length > 0 ? 
                    `<div class="log-context">
                        <strong>Context:</strong>
                        <pre>${JSON.stringify(log.context, null, 2)}</pre>
                    </div>` : ''
                }
            </div>
        `;
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.refreshDisplay();
        console.log('📋 DirectLine logs cleared');
    }

    /**
     * Export logs to JSON file
     */
    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            conversationId: this.conversationId,
            totalEntries: this.logs.length,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `directline-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('📥 DirectLine logs exported');
    }

    /**
     * Get logs summary for analysis
     * @returns {object} Summary statistics
     */
    getLogsSummary() {
        const summary = {
            total: this.logs.length,
            byType: {},
            byDirection: {},
            lastActivity: this.logs[0]?.timestamp,
            conversationId: this.conversationId,
            errors: this.logs.filter(log => log.type === 'error').length
        };

        this.logs.forEach(log => {
            summary.byType[log.type] = (summary.byType[log.type] || 0) + 1;
            summary.byDirection[log.direction] = (summary.byDirection[log.direction] || 0) + 1;
        });

        return summary;
    }
}

// Export for use in other modules
window.DirectLineLogsService = DirectLineLogsService;
