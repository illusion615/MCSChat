/**
 * Adaptive Card Modal Component
 * A reusable modal component for displaying and interacting with Microsoft Adaptive Cards
 * 
 * @author MCSChat Team
 * @version 1.0.0
 */

import { DOMUtils } from '../utils/domUtils.js';

class AdaptiveCardModal {
    constructor(options = {}) {
        this.options = {
            modalId: options.modalId || 'adaptiveCardModal',
            title: options.title || 'Interactive Card',
            maxWidth: options.maxWidth || '700px',
            onAction: options.onAction || null,
            onClose: options.onClose || null,
            directLineManager: options.directLineManager || null,
            autoClose: options.autoClose !== false, // Default to true
            autoCloseDelay: options.autoCloseDelay || 2000,
            ...options
        };

        this.modal = null;
        this.isOpen = false;
        this.currentCard = null;
    }

    /**
     * Initialize the modal component
     */
    init() {
        if (!this.modal) {
            this.modal = this.createModal();
            document.body.appendChild(this.modal);
        }
        return this;
    }

    /**
     * Create the modal DOM structure
     * @returns {HTMLElement} Modal element
     * @private
     */
    createModal() {
        const modal = DOMUtils.createElement('div', {
            id: this.options.modalId,
            className: 'modal adaptive-card-modal'
        });

        const modalContent = DOMUtils.createElement('div', {
            className: 'modal-content adaptive-card-modal-content'
        });

        const modalHeader = DOMUtils.createElement('div', {
            className: 'modal-header'
        });

        const modalTitle = DOMUtils.createElement('h2', {
            textContent: this.options.title
        });

        const closeButton = DOMUtils.createElement('button', {
            className: 'modal-close',
            innerHTML: '&times;',
            ariaLabel: 'Close modal'
        });

        const modalBody = DOMUtils.createElement('div', {
            className: 'modal-body adaptive-card-modal-body'
        });

        const modalFooter = DOMUtils.createElement('div', {
            className: 'modal-footer adaptive-card-modal-footer'
        });

        const responseStatus = DOMUtils.createElement('div', {
            className: 'adaptive-card-response-status',
            style: 'display: none;'
        });

        // Assemble modal structure
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        modalFooter.appendChild(responseStatus);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);

        // Set custom max-width if specified
        if (this.options.maxWidth) {
            modalContent.style.maxWidth = this.options.maxWidth;
        }

        // Add event handlers
        this.setupEventHandlers(modal, closeButton);

        return modal;
    }

    /**
     * Setup event handlers for the modal
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} closeButton - Close button element
     * @private
     */
    setupEventHandlers(modal, closeButton) {
        // Close button click
        closeButton.addEventListener('click', () => {
            this.close();
        });

        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Open the modal with an adaptive card
     * @param {Object} cardContent - Adaptive card JSON content
     * @param {Object} options - Additional options
     * @returns {Promise<void>}
     */
    async open(cardContent, options = {}) {
        try {
            if (!this.modal) {
                this.init();
            }

            // Update title if provided
            if (options.title) {
                const titleElement = this.modal.querySelector('.modal-header h2');
                if (titleElement) {
                    titleElement.textContent = options.title;
                }
            }

            // Clear previous content
            const modalBody = this.modal.querySelector('.adaptive-card-modal-body');
            modalBody.innerHTML = '';

            // Hide response status
            const responseStatus = this.modal.querySelector('.adaptive-card-response-status');
            responseStatus.style.display = 'none';

            // Create and render the adaptive card
            const adaptiveCard = new AdaptiveCards.AdaptiveCard();
            
            // Set host config for better styling
            adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
                "spacing": {
                    "small": 4,
                    "default": 8,
                    "medium": 16,
                    "large": 24,
                    "extraLarge": 32,
                    "padding": 16
                },
                "separator": {
                    "lineThickness": 1,
                    "lineColor": "#EEEEEE"
                },
                "fontFamily": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                "containerStyles": {
                    "default": {
                        "backgroundColor": "#FFFFFF",
                        "foregroundColors": {
                            "default": {
                                "default": "#323130",
                                "subtle": "#605E5C"
                            }
                        }
                    }
                }
            });

            // Parse and render the card
            adaptiveCard.parse(cardContent);
            const renderedCard = adaptiveCard.render();

            if (renderedCard) {
                // Set up action handling
                adaptiveCard.onExecuteAction = (action) => {
                    this.handleAction(action, options);
                };

                // Style the rendered card
                renderedCard.style.maxWidth = '100%';
                renderedCard.style.borderRadius = '8px';
                renderedCard.style.overflow = 'hidden';

                modalBody.appendChild(renderedCard);
                this.currentCard = adaptiveCard;
                
                // Show modal
                DOMUtils.show(this.modal, 'flex');
                DOMUtils.addClass(this.modal, 'show');
                this.isOpen = true;
                
                console.log('Adaptive card modal opened');
            } else {
                throw new Error('Failed to render adaptive card');
            }

        } catch (error) {
            console.error('Error opening adaptive card modal:', error);
            throw error;
        }
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal && this.isOpen) {
            DOMUtils.hide(this.modal);
            DOMUtils.removeClass(this.modal, 'show');
            this.isOpen = false;
            this.currentCard = null;

            // Call onClose callback if provided
            if (typeof this.options.onClose === 'function') {
                this.options.onClose();
            }

            console.log('Adaptive card modal closed');
        }
    }

    /**
     * Handle adaptive card actions
     * @param {Object} action - Adaptive card action
     * @param {Object} options - Additional options
     * @private
     */
    async handleAction(action, options = {}) {
        console.log('Adaptive Card action executed:', action);

        const responseStatus = this.modal.querySelector('.adaptive-card-response-status');
        
        try {
            // Call custom action handler if provided
            if (typeof this.options.onAction === 'function') {
                const result = await this.options.onAction(action, this);
                if (result === false) {
                    // Custom handler handled the action, don't proceed
                    return;
                }
            }

            if (action instanceof AdaptiveCards.SubmitAction) {
                // Immediately close modal when user clicks submit
                this.close();
                
                // Show loading state briefly if modal is still visible
                this.showResponseStatus('Sending response...', 'loading');

                // Prepare activity to send back to bot
                const responseData = action.data || {};
                
                try {
                    // Send response to bot via DirectLine
                    await this.sendResponse(responseData);
                    console.log('Adaptive card response sent successfully');
                } catch (sendError) {
                    console.error('Error sending adaptive card response:', sendError);
                    // Note: We don't show error in modal since it's already closed
                }

            } else if (action instanceof AdaptiveCards.OpenUrlAction) {
                // Handle URL actions
                if (action.url) {
                    // Check if side browser is enabled and available
                    const useSideBrowser = localStorage.getItem('enableSideBrowser') === 'true';
                    
                    if (useSideBrowser && window.MCSChatApp && typeof window.MCSChatApp.openCitationPreview === 'function') {
                        window.MCSChatApp.openCitationPreview(action.url);
                    } else {
                        window.open(action.url, '_blank', 'noopener,noreferrer');
                    }
                }
            } else {
                console.log('Unhandled action type:', action.getJsonTypeName());
            }

        } catch (error) {
            console.error('Error handling adaptive card action:', error);
            this.showResponseStatus('Failed to send response', 'error');
        }
    }

    /**
     * Send adaptive card response to bot
     * @param {Object} responseData - Response data
     * @private
     */
    async sendResponse(responseData) {
        // Try to get DirectLine manager from options, global app, or fallback
        const directLineManager = this.options.directLineManager || 
                                window.MCSChatApp?.directLineManager ||
                                window.directLineManager;

        if (directLineManager && typeof directLineManager.sendActivity === 'function') {
            const activity = {
                type: 'message',
                from: { id: 'user' },
                value: responseData,
                text: JSON.stringify(responseData)
            };

            await directLineManager.sendActivity(activity);
            console.log('Adaptive card response sent:', responseData);
        } else {
            console.warn('DirectLine manager not available - response not sent');
            throw new Error('Unable to send response - DirectLine not available');
        }
    }

    /**
     * Show response status message
     * @param {string} message - Status message
     * @param {string} type - Status type: 'loading', 'success', 'error'
     */
    showResponseStatus(message, type = 'loading') {
        const responseStatus = this.modal.querySelector('.adaptive-card-response-status');
        if (responseStatus) {
            responseStatus.textContent = message;
            responseStatus.className = `adaptive-card-response-status ${type}`;
            responseStatus.style.display = 'block';
        }
    }

    /**
     * Hide response status message
     */
    hideResponseStatus() {
        const responseStatus = this.modal.querySelector('.adaptive-card-response-status');
        if (responseStatus) {
            responseStatus.style.display = 'none';
        }
    }

    /**
     * Check if the modal is currently open
     * @returns {boolean}
     */
    isModalOpen() {
        return this.isOpen;
    }

    /**
     * Destroy the modal and clean up resources
     */
    destroy() {
        if (this.modal) {
            this.close();
            this.modal.remove();
            this.modal = null;
        }
        this.currentCard = null;
        this.isOpen = false;
    }

    /**
     * Update modal options
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        
        // Update title if changed
        if (newOptions.title && this.modal) {
            const titleElement = this.modal.querySelector('.modal-header h2');
            if (titleElement) {
                titleElement.textContent = newOptions.title;
            }
        }
    }
}

// Create a global instance for common use
const globalAdaptiveCardModal = new AdaptiveCardModal();

// Export both the class and global instance
export { AdaptiveCardModal, globalAdaptiveCardModal };
export default AdaptiveCardModal;
