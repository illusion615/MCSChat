/**
 * IconLibrary.js
 * 
 * Core icon library management system that handles icon storage, retrieval,
 * and organization. Supports variants, metadata, and efficient caching.
 */

import { SVGIcons, getIconCategory } from '../icons/SVGIconCollection.js';

/**
 * IconLibrary class manages the central repository of all SVG icons
 * with support for variants, themes, and metadata
 */
export class IconLibrary {
    constructor() {
        this.icons = new Map();
        this.variants = new Map();
        this.metadata = new Map();
        this.cache = new Map();
        this.loadTime = Date.now();
        
        // Initialize with existing icons from legacy system
        this.initializeLegacyIcons();
    }

    /**
     * Initialize library with icons from the icon collection
     */
    initializeLegacyIcons() {
        Object.entries(SVGIcons).forEach(([name, svgData]) => {
            this.addIcon(name, svgData, {
                source: 'collection',
                category: getIconCategory(name) || this.categorizeIcon(name),
                size: this.extractSizeFromSVG(svgData),
                imported: true
            });
        });
    }

    /**
     * Add a new icon to the library
     * @param {string} name - Icon name/identifier
     * @param {string} svgData - SVG markup string
     * @param {Object} metadata - Icon metadata
     * @param {string} variant - Icon variant (default, hover, active, etc.)
     */
    addIcon(name, svgData, metadata = {}, variant = 'default') {
        const iconKey = `${name}:${variant}`;
        
        // Store icon data
        this.icons.set(iconKey, {
            name,
            variant,
            svg: svgData,
            added: Date.now(),
            ...metadata
        });

        // Store variant mapping
        if (!this.variants.has(name)) {
            this.variants.set(name, new Set());
        }
        this.variants.get(name).add(variant);

        // Store metadata
        this.metadata.set(name, {
            ...this.metadata.get(name),
            ...metadata,
            variants: Array.from(this.variants.get(name))
        });

        // Clear relevant cache entries
        this.clearIconCache(name);

        return this;
    }

    /**
     * Get an icon from the library
     * @param {string} name - Icon name
     * @param {string} variant - Icon variant
     * @returns {Object|null} Icon data object
     */
    getIcon(name, variant = 'default') {
        const iconKey = `${name}:${variant}`;
        
        // Try exact match first
        if (this.icons.has(iconKey)) {
            return this.icons.get(iconKey);
        }

        // Fallback to default variant
        if (variant !== 'default') {
            const defaultKey = `${name}:default`;
            if (this.icons.has(defaultKey)) {
                return this.icons.get(defaultKey);
            }
        }

        // Log warning for missing icons
        console.warn(`Icon '${name}' with variant '${variant}' not found in library`);
        return null;
    }

    /**
     * Check if an icon exists in the library
     * @param {string} name - Icon name
     * @param {string} variant - Icon variant (optional)
     * @returns {boolean}
     */
    hasIcon(name, variant = null) {
        if (variant) {
            return this.icons.has(`${name}:${variant}`);
        }
        
        // Check if any variant exists
        return Array.from(this.icons.keys()).some(key => key.startsWith(`${name}:`));
    }

    /**
     * Remove an icon from the library
     * @param {string} name - Icon name
     * @param {string} variant - Specific variant to remove (optional)
     */
    removeIcon(name, variant = null) {
        if (variant) {
            // Remove specific variant
            const iconKey = `${name}:${variant}`;
            this.icons.delete(iconKey);
            
            if (this.variants.has(name)) {
                this.variants.get(name).delete(variant);
                if (this.variants.get(name).size === 0) {
                    this.variants.delete(name);
                    this.metadata.delete(name);
                }
            }
        } else {
            // Remove all variants of the icon
            const keysToRemove = Array.from(this.icons.keys())
                .filter(key => key.startsWith(`${name}:`));
            
            keysToRemove.forEach(key => this.icons.delete(key));
            this.variants.delete(name);
            this.metadata.delete(name);
        }

        this.clearIconCache(name);
        return this;
    }

    /**
     * Get all available icon names
     * @returns {Array<string>} Array of icon names
     */
    getIconNames() {
        return Array.from(this.variants.keys()).sort();
    }

    /**
     * Get available variants for an icon
     * @param {string} name - Icon name
     * @returns {Array<string>} Array of variant names
     */
    getIconVariants(name) {
        return this.variants.has(name) 
            ? Array.from(this.variants.get(name))
            : [];
    }

    /**
     * Get icon metadata
     * @param {string} name - Icon name
     * @returns {Object|null} Metadata object
     */
    getIconMetadata(name) {
        return this.metadata.get(name) || null;
    }

    /**
     * Search icons by criteria
     * @param {Object} criteria - Search criteria
     * @param {string} criteria.category - Icon category
     * @param {Array<string>} criteria.tags - Icon tags
     * @param {string} criteria.query - Text search query
     * @returns {Array<Object>} Array of matching icons
     */
    searchIcons(criteria = {}) {
        const results = [];
        
        for (const [name, metadata] of this.metadata.entries()) {
            let matches = true;

            // Category filter
            if (criteria.category && metadata.category !== criteria.category) {
                matches = false;
            }

            // Tags filter
            if (criteria.tags && criteria.tags.length > 0) {
                const iconTags = metadata.tags || [];
                if (!criteria.tags.some(tag => iconTags.includes(tag))) {
                    matches = false;
                }
            }

            // Text search
            if (criteria.query) {
                const query = criteria.query.toLowerCase();
                const searchText = `${name} ${metadata.description || ''} ${(metadata.tags || []).join(' ')}`.toLowerCase();
                if (!searchText.includes(query)) {
                    matches = false;
                }
            }

            if (matches) {
                results.push({
                    name,
                    ...metadata,
                    icon: this.getIcon(name)
                });
            }
        }

        return results;
    }

    /**
     * Get icons by category
     * @param {string} category - Category name
     * @returns {Array<Object>} Array of icons in category
     */
    getIconsByCategory(category) {
        return this.searchIcons({ category });
    }

    /**
     * Get library statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const categories = {};
        const variants = {};

        for (const metadata of this.metadata.values()) {
            // Count categories
            const category = metadata.category || 'uncategorized';
            categories[category] = (categories[category] || 0) + 1;

            // Count variants
            if (metadata.variants) {
                metadata.variants.forEach(variant => {
                    variants[variant] = (variants[variant] || 0) + 1;
                });
            }
        }

        return {
            totalIcons: this.metadata.size,
            totalVariants: this.icons.size,
            categories,
            variants,
            cacheSize: this.cache.size,
            loadTime: this.loadTime
        };
    }

    /**
     * Clear icon cache for specific icon or all
     * @param {string} name - Icon name (optional)
     */
    clearIconCache(name = null) {
        if (name) {
            // Clear cache entries for specific icon
            for (const key of this.cache.keys()) {
                if (key.includes(name)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Clear entire cache
            this.cache.clear();
        }
    }

    /**
     * Categorize icon based on name (helper function)
     * @param {string} name - Icon name
     * @returns {string} Category name
     */
    categorizeIcon(name) {
        const categories = {
            'interface': ['newChat', 'delete', 'send', 'attach', 'dropdown', 'expandPanel', 'settings', 'help'],
            'communication': ['microphone', 'send', 'attach'],
            'users': ['user', 'agent', 'friendly', 'robot', 'assistant', 'smart', 'modern', 'professional', 'gaming', 'minimal'],
            'system': ['error', 'system', 'palette'],
            'navigation': ['arrowLeft', 'arrowRight', 'expandPanel'],
            'avatars': ['robotAvatar', 'assistantAvatar', 'smartAvatar', 'modernAvatar', 'professionalAvatar', 'gameAvatar', 'gamingAvatar', 'minimalAvatar'],
            'content': ['welcomeDocument', 'knowledgeHub', 'aiCompanion']
        };

        for (const [category, icons] of Object.entries(categories)) {
            if (icons.includes(name)) {
                return category;
            }
        }

        return 'miscellaneous';
    }

    /**
     * Extract size information from SVG data
     * @param {string} svgData - SVG markup
     * @returns {Object} Size information
     */
    extractSizeFromSVG(svgData) {
        const widthMatch = svgData.match(/width=['"](\d+)['"]/);
        const heightMatch = svgData.match(/height=['"](\d+)['"]/);
        const viewBoxMatch = svgData.match(/viewBox=['"]([^'"]+)['"]/);

        return {
            width: widthMatch ? parseInt(widthMatch[1]) : null,
            height: heightMatch ? parseInt(heightMatch[1]) : null,
            viewBox: viewBoxMatch ? viewBoxMatch[1] : null
        };
    }

    /**
     * Export library data for backup or transfer
     * @returns {Object} Serializable library data
     */
    export() {
        return {
            icons: Object.fromEntries(this.icons),
            variants: Object.fromEntries(this.variants),
            metadata: Object.fromEntries(this.metadata),
            stats: this.getStats(),
            exportTime: Date.now()
        };
    }

    /**
     * Import library data from backup
     * @param {Object} data - Library data to import
     */
    import(data) {
        if (data.icons) {
            this.icons = new Map(Object.entries(data.icons));
        }
        if (data.variants) {
            this.variants = new Map(Object.entries(data.variants));
        }
        if (data.metadata) {
            this.metadata = new Map(Object.entries(data.metadata));
        }
        
        this.clearIconCache();
        return this;
    }

    /**
     * Validate library integrity
     * @returns {Object} Validation results
     */
    validate() {
        const issues = [];
        const stats = this.getStats();

        // Check for orphaned variants
        for (const [iconKey] of this.icons.entries()) {
            const [name] = iconKey.split(':');
            if (!this.metadata.has(name)) {
                issues.push(`Orphaned icon variant: ${iconKey}`);
            }
        }

        // Check for empty SVG data
        for (const [iconKey, iconData] of this.icons.entries()) {
            if (!iconData.svg || iconData.svg.trim().length === 0) {
                issues.push(`Empty SVG data for: ${iconKey}`);
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            stats
        };
    }
}

// Export singleton instance for global use
export const iconLibrary = new IconLibrary();