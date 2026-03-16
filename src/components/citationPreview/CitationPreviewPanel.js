/**
 * Citation Preview Panel Component
 * Handles the display of external content (citations, references, links) in a side panel
 * Designed to be self-contained and easily relocatable within the application
 */

import { DOMUtils } from '../../utils/domUtils.js';

export class CitationPreviewPanel {
    constructor() {
        this.elements = {
            panel: null,
            frame: null,
            closeBtn: null,
            header: null
        };
        
        this.isVisible = false;
        this.currentUrl = null;
        
        this.init();
    }

    /**
     * Initialize the citation preview panel
     */
    init() {
        this.bindElements();
        this.attachEventListeners();
        console.log('[CitationPreview] Panel initialized');
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.elements = {
            panel: DOMUtils.getElementById('citationPreviewPanel'),
            frame: DOMUtils.getElementById('citationFrame'),
            closeBtn: DOMUtils.getElementById('closeCitationBtn'),
            header: document.querySelector('.citation-panel-header')
        };

        // Validate required elements
        if (!this.elements.panel || !this.elements.frame) {
            console.error('[CitationPreview] Required elements not found');
            return false;
        }

        return true;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (this.elements.closeBtn) {
            DOMUtils.addEventListener(this.elements.closeBtn, 'click', () => {
                this.close();
            });
        }

        // ESC key to close
        DOMUtils.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.close();
            }
        });

        // Frame load events
        if (this.elements.frame) {
            this.elements.frame.addEventListener('load', () => {
                this.onFrameLoad();
            });

            this.elements.frame.addEventListener('error', () => {
                this.onFrameError();
            });
        }
    }

    /**
     * Open citation preview with URL
     * @param {string} url - URL to display
     * @param {string} title - Optional title for the citation
     */
    open(url, title = 'Citation Preview') {
        if (!this.elements.panel || !this.elements.frame) {
            console.error('[CitationPreview] Panel not properly initialized');
            return false;
        }

        // Check for CSP-restricted domains
        if (this.isCSPRestrictedDomain(url)) {
            console.warn('[CitationPreview] URL likely has CSP restrictions, opening in external browser:', url);
            window.open(url, '_blank', 'noopener,noreferrer');
            return false;
        }

        try {
            // Update title if provided
            if (title && this.elements.header) {
                const titleElement = this.elements.header.querySelector('h3');
                if (titleElement) {
                    titleElement.textContent = title;
                }
            }

            // Load URL in frame
            this.elements.frame.src = url;
            this.currentUrl = url;

            // Show panel
            DOMUtils.show(this.elements.panel);
            this.isVisible = true;

            console.log('[CitationPreview] Opened:', url);
            return true;
        } catch (error) {
            console.error('[CitationPreview] Error opening URL:', error);
            // Fallback to external browser
            window.open(url, '_blank', 'noopener,noreferrer');
            return false;
        }
    }

    /**
     * Close citation preview panel
     */
    close() {
        if (!this.elements.panel) return;

        DOMUtils.hide(this.elements.panel);
        this.isVisible = false;

        // Clear frame content
        if (this.elements.frame) {
            this.elements.frame.src = '';
        }

        // Reset title
        if (this.elements.header) {
            const titleElement = this.elements.header.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = 'Citation Preview';
            }
        }

        this.currentUrl = null;
        console.log('[CitationPreview] Closed');
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.close();
        } else if (this.currentUrl) {
            this.open(this.currentUrl);
        }
    }

    /**
     * Check if URL is likely to have CSP restrictions
     * @param {string} url - URL to check
     * @returns {boolean} - True if likely restricted
     */
    isCSPRestrictedDomain(url) {
        const restrictedDomains = [
            'github.com',
            'stackoverflow.com',
            'google.com',
            'microsoft.com',
            'azure.com',
            'office.com'
        ];

        try {
            const urlObj = new URL(url);
            return restrictedDomains.some(domain => 
                urlObj.hostname.includes(domain)
            );
        } catch (error) {
            console.warn('[CitationPreview] Invalid URL:', url);
            return true;
        }
    }

    /**
     * Handle frame load success
     */
    onFrameLoad() {
        console.log('[CitationPreview] Content loaded successfully');
        // Could add loading indicator removal here
    }

    /**
     * Handle frame load error
     */
    onFrameError() {
        console.warn('[CitationPreview] Failed to load content:', this.currentUrl);
        
        // Fallback to external browser
        if (this.currentUrl) {
            window.open(this.currentUrl, '_blank', 'noopener,noreferrer');
            this.close();
        }
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isVisible: this.isVisible,
            currentUrl: this.currentUrl,
            hasValidElements: !!this.elements.panel && !!this.elements.frame
        };
    }

    /**
     * Destroy the component (cleanup)
     */
    destroy() {
        this.close();
        
        // Remove event listeners would go here if needed
        // Currently using DOMUtils.addEventListener which handles cleanup
        
        this.elements = {};
        console.log('[CitationPreview] Component destroyed');
    }
}

// Export for use in main application
export default CitationPreviewPanel;
