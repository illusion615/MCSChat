# Migration Guide: SVG Icons Relocation

This document helps you migrate from the legacy `src/utils/svgIcons.js` to the new organized icon system in the `svg-icon-manager` component.

## 📋 **What Changed**

### ✅ **Before (Legacy)**
```javascript
import { SVGIcons, createSVGIcon } from '../../../utils/svgIcons.js';
```

### ✅ **After (New)**
```javascript
import { SVGIcons, createSVGIcon } from './src/components/svg-icon-manager/icons/index.js';
```

## 🔄 **Migration Steps**

### **Step 1: Update Import Paths**

**Old imports:**
```javascript
import { SVGIcons } from '../../../utils/svgIcons.js';
import { createSVGIcon, getSVGDataUri } from '../../../utils/svgIcons.js';
```

**New imports:**
```javascript
import { SVGIcons } from './src/components/svg-icon-manager/icons/index.js';
import { createSVGIcon, getSVGDataUri } from './src/components/svg-icon-manager/icons/index.js';
```

### **Step 2: Use Category-Based Imports (Optional)**

**Enhanced approach:**
```javascript
import { CoreIcons, NavigationIcons, createSVGIcon } from './src/components/svg-icon-manager/icons/index.js';

// Use specific category
const sendIcon = createSVGIcon('send'); // from CoreIcons
const arrowIcon = createSVGIcon('arrow-left'); // from NavigationIcons
```

### **Step 3: Leverage New Features**

**Icon discovery:**
```javascript
import { getIconsByCategory, searchIcons, getIconCategory } from './src/components/svg-icon-manager/icons/index.js';

// Find all navigation icons
const navIcons = getIconsByCategory('navigation');

// Search for icons
const heartIcons = searchIcons('heart');

// Get icon category
const category = getIconCategory('send'); // returns 'core'
```

## 🏗️ **Component Integration**

### **IconLibrary.js Changes**
The `IconLibrary.js` now imports from the new location:

```javascript
// OLD
import { SVGIcons } from '../../../utils/svgIcons.js';

// NEW  
import { SVGIcons, getIconCategory } from '../icons/index.js';
```

### **Backward Compatibility**
The component maintains backward compatibility. All existing icon names and functionality continue to work exactly as before.

## 📂 **New File Structure**

```
src/components/svg-icon-manager/
├── icons/
│   ├── index.js                 # Main export point
│   ├── SVGIconCollection.js     # Organized icon collection
│   └── IconHelpers.js           # Utility functions
├── lib/
├── themes/
├── examples/
└── index.js
```

## 🚀 **Enhanced Features**

### **1. Category Organization**
Icons are now organized into logical categories:
- **Core**: Basic UI elements (`send`, `delete`, `close`)
- **Navigation**: Arrows and navigation (`arrow-left`, `dropdown`)
- **Users**: User representations (`user`, `agent`, `aiCompanion`)
- **Avatars**: Profile icons (`robotAvatar`, `professionalAvatar`)
- **Content**: Content management (`knowledgeHub`, `welcomeDocument`)
- **Media**: Audio/video (`microphone`)
- **UI**: Visual enhancements (`palette`, `heart`, `star`)

### **2. Better Icon Discovery**
```javascript
import { searchIcons, getIconsByCategory } from './icons/index.js';

// Find all arrow icons
const arrows = searchIcons('arrow');

// Get all user-related icons
const userIcons = getIconsByCategory('users');
```

### **3. Enhanced Metadata**
```javascript
import { getIconMetadata } from './icons/index.js';

const metadata = getIconMetadata('send');
// Returns: { name, category, viewBox, defaultWidth, defaultHeight, svg }
```

### **4. Icon Sprites for Performance**
```javascript
import { createIconSprite, useSpriteIcon } from './icons/index.js';

// Create sprite for commonly used icons
const sprite = createIconSprite(['send', 'delete', 'close']);
document.head.appendChild(sprite);

// Use icons from sprite
const icon = useSpriteIcon('send', { size: 'large' });
```

## ⚠️ **Breaking Changes**

### **None!** 
This migration maintains full backward compatibility. All existing code continues to work without modifications.

## 🔧 **Update Checklist**

- [ ] Update import paths in files using `utils/svgIcons.js`
- [ ] Test icon rendering in affected components
- [ ] Consider using category-based imports for better organization
- [ ] Explore new features like icon search and metadata
- [ ] Update documentation to reference new icon locations

## 🆘 **Need Help?**

If you encounter any issues during migration:

1. **Check import paths** - Ensure you're importing from the correct location
2. **Verify icon names** - All existing icon names are preserved
3. **Test functionality** - All existing functions work the same way
4. **Use fallbacks** - The system provides fallback icons for missing ones

The new system is designed to be a drop-in replacement with enhanced capabilities while maintaining complete backward compatibility.
