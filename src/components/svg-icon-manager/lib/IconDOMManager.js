/**
 * IconDOMManager.js
 * 
 * Handles DOM manipulation, element creation, and SVG optimization
 * for the icon management system. Provides efficient DOM operations
 * with caching and performance optimizations.
 */

/**
 * IconDOMManager class handles all DOM-related operations for icons
 * including creation, modification, optimization, and animation
 */
export class IconDOMManager {
    constructor() {
        this.elementCache = new Map();
        this.observedElements = new WeakSet();
        this.animationQueue = [];
        this.isProcessingAnimations = false;
        
        // Performance optimization settings
        this.config = {
            enableCaching: true,
            optimizeSVG: true,
            enableAnimations: true,
            batchSize: 10
        };
    }

    /**
     * Create a DOM element from icon data
     * @param {Object} iconData - Icon data from IconLibrary
     * @param {Object} options - Creation options
     * @returns {HTMLElement} Created SVG element
     */
    createElement(iconData, options = {}) {
        if (!iconData || !iconData.svg) {
            console.warn('Invalid icon data provided to createElement');
            return this.createErrorIcon(options);
        }

        const cacheKey = this.generateCacheKey(iconData, options);
        
        // Return cached element if available and caching is enabled
        if (this.config.enableCaching && this.elementCache.has(cacheKey)) {
            return this.cloneElement(this.elementCache.get(cacheKey));
        }

        // Create new element
        const element = this.createSVGElement(iconData.svg, options);
        
        // Cache the element
        if (this.config.enableCaching) {
            this.elementCache.set(cacheKey, element.cloneNode(true));
        }

        return element;
    }

    /**
     * Create SVG element from SVG string
     * @param {string} svgString - SVG markup
     * @param {Object} options - Creation options
     * @returns {HTMLElement} SVG element
     */
    createSVGElement(svgString, options = {}) {
        // Optimize SVG if enabled
        const optimizedSVG = this.config.optimizeSVG 
            ? this.optimizeSVG(svgString) 
            : svgString;

        // Create container and parse SVG
        const container = document.createElement('div');
        container.innerHTML = optimizedSVG;
        const svgElement = container.firstElementChild;

        if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
            console.warn('Invalid SVG markup provided');
            return this.createErrorIcon(options);
        }

        // Apply options
        this.applyElementOptions(svgElement, options);

        return svgElement;
    }

    /**
     * Apply options to SVG element
     * @param {HTMLElement} element - SVG element
     * @param {Object} options - Options to apply
     */
    applyElementOptions(element, options) {
        const {
            size,
            width,
            height,
            className,
            fill,
            stroke,
            ariaLabel,
            title,
            id,
            style,
            dataset
        } = options;

        // Apply size (predefined or custom)
        if (size) {
            const dimensions = this.getSizeDimensions(size);
            if (dimensions) {
                element.setAttribute('width', dimensions.width);
                element.setAttribute('height', dimensions.height);
            }
        } else {
            if (width) element.setAttribute('width', width);
            if (height) element.setAttribute('height', height);
        }

        // Apply CSS class
        if (className) {
            element.classList.add(...className.split(' '));
        }

        // Apply colors
        if (fill) {
            element.setAttribute('fill', fill);
            // Also apply to paths if needed
            const paths = element.querySelectorAll('path, circle, rect, polygon');
            paths.forEach(path => {
                if (path.getAttribute('fill') === 'currentColor') {
                    path.setAttribute('fill', fill);
                }
            });
        }

        if (stroke) {
            element.setAttribute('stroke', stroke);
        }

        // Apply accessibility attributes
        if (ariaLabel) {
            element.setAttribute('aria-label', ariaLabel);
            element.setAttribute('role', 'img');
        }

        if (title) {
            const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            titleElement.textContent = title;
            element.insertBefore(titleElement, element.firstChild);
        }

        // Apply other attributes
        if (id) element.setAttribute('id', id);
        
        if (style) {
            Object.assign(element.style, style);
        }

        if (dataset) {
            Object.entries(dataset).forEach(([key, value]) => {
                element.dataset[key] = value;
            });
        }

        // Add default icon class
        element.classList.add('svg-icon');
    }

    /**
     * Update an existing DOM element
     * @param {HTMLElement} element - Element to update
     * @param {Object} iconData - New icon data
     * @param {Object} options - Update options
     */
    updateElement(element, iconData, options = {}) {
        if (!element || !iconData) {
            console.warn('Invalid parameters provided to updateElement');
            return;
        }

        const { animate = false, duration = 300 } = options;

        if (animate && this.config.enableAnimations) {
            this.animateElementChange(element, iconData, options, duration);
        } else {
            this.replaceElementContent(element, iconData, options);
        }
    }

    /**
     * Replace element content without animation
     * @param {HTMLElement} element - Target element
     * @param {Object} iconData - New icon data
     * @param {Object} options - Options
     */
    replaceElementContent(element, iconData, options) {
        const newElement = this.createElement(iconData, options);
        
        // Preserve existing attributes that aren't being overridden
        Array.from(element.attributes).forEach(attr => {
            if (!newElement.hasAttribute(attr.name) && 
                !['width', 'height', 'viewBox', 'fill', 'stroke'].includes(attr.name)) {
                newElement.setAttribute(attr.name, attr.value);
            }
        });

        // Replace content
        element.innerHTML = newElement.innerHTML;
        
        // Update attributes
        Array.from(newElement.attributes).forEach(attr => {
            element.setAttribute(attr.name, attr.value);
        });
    }

    /**
     * Animate element change
     * @param {HTMLElement} element - Target element
     * @param {Object} iconData - New icon data
     * @param {Object} options - Animation options
     * @param {number} duration - Animation duration
     */
    animateElementChange(element, iconData, options, duration) {
        const animation = {
            element,
            iconData,
            options,
            duration,
            startTime: null
        };

        this.animationQueue.push(animation);
        
        if (!this.isProcessingAnimations) {
            this.processAnimationQueue();
        }
    }

    /**
     * Process animation queue
     */
    processAnimationQueue() {
        if (this.animationQueue.length === 0) {
            this.isProcessingAnimations = false;
            return;
        }

        this.isProcessingAnimations = true;
        const batch = this.animationQueue.splice(0, this.config.batchSize);

        batch.forEach(animation => {
            this.executeAnimation(animation);
        });

        // Process next batch
        requestAnimationFrame(() => this.processAnimationQueue());
    }

    /**
     * Execute single animation
     * @param {Object} animation - Animation configuration
     */
    executeAnimation(animation) {
        const { element, iconData, options, duration } = animation;

        // Fade out
        element.style.transition = `opacity ${duration / 2}ms ease`;
        element.style.opacity = '0';

        setTimeout(() => {
            // Replace content
            this.replaceElementContent(element, iconData, options);
            
            // Fade in
            element.style.opacity = '1';
            
            // Clean up transition
            setTimeout(() => {
                element.style.transition = '';
            }, duration / 2);
        }, duration / 2);
    }

    /**
     * Optimize SVG string for performance
     * @param {string} svgString - Original SVG string
     * @returns {string} Optimized SVG string
     */
    optimizeSVG(svgString) {
        let optimized = svgString;

        // Remove comments
        optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');

        // Remove unnecessary whitespace
        optimized = optimized.replace(/\s+/g, ' ').trim();

        // Remove empty attributes
        optimized = optimized.replace(/\s*[a-zA-Z-]+=""\s*/g, ' ');

        // Optimize path data (basic optimization)
        optimized = optimized.replace(/d="([^"]*)"/, (match, path) => {
            const optimizedPath = path
                .replace(/\s+/g, ' ')
                .replace(/,\s*/g, ',')
                .replace(/\s*([LMHVZlmhvz])\s*/g, '$1')
                .trim();
            return `d="${optimizedPath}"`;
        });

        // Remove default values
        optimized = optimized.replace(/\s*fill="none"\s*/, ' ');
        optimized = optimized.replace(/\s*stroke="none"\s*/, ' ');

        return optimized;
    }

    /**
     * Get size dimensions for predefined sizes
     * @param {string} size - Size name
     * @returns {Object|null} Dimensions object
     */
    getSizeDimensions(size) {
        const sizes = {
            'xs': { width: '12', height: '12' },
            'small': { width: '16', height: '16' },
            'medium': { width: '20', height: '20' },
            'large': { width: '24', height: '24' },
            'xl': { width: '32', height: '32' },
            'xxl': { width: '48', height: '48' }
        };

        return sizes[size] || null;
    }

    /**
     * Clone an element efficiently
     * @param {HTMLElement} element - Element to clone
     * @returns {HTMLElement} Cloned element
     */
    cloneElement(element) {
        return element.cloneNode(true);
    }

    /**
     * Generate cache key for element
     * @param {Object} iconData - Icon data
     * @param {Object} options - Options
     * @returns {string} Cache key
     */
    generateCacheKey(iconData, options) {
        const keyParts = [
            iconData.name,
            iconData.variant || 'default',
            options.size || 'default',
            options.fill || 'default',
            options.stroke || 'default',
            options.className || 'default'
        ];

        return keyParts.join('::');
    }

    /**
     * Create error icon for fallback
     * @param {Object} options - Options
     * @returns {HTMLElement} Error icon element
     */
    createErrorIcon(options = {}) {
        const errorSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="icon-error">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            <title>Icon not found</title>
        </svg>`;

        return this.createSVGElement(errorSVG, {
            ...options,
            className: `${options.className || ''} icon-error`.trim()
        });
    }

    /**
     * Create icon sprite for multiple icons
     * @param {Array<Object>} iconDataArray - Array of icon data
     * @returns {HTMLElement} SVG sprite element
     */
    createIconSprite(iconDataArray) {
        const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        sprite.setAttribute('style', 'display: none;');
        sprite.setAttribute('aria-hidden', 'true');

        iconDataArray.forEach(iconData => {
            if (!iconData.svg) return;

            const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
            symbol.setAttribute('id', `icon-${iconData.name}`);
            
            // Extract viewBox from original SVG
            const viewBoxMatch = iconData.svg.match(/viewBox=['"]([^'"]+)['"]/);
            if (viewBoxMatch) {
                symbol.setAttribute('viewBox', viewBoxMatch[1]);
            }

            // Extract and add content
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = iconData.svg;
            const tempSVG = tempContainer.firstElementChild;
            
            if (tempSVG) {
                Array.from(tempSVG.children).forEach(child => {
                    symbol.appendChild(child.cloneNode(true));
                });
            }

            sprite.appendChild(symbol);
        });

        return sprite;
    }

    /**
     * Create icon reference for sprite usage
     * @param {string} iconName - Icon name
     * @param {Object} options - Options
     * @returns {HTMLElement} SVG use element
     */
    createIconReference(iconName, options = {}) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        
        use.setAttribute('href', `#icon-${iconName}`);
        svg.appendChild(use);

        this.applyElementOptions(svg, options);
        
        return svg;
    }

    /**
     * Clear element cache
     * @param {string} pattern - Pattern to match cache keys (optional)
     */
    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.elementCache.keys()) {
                if (key.includes(pattern)) {
                    this.elementCache.delete(key);
                }
            }
        } else {
            this.elementCache.clear();
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.elementCache.size,
            keys: Array.from(this.elementCache.keys()),
            memoryUsage: this.estimateCacheMemory()
        };
    }

    /**
     * Estimate cache memory usage
     * @returns {number} Estimated memory in bytes
     */
    estimateCacheMemory() {
        let totalSize = 0;
        
        for (const element of this.elementCache.values()) {
            // Rough estimation based on outerHTML length
            totalSize += element.outerHTML.length * 2; // 2 bytes per character (UTF-16)
        }

        return totalSize;
    }

    /**
     * Configure DOM manager settings
     * @param {Object} newConfig - Configuration options
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Clear cache if caching was disabled
        if (!newConfig.enableCaching) {
            this.clearCache();
        }
    }

    /**
     * Dispose of resources and cleanup
     */
    dispose() {
        this.clearCache();
        this.animationQueue.length = 0;
        this.isProcessingAnimations = false;
        this.observedElements = new WeakSet();
    }
}

// Export singleton instance
export const iconDOMManager = new IconDOMManager();