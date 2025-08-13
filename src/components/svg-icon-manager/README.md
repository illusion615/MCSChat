# Universal SVG Icon Manager

# SVG Icon Library

> A lightweight, universal SVG icon library for web applications

**Works with any framework** - React, Vue, Angular, Svelte, or vanilla JavaScript

## 🚀 Why This Component?

- **🎯 Universal**: Works with any framework (React, Vue, Angular, Vanilla JS)
- **📦 Zero Dependencies**: Pure JavaScript with no external dependencies
- **⚡ Lightweight**: Less than 50KB total, optimized for performance
- **🎨 Themeable**: Built-in theme system with easy customization
- **♿ Accessible**: WCAG compliant with proper ARIA attributes
- **🔧 Easy Integration**: Just import and use, no complex setup
- **📂 Organized**: Icons grouped by category for better discoverability

## 📦 Quick Start

### Option 1: Direct Download
Download the files and include them in your project:

```html
<script type="module">
  import { IconManager } from './path/to/svg-icon-manager/index.js';
  
  const icons = new IconManager();
  const sendIcon = icons.create('send');
  document.body.appendChild(sendIcon);
</script>
```

### Option 2: ES6 Modules
If you're using a bundler (Webpack, Vite, etc.):

```javascript
import { IconManager } from '@universal/svg-icon-library';

const icons = new IconManager();
const icon = icons.create('heart', { size: 'large', color: 'red' });
document.getElementById('button').appendChild(icon);
```

### Option 3: Direct Icon Access
Import icons directly from the collection:

```javascript
import { CoreIcons, createSVGIcon } from '@universal/svg-icon-library/icons';

// Create icon directly
const sendIcon = createSVGIcon('send', { size: 'large' });
document.body.appendChild(sendIcon);
```

## 🎯 Icon Categories

Icons are organized into logical categories for better discoverability:

### 🔧 Core Icons
Essential interface elements: `newChat`, `delete`, `send`, `attach`, `search`, `close`, `menu`, `settings`, `home`, `check`

### 🎵 Media Icons  
Audio and media controls: `microphone`

### 🧭 Navigation Icons
Directional and navigation elements: `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down`, `dropdown`, `expandPanel`

### 👥 User Icons
User and agent representations: `user`, `agent`, `aiCompanion`, `system`, `error`

### 👤 Avatar Icons
Profile and character icons: `robotAvatar`, `assistantAvatar`, `smartAvatar`, `modernAvatar`, `professionalAvatar`, `gameAvatar`, `friendly`, `robot`, `assistant`, `smart`

### 📚 Content Icons
Content and knowledge management: `knowledgeHub`, `welcomeDocument`

### 🎨 UI Icons
Visual and interface enhancements: `palette`, `heart`, `star`

## 💡 Super Simple Examples

### Basic Usage
```javascript
import { IconManager } from './svg-icon-manager/index.js';

// Create instance
const icons = new IconManager();

// Create icon
const saveIcon = icons.create('save');
document.body.appendChild(saveIcon);

// That's it! 🎉
```

### With Options
```javascript
// Create styled icon
const deleteIcon = icons.create('delete', {
  size: 'large',           // xs, small, medium, large, xl, xxl
  color: '#ff4444',        // Any CSS color
  className: 'danger-btn', // CSS class
  title: 'Delete item'     // Tooltip
});
```

### Theme Support
```javascript
// Apply dark theme
icons.setTheme('dark');

// Or create custom theme
icons.setTheme({
  name: 'custom',
  colors: { primary: '#007acc', secondary: '#666' }
});
```

## 🔧 API Reference

### IconManager

The main class that orchestrates all icon operations.

#### Constructor
```javascript
new IconManager(config = {})
```

**Parameters:**
- `config.theme` (string): Default theme name
- `config.defaultSize` (string): Default icon size ('small', 'medium', 'large')
- `config.enableCaching` (boolean): Enable icon caching
- `config.lazyLoad` (boolean): Enable lazy loading

#### Methods

##### `createIcon(name, options = {})`
Creates a new icon element.

**Parameters:**
- `name` (string): Icon name
- `options.size` (string): Icon size
- `options.theme` (string): Theme override
- `options.className` (string): CSS class name
- `options.fill` (string): Fill color
- `options.stroke` (string): Stroke color
- `options.ariaLabel` (string): Accessibility label

**Returns:** HTMLElement

##### `replaceIcon(element, name, options = {})`
Replaces an existing icon element.

**Parameters:**
- `element` (HTMLElement): Element to replace
- `name` (string): New icon name
- `options` (Object): Icon options

##### `applyTheme(theme)`
Applies a theme to all managed icons.

**Parameters:**
- `theme` (Object): Theme configuration

### IconLibrary

Manages the icon storage and retrieval system.

#### Methods

##### `addIcon(name, svgData, metadata = {})`
Adds a new icon to the library.

##### `getIcon(name, variant = 'default')`
Retrieves an icon from the library.

##### `hasIcon(name)`
Checks if an icon exists in the library.

##### `removeIcon(name)`
Removes an icon from the library.

### IconDOMManager

Handles DOM manipulation for icon elements.

#### Methods

##### `createElement(iconData, options = {})`
Creates a DOM element from icon data.

##### `updateElement(element, iconData, options = {})`
Updates an existing DOM element.

##### `optimizeSVG(svgString)`
Optimizes SVG content for performance.

### IconUtils

Utility functions for icon manipulation.

#### Functions

##### `generateIconId(name, variant, size)`
Generates a unique ID for icon caching.

##### `extractSVGPaths(svgString)`
Extracts path data from SVG strings.

##### `applyIconStyles(element, styles)`
Applies styles to icon elements.

##### `createIconSprite(icons)`
Creates an SVG sprite from multiple icons.

## 🎨 Theming

The icon manager supports multiple themes with different visual styles.

### Available Themes

- **Default**: Standard icons with neutral colors
- **Dark**: Dark theme optimized icons
- **Light**: Light theme optimized icons
- **Colorful**: Icons with brand colors
- **Minimal**: Simplified, minimal design icons

### Theme Configuration

```javascript
import { IconThemes } from './src/components/svg-icon-manager/themes/IconThemes.js';

// Apply a predefined theme
iconManager.applyTheme(IconThemes.DARK);

// Create custom theme
const customTheme = {
  name: 'custom',
  colors: {
    primary: '#007acc',
    secondary: '#666666',
    accent: '#ff6b35'
  },
  styles: {
    default: { fill: '#007acc' },
    hover: { fill: '#005a9e' },
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
├── lib/                  # Core library modules
│   ├── IconLibrary.js    # Icon storage and management
│   ├── IconDOMManager.js # DOM manipulation utilities
│   └── IconUtils.js      # Utility functions
├── themes/               # Theme configurations
│   └── IconThemes.js     # Predefined themes
└── examples/             # Usage examples
    └── universal-example.html
```

### Contributing

1. Follow the existing code style and patterns
2. Add comprehensive JSDoc comments
3. Include tests for new features
4. Update documentation for API changes
5. Test across different browsers and devices

### Testing

Run the example file to test functionality:

```bash
# Open in browser
open examples/universal-example.html

# Or serve locally
python -m http.server 8000
# Then visit: http://localhost:8000/examples/universal-example.html
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
    
    const container = document.getElementById('icon-container');
    container.appendChild(iconElement);
  }, []);

  return <div id="icon-container"></div>;
}
```

### Vue 3

```vue
<template>
  <div ref="iconContainer"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Icons } from '@universal/svg-icon-library';

const iconContainer = ref();

onMounted(() => {
  const icon = Icons.create('star', { size: 'large' });
  iconContainer.value.appendChild(icon);
});
</script>
```

### Angular

```typescript
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Icons } from '@universal/svg-icon-library';

@Component({
  selector: 'app-icon',
  template: '<div #iconContainer></div>'
})
export class IconComponent {
  @ViewChild('iconContainer') iconContainer!: ElementRef;

  ngAfterViewInit() {
    const icon = Icons.create('check', { size: 'medium' });
    this.iconContainer.nativeElement.appendChild(icon);
  }
}
```

### Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  import { Icons } from '@universal/svg-icon-library';
  
  let iconContainer;
  
  onMount(() => {
    const icon = Icons.create('menu', { size: 'large' });
    iconContainer.appendChild(icon);
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