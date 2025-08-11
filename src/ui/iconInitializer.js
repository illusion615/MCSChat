/**
 * SVG Icon Initialization
 * Populates all elements with data-icon attributes with their respective icons
 * and updates CSS background images to use centralized SVG library
 */

import { SVGIcons, createSVGIcon, getSVGDataUri } from '../utils/svgIcons.js';

/**
 * Initialize all SVG icons when DOM is loaded
 */
function initializeSVGIcons() {
    // Find all elements with data-icon attribute
    const iconElements = document.querySelectorAll('[data-icon]');

    iconElements.forEach(element => {
        const iconName = element.getAttribute('data-icon');
        if (!iconName || !SVGIcons[iconName]) {
            console.warn(`Icon '${iconName}' not found for element:`, element);
            return;
        }

        // Special handling for message icons - use background image instead of inline SVG
        if (element.classList.contains('messageIcon') || element.classList.contains('unified-message-icon')) {
            const dataUri = getSVGDataUri(iconName);
            element.style.backgroundImage = dataUri;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
            element.style.backgroundRepeat = 'no-repeat';
            return;
        }

        // For other elements, insert SVG as content
        const iconElement = createSVGIcon(iconName, {
            width: element.dataset.width || (element.classList.contains('welcome-icon') ? '48' : '18'),
            height: element.dataset.height || (element.classList.contains('welcome-icon') ? '48' : '18')
        });

        if (iconElement) {
            element.innerHTML = '';
            element.appendChild(iconElement);
        }
    });

    // Update avatar backgrounds dynamically
    updateAvatarBackgrounds();

    // Update dropdown arrow
    const ollamaModelSelect = document.getElementById('ollamaModelSelect');
    if (ollamaModelSelect) {
        ollamaModelSelect.style.backgroundImage = getSVGDataUri('dropdown');
    }
}

/**
 * Update CSS avatar backgrounds to use centralized SVG icons
 */
function updateAvatarBackgrounds() {
    const avatarTypes = [
        'robot', 'assistant', 'smart', 'modern', 'professional', 'game', 'gaming'
    ];

    avatarTypes.forEach(type => {
        const iconName = `${type}Avatar`;
        if (SVGIcons[iconName]) {
            const dataUri = getSVGDataUri(iconName, 'white');

            // Create or update CSS rule for this avatar type
            updateCSSRule(`.avatar.${type}::before, .${type}-avatar::before`, {
                'background-image': dataUri
            });
        }
    });
}

/**
 * Update or create CSS rule
 * @param {string} selector - CSS selector
 * @param {Object} properties - CSS properties to set
 */
function updateCSSRule(selector, properties) {
    let styleSheet = document.getElementById('dynamic-svg-styles');

    if (!styleSheet) {
        styleSheet = document.createElement('style');
        styleSheet.id = 'dynamic-svg-styles';
        document.head.appendChild(styleSheet);
    }

    // Build CSS rule
    const rule = `${selector} { ${Object.entries(properties).map(([key, value]) => `${key}: ${value}`).join('; ')} }`;

    try {
        styleSheet.sheet.insertRule(rule, styleSheet.sheet.cssRules.length);
    } catch (e) {
        // Handle duplicate rules or invalid CSS
        console.warn('Could not insert CSS rule:', rule, e);
    }
}

/**
 * Update icon for specific element
 * @param {string} elementId - ID of the element
 * @param {string} iconName - Name of the icon to set
 * @param {Object} options - Options for icon customization
 */
export function updateElementIcon(elementId, iconName, options = {}) {
    const element = document.getElementById(elementId);
    if (!element || !SVGIcons[iconName]) {
        console.warn(`Cannot update icon: element '${elementId}' or icon '${iconName}' not found`);
        return;
    }

    const iconElement = createSVGIcon(iconName, options);
    if (iconElement) {
        element.innerHTML = '';
        element.appendChild(iconElement);
    }
}

/**
 * Set avatar background for specific element
 * @param {HTMLElement} element - Element to update
 * @param {string} avatarType - Type of avatar (robot, assistant, etc.)
 */
export function setAvatarBackground(element, avatarType) {
    const iconName = `${avatarType}Avatar`;
    if (SVGIcons[iconName]) {
        const dataUri = getSVGDataUri(iconName, 'white');
        element.style.backgroundImage = dataUri;
    }
}

/**
 * Initialize icons when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSVGIcons);
} else {
    initializeSVGIcons();
}

// Export for use in other modules
export { initializeSVGIcons, updateAvatarBackgrounds };
