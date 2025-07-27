/**
 * DOM utility functions for element selection and manipulation
 */

export const DOMUtils = {
    /**
     * Get element by ID with error handling
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null if not found
     */
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * Get elements by selector with error handling
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element (optional)
     * @returns {NodeList} Elements matching selector
     */
    querySelectorAll(selector, parent = document) {
        return parent.querySelectorAll(selector);
    },

    /**
     * Get single element by selector with error handling
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element (optional)
     * @returns {HTMLElement|null} First element matching selector
     */
    querySelector(selector, parent = document) {
        return parent.querySelector(selector);
    },

    /**
     * Create element with attributes and content
     * @param {string} tagName - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|HTMLElement|HTMLElement[]} content - Element content
     * @returns {HTMLElement} Created element
     */
    createElement(tagName, attributes = {}, content = '') {
        const element = document.createElement(tagName);

        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        // Set content
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (item instanceof HTMLElement) {
                    element.appendChild(item);
                }
            });
        }

        return element;
    },

    /**
     * Add event listener with error handling
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('Cannot add event listener: element is null');
            return;
        }
        element.addEventListener(event, handler, options);
    },

    /**
     * Show element with optional animation
     * @param {HTMLElement} element - Element to show
     * @param {string} displayType - CSS display value
     */
    show(element, displayType = 'block') {
        if (element) {
            element.style.display = displayType;
        }
    },

    /**
     * Hide element
     * @param {HTMLElement} element - Element to hide
     */
    hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    },

    /**
     * Toggle element visibility
     * @param {HTMLElement} element - Element to toggle
     * @param {string} displayType - CSS display value when showing
     */
    toggle(element, displayType = 'block') {
        if (element) {
            const isHidden = element.style.display === 'none' ||
                getComputedStyle(element).display === 'none';
            element.style.display = isHidden ? displayType : 'none';
        }
    },

    /**
     * Add CSS classes
     * @param {HTMLElement} element - Target element
     * @param {...string} classes - Classes to add
     */
    addClass(element, ...classes) {
        if (element) {
            element.classList.add(...classes);
        }
    },

    /**
     * Remove CSS classes
     * @param {HTMLElement} element - Target element
     * @param {...string} classes - Classes to remove
     */
    removeClass(element, ...classes) {
        if (element) {
            element.classList.remove(...classes);
        }
    },

    /**
     * Toggle CSS class
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class to toggle
     * @returns {boolean} True if class was added, false if removed
     */
    toggleClass(element, className) {
        if (element) {
            return element.classList.toggle(className);
        }
        return false;
    }
};
