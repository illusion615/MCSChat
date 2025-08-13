/**
 * SVG Icon Manager - Unified API
 * 
 * Single, consistent interface for all icon operations.
 * Provides both simple functions and advanced class-based usage.
 */

// === CORE ICON MANAGER ===
import { IconLibrary, iconLibrary } from './lib/IconLibrary.js';
import { IconDOMManager, iconDOMManager } from './lib/IconDOMManager.js';
import * as IconUtils from './lib/IconUtils.js';
import { IconThemes, ThemeManager, themeManager } from './themes/IconThemes.js';

// === ICON DATA ===
export {
    SVGIcons,
    CoreIcons,
    MediaIcons,
    NavigationIcons,
    UserIcons,
    AvatarIcons,
    ContentIcons,
    UIIcons,
    IconCategories,
    getIconCategory,
    getIconsByCategory,
    searchIcons
} from './icons/SVGIconCollection.js';

/**
 * Advanced IconManager class for complex usage
 */
export class IconManager {
    constructor(options = {}) {
        this.config = {
            theme: options.theme || 'default',
            size: options.size || 'medium',
            enableCaching: options.enableCaching !== false,
            enableAnimations: options.enableAnimations !== false,
            ...options
        };

        this.library = iconLibrary;
        this.domManager = iconDOMManager;
        this.themeManager = themeManager;
        
        this.initialize();
    }

    initialize() {
        if (this.config.theme && this.config.theme !== 'default') {
            this.setTheme(this.config.theme);
        }

        this.domManager.configure({
            enableCaching: this.config.enableCaching,
            enableAnimations: this.config.enableAnimations
        });

        this.ensureDefaultIcons();
    }

    create(name, options = {}) {
        const finalOptions = {
            size: options.size || this.config.size,
            color: options.color || options.fill,
            className: options.className || options.class,
            title: options.title || options.tooltip,
            ...options
        };

        if (finalOptions.color) {
            finalOptions.fill = finalOptions.color;
        }
        if (finalOptions.tooltip) {
            finalOptions.ariaLabel = finalOptions.tooltip;
        }

        return this.createIcon(name, finalOptions);
    }

    createIcon(name, options = {}) {
        try {
            const iconData = this.library.getIcon(name, options.variant);
            if (!iconData) {
                console.warn(`Icon '${name}' not found. Creating fallback icon.`);
                return this.createFallbackIcon(name, options);
            }

            const element = this.domManager.createElement(iconData, options);
            
            const theme = this.themeManager.getTheme();
            if (theme && this.config.enableAnimations) {
                this.themeManager.applyTheme(element, theme);
                this.themeManager.addStateListeners(element, theme);
            }

            return element;
        } catch (error) {
            console.error('Error creating icon:', error);
            return this.createFallbackIcon(name, options);
        }
    }

    replace(element, name, options = {}) {
        this.replaceIcon(element, name, options);
    }

    replaceIcon(element, name, options = {}) {
        if (!element) {
            console.warn('No element provided for icon replacement');
            return;
        }

        try {
            const iconData = this.library.getIcon(name, options.variant);
            if (!iconData) {
                console.warn(`Icon '${name}' not found for replacement`);
                return;
            }

            this.domManager.updateElement(element, iconData, options);
        } catch (error) {
            console.error('Error replacing icon:', error);
        }
    }

    createFallbackIcon(name, options = {}) {
        const fallbackSVG = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-label="Icon: ${name}">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">?</text>
                <title>Icon '${name}' not found</title>
            </svg>
        `;

        return this.domManager.createSVGElement(fallbackSVG, {
            ...options,
            className: `${options.className || ''} icon-fallback`.trim()
        });
    }

    setTheme(theme) {
        if (typeof theme === 'string') {
            this.themeManager.setTheme(theme);
        } else {
            this.themeManager.addCustomTheme(theme);
            this.themeManager.setTheme(theme.name);
        }
    }

    addIcon(name, svgContent, metadata = {}) {
        this.library.addIcon(name, svgContent, metadata);
    }

    hasIcon(name) {
        return this.library.hasIcon(name);
    }

    getIcons() {
        return this.library.getAvailableIcons();
    }

    ensureDefaultIcons() {
        const defaultIcons = {
            'close': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
            'check': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
            'arrow-left': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/></svg>`,
            'arrow-right': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 13h12.17l-5.59 5.59L12 20l8-8-8-8-1.42 1.41L16.17 11H4v2z"/></svg>`,
            'arrow-up': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 20h-2V8l-5.5 5.5-1.42-1.42L12 4.16l7.92 7.92-1.42 1.42L13 8v12z"/></svg>`,
            'arrow-down': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 4h2v12l5.5-5.5 1.42 1.42L12 19.84l-7.92-7.92L5.5 10.5 11 16V4z"/></svg>`,
            'menu': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
            'search': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
            'settings': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`,
            'home': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
            'heart': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5 C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z"/></svg>`,
            'star': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,17.27L18.18,21l-1.64-7.03L22,9.24l-7.19-0.61L12,2L9.19,8.63L2,9.24l5.46,4.73L5.82,21L12,17.27z"/></svg>`
        };

        Object.entries(defaultIcons).forEach(([name, svg]) => {
            if (!this.library.hasIcon(name)) {
                this.library.addIcon(name, svg, { 
                    category: 'default',
                    source: 'builtin'
                });
            }
        });
    }

    getThemes() {
        return this.themeManager.getAvailableThemes();
    }

    reset() {
        this.domManager.clearCache();
        this.themeManager.resetTheme();
    }

    getStats() {
        const libraryStats = this.library.getStats();
        return {
            totalIcons: libraryStats.totalIcons,
            cacheSize: this.domManager.getCacheStats().size,
            currentTheme: this.themeManager.getTheme().name
        };
    }
}

// === SINGLETON INSTANCE FOR SIMPLE USAGE ===
const defaultIconManager = new IconManager();

// === SIMPLE FUNCTION API (for backward compatibility and ease of use) ===

/**
 * Create an SVG icon element (simple API)
 * @param {string} iconName - Name of the icon
 * @param {Object} options - Icon options
 * @returns {HTMLElement} SVG icon element
 */
export function createSVGIcon(iconName, options = {}) {
    return defaultIconManager.create(iconName, options);
}

/**
 * Get SVG as data URI for CSS usage (simple API)
 * @param {string} iconName - Name of the icon
 * @param {string} fill - Fill color
 * @returns {string} Data URI string
 */
export function getSVGDataUri(iconName, fill = 'currentColor') {
    const iconData = defaultIconManager.library.getIcon(iconName);
    if (!iconData) {
        console.warn(`Icon '${iconName}' not found for data URI`);
        return '';
    }

    return IconUtils.svgToDataURL(iconData.svg, { fill });
}

/**
 * Get SVG path data (simple API)
 * @param {string} iconName - Name of the icon
 * @returns {string} Path data
 */
export function getSVGPath(iconName) {
    const iconData = defaultIconManager.library.getIcon(iconName);
    if (!iconData) {
        console.warn(`Icon '${iconName}' not found for path data`);
        return '';
    }

    return IconUtils.extractSVGPaths(iconData.svg)[0] || '';
}

/**
 * Replace an existing icon element (simple API)
 * @param {HTMLElement} element - Element to replace
 * @param {string} iconName - New icon name
 * @param {Object} options - Options
 */
export function replaceSVGIcon(element, iconName, options = {}) {
    return defaultIconManager.replace(element, iconName, options);
}

/**
 * Update SVG path content (simple API)
 * @param {HTMLElement} svgElement - SVG element
 * @param {string} iconName - Icon name
 */
export function updateSVGPath(svgElement, iconName) {
    if (!svgElement || svgElement.tagName !== 'svg') {
        console.warn('Element is not an SVG');
        return;
    }

    const pathData = getSVGPath(iconName);
    if (pathData) {
        const pathElement = svgElement.querySelector('path');
        if (pathElement) {
            pathElement.setAttribute('d', pathData);
        }
    }
}

/**
 * Check if icon exists (simple API)
 * @param {string} iconName - Icon name
 * @returns {boolean}
 */
export function hasIcon(iconName) {
    return defaultIconManager.hasIcon(iconName);
}

/**
 * Get available icons (simple API)
 * @returns {Array<string>}
 */
export function getAvailableIcons() {
    return defaultIconManager.getIcons();
}

/**
 * Get icon metadata (simple API)
 * @param {string} iconName - Icon name
 * @returns {Object}
 */
export function getIconMetadata(iconName) {
    const iconData = defaultIconManager.library.getIcon(iconName);
    return iconData ? iconData.metadata || {} : {};
}

/**
 * Clone an SVG icon (simple API)
 * @param {HTMLElement} iconElement - Icon element to clone
 * @returns {HTMLElement}
 */
export function cloneSVGIcon(iconElement) {
    return iconElement.cloneNode(true);
}

/**
 * Apply styles to icon (simple API)
 * @param {HTMLElement} iconElement - Icon element
 * @param {Object} styles - Styles to apply
 */
export function applySVGStyles(iconElement, styles) {
    return IconUtils.applyIconStyles(iconElement, styles);
}

/**
 * Create icon sprite (simple API)
 * @param {Array<string>} iconNames - Icon names to include
 * @returns {HTMLElement}
 */
export function createIconSprite(iconNames) {
    const iconData = iconNames.map(name => ({
        name,
        svg: defaultIconManager.library.getIcon(name)?.svg || ''
    })).filter(icon => icon.svg);

    return defaultIconManager.domManager.createIconSprite(iconData);
}

/**
 * Use sprite icon (simple API)
 * @param {string} iconName - Icon name
 * @param {Object} options - Options
 * @returns {HTMLElement}
 */
export function useSpriteIcon(iconName, options = {}) {
    return defaultIconManager.domManager.createIconReference(iconName, options);
}

// === ADVANCED EXPORTS ===
export {
    IconLibrary,
    IconDOMManager,
    IconUtils,
    IconThemes,
    ThemeManager
};

// === SINGLETON INSTANCE ===
export const Icons = defaultIconManager;

// === DEFAULT EXPORT ===
export default IconManager;
