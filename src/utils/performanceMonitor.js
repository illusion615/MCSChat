/**
 * Performance Monitor - Real-time performance tracking and optimization
 * Provides detailed metrics for loading, rendering, and interaction performance
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            // Core Web Vitals
            lcp: null,          // Largest Contentful Paint
            fid: null,          // First Input Delay  
            cls: null,          // Cumulative Layout Shift

            // Loading Performance
            domContentLoaded: null,
            loadComplete: null,
            timeToInteractive: null,

            // CSS Loading
            cssModules: new Map(),
            cssLoadTime: null,

            // JavaScript Loading
            jsModules: new Map(),
            jsLoadTime: null,

            // User Interactions
            firstInteraction: null,
            averageResponseTime: [],

            // Memory Usage
            memoryUsage: {
                used: 0,
                total: 0,
                limit: 0
            },

            // Network
            resourceCount: 0,
            resourceSize: 0,

            // Custom Metrics
            appInitTime: null,
            agentConnectionTime: null,
            firstMessageTime: null
        };

        this.observers = [];
        this.isMonitoring = false;
        this.startTime = performance.now();

        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.setupCoreWebVitals();
        this.setupResourceObserver();
        this.setupNavigationObserver();
        this.setupMemoryMonitoring();
        this.setupCustomMetrics();

        console.log('[PerformanceMonitor] Initialized');
    }

    /**
     * Setup Core Web Vitals monitoring
     */
    setupCoreWebVitals() {
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.metrics.lcp = lastEntry.startTime;
            this.notifyObservers('lcp', this.metrics.lcp);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0];
            this.metrics.fid = firstInput.processingStart - firstInput.startTime;
            this.notifyObservers('fid', this.metrics.fid);
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.metrics.cls = clsValue;
            this.notifyObservers('cls', this.metrics.cls);
        }).observe({ entryTypes: ['layout-shift'] });
    }

    /**
     * Setup resource loading observer
     */
    setupResourceObserver() {
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                this.metrics.resourceCount++;
                this.metrics.resourceSize += entry.transferSize || 0;

                // Track CSS modules specifically
                if (entry.name.includes('.css')) {
                    this.metrics.cssModules.set(entry.name, {
                        loadTime: entry.loadEnd - entry.loadStart,
                        size: entry.transferSize || 0,
                        cached: entry.transferSize === 0
                    });
                }

                // Track JS modules specifically
                if (entry.name.includes('.js')) {
                    this.metrics.jsModules.set(entry.name, {
                        loadTime: entry.loadEnd - entry.loadStart,
                        size: entry.transferSize || 0,
                        cached: entry.transferSize === 0
                    });
                }
            }

            this.notifyObservers('resourceLoaded', {
                count: this.metrics.resourceCount,
                totalSize: this.metrics.resourceSize
            });
        }).observe({ entryTypes: ['resource'] });
    }

    /**
     * Setup navigation timing observer
     */
    setupNavigationObserver() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];

            this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
            this.metrics.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;

            // Calculate Time to Interactive (TTI)
            this.calculateTimeToInteractive();

            this.notifyObservers('navigationComplete', {
                domContentLoaded: this.metrics.domContentLoaded,
                loadComplete: this.metrics.loadComplete,
                timeToInteractive: this.metrics.timeToInteractive
            });
        });
    }

    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.metrics.memoryUsage = {
                    used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
                };

                this.notifyObservers('memoryUpdate', this.metrics.memoryUsage);
            }, 5000);
        }
    }

    /**
     * Setup custom application metrics
     */
    setupCustomMetrics() {
        // Track app initialization
        document.addEventListener('app:initialized', (event) => {
            this.metrics.appInitTime = performance.now() - this.startTime;
            this.notifyObservers('appInitialized', this.metrics.appInitTime);
        });

        // Track agent connection
        document.addEventListener('agent:connected', (event) => {
            this.metrics.agentConnectionTime = performance.now() - this.startTime;
            this.notifyObservers('agentConnected', this.metrics.agentConnectionTime);
        });

        // Track first message
        document.addEventListener('message:sent', (event) => {
            if (!this.metrics.firstMessageTime) {
                this.metrics.firstMessageTime = performance.now() - this.startTime;
                this.notifyObservers('firstMessage', this.metrics.firstMessageTime);
            }
        });

        // Track user interactions
        ['click', 'keydown', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, (event) => {
                if (!this.metrics.firstInteraction) {
                    this.metrics.firstInteraction = performance.now() - this.startTime;
                    this.notifyObservers('firstInteraction', this.metrics.firstInteraction);
                }
            }, { once: true });
        });
    }

    /**
     * Calculate Time to Interactive
     */
    calculateTimeToInteractive() {
        // Simplified TTI calculation
        // In a real implementation, this would be more complex
        const navigation = performance.getEntriesByType('navigation')[0];
        const lastLongTask = this.getLastLongTask();

        if (lastLongTask) {
            this.metrics.timeToInteractive = Math.max(
                navigation.domContentLoadedEventEnd,
                lastLongTask.startTime + lastLongTask.duration
            );
        } else {
            this.metrics.timeToInteractive = navigation.domContentLoadedEventEnd;
        }
    }

    /**
     * Get the last long task
     */
    getLastLongTask() {
        const longTasks = performance.getEntriesByType('longtask');
        return longTasks.length > 0 ? longTasks[longTasks.length - 1] : null;
    }

    /**
     * Track response time for user interactions
     */
    trackResponseTime(startTime, endTime) {
        const responseTime = endTime - startTime;
        this.metrics.averageResponseTime.push(responseTime);

        // Keep only last 100 measurements
        if (this.metrics.averageResponseTime.length > 100) {
            this.metrics.averageResponseTime.shift();
        }

        this.notifyObservers('responseTime', responseTime);
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const avgResponseTime = this.metrics.averageResponseTime.length > 0
            ? this.metrics.averageResponseTime.reduce((a, b) => a + b, 0) / this.metrics.averageResponseTime.length
            : 0;

        return {
            // Core Web Vitals
            coreWebVitals: {
                lcp: this.metrics.lcp ? `${Math.round(this.metrics.lcp)}ms` : 'N/A',
                fid: this.metrics.fid ? `${Math.round(this.metrics.fid)}ms` : 'N/A',
                cls: this.metrics.cls ? Math.round(this.metrics.cls * 1000) / 1000 : 'N/A'
            },

            // Loading Performance
            loading: {
                domContentLoaded: this.metrics.domContentLoaded ? `${Math.round(this.metrics.domContentLoaded)}ms` : 'N/A',
                loadComplete: this.metrics.loadComplete ? `${Math.round(this.metrics.loadComplete)}ms` : 'N/A',
                timeToInteractive: this.metrics.timeToInteractive ? `${Math.round(this.metrics.timeToInteractive)}ms` : 'N/A'
            },

            // Application Performance
            application: {
                initTime: this.metrics.appInitTime ? `${Math.round(this.metrics.appInitTime)}ms` : 'N/A',
                agentConnectionTime: this.metrics.agentConnectionTime ? `${Math.round(this.metrics.agentConnectionTime)}ms` : 'N/A',
                firstMessageTime: this.metrics.firstMessageTime ? `${Math.round(this.metrics.firstMessageTime)}ms` : 'N/A',
                firstInteraction: this.metrics.firstInteraction ? `${Math.round(this.metrics.firstInteraction)}ms` : 'N/A',
                averageResponseTime: `${Math.round(avgResponseTime)}ms`
            },

            // Resource Loading
            resources: {
                count: this.metrics.resourceCount,
                totalSize: `${Math.round(this.metrics.resourceSize / 1024)}KB`,
                cssModules: this.metrics.cssModules.size,
                jsModules: this.metrics.jsModules.size
            },

            // Memory Usage
            memory: this.metrics.memoryUsage
        };
    }

    /**
     * Get performance score (0-100)
     */
    getPerformanceScore() {
        let score = 100;

        // Penalize poor Core Web Vitals
        if (this.metrics.lcp > 2500) score -= 20;
        else if (this.metrics.lcp > 1200) score -= 10;

        if (this.metrics.fid > 100) score -= 20;
        else if (this.metrics.fid > 300) score -= 30;

        if (this.metrics.cls > 0.25) score -= 20;
        else if (this.metrics.cls > 0.1) score -= 10;

        // Penalize slow app initialization
        if (this.metrics.appInitTime > 3000) score -= 15;
        else if (this.metrics.appInitTime > 1500) score -= 8;

        // Penalize high memory usage
        if (this.metrics.memoryUsage.used > 100) score -= 10;
        else if (this.metrics.memoryUsage.used > 50) score -= 5;

        return Math.max(0, Math.round(score));
    }

    /**
     * Export performance data
     */
    exportData() {
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metrics: this.metrics,
            summary: this.getPerformanceSummary(),
            score: this.getPerformanceScore()
        };
    }

    /**
     * Add performance observer
     */
    addObserver(observer) {
        this.observers.push(observer);
    }

    /**
     * Remove performance observer
     */
    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * Notify observers of performance events
     */
    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            if (typeof observer === 'function') {
                observer(event, data);
            } else if (observer[event]) {
                observer[event](data);
            }
        });
    }

    /**
     * Log performance summary to console
     */
    logSummary() {
        const summary = this.getPerformanceSummary();
        const score = this.getPerformanceScore();

        console.group('[PerformanceMonitor] Performance Summary');
        console.log(`Performance Score: ${score}/100`);
        console.log('Core Web Vitals:', summary.coreWebVitals);
        console.log('Loading Performance:', summary.loading);
        console.log('Application Performance:', summary.application);
        console.log('Resource Loading:', summary.resources);
        console.log('Memory Usage:', summary.memory);
        console.groupEnd();
    }

    /**
     * Create performance dashboard
     */
    createDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'performance-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-height: 400px;
            overflow-y: auto;
        `;

        this.updateDashboard(dashboard);
        document.body.appendChild(dashboard);

        // Update dashboard every 2 seconds
        setInterval(() => this.updateDashboard(dashboard), 2000);

        return dashboard;
    }

    /**
     * Update performance dashboard
     */
    updateDashboard(dashboard) {
        const summary = this.getPerformanceSummary();
        const score = this.getPerformanceScore();

        dashboard.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: ${score >= 90 ? '#4ade80' : score >= 70 ? '#fbbf24' : '#ef4444'};">
                Performance Score: ${score}/100
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong>Core Web Vitals:</strong><br>
                LCP: ${summary.coreWebVitals.lcp}<br>
                FID: ${summary.coreWebVitals.fid}<br>
                CLS: ${summary.coreWebVitals.cls}
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong>Loading:</strong><br>
                DOM Ready: ${summary.loading.domContentLoaded}<br>
                Load Complete: ${summary.loading.loadComplete}<br>
                Time to Interactive: ${summary.loading.timeToInteractive}
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong>Application:</strong><br>
                Init Time: ${summary.application.initTime}<br>
                First Interaction: ${summary.application.firstInteraction}<br>
                Avg Response: ${summary.application.averageResponseTime}
            </div>
            
            <div style="margin-bottom: 8px;">
                <strong>Resources:</strong><br>
                Count: ${summary.resources.count}<br>
                Size: ${summary.resources.totalSize}<br>
                CSS Modules: ${summary.resources.cssModules}<br>
                JS Modules: ${summary.resources.jsModules}
            </div>
            
            <div>
                <strong>Memory:</strong><br>
                Used: ${summary.memory.used}MB<br>
                Total: ${summary.memory.total}MB<br>
                Limit: ${summary.memory.limit}MB
            </div>
        `;
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-show dashboard in development
if (window.location.search.includes('debug=performance')) {
    performanceMonitor.createDashboard();
}

// Global access for debugging
if (typeof window !== 'undefined') {
    window.PerformanceMonitor = performanceMonitor;
}
