/**
 * GitHub Pages Compatible Storage Solution
 * Uses localStorage for persistent icon storage
 */

class GitHubPagesIconStorage {
    constructor() {
        this.storageKey = 'custom-svg-icons';
        this.init();
    }

    init() {
        // Initialize storage if it doesn't exist
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    // Get all custom icons
    getIcons() {
        try {
            const icons = localStorage.getItem(this.storageKey);
            return icons ? JSON.parse(icons) : [];
        } catch (error) {
            console.error('Error reading icons from localStorage:', error);
            return [];
        }
    }

    // Add new icon
    addIcon(iconData) {
        try {
            const icons = this.getIcons();
            
            // Check if icon already exists
            const existingIndex = icons.findIndex(icon => icon.name === iconData.name);
            if (existingIndex !== -1) {
                throw new Error(`Icon "${iconData.name}" already exists`);
            }

            // Add timestamp and ID
            const newIcon = {
                ...iconData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            icons.push(newIcon);
            localStorage.setItem(this.storageKey, JSON.stringify(icons));
            
            return { success: true, icon: newIcon };
        } catch (error) {
            console.error('Error adding icon:', error);
            return { success: false, error: error.message };
        }
    }

    // Update existing icon
    updateIcon(id, iconData) {
        try {
            const icons = this.getIcons();
            const index = icons.findIndex(icon => icon.id === id);
            
            if (index === -1) {
                throw new Error(`Icon with ID "${id}" not found`);
            }

            // Update icon
            icons[index] = {
                ...icons[index],
                ...iconData,
                updatedAt: new Date().toISOString()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(icons));
            
            return { success: true, icon: icons[index] };
        } catch (error) {
            console.error('Error updating icon:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete icon
    deleteIcon(id) {
        try {
            const icons = this.getIcons();
            const index = icons.findIndex(icon => icon.id === id);
            
            if (index === -1) {
                throw new Error(`Icon with ID "${id}" not found`);
            }

            const deletedIcon = icons.splice(index, 1)[0];
            localStorage.setItem(this.storageKey, JSON.stringify(icons));
            
            return { success: true, icon: deletedIcon };
        } catch (error) {
            console.error('Error deleting icon:', error);
            return { success: false, error: error.message };
        }
    }

    // Get icon by ID
    getIcon(id) {
        const icons = this.getIcons();
        return icons.find(icon => icon.id === id);
    }

    // Get icon by name
    getIconByName(name) {
        const icons = this.getIcons();
        return icons.find(icon => icon.name === name);
    }

    // Export icons data (for backup)
    exportIcons() {
        const icons = this.getIcons();
        const dataStr = JSON.stringify(icons, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'custom-svg-icons-backup.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Import icons data (from backup)
    async importIcons(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedIcons = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedIcons)) {
                        throw new Error('Invalid file format');
                    }

                    // Validate each icon
                    for (const icon of importedIcons) {
                        if (!icon.name || !icon.svgContent) {
                            throw new Error('Invalid icon data in file');
                        }
                    }

                    // Merge with existing icons (avoid duplicates)
                    const existingIcons = this.getIcons();
                    const existingNames = existingIcons.map(icon => icon.name);
                    
                    const newIcons = importedIcons.filter(icon => 
                        !existingNames.includes(icon.name)
                    );

                    const allIcons = [...existingIcons, ...newIcons];
                    localStorage.setItem(this.storageKey, JSON.stringify(allIcons));
                    
                    resolve({
                        success: true,
                        imported: newIcons.length,
                        skipped: importedIcons.length - newIcons.length
                    });
                } catch (error) {
                    reject({ success: false, error: error.message });
                }
            };
            reader.onerror = () => reject({ success: false, error: 'File read error' });
            reader.readAsText(file);
        });
    }

    // Clear all custom icons
    clearAll() {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
        return { success: true };
    }

    // Get storage statistics
    getStats() {
        const icons = this.getIcons();
        const categories = {};
        
        icons.forEach(icon => {
            const category = icon.category || 'uncategorized';
            categories[category] = (categories[category] || 0) + 1;
        });

        return {
            total: icons.length,
            categories: categories,
            storageUsed: new Blob([localStorage.getItem(this.storageKey)]).size
        };
    }
}

// Export for use
window.GitHubPagesIconStorage = GitHubPagesIconStorage;
