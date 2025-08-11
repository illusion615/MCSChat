/**
 * CSS Loading Utility - Progressive CSS Loading System
 * Manages dynamic loading of CSS modules for optimal performance
 */

class CSSLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
        this.observers = [];

        // Track loading performance
        this.performanceMetrics = {
            startTime: Date.now(),
            cssLoadTime: null,
            totalLoadTime: null
        };
    }

    /**
     * Load CSS module with caching and error handling
     */
    async loadModule(href, options = {}) {
        const {
            priority = 'normal',
            media = 'all',
            crossorigin = null,
            retries = 2
        } = options;

        // Return existing promise if already loading
        if (this.loadingPromises.has(href)) {
            return this.loadingPromises.get(href);
        }

        // Return immediately if already loaded
        if (this.loadedModules.has(href)) {
            return Promise.resolve();
        }

        const loadPromise = this._loadCSSWithRetry(href, { media, crossorigin }, retries);
        this.loadingPromises.set(href, loadPromise);

        try {
            await loadPromise;
            this.loadedModules.add(href);
            this.loadingPromises.delete(href);
            this._notifyObservers('moduleLoaded', { href, success: true });
            console.log(`[CSSLoader] Loaded: ${href}`);
        } catch (error) {
            this.loadingPromises.delete(href);
            this._notifyObservers('moduleLoaded', { href, success: false, error });
            console.warn(`[CSSLoader] Failed to load: ${href}`, error);
            throw error;
        }

        return loadPromise;
    }

    /**
     * Load multiple CSS modules in parallel
     */
    async loadModules(modules) {
        const promises = modules.map(module => {
            if (typeof module === 'string') {
                return this.loadModule(module);
            } else {
                return this.loadModule(module.href, module.options);
            }
        });

        try {
            await Promise.allSettled(promises);
            console.log(`[CSSLoader] Batch loaded ${modules.length} modules`);
        } catch (error) {
            console.warn('[CSSLoader] Some modules failed to load in batch', error);
        }
    }

    /**
     * Load CSS modules based on viewport and user interaction
     */
    loadModulesProgressively() {
        // Load core layout styles immediately
        this.loadModule('src/styles/critical.css', { priority: 'high' });

        // Load component styles when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadModule('src/styles/layout.css', { priority: 'high' });
                this.loadModule('src/styles/components.css', { priority: 'medium' });
            });
        } else {
            this.loadModule('src/styles/layout.css', { priority: 'high' });
            this.loadModule('src/styles/components.css', { priority: 'medium' });
        }

        // Load modal styles when needed (on user interaction)
        this._loadOnInteraction();

        // Load print styles only for print media
        this.loadModule('src/styles/print.css', {
            priority: 'low',
            media: 'print'
        });
    }

    /**
     * Load CSS module with retry logic
     */
    _loadCSSWithRetry(href, options = {}, retries = 2) {
        return new Promise((resolve, reject) => {
            const attemptLoad = (attempt) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.media = options.media || 'all';

                if (options.crossorigin) {
                    link.crossOrigin = options.crossorigin;
                }

                const cleanup = () => {
                    link.removeEventListener('load', onLoad);
                    link.removeEventListener('error', onError);
                };

                const onLoad = () => {
                    cleanup();
                    resolve();
                };

                const onError = () => {
                    cleanup();
                    if (attempt < retries) {
                        console.warn(`[CSSLoader] Retry ${attempt + 1}/${retries} for: ${href}`);
                        setTimeout(() => attemptLoad(attempt + 1), 1000 * attempt);
                    } else {
                        reject(new Error(`Failed to load CSS: ${href}`));
                    }
                };

                link.addEventListener('load', onLoad);
                link.addEventListener('error', onError);

                document.head.appendChild(link);
            };

            attemptLoad(0);
        });
    }

    /**
     * Load modal styles when user interacts with UI
     */
    _loadOnInteraction() {
        const interactionEvents = ['click', 'keydown', 'touchstart'];
        const loadModalStyles = () => {
            this.loadModule('src/styles/modals.css', { priority: 'medium' });

            // Remove listeners after first interaction
            interactionEvents.forEach(event => {
                document.removeEventListener(event, loadModalStyles, { once: true });
            });
        };

        // Add listeners for first user interaction
        interactionEvents.forEach(event => {
            document.addEventListener(event, loadModalStyles, { once: true });
        });
    }

    /**
     * Preload CSS for faster subsequent loads
     */
    preloadModules(modules) {
        modules.forEach(href => {
            if (!this.loadedModules.has(href) && !this.loadingPromises.has(href)) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'style';
                link.href = href;
                link.onload = () => {
                    // Convert preload to stylesheet
                    link.rel = 'stylesheet';
                    this.loadedModules.add(href);
                };
                document.head.appendChild(link);
            }
        });
    }

    /**
     * Check if specific module is loaded
     */
    isModuleLoaded(href) {
        return this.loadedModules.has(href);
    }

    /**
     * Get loading status of all modules
     */
    getLoadingStatus() {
        return {
            loaded: Array.from(this.loadedModules),
            loading: Array.from(this.loadingPromises.keys()),
            metrics: this.performanceMetrics
        };
    }

    /**
     * Add observer for loading events
     */
    addObserver(observer) {
        this.observers.push(observer);
    }

    /**
     * Remove observer
     */
    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * Notify all observers of loading events
     */
    _notifyObservers(event, data) {
        this.observers.forEach(observer => {
            if (typeof observer === 'function') {
                observer(event, data);
            } else if (observer[event]) {
                observer[event](data);
            }
        });
    }

    /**
     * Enable critical resource hints
     */
    enableResourceHints() {
        // DNS prefetch for external CSS CDNs
        this._addDNSPrefetch([
            '//fonts.googleapis.com',
            '//cdn.jsdelivr.net',
            '//unpkg.com'
        ]);

        // Preconnect to critical origins
        this._addPreconnect([
            '//fonts.gstatic.com'
        ]);
    }

    /**
     * Add DNS prefetch hints
     */
    _addDNSPrefetch(domains) {
        domains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = domain;
            document.head.appendChild(link);
        });
    }

    /**
     * Add preconnect hints
     */
    _addPreconnect(origins) {
        origins.forEach(origin => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = origin;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }

    /**
     * Clean up unused CSS
     */
    cleanup() {
        // Remove stylesheets that are no longer needed
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        stylesheets.forEach(sheet => {
            // Only remove if explicitly marked for cleanup
            if (sheet.dataset.cleanup === 'true') {
                sheet.remove();
                this.loadedModules.delete(sheet.href);
            }
        });
    }

    /**
     * Update performance metrics
     */
    updateMetrics() {
        if (!this.performanceMetrics.cssLoadTime) {
            this.performanceMetrics.cssLoadTime = Date.now() - this.performanceMetrics.startTime;
        }

        // Use Performance Observer if available
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.initiatorType === 'link') {
                        console.log(`[CSSLoader] ${entry.name} loaded in ${entry.loadEnd - entry.loadStart}ms`);
                    }
                }
            });
            observer.observe({ entryTypes: ['resource'] });
        }
    }
}

// Create and export singleton instance
export const cssLoader = new CSSLoader();

// Auto-initialize progressive loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cssLoader.loadModulesProgressively();
        cssLoader.enableResourceHints();
        cssLoader.updateMetrics();
    });
} else {
    cssLoader.loadModulesProgressively();
    cssLoader.enableResourceHints();
    cssLoader.updateMetrics();
}

// Global access for debugging
if (typeof window !== 'undefined') {
    window.CSSLoader = cssLoader;
}
