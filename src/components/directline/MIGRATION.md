# DirectLine Manager Component Migration Guide

## 🔄 Migration from Legacy to Component

The DirectLine functionality has been consolidated into a reusable component structure for better maintainability and reusability across projects.

### New Component Structure
```
src/components/directline/
├── DirectLineManager.js         # Main component (enhanced)
├── DirectLineManager.css        # Complete styling system
├── DirectLineManager.test.html  # Comprehensive test suite
└── README.md                   # Full documentation
```

### Migration Steps

#### 1. Update Imports
**Before (Legacy - Now Moved):**
```javascript
// This file has been moved to legacy/directLineManager-legacy.js
// import { directLineManager } from '../services/directLineManager.js';
```

**After (New Component):**
```javascript
import { DirectLineManager, directLineManager } from '../components/directline/DirectLineManager.js';
```

#### 2. Update CSS Imports
**Add to your main CSS or HTML:**
```html
<link rel="stylesheet" href="./src/components/directline/DirectLineManager.css">
```

#### 3. Enhanced Configuration Options
**New Component supports additional config:**
```javascript
const manager = new DirectLineManager({
  timeout: 30000,           // Custom timeout
  pollingInterval: 2000,    // Custom polling
  webSocket: true,          // WebSocket streaming
  domain: 'custom-domain'   // Custom DirectLine domain
});
```

### Key Improvements

#### 🎯 Enhanced Features
- **Better Streaming Detection**: More accurate real-time message handling
- **Adaptive Typing Indicators**: Context-aware timeout calculation
- **Health Monitoring**: Real-time connection quality assessment
- **Event-Driven Architecture**: Cleaner separation of concerns

#### 🎨 Complete Styling System
- **CSS Custom Properties**: Easy theming and customization
- **Dark Theme Support**: Automatic dark mode detection
- **Accessibility**: High contrast and reduced motion support
- **Responsive Design**: Mobile-optimized layouts

#### 🧪 Comprehensive Testing
- **Interactive Test Suite**: Visual testing environment
- **Unit Tests**: Component instantiation and configuration
- **Integration Tests**: Event system and message flow
- **Performance Metrics**: Real-time monitoring

### Backward Compatibility

The legacy file has been moved to `legacy/directLineManager-legacy.js` and is no longer maintained. The current active implementation is the Simple version which provides full backward compatibility.

**Singleton Export**: The new component maintains the same singleton export for backward compatibility:
```javascript
// This still works
import { directLineManager } from '../components/directline/DirectLineManager.js';
```

### Testing the New Component

1. **Open Test Suite:**
   ```
   http://localhost:8000/src/components/directline/DirectLineManager.test.html
   ```

2. **Run Integration Tests:**
   - Initialize with your DirectLine secret
   - Test message sending/receiving
   - Verify streaming functionality
   - Check error handling

### Benefits for Other Projects

#### 🔧 Easy Integration
Copy the entire `src/components/directline/` folder to any project:
- Zero external dependencies (except DirectLine SDK)
- Self-contained styling
- Complete documentation
- Ready-to-use test suite

#### 🎨 Customizable Styling
```css
:root {
  --directline-status-online: #your-brand-color;
  --directline-font-family: 'Your-Font', sans-serif;
  --directline-border-radius: 12px;
}
```

#### 📱 Framework Agnostic
- Pure JavaScript ES6+ modules
- Works with React, Vue, Angular, or vanilla JS
- No build tools required
- Progressive enhancement ready

### Next Steps

1. **Update current project** to use new component
2. **Test thoroughly** with existing DirectLine secrets
3. **Customize styling** to match project branding
4. **Use in other projects** by copying component folder

### Support

- **Documentation**: `src/components/directline/README.md`
- **Test Suite**: `src/components/directline/DirectLineManager.test.html`
- **Examples**: See test file for usage patterns
- **Styling Guide**: CSS file has comprehensive examples

---

**Migration Timeline**: Immediate (legacy remains functional)  
**Breaking Changes**: None (backward compatible)  
**Recommended Action**: Update imports to use new component path
