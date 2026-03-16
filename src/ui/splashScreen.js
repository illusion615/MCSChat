/**
 * Splash Screen Controller
 * Manages loading progress and user feedback during application initialization
 * Now synchronized with actual application loading progress
 * 
 * Version: 1.1.2
 * Changelog:
 * - 1.1.2: Fixed displayVersionInfo undefined error with better type checking
 * - 1.1.1: Fixed module loading - removed ES6 imports for immediate loading
 * - 1.1.0: Added version display support
 * - 1.0.0: Initial release with real-time progress tracking
 */

const SPLASH_VERSION = '1.1.2';
console.log(`🎬 [SplashScreen] Version ${SPLASH_VERSION} loaded`);

// Version information will be loaded from versionRegistry once it's available
// For now, use placeholder that will be updated by main.js
let APP_VERSION = '2.0.0';
let BUILD_DATE = '2025-10-04';
let MODULE_VERSIONS = {};

// Function to update version info from versionRegistry (called by main.js)
window.updateSplashVersionInfo = function(versionInfo) {
    APP_VERSION = versionInfo.app;
    BUILD_DATE = versionInfo.buildDate;
    MODULE_VERSIONS = versionInfo.modules;
    
    // Update splash screen display if already initialized
    if (window.splashScreen && typeof window.splashScreen.displayVersionInfo === 'function') {
        window.splashScreen.displayVersionInfo();
    } else {
        console.log('[SplashScreen] Version info updated, splash screen will display it when initialized');
    }
};

class SplashScreen {
    constructor() {
        this.progress = 0;
        this.maxProgress = 100;
        this.currentStatus = '';
        this.errors = [];
        this.startTime = Date.now();
        this.isCompleted = false;
        this.isHidden = false;
        this.highestProgress = 0; // Track highest progress to ensure monotonic increase
        
        // Remove hardcoded steps - now driven by real application events
        this.initializeSplashElements();
        this.displayVersionInfo();
        this.setupApplicationEventListeners();
    }

    initializeSplashElements() {
        // Use existing splash screen elements from HTML
        this.splashElement = document.getElementById('splashScreen');
        this.progressFill = document.getElementById('splashProgressFill');
        this.statusElement = document.getElementById('splashStatus');
        
        if (!this.splashElement) {
            console.error('[SplashScreen] Splash screen element not found in HTML');
            return;
        }
        
        if (!this.progressFill) {
            console.error('[SplashScreen] Progress fill element not found');
        }
        
        if (!this.statusElement) {
            console.error('[SplashScreen] Status element not found');
        }
    }

    /**
     * Display version information on splash screen
     */
    displayVersionInfo() {
        if (!this.splashElement) return;
        
        // Find the subtitle element (where it says "Initializing AI Assistant...")
        const subtitle = this.splashElement.querySelector('.splash-subtitle');
        
        if (subtitle) {
            // Update subtitle to include version
            subtitle.textContent = `Version ${APP_VERSION} • ${BUILD_DATE}`;
            subtitle.style.fontSize = '0.9rem';
            subtitle.style.marginBottom = '2rem';
        }
        
        // Add version footer at the bottom of splash screen
        let versionFooter = this.splashElement.querySelector('.splash-version-footer');
        if (!versionFooter) {
            versionFooter = document.createElement('div');
            versionFooter.className = 'splash-version-footer';
            versionFooter.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 0.75rem;
                opacity: 0.5;
                text-align: center;
                width: 90%;
                max-width: 500px;
            `;
            
            // Count loaded modules
            const moduleCount = Object.keys(MODULE_VERSIONS).length;
            versionFooter.innerHTML = `
                <div>${moduleCount} modules loaded</div>
                <div style="margin-top: 4px; font-size: 0.7rem;">Press F12 to view detailed version info in console</div>
            `;
            
            this.splashElement.appendChild(versionFooter);
        }
    }

    /**
     * Set up listeners for real application initialization events
     */
    setupApplicationEventListeners() {
        console.log('Setting up application event listeners for splash screen');
        
        // Listen for initialization progress events
        document.addEventListener('app:init:progress', (event) => {
            console.log('Splash received progress event:', event.detail.message);
            this.updateProgress(event.detail.message, event.detail.progress || 0);
        });

        // Listen for DirectLine connection events
        document.addEventListener('directline:connecting', () => {
            console.log('Splash received DirectLine connecting event');
            this.updateProgress('Connecting to agent...', 82);
        });

        document.addEventListener('directline:connected', () => {
            console.log('Splash received DirectLine connected event');
            this.updateProgress('Agent connected!', 85);
        });

        // Listen for agent greeting events
        document.addEventListener('agent:greeting:sending', () => {
            console.log('Splash received agent greeting sending event');
            this.updateProgress('Preparing agent welcome...', 88);
        });

        document.addEventListener('agent:greeting:received', () => {
            console.log('Splash received agent greeting received event');
            this.updateProgress('Agent ready!', 95);
            // Small delay to let the greeting message start streaming
            setTimeout(() => this.completeLoading(true), 500);
        });

        document.addEventListener('agent:greeting:timeout', () => {
            console.log('Splash received agent greeting timeout event');
            this.updateProgress('Agent connected (no greeting)', 95);
            setTimeout(() => this.completeLoading(true), 500);
        });

        document.addEventListener('directline:failed', (event) => {
            console.log('Splash received DirectLine failed event');
            this.updateProgress('Connection failed. You can use the app without an agent.', 100);
            setTimeout(() => this.completeLoading(false), 1500);
        });

        // Listen for application initialization complete (fallback for no-agent scenarios)
        document.addEventListener('app:init:complete', (event) => {
            console.log('Splash received init complete event:', event.detail);
            const hasAgent = event.detail && event.detail.hasAgent;
            if (!hasAgent) {
                this.updateProgress('Ready!', 100);
                setTimeout(() => this.completeLoading(false), 1000);
            }
            // If hasAgent is true, we wait for greeting events instead
        });
    }

    /**
     * Update progress based on real application events
     */
    updateProgress(status, progress) {
        if (this.isCompleted) return; // Don't update after completion
        
        // Ensure progress only increases (monotonic progress)
        const newProgress = Math.max(progress, this.highestProgress);
        this.highestProgress = newProgress;
        this.progress = Math.min(newProgress, this.maxProgress);
        this.currentStatus = status;
        
        // Update progress bar
        if (this.progressFill) {
            this.progressFill.style.width = `${this.progress}%`;
        } else {
            console.warn('[SplashScreen] Progress fill element not available');
        }
        
        // Format status text with percentage
        const formattedStatus = `${status} (${Math.round(this.progress)}%)`;
        
        if (this.statusElement) {
            this.statusElement.innerHTML = `
                <div class="splash-spinner"></div>
                ${formattedStatus}
            `;
        } else {
            console.warn('[SplashScreen] Status element not available');
        }
        
        console.log(`[SplashScreen] Progress: ${this.progress}% (requested: ${progress}%) - ${status}`);
    }

    addError(message) {
        this.errors.push(message);
        console.error('[SplashScreen]', message);
        
        // Display error in status element
        if (this.statusElement) {
            this.statusElement.innerHTML = `
                <span class="splash-error">⚠️ Loading Issues:</span><br>
                <span style="font-size: 0.9em;">${this.errors.slice(-1)[0]}</span>
            `;
            this.statusElement.style.color = '#ffcccb';
        }
    }

    /**
     * Complete loading with different behaviors based on agent configuration
     * @param {boolean} hasAgent - Whether an agent is configured
     */
    completeLoading(hasAgent = true) {
        if (this.isCompleted) return;
        
        this.isCompleted = true;
        const loadTime = Date.now() - this.startTime;
        console.log(`[SplashScreen] Application loaded in ${loadTime}ms`);
        
        if (hasAgent) {
            // Normal completion - agent is configured and ready
            this.updateProgress('Ready!', 100);
            
            if (this.statusElement) {
                this.statusElement.innerHTML = `
                    <span class="splash-success">✓ Ready! (${(loadTime/1000).toFixed(1)}s)</span>
                `;
            }
            
            // Hide splash screen after brief success display
            setTimeout(() => {
                this.hide();
                // Reset progress tracker for potential future use
                this.highestProgress = 0;
            }, 1000);
        } else {
            // No agent configured - show helpful message
            this.updateProgress('Setup required', 100);
            
            if (this.statusElement) {
                this.statusElement.innerHTML = `
                    <span class="splash-setup">⚙️ Agent setup required</span><br>
                    <span style="font-size: 0.9em;">Opening configuration...</span>
                `;
            }
            
            // Hide splash screen quicker and show setup
            setTimeout(() => {
                this.hide();
            }, 1500);
        }
    }

    show() {
        if (this.splashElement) {
            this.splashElement.style.display = 'flex';
            this.splashElement.classList.remove('hidden');
        }
        // Reset progress tracking when showing
        this.highestProgress = 0;
        this.progress = 0;
        this.isCompleted = false;
        this.isHidden = false;
    }

    hide() {
        if (this.isHidden) return;
        this.isHidden = true;
        
        if (this.splashElement) {
            this.splashElement.classList.add('hidden');
            
            // Remove from DOM after transition
            setTimeout(() => {
                if (this.splashElement) {
                    this.splashElement.style.display = 'none';
                }
            }, 500);
        }
    }

    // Public method to manually update progress
    setProgress(progress, status) {
        this.updateProgress(status, progress);
    }

    // Public method to manually complete loading
    complete(hasAgent = true) {
        this.completeLoading(hasAgent);
    }
}
