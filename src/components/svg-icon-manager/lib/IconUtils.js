/**
 * IconUtils.js
 * 
 * Utility functions for icon manipulation, optimization, and helper operations.
 * Provides a comprehensive set of tools for working with SVG icons.
 */

/**
 * Generate a unique ID for icon caching
 * @param {string} name - Icon name
 * @param {string} variant - Icon variant
 * @param {string} size - Icon size
 * @param {Object} options - Additional options
 * @returns {string} Unique identifier
 */
export function generateIconId(name, variant = 'default', size = 'medium', options = {}) {
    const parts = [
        name,
        variant,
        size,
        options.theme || 'default',
        options.fill || 'current',
        options.stroke || 'none'
    ];
    
    return parts.join('-').replace(/[^a-zA-Z0-9-]/g, '');
}

/**
 * Extract SVG paths from SVG string
 * @param {string} svgString - SVG markup
 * @returns {Array<string>} Array of path data strings
 */
export function extractSVGPaths(svgString) {
    const paths = [];
    const pathRegex = /<path[^>]*\sd=['"]([^'"]*)['"]/g;
    let match;
    
    while ((match = pathRegex.exec(svgString)) !== null) {
        paths.push(match[1]);
    }
    
    return paths;
}

/**
 * Apply styles to icon elements
 * @param {HTMLElement} element - Icon element
 * @param {Object} styles - Style object
 */
export function applyIconStyles(element, styles) {
    if (!element || typeof styles !== 'object') {
        return;
    }

    Object.entries(styles).forEach(([property, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
            element.style[property] = value;
        }
    });
}

/**
 * Create an SVG sprite from multiple icons
 * @param {Array<Object>} icons - Array of icon objects
 * @returns {string} SVG sprite markup
 */
export function createIconSprite(icons) {
    const symbols = icons.map(icon => {
        const viewBoxMatch = icon.svg.match(/viewBox=['"]([^'"]+)['"]/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';
        
        // Extract content between svg tags
        const contentMatch = icon.svg.match(/<svg[^>]*>(.*)<\/svg>/s);
        const content = contentMatch ? contentMatch[1] : '';
        
        return `<symbol id="icon-${icon.name}" viewBox="${viewBox}">${content}</symbol>`;
    }).join('');

    return `<svg style="display: none;" aria-hidden="true">${symbols}</svg>`;
}

/**
 * Parse SVG viewBox attribute
 * @param {string} viewBox - ViewBox string
 * @returns {Object} Parsed viewBox object
 */
export function parseViewBox(viewBox) {
    if (!viewBox || typeof viewBox !== 'string') {
        return { x: 0, y: 0, width: 24, height: 24 };
    }

    const values = viewBox.split(/\s+/).map(Number);
    
    if (values.length !== 4 || values.some(isNaN)) {
        return { x: 0, y: 0, width: 24, height: 24 };
    }

    return {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3]
    };
}

/**
 * Calculate icon aspect ratio
 * @param {string} svgString - SVG markup
 * @returns {number} Aspect ratio (width/height)
 */
export function calculateAspectRatio(svgString) {
    const viewBoxMatch = svgString.match(/viewBox=['"]([^'"]+)['"]/);
    
    if (viewBoxMatch) {
        const viewBox = parseViewBox(viewBoxMatch[1]);
        return viewBox.width / viewBox.height;
    }

    // Fallback: try to get width/height attributes
    const widthMatch = svgString.match(/width=['"](\d+)['"]/);
    const heightMatch = svgString.match(/height=['"](\d+)['"]/);
    
    if (widthMatch && heightMatch) {
        return parseInt(widthMatch[1]) / parseInt(heightMatch[1]);
    }

    return 1; // Default square aspect ratio
}

/**
 * Normalize SVG markup for consistent processing
 * @param {string} svgString - Original SVG markup
 * @returns {string} Normalized SVG markup
 */
export function normalizeSVG(svgString) {
    let normalized = svgString;

    // Ensure proper SVG tag
    if (!normalized.includes('<svg')) {
        normalized = `<svg viewBox="0 0 24 24" fill="currentColor">${normalized}</svg>`;
    }

    // Add default fill if missing
    if (!normalized.includes('fill=') && !normalized.includes('stroke=')) {
        normalized = normalized.replace('<svg', '<svg fill="currentColor"');
    }

    // Ensure viewBox exists
    if (!normalized.includes('viewBox=')) {
        normalized = normalized.replace('<svg', '<svg viewBox="0 0 24 24"');
    }

    // Clean up whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Convert SVG to data URL
 * @param {string} svgString - SVG markup
 * @param {Object} options - Conversion options
 * @returns {string} Data URL
 */
export function svgToDataURL(svgString, options = {}) {
    const { 
        fill = 'currentColor',
        stroke = 'none',
        minify = true 
    } = options;

    let processed = svgString;

    // Apply color overrides
    if (fill !== 'currentColor') {
        processed = processed.replace(/fill=['"]currentColor['"]/g, `fill="${fill}"`);
    }
    
    if (stroke !== 'none') {
        processed = processed.replace(/stroke=['"]currentColor['"]/g, `stroke="${stroke}"`);
    }

    // Minify if requested
    if (minify) {
        processed = processed
            .replace(/\s+/g, ' ')
            .replace(/> </g, '><')
            .trim();
    }

    // Encode for data URL
    const encoded = encodeURIComponent(processed);
    return `data:image/svg+xml,${encoded}`;
}

/**
 * Extract colors from SVG
 * @param {string} svgString - SVG markup
 * @returns {Object} Color information
 */
export function extractSVGColors(svgString) {
    const colors = {
        fills: new Set(),
        strokes: new Set()
    };

    // Extract fill colors
    const fillMatches = svgString.match(/fill=['"]([^'"]+)['"]/g) || [];
    fillMatches.forEach(match => {
        const color = match.match(/fill=['"]([^'"]+)['"]/)[1];
        if (color !== 'none' && color !== 'currentColor') {
            colors.fills.add(color);
        }
    });

    // Extract stroke colors
    const strokeMatches = svgString.match(/stroke=['"]([^'"]+)['"]/g) || [];
    strokeMatches.forEach(match => {
        const color = match.match(/stroke=['"]([^'"]+)['"]/)[1];
        if (color !== 'none' && color !== 'currentColor') {
            colors.strokes.add(color);
        }
    });

    return {
        fills: Array.from(colors.fills),
        strokes: Array.from(colors.strokes),
        useCurrentColor: svgString.includes('currentColor')
    };
}

/**
 * Validate SVG markup
 * @param {string} svgString - SVG markup to validate
 * @returns {Object} Validation result
 */
export function validateSVG(svgString) {
    const issues = [];
    const warnings = [];

    // Basic structure validation
    if (!svgString || typeof svgString !== 'string') {
        issues.push('Invalid SVG: not a string');
        return { valid: false, issues, warnings };
    }

    if (!svgString.includes('<svg')) {
        issues.push('Invalid SVG: missing <svg> tag');
    }

    if (!svgString.includes('</svg>')) {
        issues.push('Invalid SVG: missing closing </svg> tag');
    }

    // Check for viewBox
    if (!svgString.includes('viewBox=')) {
        warnings.push('Missing viewBox attribute - may cause scaling issues');
    }

    // Check for accessibility
    if (!svgString.includes('aria-') && !svgString.includes('<title>')) {
        warnings.push('Missing accessibility attributes (aria-label or title)');
    }

    // Check for common issues
    if (svgString.includes('<?xml')) {
        warnings.push('Contains XML declaration - may not be needed for inline SVG');
    }

    if (svgString.includes('xmlns:')) {
        warnings.push('Contains namespace declarations - may not be needed for inline SVG');
    }

    return {
        valid: issues.length === 0,
        issues,
        warnings
    };
}

/**
 * Optimize SVG for web usage
 * @param {string} svgString - Original SVG
 * @param {Object} options - Optimization options
 * @returns {string} Optimized SVG
 */
export function optimizeSVGForWeb(svgString, options = {}) {
    const {
        removeComments = true,
        removeMetadata = true,
        removeEmptyAttrs = true,
        removeUnusedNS = true,
        minifyStyles = true,
        removeTitle = false,
        removeDesc = true
    } = options;

    let optimized = svgString;

    // Remove comments
    if (removeComments) {
        optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
    }

    // Remove metadata elements
    if (removeMetadata) {
        optimized = optimized.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    }

    // Remove description elements
    if (removeDesc) {
        optimized = optimized.replace(/<desc[\s\S]*?<\/desc>/gi, '');
    }

    // Remove title elements (careful with accessibility)
    if (removeTitle) {
        optimized = optimized.replace(/<title[\s\S]*?<\/title>/gi, '');
    }

    // Remove empty attributes
    if (removeEmptyAttrs) {
        optimized = optimized.replace(/\s+[a-zA-Z-]+=""\s*/g, ' ');
    }

    // Remove unused namespaces
    if (removeUnusedNS) {
        optimized = optimized.replace(/\s+xmlns:[^=]+="[^"]*"/g, '');
    }

    // Minify styles
    if (minifyStyles) {
        optimized = optimized.replace(/style="([^"]*)"/g, (match, styles) => {
            const minified = styles
                .replace(/\s+/g, ' ')
                .replace(/;\s*/g, ';')
                .replace(/:\s*/g, ':')
                .trim();
            return `style="${minified}"`;
        });
    }

    // Clean up whitespace
    optimized = optimized
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

    return optimized;
}

/**
 * Create icon variants (hover, active, disabled)
 * @param {string} svgString - Base SVG
 * @param {Object} variantOptions - Variant configurations
 * @returns {Object} Icon variants
 */
export function createIconVariants(svgString, variantOptions = {}) {
    const variants = { default: svgString };

    const defaultOptions = {
        hover: { opacity: 0.8, transform: 'scale(1.1)' },
        active: { opacity: 0.6, transform: 'scale(0.95)' },
        disabled: { opacity: 0.4, filter: 'grayscale(100%)' }
    };

    const options = { ...defaultOptions, ...variantOptions };

    Object.entries(options).forEach(([variant, styles]) => {
        if (variant === 'default') return;

        let variantSVG = svgString;
        
        // Apply styles by adding a style attribute to the root SVG
        const styleString = Object.entries(styles)
            .map(([prop, value]) => `${prop}:${value}`)
            .join(';');

        variantSVG = variantSVG.replace(
            '<svg',
            `<svg style="${styleString}"`
        );

        variants[variant] = variantSVG;
    });

    return variants;
}

/**
 * Convert icon to different formats
 * @param {string} svgString - SVG markup
 * @param {string} format - Target format ('dataurl', 'base64', 'blob')
 * @param {Object} options - Conversion options
 * @returns {Promise<string|Blob>} Converted icon
 */
export async function convertIconFormat(svgString, format, options = {}) {
    const { width = 24, height = 24, type = 'image/svg+xml' } = options;

    switch (format.toLowerCase()) {
        case 'dataurl':
            return svgToDataURL(svgString, options);

        case 'base64':
            const dataURL = svgToDataURL(svgString, options);
            return dataURL.split(',')[1];

        case 'blob':
            return new Blob([svgString], { type });

        case 'canvas':
            return svgToCanvas(svgString, width, height);

        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

/**
 * Convert SVG to Canvas (for raster export)
 * @param {string} svgString - SVG markup
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Promise<HTMLCanvasElement>} Canvas element
 */
export function svgToCanvas(svgString, width = 24, height = 24) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = width;
        canvas.height = height;

        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas);
        };

        img.onerror = reject;
        img.src = svgToDataURL(svgString);
    });
}

/**
 * Migrate legacy icons to new system
 * @param {HTMLElement} container - Container element to search
 * @param {Object} iconManager - Icon manager instance
 * @returns {Array<Object>} Migration results
 */
export function migrateLegacyIcons(container, iconManager) {
    const results = [];
    const legacyIcons = container.querySelectorAll('svg:not(.svg-icon)');

    legacyIcons.forEach((element, index) => {
        try {
            // Try to identify the icon
            const iconName = identifyLegacyIcon(element);
            
            if (iconName && iconManager) {
                // Replace with managed icon
                const newIcon = iconManager.createIcon(iconName, {
                    size: inferIconSize(element),
                    className: element.className.baseVal || element.className
                });

                element.parentNode.replaceChild(newIcon, element);
                
                results.push({
                    index,
                    iconName,
                    status: 'migrated',
                    element: newIcon
                });
            } else {
                results.push({
                    index,
                    iconName: null,
                    status: 'unidentified',
                    element
                });
            }
        } catch (error) {
            results.push({
                index,
                iconName: null,
                status: 'error',
                error: error.message,
                element
            });
        }
    });

    return results;
}

/**
 * Identify legacy icon by analyzing its content
 * @param {HTMLElement} element - SVG element
 * @returns {string|null} Icon name if identified
 */
function identifyLegacyIcon(element) {
    const pathData = element.querySelector('path')?.getAttribute('d');
    
    if (!pathData) return null;

    // Simple pattern matching for common icons
    const patterns = {
        'send': /M4\s+12l1\.41\s+1\.41L11\s+7\.83V20h2V7\.83/,
        'delete': /M9,3V4H4V6H5V19A2,2\s+0\s+0,0\s+7,21H17/,
        'user': /M8\s+7a4\s+4\s+0\s+1\s+0\s+8\s+0a4\s+4\s+0\s+0\s+0-8\s+0M6\s+21v-2a4\s+4\s+0\s+0\s+1\s+4-4h4/
    };

    for (const [iconName, pattern] of Object.entries(patterns)) {
        if (pattern.test(pathData)) {
            return iconName;
        }
    }

    return null;
}

/**
 * Infer icon size from element dimensions
 * @param {HTMLElement} element - SVG element
 * @returns {string} Size name
 */
function inferIconSize(element) {
    const width = parseInt(element.getAttribute('width')) || 20;
    
    if (width <= 12) return 'xs';
    if (width <= 16) return 'small';
    if (width <= 24) return 'medium';
    if (width <= 32) return 'large';
    if (width <= 48) return 'xl';
    return 'xxl';
}

/**
 * Debug icon information
 * @param {string} svgString - SVG markup
 * @returns {Object} Debug information
 */
export function debugIcon(svgString) {
    return {
        size: svgString.length,
        hasViewBox: svgString.includes('viewBox='),
        pathCount: (svgString.match(/<path/g) || []).length,
        colors: extractSVGColors(svgString),
        aspectRatio: calculateAspectRatio(svgString),
        validation: validateSVG(svgString),
        complexity: estimateComplexity(svgString)
    };
}

/**
 * Estimate SVG complexity for performance optimization
 * @param {string} svgString - SVG markup
 * @returns {Object} Complexity metrics
 */
function estimateComplexity(svgString) {
    const pathCount = (svgString.match(/<path/g) || []).length;
    const circleCount = (svgString.match(/<circle/g) || []).length;
    const rectCount = (svgString.match(/<rect/g) || []).length;
    const polygonCount = (svgString.match(/<polygon/g) || []).length;
    
    const totalElements = pathCount + circleCount + rectCount + polygonCount;
    const hasGradients = svgString.includes('<linearGradient') || svgString.includes('<radialGradient');
    const hasFilters = svgString.includes('<filter');
    const hasAnimations = svgString.includes('<animate') || svgString.includes('<animateTransform');

    let score = totalElements;
    if (hasGradients) score += 5;
    if (hasFilters) score += 10;
    if (hasAnimations) score += 15;

    return {
        elements: totalElements,
        paths: pathCount,
        shapes: circleCount + rectCount + polygonCount,
        hasGradients,
        hasFilters,
        hasAnimations,
        score,
        level: score < 5 ? 'simple' : score < 15 ? 'moderate' : 'complex'
    };
}