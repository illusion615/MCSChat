/**
 * Logging UI Manager for MCSChat
 * Manages the logging panel interface and user interactions
 */

class LoggingUIManager {
    constructor(loggingManager) {
        this.loggingManager = loggingManager;
        this.isVisible = false;
        this.currentFilters = {
            level: 'all',
            category: 'all',
            timeRange: 'all',
            search: ''
        };
        this.currentPage = 1;
        this.pageSize = 100;
        this.selectedLogs = new Set();
        this.refreshInterval = null;
        this.autoRefresh = true;
        this.autoRefreshDelay = 5000; // 5 seconds
        
        this.init();
    }

    init() {
        this.bindElements();
        this.attachEventListeners();
        this.setupLoggingManagerListeners();
        
        // Set up auto-refresh
        if (this.autoRefresh) {
            this.startAutoRefresh();
        }
        
        this.loggingManager.info('ui', 'Logging UI Manager initialized');
    }

    bindElements() {
        // Panel elements
        this.panel = document.getElementById('loggingPanel');
        this.closeBtn = document.getElementById('closeLoggingPanel');
        
        // Filter elements
        this.searchInput = document.getElementById('logSearch');
        this.levelFilter = document.getElementById('logLevelFilter');
        this.categoryFilter = document.getElementById('logCategoryFilter');
        this.timeFilter = document.getElementById('logTimeFilter');
        this.refreshBtn = document.getElementById('refreshLogsBtn');
        
        // Content elements
        this.logContainer = document.getElementById('logGroupContainer');
        
        // Stats elements
        this.totalCount = document.getElementById('totalLogsCount');
        this.errorCount = document.getElementById('errorLogsCount');
        this.warnCount = document.getElementById('warnLogsCount');
        this.infoCount = document.getElementById('infoLogsCount');
        this.debugCount = document.getElementById('debugLogsCount');
        
        // Control elements
        this.exportBtn = document.getElementById('exportLogsBtn');
        this.clearAllBtn = document.getElementById('clearAllLogsBtn');
        this.selectAllBtn = document.getElementById('selectAllLogsBtn');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedLogsBtn');
        this.exportSelectedBtn = document.getElementById('exportSelectedLogsBtn');
        
        // Pagination elements
        this.prevPageBtn = document.getElementById('prevPageBtn');
        this.nextPageBtn = document.getElementById('nextPageBtn');
        this.pageInfo = document.getElementById('pageInfo');
    }

    attachEventListeners() {
        // Panel controls
        this.closeBtn?.addEventListener('click', () => this.hide());
        
        // Filter controls
        this.searchInput?.addEventListener('input', this.debounce(() => {
            this.currentFilters.search = this.searchInput.value;
            this.currentPage = 1;
            this.updateDisplay();
        }, 300));
        
        this.levelFilter?.addEventListener('change', () => {
            this.currentFilters.level = this.levelFilter.value;
            this.currentPage = 1;
            this.updateDisplay();
        });
        
        this.categoryFilter?.addEventListener('change', () => {
            this.currentFilters.category = this.categoryFilter.value;
            this.currentPage = 1;
            this.updateDisplay();
        });
        
        this.timeFilter?.addEventListener('change', () => {
            this.currentFilters.timeRange = this.timeFilter.value;
            this.currentPage = 1;
            this.updateDisplay();
        });
        
        this.refreshBtn?.addEventListener('click', () => {
            this.updateDisplay();
            this.loggingManager.info('ui', 'Logs manually refreshed');
        });
        
        // Action controls
        this.exportBtn?.addEventListener('click', () => this.exportAllLogs());
        this.clearAllBtn?.addEventListener('click', () => this.clearAllLogs());
        this.selectAllBtn?.addEventListener('click', () => this.selectAllVisibleLogs());
        this.deleteSelectedBtn?.addEventListener('click', () => this.deleteSelectedLogs());
        this.exportSelectedBtn?.addEventListener('click', () => this.exportSelectedLogs());
        
        // Pagination controls
        this.prevPageBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateDisplay();
            }
        });
        
        this.nextPageBtn?.addEventListener('click', () => {
            this.currentPage++;
            this.updateDisplay();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isVisible && e.ctrlKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        this.searchInput?.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.updateDisplay();
                        break;
                    case 'a':
                        e.preventDefault();
                        this.selectAllVisibleLogs();
                        break;
                }
            }
        });
    }

    setupLoggingManagerListeners() {
        this.loggingManager.addEventListener((event, data) => {
            switch (event) {
                case 'logAdded':
                    if (this.isVisible && this.autoRefresh) {
                        // Only refresh if we're on the first page to see new logs
                        if (this.currentPage === 1) {
                            this.updateDisplay();
                        }
                    }
                    break;
                case 'logsDeleted':
                case 'allLogsCleared':
                case 'logsClearedByCategory':
                case 'logsClearedByLevel':
                    if (this.isVisible) {
                        this.selectedLogs.clear();
                        this.updateDisplay();
                    }
                    break;
            }
        });
    }

    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.panel.classList.add('visible');
        this.updateDisplay();
        
        // Focus search input for immediate filtering
        setTimeout(() => this.searchInput?.focus(), 100);
        
        this.loggingManager.info('ui', 'Logging panel opened');
    }

    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.panel.classList.remove('visible');
        this.selectedLogs.clear();
        
        this.loggingManager.info('ui', 'Logging panel closed');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    updateDisplay() {
        this.updateStats();
        this.updateLogList();
        this.updatePagination();
        this.updateActionButtons();
    }

    updateStats() {
        const stats = this.loggingManager.getLogStats(this.currentFilters);
        
        this.totalCount.textContent = stats.total;
        this.errorCount.textContent = stats.error;
        this.warnCount.textContent = stats.warn;
        this.infoCount.textContent = stats.info;
        this.debugCount.textContent = stats.debug;
    }

    updateLogList() {
        const logs = this.loggingManager.getLogs({
            ...this.currentFilters,
            page: this.currentPage,
            pageSize: this.pageSize
        });

        if (logs.length === 0) {
            this.showEmptyState();
            return;
        }

        // Group logs by date
        const groupedLogs = this.groupLogsByDate(logs);
        this.renderLogGroups(groupedLogs);
    }

    groupLogsByDate(logs) {
        const groups = new Map();
        
        logs.forEach(log => {
            const date = new Date(log.timestamp).toDateString();
            if (!groups.has(date)) {
                groups.set(date, []);
            }
            groups.get(date).push(log);
        });
        
        return groups;
    }

    renderLogGroups(groupedLogs) {
        const container = this.logContainer;
        container.innerHTML = '';

        for (const [date, logs] of groupedLogs) {
            const groupElement = this.createLogGroup(date, logs);
            container.appendChild(groupElement);
        }
    }

    createLogGroup(date, logs) {
        const group = document.createElement('div');
        group.className = 'log-group';
        
        const header = document.createElement('div');
        header.className = 'log-group-header';
        header.innerHTML = `
            <h4>${date}</h4>
            <span class="log-count">${logs.length} logs</span>
        `;
        
        const content = document.createElement('div');
        content.className = 'log-group-content';
        
        logs.forEach(log => {
            const logElement = this.createLogElement(log);
            content.appendChild(logElement);
        });
        
        group.appendChild(header);
        group.appendChild(content);
        
        return group;
    }

    createLogElement(log) {
        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${log.level}`;
        logElement.dataset.logId = log.id;
        
        const isSelected = this.selectedLogs.has(log.id);
        if (isSelected) {
            logElement.classList.add('selected');
        }
        
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        const hasMetadata = Object.keys(log.metadata).length > 0;
        const hasError = log.error !== null;
        
        logElement.innerHTML = `
            <div class="log-entry-header">
                <input type="checkbox" class="log-checkbox" ${isSelected ? 'checked' : ''}>
                <span class="log-timestamp">${timestamp}</span>
                <span class="log-level">${log.level.toUpperCase()}</span>
                <span class="log-category">${log.category}</span>
                <button class="log-expand-btn" title="View details">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                    </svg>
                </button>
            </div>
            <div class="log-message">${this.escapeHtml(log.message)}</div>
            <div class="log-details" style="display: none;">
                ${hasMetadata ? `
                    <div class="log-metadata">
                        <h5>Metadata:</h5>
                        <pre>${JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                ` : ''}
                ${hasError ? `
                    <div class="log-error">
                        <h5>Error Details:</h5>
                        <pre>${JSON.stringify(log.error, null, 2)}</pre>
                    </div>
                ` : ''}
                <div class="log-system-info">
                    <p><strong>Session ID:</strong> ${log.sessionId}</p>
                    <p><strong>URL:</strong> ${log.url}</p>
                    <p><strong>User Agent:</strong> ${log.userAgent}</p>
                </div>
            </div>
        `;
        
        // Attach event listeners
        const checkbox = logElement.querySelector('.log-checkbox');
        const expandBtn = logElement.querySelector('.log-expand-btn');
        const details = logElement.querySelector('.log-details');
        
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                this.selectedLogs.add(log.id);
                logElement.classList.add('selected');
            } else {
                this.selectedLogs.delete(log.id);
                logElement.classList.remove('selected');
            }
            this.updateActionButtons();
        });
        
        expandBtn.addEventListener('click', () => {
            const isExpanded = details.style.display !== 'none';
            details.style.display = isExpanded ? 'none' : 'block';
            expandBtn.classList.toggle('expanded', !isExpanded);
        });
        
        return logElement;
    }

    updatePagination() {
        const totalLogs = this.loggingManager.getLogStats(this.currentFilters).total;
        const totalPages = Math.ceil(totalLogs / this.pageSize);
        
        this.prevPageBtn.disabled = this.currentPage <= 1;
        this.nextPageBtn.disabled = this.currentPage >= totalPages;
        
        this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }

    updateActionButtons() {
        const hasSelection = this.selectedLogs.size > 0;
        this.deleteSelectedBtn.disabled = !hasSelection;
        this.exportSelectedBtn.disabled = !hasSelection;
        
        this.selectAllBtn.textContent = hasSelection ? 'Deselect All' : 'Select All';
    }

    showEmptyState() {
        this.logContainer.innerHTML = `
            <div class="log-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                    <path d="M3,3H21A1,1 0 0,1 22,4V8A1,1 0 0,1 21,9H3A1,1 0 0,1 2,8V4A1,1 0 0,1 3,3M3,10H21A1,1 0 0,1 22,11V15A1,1 0 0,1 21,16H3A1,1 0 0,1 2,15V11A1,1 0 0,1 3,10M3,17H21A1,1 0 0,1 22,18V22A1,1 0 0,1 21,23H3A1,1 0 0,1 2,22V18A1,1 0 0,1 3,17Z" />
                </svg>
                <p>No logs match the current filters</p>
                <small>Try adjusting your search criteria or time range.</small>
            </div>
        `;
    }

    selectAllVisibleLogs() {
        const hasSelection = this.selectedLogs.size > 0;
        
        if (hasSelection) {
            // Deselect all
            this.selectedLogs.clear();
            this.logContainer.querySelectorAll('.log-checkbox').forEach(cb => {
                cb.checked = false;
                cb.closest('.log-entry').classList.remove('selected');
            });
        } else {
            // Select all visible
            this.logContainer.querySelectorAll('.log-entry').forEach(entry => {
                const logId = entry.dataset.logId;
                const checkbox = entry.querySelector('.log-checkbox');
                
                this.selectedLogs.add(logId);
                checkbox.checked = true;
                entry.classList.add('selected');
            });
        }
        
        this.updateActionButtons();
    }

    deleteSelectedLogs() {
        if (this.selectedLogs.size === 0) return;
        
        const count = this.selectedLogs.size;
        const confirmation = confirm(`Are you sure you want to delete ${count} selected log${count > 1 ? 's' : ''}?`);
        
        if (confirmation) {
            const deletedCount = this.loggingManager.deleteLogs([...this.selectedLogs]);
            this.selectedLogs.clear();
            this.updateDisplay();
            
            this.loggingManager.info('ui', 'Logs deleted via UI', {
                requestedCount: count,
                actualDeleted: deletedCount
            });
        }
    }

    exportSelectedLogs() {
        if (this.selectedLogs.size === 0) return;
        
        // Get selected logs
        const allLogs = this.loggingManager.getLogs({ ...this.currentFilters, page: null, pageSize: null });
        const selectedLogs = allLogs.filter(log => this.selectedLogs.has(log.id));
        
        // Create temporary export data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const content = JSON.stringify(selectedLogs, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `mcschat-selected-logs-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.loggingManager.info('ui', 'Selected logs exported', {
            count: selectedLogs.length,
            filename: link.download
        });
    }

    exportAllLogs() {
        const filters = { ...this.currentFilters };
        const count = this.loggingManager.exportLogs(filters, 'json');
        
        this.loggingManager.info('ui', 'All logs exported via UI', {
            count,
            filters
        });
    }

    clearAllLogs() {
        const confirmation = confirm('Are you sure you want to clear ALL logs? This action cannot be undone.');
        
        if (confirmation) {
            const count = this.loggingManager.clearAllLogs();
            this.selectedLogs.clear();
            this.currentPage = 1;
            this.updateDisplay();
            
            this.loggingManager.info('ui', 'All logs cleared via UI', { count });
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.isVisible && this.autoRefresh) {
                this.updateDisplay();
            }
        }, this.autoRefreshDelay);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    setAutoRefresh(enabled) {
        this.autoRefresh = enabled;
        if (enabled) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        this.stopAutoRefresh();
        this.selectedLogs.clear();
    }
}

export default LoggingUIManager;
