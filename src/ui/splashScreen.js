/**
 * Splash Screen Controller
 * Manages loading progress and user feedback during application initialization
 * Now synchronized with actual application loading progress
 */
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
