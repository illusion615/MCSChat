/**
 * IconThemes.js
 * 
 * Theme configurations for the SVG icon system. Provides predefined themes
 * and utilities for creating custom themes with consistent styling.
 */

/**
 * Base theme structure defining the standard properties
 */
const BaseTheme = {
    name: 'base',
    description: 'Base theme structure',
    colors: {
        primary: 'currentColor',
        secondary: '#666666',
        accent: '#0078d4',
        success: '#107c10',
        warning: '#ff8c00',
        error: '#d13438',
        muted: '#8a8886'
    },
    states: {
        default: {
            fill: 'currentColor',
            opacity: 1,
            transform: 'none'
        },
        hover: {
            fill: 'currentColor',
            opacity: 0.8,
            transform: 'scale(1.05)'
        },
        active: {
            fill: 'currentColor',
            opacity: 0.6,
            transform: 'scale(0.95)'
        },
        disabled: {
            fill: '#c8c6c4',
            opacity: 0.4,
            transform: 'none'
        },
        focus: {
            fill: 'currentColor',
            opacity: 1,
            transform: 'none',
            outline: '2px solid #0078d4',
            outlineOffset: '2px'
        }
    },
    sizes: {
        xs: { width: 12, height: 12 },
        small: { width: 16, height: 16 },
        medium: { width: 20, height: 20 },
        large: { width: 24, height: 24 },
        xl: { width: 32, height: 32 },
        xxl: { width: 48, height: 48 }
    },
    animations: {
        enabled: true,
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
};

/**
 * Default/Light theme - optimized for light backgrounds
 */
export const DefaultTheme = {
    ...BaseTheme,
    name: 'default',
    description: 'Default light theme with neutral colors',
    colors: {
        ...BaseTheme.colors,
        primary: '#323130',
        secondary: '#605e5c',
        accent: '#0078d4'
    },
    states: {
        ...BaseTheme.states,
        default: {
            fill: '#323130',
            opacity: 1
        },
        hover: {
            fill: '#0078d4',
            opacity: 1,
            transform: 'scale(1.05)'
        },
        active: {
            fill: '#106ebe',
            opacity: 1,
            transform: 'scale(0.95)'
        }
    }
};

/**
 * Dark theme - optimized for dark backgrounds
 */
export const DarkTheme = {
    ...BaseTheme,
    name: 'dark',
    description: 'Dark theme with light colors for dark backgrounds',
    colors: {
        ...BaseTheme.colors,
        primary: '#ffffff',
        secondary: '#c8c6c4',
        accent: '#60cdff'
    },
    states: {
        ...BaseTheme.states,
        default: {
            fill: '#ffffff',
            opacity: 1
        },
        hover: {
            fill: '#60cdff',
            opacity: 1,
            transform: 'scale(1.05)'
        },
        active: {
            fill: '#40a9ff',
            opacity: 1,
            transform: 'scale(0.95)'
        },
        disabled: {
            fill: '#484644',
            opacity: 0.4
        }
    }
};

/**
 * Colorful theme - vibrant colors for expressive interfaces
 */
export const ColorfulTheme = {
    ...BaseTheme,
    name: 'colorful',
    description: 'Vibrant theme with brand colors and gradients',
    colors: {
        ...BaseTheme.colors,
        primary: '#6264a7',
        secondary: '#8b8cc8',
        accent: '#ff6b35',
        success: '#00bcf2',
        warning: '#ffb900',
        error: '#e74856'
    },
    states: {
        ...BaseTheme.states,
        default: {
            fill: 'url(#gradient-primary)',
            opacity: 1
        },
        hover: {
            fill: 'url(#gradient-accent)',
            opacity: 1,
            transform: 'scale(1.1)'
        },
        active: {
            fill: 'url(#gradient-primary)',
            opacity: 0.8,
            transform: 'scale(0.9)'
        }
    },
    gradients: {
        primary: {
            id: 'gradient-primary',
            type: 'linear',
            stops: [
                { offset: '0%', color: '#6264a7' },
                { offset: '100%', color: '#8b8cc8' }
            ]
        },
        accent: {
            id: 'gradient-accent',
            type: 'linear',
            stops: [
                { offset: '0%', color: '#ff6b35' },
                { offset: '100%', color: '#f7931e' }
            ]
        }
    }
};

/**
 * Minimal theme - clean and simplified design
 */
export const MinimalTheme = {
    ...BaseTheme,
    name: 'minimal',
    description: 'Clean minimal theme with subtle effects',
    colors: {
        ...BaseTheme.colors,
        primary: '#000000',
        secondary: '#666666',
        accent: '#333333'
    },
    states: {
        ...BaseTheme.states,
        default: {
            fill: 'none',
            stroke: '#000000',
            strokeWidth: 1.5,
            opacity: 1
        },
        hover: {
            fill: 'none',
            stroke: '#333333',
            strokeWidth: 2,
            opacity: 1
        },
        active: {
            fill: '#000000',
            stroke: 'none',
            opacity: 1
        }
    },
    animations: {
        enabled: true,
        duration: 150,
        easing: 'ease-out'
    }
};

/**
 * High contrast theme - accessibility-focused design
 */
export const HighContrastTheme = {
    ...BaseTheme,
    name: 'high-contrast',
    description: 'High contrast theme for accessibility',
    colors: {
        ...BaseTheme.colors,
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#ffff00',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000'
    },
    states: {
        ...BaseTheme.states,
        default: {
            fill: '#000000',
            stroke: '#ffffff',
            strokeWidth: 1,
            opacity: 1
        },
        hover: {
            fill: '#ffff00',
            stroke: '#000000',
            strokeWidth: 2,
            opacity: 1
        },
        active: {
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            opacity: 1
        },
        focus: {
            fill: '#000000',
            stroke: '#ffff00',
            strokeWidth: 3,
            outline: '3px solid #ffff00'
        }
    }
};

/**
 * Brand theme - MCSChat specific branding
 */
export const BrandTheme = {
    ...BaseTheme,
    name: 'brand',
    description: 'MCSChat brand theme',
    colors: {
        ...BaseTheme.colors,
        primary: '#0078d4',
        secondary: '#106ebe',
        accent: '#40e0d0',
        success: '#00bcf2',
        warning: '#ff8c00',
        error: '#d13438'
    },
    states: {
        ...BaseTheme.states,
        default: {
            fill: '#0078d4',
            opacity: 1
        },
        hover: {
            fill: '#40e0d0',
            opacity: 1,
            transform: 'scale(1.1)'
        },
        active: {
            fill: '#106ebe',
            opacity: 1,
            transform: 'scale(0.95)'
        }
    }
};

/**
 * Collection of all predefined themes
 */
export const IconThemes = {
    DEFAULT: DefaultTheme,
    DARK: DarkTheme,
    COLORFUL: ColorfulTheme,
    MINIMAL: MinimalTheme,
    HIGH_CONTRAST: HighContrastTheme,
    BRAND: BrandTheme
};

/**
 * Theme utility functions
 */
export class ThemeManager {
    constructor() {
        this.currentTheme = DefaultTheme;
        this.appliedElements = new WeakSet();
        this.gradientDefs = new Map();
    }

    /**
     * Apply theme to an icon element
     * @param {HTMLElement} element - Icon element
     * @param {Object} theme - Theme object
     * @param {string} state - Element state (default, hover, etc.)
     */
    applyTheme(element, theme = this.currentTheme, state = 'default') {
        if (!element || !theme) return;

        const stateStyles = theme.states[state] || theme.states.default;
        
        // Apply styles
        Object.entries(stateStyles).forEach(([property, value]) => {
            if (property === 'outline' || property === 'outlineOffset') {
                element.style[property] = value;
            } else if (property === 'transform') {
                element.style.transform = value;
            } else {
                element.setAttribute(property, value);
            }
        });

        // Set up gradients if needed
        if (theme.gradients && stateStyles.fill?.startsWith('url(')) {
            this.ensureGradientDefs(element, theme);
        }

        // Add theme class
        element.classList.add(`icon-theme-${theme.name}`);
        element.classList.add(`icon-state-${state}`);

        // Track applied element
        this.appliedElements.add(element);
    }

    /**
     * Set current theme
     * @param {Object} theme - Theme object
     */
    setTheme(theme) {
        this.currentTheme = theme;
    }

    /**
     * Get current theme
     * @returns {Object} Current theme
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Create custom theme
     * @param {Object} themeConfig - Theme configuration
     * @returns {Object} Custom theme
     */
    createCustomTheme(themeConfig) {
        return {
            ...BaseTheme,
            ...themeConfig,
            colors: { ...BaseTheme.colors, ...themeConfig.colors },
            states: { ...BaseTheme.states, ...themeConfig.states },
            sizes: { ...BaseTheme.sizes, ...themeConfig.sizes }
        };
    }

    /**
     * Ensure gradient definitions exist in DOM
     * @param {HTMLElement} element - Icon element
     * @param {Object} theme - Theme with gradients
     */
    ensureGradientDefs(element, theme) {
        if (!theme.gradients) return;

        let defsElement = document.querySelector('defs');
        if (!defsElement) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'absolute';
            svg.style.width = '0';
            svg.style.height = '0';
            svg.setAttribute('aria-hidden', 'true');
            
            defsElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.appendChild(defsElement);
            document.head.appendChild(svg);
        }

        Object.values(theme.gradients).forEach(gradient => {
            if (!this.gradientDefs.has(gradient.id)) {
                const gradientElement = this.createGradientElement(gradient);
                defsElement.appendChild(gradientElement);
                this.gradientDefs.set(gradient.id, gradientElement);
            }
        });
    }

    /**
     * Create gradient element
     * @param {Object} gradient - Gradient configuration
     * @returns {HTMLElement} Gradient element
     */
    createGradientElement(gradient) {
        const gradientEl = document.createElementNS(
            'http://www.w3.org/2000/svg',
            gradient.type === 'radial' ? 'radialGradient' : 'linearGradient'
        );
        
        gradientEl.setAttribute('id', gradient.id);
        
        gradient.stops.forEach(stop => {
            const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stopEl.setAttribute('offset', stop.offset);
            stopEl.setAttribute('stop-color', stop.color);
            if (stop.opacity !== undefined) {
                stopEl.setAttribute('stop-opacity', stop.opacity);
            }
            gradientEl.appendChild(stopEl);
        });

        return gradientEl;
    }

    /**
     * Add state listeners to element
     * @param {HTMLElement} element - Icon element
     * @param {Object} theme - Theme object
     */
    addStateListeners(element, theme = this.currentTheme) {
        if (!element || this.appliedElements.has(element)) return;

        // Mouse events
        element.addEventListener('mouseenter', () => {
            this.applyTheme(element, theme, 'hover');
        });

        element.addEventListener('mouseleave', () => {
            this.applyTheme(element, theme, 'default');
        });

        element.addEventListener('mousedown', () => {
            this.applyTheme(element, theme, 'active');
        });

        element.addEventListener('mouseup', () => {
            this.applyTheme(element, theme, 'hover');
        });

        // Focus events
        element.addEventListener('focus', () => {
            this.applyTheme(element, theme, 'focus');
        });

        element.addEventListener('blur', () => {
            this.applyTheme(element, theme, 'default');
        });

        this.appliedElements.add(element);
    }

    /**
     * Get theme by name
     * @param {string} themeName - Theme name
     * @returns {Object|null} Theme object
     */
    getThemeByName(themeName) {
        const theme = Object.values(IconThemes).find(t => t.name === themeName);
        return theme || null;
    }

    /**
     * List available themes
     * @returns {Array<Object>} Array of theme objects
     */
    getAvailableThemes() {
        return Object.values(IconThemes);
    }

    /**
     * Generate CSS for theme
     * @param {Object} theme - Theme object
     * @returns {string} CSS string
     */
    generateThemeCSS(theme) {
        const className = `icon-theme-${theme.name}`;
        let css = '';

        // Base styles
        css += `.${className} {\n`;
        Object.entries(theme.states.default).forEach(([prop, value]) => {
            const cssProp = prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            css += `  ${cssProp}: ${value};\n`;
        });
        css += '}\n\n';

        // State styles
        Object.entries(theme.states).forEach(([state, styles]) => {
            if (state === 'default') return;
            
            const selector = state === 'hover' ? `:hover` : 
                           state === 'active' ? `:active` : 
                           state === 'focus' ? `:focus` : 
                           `.icon-state-${state}`;
            
            css += `.${className}${selector} {\n`;
            Object.entries(styles).forEach(([prop, value]) => {
                const cssProp = prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
                css += `  ${cssProp}: ${value};\n`;
            });
            css += '}\n\n';
        });

        // Animation styles
        if (theme.animations?.enabled) {
            css += `.${className} {\n`;
            css += `  transition: all ${theme.animations.duration}ms ${theme.animations.easing};\n`;
            css += '}\n\n';
        }

        return css;
    }

    /**
     * Inject theme CSS into document
     * @param {Object} theme - Theme object
     */
    injectThemeCSS(theme) {
        const styleId = `icon-theme-${theme.name}`;
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        styleElement.textContent = this.generateThemeCSS(theme);
    }

    /**
     * Remove theme CSS from document
     * @param {string} themeName - Theme name
     */
    removeThemeCSS(themeName) {
        const styleElement = document.getElementById(`icon-theme-${themeName}`);
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Export singleton instance
export const themeManager = new ThemeManager();

// Default export for convenience
export default IconThemes;