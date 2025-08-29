# Universal SVG Icon Manager

> A complete SVG icon management system with visual interface and GitHub Pages support

**🎯 Features:**
- **📊 Visual Management Interface** - Add, edit, and organize icons with a web UI
- **� Client-Side Storage** - localStorage-based persistence (GitHub Pages compatible)
- **🌐 GitHub Pages Ready** - Deploy anywhere as a static site
- **🎨 Real-time Preview** - See your icons as you create them
- **📁 Category Organization** - Organize icons by category
- **📤 Import/Export** - Backup and share icon libraries
- **🔧 Universal Integration** - Works with any framework

## 🚀 Quick Start

### Option 1: Icon Management Interface

The easiest way to manage your icons:

```bash
# Clone or download the repository
git clone https://github.com/yourusername/your-repo.git

# Navigate to the icon manager
cd src/components/svg-icon-manager

# Serve locally
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/icon-manager.html
```

### Option 2: Direct JavaScript Usage

Use the icon system in your applications:

```html
<script type="module">
  import { Icon } from './src/components/svg-icon-manager/index.js';
  
  // Create an icon
  const sendIcon = Icon.create('send', { size: 'large' });
  document.body.appendChild(sendIcon);
</script>
```

### Option 3: GitHub Pages Deployment

Deploy to GitHub Pages for team access:

1. **Push to GitHub repository**
2. **Enable GitHub Pages** in repository settings
3. **Access at:** `https://yourusername.github.io/yourrepo/src/components/svg-icon-manager/icon-manager.html`

See [GitHub Pages Deployment Guide](../../GITHUB_PAGES_DEPLOYMENT.md) for details.

## 🎛️ Management Interface Features

### 🖼️ Icon Gallery
- **Visual browsing** of all available icons
- **Search and filter** by name or category  
- **Size adjustment** (XS to XXL)
- **Fill mode toggle** (outline/filled)
- **Real-time preview** with customization

### ➕ Add New Icons
- **Drag-and-drop** SVG code input
- **Live preview** as you type
- **Category assignment** for organization
- **Name validation** (lowercase, hyphens, numbers)
- **Instant availability** after saving

### ✏️ Edit & Manage
- **Rename icons** with click-to-edit
- **Update SVG content** 
- **Change categories**
- **Delete unwanted icons**
- **Bulk operations** support

### 💾 Import/Export
- **Export library** as JSON backup
- **Import from backup** files
- **Share libraries** between team members
- **Version control** friendly format

## 📊 Visual Interface Preview

```
┌─────────────────────────────────────────────────┐
│ 🎨 SVG Icon Library Manager                    │
├─────────────────────────────────────────────────┤
│ 🔍 Search: [___________] 📁 Category: [All ▼]  │
│ 📏 Size: [Medium ▼] [+] [↻] [⚙️] [📤] [📥]      │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🎯 user    🤖 agent   ⚙️ settings  🏠 home    │
│ ✉️ send    🗑️ delete  💬 chat     🔍 search   │
│ 📎 attach  ✅ check   ❌ close    📋 menu     │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🔧 Developer API

### Icon Creation
```javascript
// Create basic icon
const icon = Icon.create('user');

// Create with options
const styledIcon = Icon.create('send', {
  size: 'large',           // xs, small, medium, large, xl, xxl
  fillMode: 'outline',     // solid, outline
  color: '#007acc',        // CSS color
  className: 'btn-icon',   // CSS class
  title: 'Send message'    // Tooltip
});

// Apply advanced styling
Icon.style(icon, {
  fillMode: 'outline',
  thickness: 1.5,
  traceWidth: 0.8
});
```

### Icon Listing
```javascript
// Get all available icons
const allIcons = Icon.list();

// Get icons by category
const userIcons = Icon.list('users');

// Check if icon exists
if (Icon.has('custom-icon')) {
  // Use the icon
}
```

### Storage Management (Advanced)
```javascript
// Initialize storage (auto-done in interface)
const storage = new GitHubPagesIconStorage();

// Add custom icon programmatically
storage.addIcon({
  name: 'my-custom-icon',
  svgContent: '<svg>...</svg>',
  category: 'custom'
});

// Export for backup
storage.exportIcons();
```

## 🎯 Available Icon Categories

The interface organizes icons into logical categories:

### 🔧 **Core Icons**
Essential interface elements: `newChat`, `delete`, `send`, `attach`, `search`, `close`, `menu`, `settings`, `home`, `check`

### 🎵 **Media Icons**  
Audio and media controls: `microphone`, `speaker`, `play`, `stop`, `volume`

### 🧭 **Navigation Icons**
Directional and navigation: `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down`, `dropdown`, `expandPanel`

### 👥 **User Icons**
User and agent representations: `user`, `agent`, `aiCompanion`, `system`, `error`

###  **Content Icons**
Content and knowledge management: `knowledgeHub`, `welcomeDocument`, `copy`, `download`, `export`

### 🎨 **UI Icons**
Visual enhancements: `palette`, `heart`, `star`, `refresh`, `code`

### �️ **Custom Icons**
User-added icons via the management interface

## 💡 Usage Examples

### 🖥️ Management Interface
```bash
# Start local server
python3 -m http.server 8000

# Open interface
open http://localhost:8000/icon-manager.html

# Or access deployed version
https://yourusername.github.io/repo/src/components/svg-icon-manager/icon-manager.html
```

### 📝 Adding Custom Icons
1. **Click "Add New Icon"** in the interface
2. **Enter icon name** (lowercase, hyphens, numbers only)
3. **Select category** from dropdown
4. **Paste SVG code** including `<svg>` tags
5. **Preview updates** automatically
6. **Click "Save Icon"** to add to library

### 📤 Backup & Sharing
```javascript
// Export your icon library
// Click "Export" button in interface
// Downloads: custom-svg-icons-backup.json

// Import to another instance
// Click "Import" button
// Select your backup JSON file
// Icons are added (duplicates skipped)
```

### 🔧 Developer Integration
```javascript
// Include in your HTML
<script type="module" src="./index.js"></script>

// Create icons programmatically
const userIcon = Icon.create('user', {
  size: 'large',
  fillMode: 'outline',
  color: '#007acc'
});

// Advanced styling
Icon.style(userIcon, {
  thickness: 1.5,
  traceWidth: 0.8
});

// Add to DOM
document.getElementById('avatar').appendChild(userIcon);
```

## 🎨 Styling & Customization

### Fill Mode Control
```javascript
// Switch between solid and outline modes
Icon.create('user', { fillMode: 'outline' });  // Outlined
Icon.create('user', { fillMode: 'solid' });    // Filled

// Gallery display mode toggle
// Use the toggle button in the interface
```

### Size Options
```javascript
// Available sizes
Icon.create('icon-name', { size: 'xs' });     // 12px
Icon.create('icon-name', { size: 'small' });  // 16px  
Icon.create('icon-name', { size: 'medium' }); // 24px (default)
Icon.create('icon-name', { size: 'large' });  // 32px
Icon.create('icon-name', { size: 'xl' });     // 40px
Icon.create('icon-name', { size: 'xxl' });    // 48px
```

### Color Customization
```javascript
// CSS color values
Icon.create('heart', { color: '#ff4757' });    // Hex
Icon.create('star', { color: 'gold' });        // Named
Icon.create('check', { color: 'rgb(0,255,0)' }); // RGB

// CSS classes for advanced styling
Icon.create('icon', { className: 'my-custom-style' });
```

## 📊 Storage System

### 💾 **localStorage Implementation**
- **Persistent**: Survives browser restarts
- **Client-side**: No server required
- **GitHub Pages compatible**: Works on static hosting
- **Size limit**: ~5-10MB per domain

### 🔄 **Data Format**
```json
{
  "id": "1234567890",
  "name": "my-icon",
  "svgContent": "<svg>...</svg>",
  "category": "custom",
  "createdAt": "2025-08-30T10:00:00.000Z",
  "updatedAt": "2025-08-30T10:00:00.000Z"
}
```

### 📤 **Import/Export Features**
- **Backup**: Download JSON file with all custom icons
- **Restore**: Upload JSON to restore icons
- **Share**: Send JSON files to team members
- **Migration**: Move between environments easily
    active: { fill: '#003d6b' }
  }
};

iconManager.applyTheme(customTheme);
```

## 📐 Size Variants

Icons come in multiple size presets:

- **XS**: 12x12px - For small UI elements
- **Small**: 16x16px - For buttons and inline elements  
- **Medium**: 20x20px - Default size for most use cases
- **Large**: 24x24px - For headers and prominent elements
- **XL**: 32x32px - For hero sections and large displays
- **XXL**: 48x48px - For splash screens and welcome messages

```javascript
// Create icons with different sizes
const smallIcon = iconManager.createIcon('send', { size: 'small' });
const largeIcon = iconManager.createIcon('send', { size: 'large' });

// Custom size
const customIcon = iconManager.createIcon('send', { 
  width: '28px', 
  height: '28px' 
});
```

## 🚀 Performance Optimization

### Caching
Icons are automatically cached to improve performance:

```javascript
// Enable caching (default: true)
const iconManager = new IconManager({ enableCaching: true });

// Clear cache when needed
iconManager.clearCache();

// Get cache statistics
const stats = iconManager.getCacheStats();
console.log(`Cache hits: ${stats.hits}, Cache size: ${stats.size}`);
```

### Lazy Loading
Icons can be loaded on-demand to reduce initial bundle size:

```javascript
// Enable lazy loading
const iconManager = new IconManager({ lazyLoad: true });

// Preload specific icons
iconManager.preloadIcons(['send', 'delete', 'edit']);
```

### SVG Optimization
Automatic SVG optimization reduces file size and improves rendering:

- Removes unnecessary attributes and metadata
- Optimizes path data
- Consolidates similar elements
- Applies compression techniques

## 🔍 Examples

### Basic Icon Creation
```javascript
// Simple icon
const icon = iconManager.createIcon('send');
document.body.appendChild(icon);
```

### Styled Icon
```javascript
// Icon with custom styling
const styledIcon = iconManager.createIcon('delete', {
  size: 'large',
  className: 'danger-icon',
  fill: '#ff4444',
  ariaLabel: 'Delete item'
});
```

### Batch Operations
```javascript
// Create multiple icons at once
const iconConfigs = [
  { name: 'save', options: { size: 'medium' } },
  { name: 'cancel', options: { size: 'medium' } },
  { name: 'help', options: { size: 'small' } }
];

const icons = iconManager.createIconBatch(iconConfigs);
icons.forEach((icon, index) => {
  document.getElementById(`btn-${index}`).appendChild(icon);
});
```

### Dynamic Icon Updates
```javascript
// Replace icon on state change
const button = document.getElementById('toggle-btn');
let isExpanded = false;

button.addEventListener('click', () => {
  const iconName = isExpanded ? 'expand' : 'collapse';
  iconManager.replaceIcon(button.querySelector('svg'), iconName, {
    animate: true,
    duration: 300
  });
  isExpanded = !isExpanded;
});
```

## 🛠️ Development

### Project Structure
```
svg-icon-manager/
├── index.js              # Main entry point
├── package.json          # Package configuration
├── README.md             # Documentation
├── icon-manager.html     # Management interface
├── github-pages-storage.js # Client-side storage
├── lib/                  # Core library modules
│   ├── IconLibrary.js    # Icon storage and management
│   ├── IconDOMManager.js # DOM manipulation utilities
│   └── IconUtils.js      # Utility functions
├── themes/               # Theme configurations
│   └── IconThemes.js     # Predefined themes
├── styles/               # Stylesheets
│   └── icon-manager.css  # Management interface styles
└── icons/                # Icon collections
    └── SVGIconCollection.js
```

### Contributing

1. Follow the existing code style and patterns
2. Add comprehensive JSDoc comments
3. Include tests for new features
4. Update documentation for API changes
5. Test across different browsers and devices

### Testing

Run the icon manager interface to test functionality:

```bash
# Open in browser
open icon-manager.html

# Or serve locally
python -m http.server 8000
# Then visit: http://localhost:8000/icon-manager.html
```

## 🔄 Migration from Legacy System

If you're migrating from the existing `src/utils/svgIcons.js` system:

### Before (Legacy)
```javascript
import { SVGIcons, createSVGIcon } from './src/utils/svgIcons.js';

const icon = createSVGIcon('send', { className: 'send-icon' });
```

### After (New System)
```javascript
import { IconManager } from './src/components/svg-icon-manager/index.js';

const iconManager = new IconManager();
const icon = iconManager.createIcon('send', { className: 'send-icon' });
```

### Migration Utility
```javascript
// Automatic migration helper (for compatibility with existing projects)
import { IconUtils } from '@universal/svg-icon-library';

// Migrate all legacy icons in a container
IconUtils.migrateLegacyIcons(document.getElementById('app'));
```

## Framework Integration Examples

### React

```jsx
import { Icons } from '@universal/svg-icon-library';

function MyComponent() {
  useEffect(() => {
    const iconElement = Icons.create('heart', { 
      size: 'medium', 
      color: '#ff6b6b' 
    });
    
## 🌐 Framework Integration

The icon system works seamlessly with any framework:

### React
```jsx
import { useEffect, useRef } from 'react';
import { Icon } from './svg-icon-manager/index.js';

function IconComponent({ name, size = 'medium' }) {
  const iconRef = useRef(null);

  useEffect(() => {
    if (iconRef.current) {
      const icon = Icon.create(name, { size });
      iconRef.current.innerHTML = '';
      iconRef.current.appendChild(icon);
    }
  }, [name, size]);

  return <div ref={iconRef} className="icon-wrapper" />;
}

// Usage
<IconComponent name="user" size="large" />
```

### Vue 3
```vue
<template>
  <div ref="iconContainer" class="icon-wrapper"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { Icon } from './svg-icon-manager/index.js';

const props = defineProps(['name', 'size']);
const iconContainer = ref();

const createIcon = () => {
  if (iconContainer.value) {
    const icon = Icon.create(props.name, { size: props.size });
    iconContainer.value.innerHTML = '';
    iconContainer.value.appendChild(icon);
  }
};

onMounted(createIcon);
watch([() => props.name, () => props.size], createIcon);
</script>
```

### Vanilla JavaScript
```javascript
// Simple integration
function createIconButton(name, text) {
  const button = document.createElement('button');
  const icon = Icon.create(name, { size: 'small' });
  
  button.appendChild(icon);
  button.appendChild(document.createTextNode(' ' + text));
  
  return button;
}

// Usage
const saveBtn = createIconButton('save', 'Save Document');
document.body.appendChild(saveBtn);
```

## 🗂️ Project Structure

```
svg-icon-manager/
├── icon-manager.html              # 🎨 Management interface
├── github-pages-storage.js        # 💾 Client storage system
├── index.js                       # 🔧 Core icon manager
├── package.json                   # 📦 Package configuration
├── README.md                      # 📖 Documentation
├── styles/
│   └── icon-manager.css           # 🎨 Interface styling
├── icons/
│   └── SVGIconCollection.js       # 📚 Built-in icon library
├── lib/                           # 🔧 Core modules
│   ├── IconLibrary.js             # Icon storage management
│   ├── IconDOMManager.js          # DOM manipulation
│   └── IconUtils.js               # Utility functions
└── themes/                        # 🎨 Theme configurations
    └── IconThemes.js              # Predefined themes
```

## 🚀 Deployment Options

### GitHub Pages (Recommended)
```bash
# 1. Push to GitHub
git add .
git commit -m "Add icon manager"
git push origin main

# 2. Enable GitHub Pages in repo settings
# 3. Access at: https://username.github.io/repo/src/components/svg-icon-manager/icon-manager.html
```

### Local Development
```bash
# Serve locally
python3 -m http.server 8000
open http://localhost:8000/icon-manager.html
```

### Custom Domain
```bash
# Add CNAME file for custom domain
echo "icons.yoursite.com" > CNAME
```

## 🧪 Testing

Test the interface functionality:

```bash
# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/icon-manager.html

# Test features:
# ✅ Add new icons
# ✅ Search and filter
# ✅ Export/import
# ✅ Size adjustments
# ✅ Fill mode toggle
```

## 📈 Performance

- **⚡ Fast loading**: Icons load on-demand
- **💾 Small footprint**: ~50KB total size
- **🔄 Efficient rendering**: SVG optimization
- **📱 Mobile optimized**: Responsive design
- **🌐 CDN ready**: Works with GitHub Pages CDN

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Add your changes** (use the management interface!)
4. **Export your icons** for backup
5. **Commit changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open Pull Request**

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

- **📖 Documentation**: Check this README
- **🐛 Issues**: Open GitHub issues
- **💬 Discussions**: Use GitHub discussions
- **📧 Contact**: [Your contact information]

---

**🎉 Happy icon managing!** Start with the [management interface](icon-manager.html) and build your perfect icon library!
  });
</script>

<div bind:this={iconContainer}></div>
```

## Built-in Icons

The component includes these essential icons out of the box:
- `close`, `check`, `menu`, `home`, `settings`, `search`
- `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down`
- `heart`, `star`

## Available Themes

- **default** - Clean, neutral styling
- **dark** - Dark mode friendly  
- **colorful** - Vibrant colors
- **minimal** - Ultra-clean, minimal styling
- **vibrant** - High-contrast, energetic
- **corporate** - Professional, business-appropriate

## Performance Features

- **Zero dependencies** - No external libraries required
- **Lightweight** - < 10KB gzipped
- **Optimized** - Built-in caching and performance optimizations
- **Tree-shakable** - Import only what you need
- **Framework agnostic** - Works with any web framework or vanilla JavaScript

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- IE 11+ (with polyfills)

## 📝 License

MIT License - see LICENSE file for details.

## 🔗 Contributing

Contributions welcome! This is a universal component designed to work across any web framework.

---

Made with ❤️ for universal use across any web application.