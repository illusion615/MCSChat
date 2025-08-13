/**
 * SVG Icon Utilities
 * Helper functions for working with SVG icons from the collection
 * Provides backward compatibility and enhanced functionality
 */

import { SVGIcons, getIconCategory, getIconsByCategory, searchIcons } from './SVGIconCollection.js';

/**
 * Create an SVG element from icon definition
 * @param {string} iconName - Name of the icon from SVGIcons
 * @param {Object} options - Options for customization
 * @param {string} options.className - CSS class to add
 * @param {string} options.width - Width attribute
 * @param {string} options.height - Height attribute
 * @param {string} options.fill - Fill color
 * @param {string} options.size - Size preset (xs, small, medium, large, xl, xxl)
 * @returns {HTMLElement} SVG element or null if icon not found
 */
export function createSVGIcon(iconName, options = {}) {
    const iconSVG = SVGIcons[iconName];
    if (!iconSVG) {
        console.warn(`SVG icon '${iconName}' not found`);
        return createFallbackIcon(iconName, options);
    }

    const container = document.createElement('div');
    container.innerHTML = iconSVG;
    const svgElement = container.firstElementChild;

    if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
        console.warn(`Invalid SVG markup for icon '${iconName}'`);
        return createFallbackIcon(iconName, options);
    }

    // Apply size presets
    if (options.size) {
        const dimensions = getSizeDimensions(options.size);
        if (dimensions) {
            svgElement.setAttribute('width', dimensions.width);
            svgElement.setAttribute('height', dimensions.height);
        }
    }

    // Apply custom options
    if (options.className) {
        svgElement.classList.add(options.className);
    }
    if (options.width) {
        svgElement.setAttribute('width', options.width);
    }
    if (options.height) {
        svgElement.setAttribute('height', options.height);
    }
    if (options.fill) {
        svgElement.setAttribute('fill', options.fill);
    }

    // Add accessibility attributes
    if (!svgElement.getAttribute('role')) {
        svgElement.setAttribute('role', 'img');
    }
    if (!svgElement.getAttribute('aria-label') && !svgElement.querySelector('title')) {
        svgElement.setAttribute('aria-label', `${iconName} icon`);
    }

    return svgElement;
}

/**
 * Create a fallback icon when the requested icon is not found
 * @param {string} iconName - Name of the missing icon
 * @param {Object} options - Icon options
 * @returns {HTMLElement} Fallback SVG element
 */
function createFallbackIcon(iconName, options = {}) {
    const size = options.size || 'medium';
    const dimensions = getSizeDimensions(size);
    const width = options.width || dimensions.width;
    const height = options.height || dimensions.height;
    
    const fallbackSVG = `
        <svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Missing icon: ${iconName}">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">?</text>
            <title>Icon '${iconName}' not found</title>
        </svg>
    `;

    const container = document.createElement('div');
    container.innerHTML = fallbackSVG;
    const svgElement = container.firstElementChild;
    
    if (options.className) {
        svgElement.classList.add(options.className, 'icon-fallback');
    } else {
        svgElement.classList.add('icon-fallback');
    }

    return svgElement;
}

/**
 * Get dimensions for size presets
 * @param {string} size - Size preset name
 * @returns {Object|null} Width and height dimensions
 */
function getSizeDimensions(size) {
    const sizes = {
        'xs': { width: '12', height: '12' },
        'small': { width: '16', height: '16' },
        'medium': { width: '20', height: '20' },
        'large': { width: '24', height: '24' },
        'xl': { width: '32', height: '32' },
        'xxl': { width: '48', height: '48' }
    };

    return sizes[size] || sizes['medium'];
}

/**
 * Get SVG as data URI for CSS background-image usage
 * @param {string} iconName - Name of the icon from SVGIcons
 * @param {string} fill - Fill color (default: 'currentColor')
 * @returns {string} Data URI string or empty string if icon not found
 */
export function getSVGDataUri(iconName, fill = 'currentColor') {
    const iconSVG = SVGIcons[iconName];
    if (!iconSVG) {
        console.warn(`SVG icon '${iconName}' not found`);
        return '';
    }

    // Replace fill attribute if needed
    let svgWithFill = iconSVG;
    if (fill !== 'currentColor') {
        svgWithFill = iconSVG.replace(
            /fill=['"]currentColor['"]|fill=['"]white['"]|fill=['"]black['"]/g, 
            `fill='${fill}'`
        );
    }

    // Encode for data URI
    const encoded = encodeURIComponent(svgWithFill);
    return `url("data:image/svg+xml,${encoded}")`;
}

/**
 * Get just the path data for inline SVG usage
 * @param {string} iconName - Name of the icon from SVGIcons  
 * @returns {string} Path data only or empty string if not found
 */
export function getSVGPath(iconName) {
    const iconSVG = SVGIcons[iconName];
    if (!iconSVG) {
        console.warn(`SVG icon '${iconName}' not found`);
        return '';
    }

    // For simple path-only icons like arrows that are just path strings
    if (iconName === 'arrowLeft' || iconName === 'arrowRight') {
        return iconSVG;
    }

    // Extract path data from SVG
    const pathMatch = iconSVG.match(/<path[^>]*\sd=['"]([^'"]*)['"]/);
    return pathMatch ? pathMatch[1] : '';
}

/**
 * Replace SVG element with new icon
 * @param {HTMLElement} element - SVG element to replace
 * @param {string} iconName - Name of the new icon
 * @param {Object} options - Options for customization
 * @returns {HTMLElement|null} New icon element or null if replacement failed
 */
export function replaceSVGIcon(element, iconName, options = {}) {
    if (!element || element.tagName.toLowerCase() !== 'svg') {
        console.warn('Element is not an SVG');
        return null;
    }

    const newIcon = createSVGIcon(iconName, options);
    if (newIcon && element.parentNode) {
        // Copy attributes from old element that aren't already set
        Array.from(element.attributes).forEach(attr => {
            if (!newIcon.hasAttribute(attr.name)) {
                newIcon.setAttribute(attr.name, attr.value);
            }
        });

        element.parentNode.replaceChild(newIcon, element);
        return newIcon;
    }

    return null;
}

/**
 * Update SVG path content (for simple path-based icons)
 * @param {HTMLElement} svgElement - SVG element containing path
 * @param {string} iconName - Name of the icon to update to
 * @returns {boolean} True if update was successful
 */
export function updateSVGPath(svgElement, iconName) {
    if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
        console.warn('Element is not an SVG');
        return false;
    }

    const pathData = getSVGPath(iconName);
    if (pathData) {
        const pathElement = svgElement.querySelector('path');
        if (pathElement) {
            pathElement.setAttribute('d', pathData);
            return true;
        }
    }

    return false;
}

/**
 * Clone an SVG icon element
 * @param {HTMLElement} svgElement - SVG element to clone
 * @returns {HTMLElement|null} Cloned element or null if invalid
 */
export function cloneSVGIcon(svgElement) {
    if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
        console.warn('Element is not an SVG');
        return null;
    }

    return svgElement.cloneNode(true);
}

/**
 * Apply styles to SVG icon element
 * @param {HTMLElement} svgElement - SVG element
 * @param {Object} styles - Style object with CSS properties
 */
export function applySVGStyles(svgElement, styles) {
    if (!svgElement || typeof styles !== 'object') {
        return;
    }

    Object.entries(styles).forEach(([property, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
            svgElement.style[property] = value;
        }
    });
}

/**
 * Validate if an icon exists in the collection
 * @param {string} iconName - Name of the icon to check
 * @returns {boolean} True if icon exists
 */
export function hasIcon(iconName) {
    return iconName in SVGIcons;
}

/**
 * Get all available icon names
 * @returns {Array<string>} Array of all icon names
 */
export function getAvailableIcons() {
    return Object.keys(SVGIcons).sort();
}

/**
 * Get icon metadata including category
 * @param {string} iconName - Name of the icon
 * @returns {Object|null} Icon metadata or null if not found
 */
export function getIconMetadata(iconName) {
    if (!hasIcon(iconName)) {
        return null;
    }

    const category = getIconCategory(iconName);
    const svgString = SVGIcons[iconName];
    
    // Extract basic metadata from SVG string
    const viewBoxMatch = svgString.match(/viewBox=['"]([^'"]+)['"]/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
    
    const widthMatch = svgString.match(/width=['"]([^'"]+)['"]/);
    const heightMatch = svgString.match(/height=['"]([^'"]+)['"]/);
    
    return {
        name: iconName,
        category: category,
        viewBox: viewBox,
        defaultWidth: widthMatch ? widthMatch[1] : '20',
        defaultHeight: heightMatch ? heightMatch[1] : '20',
        svg: svgString
    };
}

/**
 * Create an icon sprite from multiple icons for performance optimization
 * @param {Array<string>} iconNames - Array of icon names to include in sprite
 * @param {string} spriteId - ID for the sprite SVG element
 * @returns {HTMLElement} SVG sprite element
 */
export function createIconSprite(iconNames, spriteId = 'icon-sprite') {
    const symbols = iconNames
        .filter(name => hasIcon(name))
        .map(name => {
            const iconSVG = SVGIcons[name];
            const viewBoxMatch = iconSVG.match(/viewBox=['"]([^'"]+)['"]/);
            const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
            
            // Extract content between svg tags
            const contentMatch = iconSVG.match(/<svg[^>]*>(.*)<\/svg>/s);
            const content = contentMatch ? contentMatch[1] : '';
            
            return `<symbol id="icon-${name}" viewBox="${viewBox}">${content}</symbol>`;
        })
        .join('');

    const spriteContainer = document.createElement('div');
    spriteContainer.innerHTML = `<svg id="${spriteId}" style="display: none;" aria-hidden="true">${symbols}</svg>`;
    
    return spriteContainer.firstElementChild;
}

/**
 * Use an icon from a sprite
 * @param {string} iconName - Name of the icon
 * @param {Object} options - Icon options
 * @param {string} spriteId - ID of the sprite containing the icon
 * @returns {HTMLElement} SVG use element
 */
export function useSpriteIcon(iconName, options = {}, spriteId = 'icon-sprite') {
    const size = options.size || 'medium';
    const dimensions = getSizeDimensions(size);
    const width = options.width || dimensions.width;
    const height = options.height || dimensions.height;
    
    const svgElement = document.createElement('svg');
    svgElement.setAttribute('width', width);
    svgElement.setAttribute('height', height);
    svgElement.setAttribute('role', 'img');
    svgElement.setAttribute('aria-label', `${iconName} icon`);
    
    if (options.className) {
        svgElement.classList.add(options.className);
    }
    
    const useElement = document.createElement('use');
    useElement.setAttribute('href', `#icon-${iconName}`);
    svgElement.appendChild(useElement);
    
    return svgElement;
}

// Re-export collection functions for convenience
export { getIconCategory, getIconsByCategory, searchIcons };

// Re-export the icon collection for direct access
export { SVGIcons };
