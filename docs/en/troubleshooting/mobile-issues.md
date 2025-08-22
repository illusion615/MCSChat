# Mobile Troubleshooting Guide

Common issues and solutions for the mobile responsive version of MCSChat.

## 🔧 Common Mobile Issues

### Panel Display Problems

#### AI Companion Panel Not Showing
**Symptoms**: Floating AI button visible but panel doesn't open

**Solutions**:
1. Check CSS media queries are active:
   ```css
   @media (max-width: 768px) {
       #llmAnalysisPanel { display: block; }
   }
   ```

2. Verify JavaScript event listeners:
   ```javascript
   // Check if mobile utilities are loaded
   console.log(window.mobileUtils);
   ```

3. Clear browser cache and hard refresh (Ctrl+Shift+R)

#### Sidebar Not Sliding Properly
**Symptoms**: Sidebar appears instantly or doesn't animate

**Solutions**:
1. Check CSS transitions:
   ```css
   #leftPanel {
       transition: transform 0.3s ease;
   }
   ```

2. Verify transform properties:
   ```css
   #leftPanel.mobile-open {
       transform: translateX(0);
   }
   ```

### Touch and Gesture Issues

#### Swipe Gestures Not Working
**Symptoms**: Can't swipe to open/close panels

**Solutions**:
1. Check touch event listeners are bound:
   ```javascript
   // Debug touch events
   document.addEventListener('touchstart', (e) => {
       console.log('Touch start:', e.touches[0].clientX);
   });
   ```

2. Verify passive event listeners:
   ```javascript
   document.addEventListener('touchstart', handler, { passive: true });
   ```

3. Check for conflicting CSS:
   ```css
   /* Remove if present */
   touch-action: none; /* This blocks gestures */
   ```

#### Buttons Too Small to Tap
**Symptoms**: Difficulty tapping buttons on mobile

**Solutions**:
1. Ensure minimum touch targets:
   ```css
   .mobile-button {
       min-width: 44px;
       min-height: 44px;
   }
   ```

2. Add adequate spacing:
   ```css
   .button-group {
       gap: 8px;
   }
   ```

### Layout and Positioning Issues

#### AI Toggle Button Overlapping Send Button
**Symptoms**: Floating AI button covers send button

**Solutions**:
1. Adjust positioning:
   ```css
   .mobile-ai-toggle {
       bottom: 80px; /* Increase distance from bottom */
       right: 16px;
   }
   ```

2. Check z-index conflicts:
   ```css
   .mobile-ai-toggle {
       z-index: 1001; /* Higher than other elements */
   }
   ```

#### Panel Extending Beyond Screen Edge
**Symptoms**: Part of panel visible when closed

**Solutions**:
1. Use viewport units:
   ```css
   #llmAnalysisPanel {
       right: -100vw; /* Use viewport width */
       width: 100vw;
   }
   ```

2. Check max-width constraints:
   ```css
   #llmAnalysisPanel {
       max-width: none; /* Remove on mobile */
   }
   ```

### Performance Issues

#### Slow Panel Animations
**Symptoms**: Choppy or slow sliding animations

**Solutions**:
1. Use hardware acceleration:
   ```css
   .sliding-panel {
       transform: translateZ(0); /* Force GPU acceleration */
       will-change: transform;
   }
   ```

2. Optimize transitions:
   ```css
   .panel-transition {
       transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
   }
   ```

#### Memory Issues on Mobile
**Symptoms**: App becomes unresponsive on mobile devices

**Solutions**:
1. Check for memory leaks:
   ```javascript
   // Remove event listeners properly
   document.removeEventListener('touchstart', handler);
   ```

2. Optimize image sizes:
   ```html
   <!-- Use appropriate image sizes -->
   <img src="image-mobile.jpg" alt="Mobile optimized image">
   ```

## 🔍 Debugging Tools

### Mobile Debug Console
Enable debug mode for mobile utilities:

```javascript
// Add to browser console
window.mobileUtils.debugMode = true;

// Check mobile state
console.log('Is mobile:', window.mobileUtils.isMobile);
console.log('Sidebar open:', window.mobileUtils.sidebarOpen);
console.log('AI panel open:', window.mobileUtils.aiPanelOpen);
```

### CSS Debug Helpers
Add temporary debug styles:

```css
/* Debug panel boundaries */
.debug-panels {
    outline: 2px solid red !important;
}

/* Debug touch targets */
.debug-touch {
    background: rgba(255, 0, 0, 0.3) !important;
}
```

### Responsive Testing
Test different screen sizes:

```javascript
// Simulate different viewports
window.resizeTo(375, 667); // iPhone SE
window.resizeTo(768, 1024); // iPad
window.resizeTo(360, 640); // Android
```

## 📱 Device-Specific Issues

### iOS Safari Issues

#### Input Zoom Prevention
**Problem**: iOS zooms when focusing on inputs

**Solution**:
```css
input, textarea {
    font-size: 16px; /* Minimum to prevent zoom */
}
```

#### Viewport Height Issues
**Problem**: `100vh` doesn't account for Safari UI

**Solution**:
```css
.full-height {
    height: 100vh;
    height: -webkit-fill-available;
}
```

### Android Chrome Issues

#### Address Bar Hiding
**Problem**: Layout jumps when address bar hides

**Solution**:
```css
.mobile-container {
    min-height: 100vh;
    min-height: -webkit-fill-available;
}
```

#### Hardware Back Button
**Problem**: Back button doesn't close panels

**Solution**:
```javascript
// Handle hardware back button
window.addEventListener('popstate', (e) => {
    if (mobileUtils.sidebarOpen || mobileUtils.aiPanelOpen) {
        mobileUtils.closeAllPanels();
        history.pushState(null, null, location.href);
    }
});
```

## 🛠️ Development Tools

### Mobile Testing Setup
1. **Chrome DevTools**: Use device emulation
2. **Firefox Responsive Mode**: Test different screen sizes
3. **Safari Web Inspector**: iOS-specific testing
4. **Real Device Testing**: Always test on actual devices

### CSS Debugging
```css
/* Temporary mobile debug styles */
@media (max-width: 768px) {
    * {
        outline: 1px solid rgba(255, 0, 0, 0.3);
    }
    
    .mobile-panel {
        background: rgba(0, 255, 0, 0.1) !important;
    }
}
```

### JavaScript Debugging
```javascript
// Mobile event debugging
document.addEventListener('touchstart', (e) => {
    console.log('Touch Start:', {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        target: e.target.tagName
    });
});

document.addEventListener('touchend', (e) => {
    console.log('Touch End:', e.changedTouches[0]);
});
```

## 🚨 Emergency Fixes

### Quick CSS Override
If mobile layout is completely broken:

```css
/* Emergency mobile reset */
@media (max-width: 768px) {
    #leftPanel,
    #llmAnalysisPanel {
        position: relative !important;
        transform: none !important;
        width: 100% !important;
        height: auto !important;
    }
}
```

### JavaScript Fallback
If mobile utilities fail to load:

```javascript
// Emergency mobile fallback
if (!window.mobileUtils) {
    const menuBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('leftPanel');
    
    menuBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('mobile-open');
    });
}
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check browser console** for JavaScript errors
2. **Validate CSS** using online validators
3. **Test on multiple devices** to isolate device-specific issues
4. **File an issue** on GitHub with device and browser details

### Useful Information to Include
- Device model and OS version
- Browser name and version
- Screen resolution and orientation
- Steps to reproduce the issue
- Browser console error messages
- Screenshots or screen recordings

For more help, visit our [GitHub Issues](https://github.com/illusion615/MCSChat/issues) page.
