/**
 * Simple Global SVG Icon Manager
 * One-stop solution: Icon.create(name, style)
 * 
 * Usage:
 * - Icon.create('help', { size: '24px', color: '#e0e0e0' })
 * - Icon.sideCommand('settings') 
 * - Icon.welcome('welcomeDocument')
 */

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
 * Simple Global Icon Manager
 * Handles all icon creation with one simple method
 */
class GlobalIconManager {
    constructor() {
        this.icons = new Map();
        this.isLoaded = false;
        this.loadingPromise = null;
        // Load fallback icons immediately for critical icons
        this.loadFallbackIcons();
        // Then load the full collection asynchronously
        this.loadingPromise = this.loadIcons();
    }

    /**
     * Wait for the full icon collection to be loaded
     * @returns {Promise} Promise that resolves when icons are fully loaded
     */
    async waitForLoad() {
        if (this.loadingPromise) {
            await this.loadingPromise;
        }
        return this.isLoaded;
    }

    /**
     * Load icons from collection
     */
    async loadIcons() {
        try {
            console.log('[Icon Manager] Loading full SVGIconCollection...');
            const { SVGIcons } = await import('./icons/SVGIconCollection.js');
            // Merge with existing fallback icons (full collection takes precedence)
            this.icons = new Map([...this.icons, ...Object.entries(SVGIcons)]);
            this.isLoaded = true;
            console.log(`[Icon Manager] Loaded ${this.icons.size} icons from SVGIconCollection`);
            
            // Log the aiCompanion icon to verify it's loaded correctly
            const aiCompanionIcon = this.icons.get('aiCompanion');
            if (aiCompanionIcon) {
                console.log('[Icon Manager] aiCompanion icon loaded:', aiCompanionIcon.substring(0, 100) + '...');
            }
        } catch (error) {
            console.error('[Icon Manager] Failed to load full icon collection:', error);
            console.log('[Icon Manager] Using fallback icons only');
            this.isLoaded = true;
        }
    }

    /**
     * Create an icon with desired styling - ONE-STOP METHOD
     * @param {string} name - Icon name (e.g., 'help', 'settings', 'home')
     * @param {Object} style - Style object { size, color, className, ...otherCSS }
     * @returns {HTMLElement} Ready-to-use SVG element
     */
    create(name, style = {}) {
        const iconSvg = this.icons.get(name);
        if (!iconSvg) {
            console.warn(`[Icon Manager] Icon '${name}' not found`);
            return this.fallback(name, style);
        }

        // Parse SVG
        const temp = document.createElement('div');
        temp.innerHTML = iconSvg;
        const svg = temp.firstElementChild;

        if (!svg || svg.tagName.toLowerCase() !== 'svg') {
            console.warn(`[Icon Manager] Invalid SVG for icon '${name}'`);
            return this.fallback(name, style);
        }

        // Apply all styles in one go
        this.style(svg, style);

        return svg;
    }

    /**
     * Apply styles to SVG element
     * @param {SVGElement} svg - SVG element
     * @param {Object} style - Style configuration
     */
    style(svg, style) {
        const {
            size = '18px',
            color = 'currentColor', 
            width = size,
            height = size,
            className,
            ...cssProps
        } = style;

        // Core attributes
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('fill', color);

        // Remove any existing inline styles
        svg.removeAttribute('style');

        // CSS class
        if (className) {
            svg.setAttribute('class', className);
        }

        // Any other CSS properties
        Object.entries(cssProps).forEach(([key, value]) => {
            svg.style[key] = value;
        });
    }

    /**
     * Create fallback icon when icon not found
     * @param {string} name - Icon name
     * @param {Object} style - Style configuration
     * @returns {SVGElement} Fallback SVG element
     */
    fallback(name, style) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.innerHTML = `
            <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" font-size="8" fill="currentColor">?</text>
            <title>Icon '${name}' not found</title>
        `;
        
        this.style(svg, { ...style, className: `${style.className || ''} icon-fallback`.trim() });
        return svg;
    }

    /**
     * Load basic fallback icons immediately for essential functionality
     */
    loadFallbackIcons() {
        const fallbackIcons = {
            'help': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.8,10.5 9.85,9.55 9.85,8.35C9.85,7.15 10.8,6.2 12,6.2C13.2,6.2 14.15,7.15 14.15,8.35C14.15,9.55 13.2,10.5 12,10.5Z"/></svg>`,
            'settings': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>`,
            'knowledgeHub': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/></svg>`,
            'welcomeDocument': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>`,
            'aiCompanion': `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M12 5.5a1 1 0 1 0 0 2a1 1 0 0 0 0-2Zm-5 1a1 1 0 1 1 2 0a1 1 0 0 1-2 0Zm3.5-4a.5.5 0 0 0-1 0V3h-3A1.5 1.5 0 0 0 5 4.5v4A1.5 1.5 0 0 0 6.5 10h6.294l.326-1H6.5a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v3.583a1.423 1.423 0 0 1 1 .016V4.5A1.5 1.5 0 0 0 13.5 3h-3v-.5Z"/></svg>`,
            'dropdown': `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='#666' d='M2 4l4 4 4-4z'/></svg>`,
            'newChat': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.75 7.75C12.75 7.33579 12.4142 7 12 7C11.5858 7 11.25 7.33579 11.25 7.75V11.25H7.75C7.33579 11.25 7 11.5858 7 12C7 12.4142 7.33579 12.75 7.75 12.75H11.25V16.25C11.25 16.6642 11.5858 17 12 17C12.4142 17 12.75 16.6642 12.75 16.25V12.75H16.25C16.6642 12.75 17 12.4142 17 12C17 11.5858 16.6642 11.25 16.25 11.25H12.75V7.75Z" /></svg>`,
            'delete': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" /></svg>`,
            'attach': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.7722 3.74407C14.1136 1.40049 17.9126 1.40049 20.2558 3.74363C22.5388 6.0267 22.5974 9.69191 20.4314 12.0458L20.2432 12.2432L11.4432 21.0414L11.4066 21.0717C9.94541 22.3884 7.69141 22.3437 6.28404 20.9363C4.96502 19.6173 4.8429 17.5546 5.91769 16.0979C5.94103 16.0525 5.96928 16.0088 6.00249 15.9677L6.05605 15.908L6.14295 15.8203L6.28404 15.6724L6.28695 15.6753L13.7227 8.22096C13.9886 7.95434 14.4052 7.92958 14.6991 8.14704L14.7834 8.21955C15.05 8.48546 15.0747 8.90209 14.8573 9.19599L14.7848 9.28021L7.19015 16.8933C6.47251 17.7689 6.52239 19.0632 7.33979 19.8806C8.16885 20.7096 9.4885 20.7491 10.3643 19.999L19.197 11.1685C20.9525 9.41089 20.9525 6.56165 19.1951 4.80429C17.4927 3.10185 14.7655 3.04865 12.999 4.64469L12.8312 4.80429L12.8186 4.8186L3.28228 14.3549C2.98939 14.6478 2.51452 14.6478 2.22162 14.3549C1.95536 14.0887 1.93115 13.672 2.149 13.3784L2.22162 13.2943L11.7705 3.74363L11.7722 3.74407Z" /></svg>`,
            'microphone': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.25 11C18.6297 11 18.9435 11.2822 18.9932 11.6482L19 11.75V12.25C19 15.8094 16.245 18.7254 12.751 18.9817L12.75 21.25C12.75 21.6642 12.4142 22 12 22C11.6203 22 11.3065 21.7178 11.2568 21.3518L11.25 21.25L11.25 18.9818C7.83323 18.7316 5.12283 15.938 5.00406 12.4863L5 12.25V11.75C5 11.3358 5.33579 11 5.75 11C6.1297 11 6.44349 11.2822 6.49315 11.6482L6.5 11.75V12.25C6.5 15.077 8.73445 17.3821 11.5336 17.4956L11.75 17.5H12.25C15.077 17.5 17.3821 15.2656 17.4956 12.4664L17.5 12.25V11.75C17.5 11.3358 17.8358 11 18.25 11ZM12 2C14.2091 2 16 3.79086 16 6V12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12V6C8 3.79086 9.79086 2 12 2ZM12 3.5C10.6193 3.5 9.5 4.61929 9.5 6V12C9.5 13.3807 10.6193 14.5 12 14.5C13.3807 14.5 14.5 13.3807 14.5 12V6C14.5 4.61929 13.3807 3.5 12 3.5Z" /></svg>`,
            'send': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8z" /></svg>`,
            'expandPanel': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.8075 9.24902C14.5304 8.94121 14.0562 8.91625 13.7483 9.19328L11.2483 11.4428C11.0902 11.585 11 11.7875 11 12.0001C11 12.2127 11.0902 12.4152 11.2483 12.5574L13.7483 14.8069C14.0562 15.084 14.5304 15.059 14.8075 14.7512C15.0846 14.4434 15.0596 13.9693 14.7517 13.6922L13.7045 12.7499H17.25C17.6642 12.7499 18 12.4142 18 12.0001C18 11.586 17.6642 11.2503 17.25 11.2503H13.7045L14.7517 10.308C15.0596 10.0309 15.0846 9.55683 14.8075 9.24902Z" /></svg>`,
            'document': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>`,
            'eye': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" /></svg>`,
            'arrowRight': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 13h12.17l-5.59 5.59L12 20l8-8-8-8-1.42 1.41L16.17 11H4v2z"/></svg>`,
            'kpi': `<svg viewBox="0 0 32 32" fill="currentColor"><path d="M7.667 27.503L2 22.448l1.331-1.492l5.641 5.031l7.69-7.445a1.928 1.928 0 0 1 2.674-.008l3.624 3.464l5.58-5.973L30 17.39l-5.581 5.975a1.996 1.996 0 0 1-2.838.08l-3.577-3.419l-7.666 7.42a1.963 1.963 0 0 1-2.671.056zM30 11h-4l2-3l2 3zm-8-7h-4v2h4v2h-3v2h3v2h-4v2h4a2.003 2.003 0 0 0 2-2V6a2.002 2.002 0 0 0-2-2zm-6 10h-6v-4a2.002 2.002 0 0 1 2-2h2V6h-4V4h4a2.002 2.002 0 0 1 2 2v2a2.002 2.002 0 0 1-2 2h-2v2h4zM6 12V4H4v1H2v2h2v5H2v2h6v-2H6z" /></svg>`
        };
        
        this.icons = new Map(Object.entries(fallbackIcons));
        console.log(`[Icon Manager] Loaded ${this.icons.size} fallback icons`);
    }

    // === PRESET METHODS FOR COMMON CONTEXTS ===

    /**
     * Create side command bar icon (24px, light color)
     * @param {string} name - Icon name
     * @returns {SVGElement} Styled icon for side command bar
     */
    sideCommand(name) {
        return this.create(name, { 
            size: '24px', 
            color: '#e0e0e0',
            className: 'side-command-icon'
        });
    }

    /**
     * Create welcome screen icon (48px, Microsoft blue)
     * @param {string} name - Icon name
     * @returns {SVGElement} Styled icon for welcome screen
     */
    welcome(name) {
        return this.create(name, { 
            size: '48px', 
            color: '#0078d4',
            className: 'welcome-icon-svg'
        });
    }

    /**
     * Create mobile action icon (20px, neutral color)
     * @param {string} name - Icon name
     * @returns {SVGElement} Styled icon for mobile actions
     */
    mobile(name) {
        return this.create(name, { 
            size: '20px', 
            color: '#605e5c',
            className: 'mobile-action-icon'
        });
    }

    /**
     * Create UI button icon (18px, neutral color)
     * @param {string} name - Icon name
     * @returns {SVGElement} Styled icon for UI buttons
     */
    button(name) {
        return this.create(name, { 
            size: '18px', 
            color: '#605e5c',
            className: 'ui-icon'
        });
    }

    /**
     * Create large icon (32px)
     * @param {string} name - Icon name
     * @param {string} color - Icon color
     * @returns {SVGElement} Large styled icon
     */
    large(name, color = 'currentColor') {
        return this.create(name, { 
            size: '32px', 
            color,
            className: 'large-icon'
        });
    }

    /**
     * Create small icon (12px)
     * @param {string} name - Icon name
     * @param {string} color - Icon color
     * @returns {SVGElement} Small styled icon
     */
    small(name, color = 'currentColor') {
        return this.create(name, { 
            size: '12px', 
            color,
            className: 'small-icon'
        });
    }

    // === UTILITY METHODS ===

    /**
     * Get icon as data URI for CSS background-image
     * @param {string} name - Icon name
     * @param {string} color - Icon color
     * @returns {string} Data URI string
     */
    dataUri(name, color = 'currentColor') {
        const iconSvg = this.icons.get(name);
        if (!iconSvg) {
            console.warn(`[Icon Manager] Icon '${name}' not found for data URI`);
            return '';
        }

        // Replace fill color in SVG
        const coloredSvg = iconSvg.replace(/fill="[^"]*"/g, `fill="${color}"`);
        const encoded = encodeURIComponent(coloredSvg);
        return `url("data:image/svg+xml,${encoded}")`;
    }

    /**
     * Check if icon exists
     * @param {string} name - Icon name
     * @returns {boolean} True if icon exists
     */
    has(name) {
        return this.icons.has(name);
    }

    /**
     * Get all available icon names
     * @returns {Array<string>} Array of icon names
     */
    list() {
        return Array.from(this.icons.keys()).sort();
    }

    /**
     * Get total number of loaded icons
     * @returns {number} Number of icons
     */
    count() {
        return this.icons.size;
    }
}

// === GLOBAL INSTANCE ===
const Icon = new GlobalIconManager();

// Make globally available
window.Icon = Icon;

// === SIMPLE EXPORTS ===
export default Icon;
export { Icon };

// Backward compatibility functions
export function createSVGIcon(name, style = {}) {
    return Icon.create(name, style);
}

export function getSVGDataUri(name, color = 'currentColor') {
    return Icon.dataUri(name, color);
}

export function updateIconColor(target, color) {
    if (typeof target === 'string') {
        return Icon.dataUri(target, color);
    }
    return target;
}

export function hasIcon(name) {
    return Icon.has(name);
}

export function getAvailableIcons() {
    return Icon.list();
}

export function getSVGPath(name) {
    const iconSvg = Icon.icons.get(name);
    if (!iconSvg) {
        console.warn(`[Icon Manager] Icon '${name}' not found for path extraction`);
        return '';
    }
    
    // Extract path data from SVG
    const temp = document.createElement('div');
    temp.innerHTML = iconSvg;
    const svg = temp.firstElementChild;
    
    if (svg) {
        const pathElement = svg.querySelector('path');
        if (pathElement) {
            return pathElement.getAttribute('d') || '';
        }
    }
    
    return '';
}
