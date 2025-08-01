/**
 * Unified Status Indicator System
 * Provides consistent status feedback across different chat scenarios
 */

import { DOMUtils } from './domUtils.js';

export class StatusIndicator {
    constructor() {
        this.activeIndicators = new Map();
        this.defaultConfig = {
            duration: 0, // 0 means manual dismiss
            position: 'relative', // 'relative', 'fixed', 'absolute'
            style: 'default', // 'default', 'minimal', 'prominent'
            showSpinner: true,
            showText: true,
            autoHide: false,
            className: ''
        };
    }

    /**
     * Show status indicator
     * @param {string} id - Unique identifier for this indicator
     * @param {HTMLElement} container - Container element to show indicator in
     * @param {string} message - Status message
     * @param {Object} options - Configuration options
     * @returns {HTMLElement} The indicator element
     */
    show(id, container, message, options = {}) {
        // Merge with default config
        const config = { ...this.defaultConfig, ...options };
        
        // Remove existing indicator with same ID
        this.hide(id);

        // Create indicator element
        const indicator = this.createIndicator(message, config);
        indicator.dataset.statusId = id;

        // Position and style the indicator
        this.applyStyles(indicator, config);

        // Add to container
        if (config.position === 'relative') {
            container.appendChild(indicator);
        } else {
            document.body.appendChild(indicator);
            this.positionFixed(indicator, container, config);
        }

        // Store reference
        this.activeIndicators.set(id, {
            element: indicator,
            container: container,
            config: config
        });

        // Auto-hide if configured
        if (config.autoHide && config.duration > 0) {
            setTimeout(() => this.hide(id), config.duration);
        }

        return indicator;
    }

    /**
     * Update status message
     * @param {string} id - Indicator ID
     * @param {string} message - New message
     */
    update(id, message) {
        const indicator = this.activeIndicators.get(id);
        if (indicator) {
            const textElement = indicator.element.querySelector('.status-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }

    /**
     * Hide status indicator
     * @param {string} id - Indicator ID
     */
    hide(id) {
        const indicator = this.activeIndicators.get(id);
        if (indicator) {
            indicator.element.remove();
            this.activeIndicators.delete(id);
        }
    }

    /**
     * Hide all active indicators
     */
    hideAll() {
        this.activeIndicators.forEach((indicator, id) => {
            this.hide(id);
        });
    }

    /**
     * Create indicator element
     * @param {string} message - Status message
     * @param {Object} config - Configuration
     * @returns {HTMLElement} Indicator element
     * @private
     */
    createIndicator(message, config) {
        const indicator = DOMUtils.createElement('div', {
            className: `status-indicator ${config.style} ${config.className}`.trim()
        });

        let content = '';

        if (config.showSpinner) {
            content += '<div class="status-spinner"></div>';
        }

        if (config.showText && message) {
            content += `<span class="status-text">${message}</span>`;
        }

        indicator.innerHTML = content;
        return indicator;
    }

    /**
     * Apply styles to indicator
     * @param {HTMLElement} indicator - Indicator element
     * @param {Object} config - Configuration
     * @private
     */
    applyStyles(indicator, config) {
        // Base styles
        const baseStyles = {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: '1000'
        };

        // Style-specific configurations
        const styleConfigs = {
            default: {
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                color: '#495057'
            },
            minimal: {
                background: 'transparent',
                color: '#6c757d',
                padding: '4px 8px',
                fontSize: '12px'
            },
            prominent: {
                background: '#007bff',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,123,255,0.25)',
                padding: '12px 16px'
            },
            success: {
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                color: '#155724'
            },
            warning: {
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                color: '#856404'
            },
            error: {
                background: '#f8d7da',
                border: '1px solid #f5c6cb',
                color: '#721c24'
            }
        };

        // Apply styles
        const styles = { ...baseStyles, ...styleConfigs[config.style] };
        Object.assign(indicator.style, styles);

        // Position styles
        if (config.position === 'fixed') {
            indicator.style.position = 'fixed';
        } else if (config.position === 'absolute') {
            indicator.style.position = 'absolute';
        }
    }

    /**
     * Position fixed indicators
     * @param {HTMLElement} indicator - Indicator element
     * @param {HTMLElement} container - Reference container
     * @param {Object} config - Configuration
     * @private
     */
    positionFixed(indicator, container, config) {
        if (config.position === 'fixed') {
            // Position relative to container
            const rect = container.getBoundingClientRect();
            indicator.style.top = `${rect.bottom + 8}px`;
            indicator.style.left = `${rect.left}px`;
        }
    }

    /**
     * Show quick action indicator (specialized for AI companion)
     * @param {HTMLElement} button - The clicked button
     * @param {string} action - Action name
     * @returns {string} Indicator ID
     */
    showQuickActionIndicator(button, action) {
        const actionMessages = {
            analyze: 'Analyzing conversation...',
            summarize: 'Summarizing chat...',
            translate: 'Translating...',
            explain: 'Generating explanation...'
        };

        const message = actionMessages[action] || 'Processing...';
        const id = `quick-action-${action}-${Date.now()}`;

        // Temporarily disable button
        button.disabled = true;
        button.style.opacity = '0.6';

        this.show(id, button.parentElement, message, {
            style: 'minimal',
            position: 'relative',
            showSpinner: true,
            className: 'quick-action-status'
        });

        return id;
    }

    /**
     * Hide quick action indicator and re-enable button
     * @param {string} id - Indicator ID
     * @param {HTMLElement} button - The associated button
     */
    hideQuickActionIndicator(id, button) {
        this.hide(id);
        if (button) {
            button.disabled = false;
            button.style.opacity = '';
        }
    }

    /**
     * Show typing indicator (specialized for chat scenarios)
     * @param {HTMLElement} container - Chat container
     * @param {string} scenario - 'agent' or 'companion'
     * @returns {string} Indicator ID
     */
    showTypingIndicator(container, scenario = 'agent') {
        const messages = {
            agent: 'Agent is typing...',
            companion: '' // No text for AI companion, just spinner
        };

        const id = `typing-${scenario}-${Date.now()}`;
        
        this.show(id, container, messages[scenario], {
            style: scenario === 'companion' ? 'minimal' : 'default',
            position: 'relative',
            showSpinner: true,
            className: `typing-indicator ${scenario}-typing`
        });

        return id;
    }
}

// Create global instance
export const statusIndicator = new StatusIndicator();
