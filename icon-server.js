const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const ICONS_DATA_FILE = path.join(__dirname, 'src/components/svg-icon-manager/icons/custom-icons.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Ensure custom icons file exists
async function ensureIconsFile() {
    try {
        await fs.access(ICONS_DATA_FILE);
    } catch (error) {
        // File doesn't exist, create it with empty structure
        const initialData = {
            icons: {},
            categories: ['custom', 'core', 'ui', 'media', 'navigation', 'content', 'users'],
            lastModified: new Date().toISOString()
        };
        await fs.mkdir(path.dirname(ICONS_DATA_FILE), { recursive: true });
        await fs.writeFile(ICONS_DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Load icons data
async function loadIconsData() {
    try {
        const data = await fs.readFile(ICONS_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading icons data:', error);
        return { icons: {}, categories: [], lastModified: new Date().toISOString() };
    }
}

// Save icons data
async function saveIconsData(data) {
    try {
        data.lastModified = new Date().toISOString();
        await fs.writeFile(ICONS_DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving icons data:', error);
        return false;
    }
}

// Validate icon name
function validateIconName(name) {
    return /^[a-z0-9-]+$/.test(name) && name.length > 0 && name.length <= 50;
}

// Validate SVG content
function validateSVG(svgContent) {
    return svgContent.includes('<svg') && svgContent.includes('</svg>');
}

// API Routes

// Get all custom icons
app.get('/api/icons', async (req, res) => {
    try {
        const data = await loadIconsData();
        res.json({
            success: true,
            icons: data.icons,
            categories: data.categories,
            lastModified: data.lastModified
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get specific icon
app.get('/api/icons/:name', async (req, res) => {
    try {
        const data = await loadIconsData();
        const iconName = req.params.name;
        
        if (data.icons[iconName]) {
            res.json({ success: true, icon: data.icons[iconName] });
        } else {
            res.status(404).json({ success: false, error: 'Icon not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new icon
app.post('/api/icons', async (req, res) => {
    try {
        const { name, svgContent, category = 'custom', description = '' } = req.body;
        
        // Validate input
        if (!validateIconName(name)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid icon name. Use lowercase letters, numbers, and hyphens only.' 
            });
        }
        
        if (!validateSVG(svgContent)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid SVG content. Must contain <svg> tags.' 
            });
        }
        
        const data = await loadIconsData();
        
        // Check if icon already exists
        if (data.icons[name]) {
            return res.status(409).json({ 
                success: false, 
                error: 'Icon with this name already exists' 
            });
        }
        
        // Add new icon
        data.icons[name] = {
            name,
            svgContent,
            category,
            description,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
        
        const saved = await saveIconsData(data);
        if (saved) {
            res.json({ success: true, message: 'Icon added successfully', icon: data.icons[name] });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save icon' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update existing icon
app.put('/api/icons/:name', async (req, res) => {
    try {
        const oldName = req.params.name;
        const { name: newName, svgContent, category, description } = req.body;
        
        const data = await loadIconsData();
        
        // Check if old icon exists
        if (!data.icons[oldName]) {
            return res.status(404).json({ success: false, error: 'Icon not found' });
        }
        
        // Validate new name if changed
        if (newName && newName !== oldName) {
            if (!validateIconName(newName)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid icon name. Use lowercase letters, numbers, and hyphens only.' 
                });
            }
            
            if (data.icons[newName]) {
                return res.status(409).json({ 
                    success: false, 
                    error: 'Icon with new name already exists' 
                });
            }
        }
        
        // Validate SVG if provided
        if (svgContent && !validateSVG(svgContent)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid SVG content. Must contain <svg> tags.' 
            });
        }
        
        const existingIcon = data.icons[oldName];
        const finalName = newName || oldName;
        
        // Update icon data
        const updatedIcon = {
            ...existingIcon,
            name: finalName,
            svgContent: svgContent || existingIcon.svgContent,
            category: category || existingIcon.category,
            description: description !== undefined ? description : existingIcon.description,
            modifiedAt: new Date().toISOString()
        };
        
        // If name changed, remove old entry and add new one
        if (newName && newName !== oldName) {
            delete data.icons[oldName];
            data.icons[newName] = updatedIcon;
        } else {
            data.icons[oldName] = updatedIcon;
        }
        
        const saved = await saveIconsData(data);
        if (saved) {
            res.json({ success: true, message: 'Icon updated successfully', icon: updatedIcon });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save icon changes' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete icon
app.delete('/api/icons/:name', async (req, res) => {
    try {
        const iconName = req.params.name;
        const data = await loadIconsData();
        
        if (!data.icons[iconName]) {
            return res.status(404).json({ success: false, error: 'Icon not found' });
        }
        
        delete data.icons[iconName];
        
        const saved = await saveIconsData(data);
        if (saved) {
            res.json({ success: true, message: 'Icon deleted successfully' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to delete icon' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize and start server
async function startServer() {
    try {
        await ensureIconsFile();
        app.listen(PORT, () => {
            console.log(`🚀 SVG Icon Library Server running on http://localhost:${PORT}`);
            console.log(`📁 Icons data stored in: ${ICONS_DATA_FILE}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
