/**
 * Enhanced Typing Indicator — real-state driven
 * Status text is set externally by application.js based on actual DirectLine events.
 */

import { DOMUtils } from '../utils/domUtils.js';

export class EnhancedTypingIndicator {
    constructor() {
        this.element = null;
        this.statusArea = null;
    }

    /**
     * Create the indicator element (dots + status text, no container chrome).
     * @param {Object} context - Unused, kept for API compat
     * @returns {HTMLElement}
     */
    createIndicator(context = {}) {
        const dotStyle = localStorage.getItem('thinkingDotStyle') || 'bounce';
        const container = DOMUtils.createElement('div', {
            className: `enhanced-typing-indicator dot-style-${dotStyle}`
        });

        // Dots
        const dotsContainer = DOMUtils.createElement('div', {
            className: 'typing-dots-container'
        });
        for (let i = 0; i < 3; i++) {
            dotsContainer.appendChild(DOMUtils.createElement('span', { className: 'typing-dot' }));
        }

        // Status text
        this.statusArea = DOMUtils.createElement('span', {
            className: 'typing-status-area'
        });
        this.statusArea.textContent = 'Sending...';

        container.appendChild(dotsContainer);
        container.appendChild(this.statusArea);

        this.element = container;
        return container;
    }

    /**
     * Update the status text from external caller.
     * @param {string} text
     */
    setStatus(text) {
        if (this.statusArea) {
            this.statusArea.textContent = text;
        }
    }

    /**
     * Hide and clean up.
     */
    hide() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.statusArea = null;
    }
}
