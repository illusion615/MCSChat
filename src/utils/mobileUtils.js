/**
 * Mobile Utilities
 * Handles mobile-specific functionality including sidebar toggle and responsive behavior
 */

export class MobileUtils {
    constructor() {
        this.isMobile = false;
        this.sidebarOpen = false;
        this.aiPanelOpen = false;
        this.elements = {};
        this.initialize();
    }

    /**
     * Initialize mobile utilities
     */
    initialize() {
        this.bindElements();
        this.setupEventListeners();
        this.checkMobileState();
        this.setupResizeListener();
        console.log('[Mobile Utils] Initialized');
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.elements = {
            mobileHeader: document.getElementById('mobileHeader'),
            mobileMenuToggle: document.getElementById('mobileMenuToggle'),
            mobileNewChatBtn: document.getElementById('mobileNewChatBtn'),
            mobileOverlay: document.getElementById('mobileOverlay'),
            leftPanel: document.getElementById('leftPanel'),
            mobileSidebarClose: document.getElementById('mobileSidebarClose'),
            container: document.getElementById('container'),
            clearButton: document.getElementById('clearButton'),
            mobileAiToggle: document.getElementById('mobileAiToggle'),
            llmAnalysisPanel: document.getElementById('llmAnalysisPanel')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle
        if (this.elements.mobileMenuToggle) {
            this.elements.mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }

        // Mobile new chat button
        if (this.elements.mobileNewChatBtn) {
            this.elements.mobileNewChatBtn.addEventListener('click', () => {
                this.handleMobileNewChat();
            });
        }

        // Mobile sidebar close
        if (this.elements.mobileSidebarClose) {
            this.elements.mobileSidebarClose.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Mobile overlay click
        if (this.elements.mobileOverlay) {
            this.elements.mobileOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Mobile AI toggle
        if (this.elements.mobileAiToggle) {
            this.elements.mobileAiToggle.addEventListener('click', () => {
                this.toggleAiPanel();
            });
        }

        // Escape key to close sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebarOpen && this.isMobile) {
                this.closeMobileSidebar();
            }
        });

        // Close sidebar when session is selected on mobile
        document.addEventListener('click', (e) => {
            if (this.isMobile && this.sidebarOpen && e.target.closest('.sessionItem')) {
                // Delay closing to allow session selection to complete
                setTimeout(() => {
                    this.closeMobileSidebar();
                }, 100);
            }
        });
    }

    /**
     * Setup window resize listener
     */
    setupResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.checkMobileState();
            }, 100);
        });
    }

    /**
     * Check if device is in mobile state
     */
    checkMobileState() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        // Show/hide mobile AI toggle
        if (this.elements.mobileAiToggle) {
            this.elements.mobileAiToggle.style.display = this.isMobile ? 'flex' : 'none';
        }

        // If transitioning from mobile to desktop, close panels
        if (wasMobile && !this.isMobile) {
            if (this.sidebarOpen) {
                this.closeMobileSidebar();
            }
            if (this.aiPanelOpen) {
                this.closeAiPanel();
            }
        }

        // If transitioning from mobile to desktop, ensure sidebar is closed
        if (wasMobile && !this.isMobile && this.sidebarOpen) {
            this.closeMobileSidebar();
        }

        // Update mobile state classes
        document.body.classList.toggle('mobile-layout', this.isMobile);
        
        console.log(`[Mobile Utils] Mobile state: ${this.isMobile ? 'mobile' : 'desktop'}`);
    }

    /**
     * Toggle mobile sidebar
     */
    toggleMobileSidebar() {
        if (!this.isMobile) return;

        if (this.sidebarOpen) {
            this.closeMobileSidebar();
        } else {
            this.openMobileSidebar();
        }
    }

    /**
     * Open mobile sidebar
     */
    openMobileSidebar() {
        if (!this.isMobile) return;

        this.sidebarOpen = true;
        
        // Add classes for animations
        this.elements.leftPanel?.classList.add('mobile-open');
        this.elements.mobileOverlay?.classList.add('active');
        this.elements.mobileMenuToggle?.classList.add('active');
        
        // Show overlay
        if (this.elements.mobileOverlay) {
            this.elements.mobileOverlay.style.display = 'block';
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log('[Mobile Utils] Sidebar opened');
    }

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
        if (!this.isMobile) return;

        this.sidebarOpen = false;

        // Remove classes for animations
        this.elements.leftPanel?.classList.remove('mobile-open');
        this.elements.mobileOverlay?.classList.remove('active');
        this.elements.mobileMenuToggle?.classList.remove('active');

        // Hide overlay after animation
        setTimeout(() => {
            if (this.elements.mobileOverlay && !this.sidebarOpen) {
                this.elements.mobileOverlay.style.display = 'none';
            }
        }, 300);

        // Restore body scroll
        document.body.style.overflow = '';

        console.log('[Mobile Utils] Sidebar closed');
    }

    /**
     * Handle mobile new chat button
     */
    handleMobileNewChat() {
        // Trigger the existing clear button functionality
        if (this.elements.clearButton) {
            this.elements.clearButton.click();
        }
        
        // Close sidebar if open
        if (this.sidebarOpen) {
            this.closeMobileSidebar();
        }
    }

    /**
     * Toggle AI companion panel
     */
    toggleAiPanel() {
        if (!this.isMobile) return;
        
        if (this.aiPanelOpen) {
            this.closeAiPanel();
        } else {
            this.openAiPanel();
        }
    }

    /**
     * Open AI companion panel
     */
    openAiPanel() {
        if (!this.isMobile) return;
        
        this.aiPanelOpen = true;
        
        // Close sidebar if open
        if (this.sidebarOpen) {
            this.closeMobileSidebar();
        }
        
        this.elements.llmAnalysisPanel?.classList.add('mobile-open');
        console.log('[Mobile Utils] AI panel opened');
    }

    /**
     * Close AI companion panel
     */
    closeAiPanel() {
        if (!this.isMobile) return;
        
        this.aiPanelOpen = false;
        this.elements.llmAnalysisPanel?.classList.remove('mobile-open');
        console.log('[Mobile Utils] AI panel closed');
    }

    /**
     * Get mobile state
     * @returns {boolean} True if in mobile layout
     */
    isMobileLayout() {
        return this.isMobile;
    }

    /**
     * Get sidebar state
     * @returns {boolean} True if sidebar is open
     */
    isSidebarOpen() {
        return this.sidebarOpen;
    }

    /**
     * Force close sidebar (useful for external calls)
     */
    forceCloseSidebar() {
        if (this.sidebarOpen) {
            this.closeMobileSidebar();
        }
    }

    /**
     * Update mobile title
     * @param {string} title - New title to display
     */
    updateMobileTitle(title) {
        const mobileTitle = document.getElementById('mobileTitle');
        if (mobileTitle && title) {
            mobileTitle.textContent = title;
        }
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        // Small delay to let orientation change complete
        setTimeout(() => {
            this.checkMobileState();
            
            // Close sidebar on orientation change to prevent layout issues
            if (this.sidebarOpen) {
                this.closeMobileSidebar();
            }
        }, 100);
    }

    /**
     * Setup viewport meta tag for proper mobile scaling
     */
    setupViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }

    /**
     * Add swipe gesture support for sidebar
     */
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let isSwipeActive = false;

        const handleTouchStart = (e) => {
            if (!this.isMobile) return;
            
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwipeActive = true;
        };

        const handleTouchMove = (e) => {
            if (!this.isMobile || !isSwipeActive) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;

            // If vertical scroll is more significant, don't handle as swipe
            if (Math.abs(diffY) > Math.abs(diffX)) {
                isSwipeActive = false;
                return;
            }

            // Swipe from left edge to open sidebar
            if (startX < 20 && diffX > 50 && !this.sidebarOpen) {
                e.preventDefault();
                this.openMobileSidebar();
                isSwipeActive = false;
            }

            // Swipe left to close sidebar
            if (this.sidebarOpen && diffX < -50) {
                e.preventDefault();
                this.closeMobileSidebar();
                isSwipeActive = false;
            }
        };

        const handleTouchEnd = () => {
            isSwipeActive = false;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        console.log('[Mobile Utils] Swipe gestures enabled');
    }

    /**
     * Initialize additional mobile features
     */
    initializeMobileFeatures() {
        this.setupViewport();
        this.setupSwipeGestures();
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });

        // Add mobile-specific CSS classes
        document.documentElement.classList.add('mobile-ready');
    }
}

// Create and export singleton instance
export const mobileUtils = new MobileUtils();

// Initialize mobile features when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mobileUtils.initializeMobileFeatures();
    });
} else {
    mobileUtils.initializeMobileFeatures();
}
