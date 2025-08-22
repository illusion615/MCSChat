/**
 * Splash Screen Controller
 * Manages loading progress and user feedback during application initialization
 */
class SplashScreen {
    constructor() {
        this.progress = 0;
        this.maxProgress = 100;
        this.currentStatus = '';
        this.loadingSteps = [
            { name: 'Initializing application...', weight: 5 },
            { name: 'Loading CSS resources...', weight: 15 },
            { name: 'Loading external libraries...', weight: 40 },
            { name: 'Loading local libraries...', weight: 15 },
            { name: 'Initializing components...', weight: 15 },
            { name: 'Finalizing setup...', weight: 10 }
        ];
        this.currentStepIndex = 0;
        this.stepProgress = 0;
        this.errors = [];
        this.startTime = Date.now();
        
        this.initializeSplashElements();
        this.initializeProgressTracking();
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

    initializeProgressTracking() {
        // Start with first step
        this.updateProgress(0, this.loadingSteps[0].name);
        
        // Track CSS loading
        this.trackCSSLoading();
        
        // Track external library loading
        this.trackExternalLibraries();
        
        // Track DOM ready
        this.trackDOMReady();
    }

    trackCSSLoading() {
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
        let loadedCSS = 0;
        const totalCSS = cssLinks.length;
        
        if (totalCSS === 0) {
            this.completeStep(1);
            return;
        }

        cssLinks.forEach((link, index) => {
            const onLoad = () => {
                loadedCSS++;
                const cssProgress = (loadedCSS / totalCSS) * this.loadingSteps[1].weight;
                this.updateProgress(this.loadingSteps[0].weight + cssProgress, 
                    `Loading CSS (${loadedCSS}/${totalCSS})...`);
                
                if (loadedCSS === totalCSS) {
                    this.completeStep(1);
                }
            };
            
            const onError = () => {
                this.addError(`Failed to load CSS: ${link.href}`);
                onLoad(); // Continue despite error
            };

            if (link.sheet && link.sheet.cssRules) {
                // Already loaded
                onLoad();
            } else {
                link.addEventListener('load', onLoad);
                link.addEventListener('error', onError);
            }
        });
    }

    trackExternalLibraries() {
        const externalLibraries = [
            { name: 'marked', check: () => typeof marked !== 'undefined' },
            { name: 'DOMPurify', check: () => typeof DOMPurify !== 'undefined' },
            { name: 'katex', check: () => typeof katex !== 'undefined' }
        ];
        
        let checkInterval = setInterval(() => {
            const loadedLibs = externalLibraries.filter(lib => lib.check()).length;
            const libProgress = (loadedLibs / externalLibraries.length) * this.loadingSteps[2].weight;
            
            this.updateProgress(
                this.loadingSteps[0].weight + this.loadingSteps[1].weight + libProgress,
                `Loading external libraries (${loadedLibs}/${externalLibraries.length})...`
            );
            
            if (loadedLibs === externalLibraries.length) {
                clearInterval(checkInterval);
                this.completeStep(2);
                this.trackLocalLibraries();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (checkInterval) {
                clearInterval(checkInterval);
                const loadedLibs = externalLibraries.filter(lib => lib.check()).length;
                if (loadedLibs < externalLibraries.length) {
                    console.log('[SplashScreen] Some external libraries not detected, continuing...');
                }
                this.completeStep(2);
                this.trackLocalLibraries();
            }
        }, 5000);
    }

    trackLocalLibraries() {
        const localLibraries = [
            { name: 'Marked', check: () => typeof marked !== 'undefined' },
            { name: 'DOMPurify', check: () => typeof DOMPurify !== 'undefined' },
            { name: 'KaTeX', check: () => typeof katex !== 'undefined' }
        ];
        
        let checkInterval = setInterval(() => {
            const loadedLibs = localLibraries.filter(lib => lib.check()).length;
            const libProgress = (loadedLibs / localLibraries.length) * this.loadingSteps[3].weight;
            
            this.updateProgress(
                this.loadingSteps[0].weight + this.loadingSteps[1].weight + 
                this.loadingSteps[2].weight + libProgress,
                `Loading local libraries (${loadedLibs}/${localLibraries.length})...`
            );
            
            if (loadedLibs === localLibraries.length) {
                clearInterval(checkInterval);
                this.completeStep(3);
            }
        }, 50);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (checkInterval) {
                clearInterval(checkInterval);
                this.completeStep(3);
            }
        }, 5000);
    }

    trackDOMReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.onDOMReady();
            });
        } else {
            this.onDOMReady();
        }
    }

    onDOMReady() {
        const baseProgress = this.loadingSteps[0].weight + this.loadingSteps[1].weight + 
                           this.loadingSteps[2].weight + this.loadingSteps[3].weight;
        
        this.updateProgress(baseProgress, 'Initializing components...');
        
        // Simulate component initialization
        setTimeout(() => {
            this.updateProgress(baseProgress + this.loadingSteps[4].weight, 'Finalizing setup...');
            
            setTimeout(() => {
                this.completeLoading();
            }, 500);
        }, 800);
    }

    updateProgress(progress, status) {
        this.progress = Math.min(progress, this.maxProgress);
        this.currentStatus = status;
        
        if (this.progressFill) {
            this.progressFill.style.width = `${this.progress}%`;
        }
        
        if (this.statusElement) {
            // Update the text content, preserving the spinner
            const spinner = this.statusElement.querySelector('.splash-spinner');
            this.statusElement.innerHTML = '';
            if (spinner) {
                this.statusElement.appendChild(spinner);
            }
            this.statusElement.appendChild(document.createTextNode(status));
        }
    }

    completeStep(stepIndex) {
        this.currentStepIndex = Math.max(this.currentStepIndex, stepIndex);
        const completedWeight = this.loadingSteps.slice(0, stepIndex + 1)
            .reduce((sum, step) => sum + step.weight, 0);
        
        if (stepIndex + 1 < this.loadingSteps.length) {
            this.updateProgress(completedWeight, this.loadingSteps[stepIndex + 1].name);
        }
    }

    addError(message) {
        this.errors.push(message);
        console.error('[SplashScreen]', message);
        
        if (this.elements.error) {
            this.elements.error.style.display = 'block';
            this.elements.error.innerHTML = `
                <strong>Loading Issues Detected:</strong><br>
                ${this.errors.map(err => `• ${err}`).join('<br>')}
            `;
        }
    }

    completeLoading() {
        const loadTime = Date.now() - this.startTime;
        console.log(`[SplashScreen] Application loaded in ${loadTime}ms`);
        
        this.updateProgress(100, 'Ready!');
        
        if (this.elements.status) {
            this.elements.status.innerHTML = `
                <span class="splash-success">✓ Ready! (${(loadTime/1000).toFixed(1)}s)</span>
            `;
        }
        
        // Hide splash screen after brief success display
        setTimeout(() => {
            this.hide();
        }, 1000);
    }

    show() {
        if (this.splashElement) {
            this.splashElement.style.display = 'flex';
            this.splashElement.classList.remove('hidden');
        }
    }

    hide() {
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
        this.updateProgress(progress, status);
    }

    // Public method to manually complete loading
    complete() {
        this.completeLoading();
    }
}
