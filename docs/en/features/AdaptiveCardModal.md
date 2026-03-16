# AdaptiveCardModal Component Documentation

## Overview

The `AdaptiveCardModal` is a reusable component for displaying Microsoft Adaptive Cards in modal dialogs throughout the MCSChat application. It provides a consistent, styled interface for interactive cards with proper response handling and DirectLine integration.

## Features

- ✅ **White background** for optimal readability
- ✅ **MCSChat-styled close button** matching application design
- ✅ **Responsive design** with proper mobile support
- ✅ **DirectLine integration** for bot response handling
- ✅ **Customizable options** for different use cases
- ✅ **Global instance** for easy reuse
- ✅ **Custom action handlers** for specific behaviors
- ✅ **Auto-sizing** and scrolling for long forms
- ✅ **Keyboard navigation** (Escape to close)
- ✅ **Click outside to close** functionality

## Behavior

### Submit Action Handling

When a user clicks any submit button on an adaptive card:

1. **Immediate Close**: The modal closes immediately when the submit action is triggered
2. **Background Processing**: The response is sent to DirectLine in the background
3. **No Delay**: There is no delay or loading state visible to the user
4. **Simplified UX**: This provides a more responsive user experience

### Custom Action Handlers

If you need custom processing before the modal closes, use the `onAction` handler:

```javascript
globalAdaptiveCardModal.updateOptions({
    onAction: async (action, modal) => {
        if (action instanceof AdaptiveCards.SubmitAction) {
            // Your custom processing here
            console.log('Processing:', action.data);
            
            // Return true to continue with default behavior (immediate close)
            return true;
        }
        return true;
    }
});
```

### Basic Usage with Global Instance

```javascript
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';

// Simple card display
const cardContent = {
    "type": "AdaptiveCard",
    "version": "1.4",
    "body": [
        {
            "type": "TextBlock",
            "text": "Hello World!",
            "size": "Medium"
        }
    ]
};

globalAdaptiveCardModal.open(cardContent, {
    title: "My Card"
});
```

### Advanced Usage with Custom Options

```javascript
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';

// Configure the modal
globalAdaptiveCardModal.updateOptions({
    directLineManager: window.MCSChatApp?.directLineManager,
    onAction: async (action, modal) => {
        // Custom action handling
        if (action instanceof AdaptiveCards.SubmitAction) {
            console.log('Form submitted:', action.data);
            // Custom processing here
            modal.showResponseStatus('Custom success message!', 'success');
            return false; // Prevent default handling
        }
        return true; // Continue with default handling
    },
    onClose: () => {
        console.log('Modal closed');
    }
});

// Open with form
globalAdaptiveCardModal.open(formCardContent, {
    title: "Registration Form"
});
```

### Creating Custom Instances

```javascript
import { AdaptiveCardModal } from '../components/AdaptiveCardModal.js';

const customModal = new AdaptiveCardModal({
    modalId: 'myCustomModal',
    title: 'Custom Modal',
    maxWidth: '800px',
    autoClose: false,
    onAction: async (action, modal) => {
        // Custom handling
        return true;
    }
});

customModal.init();
customModal.open(cardContent);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modalId` | string | 'adaptiveCardModal' | Unique ID for the modal element |
| `title` | string | 'Interactive Card' | Default modal title |
| `maxWidth` | string | '700px' | Maximum width of the modal |
| `onAction` | function | null | Custom action handler |
| `onClose` | function | null | Callback when modal closes |
| `directLineManager` | object | null | DirectLine manager for bot responses |
| `autoClose` | boolean | true | Auto-close immediately after submit action |
| `autoCloseDelay` | number | 2000 | Delay before auto-close (ms) - deprecated |

## API Methods

### `open(cardContent, options)`
Opens the modal with an adaptive card.

**Parameters:**
- `cardContent` (Object): Adaptive card JSON content
- `options` (Object, optional): Additional options for this opening
  - `title` (string): Override the modal title

**Returns:** Promise<void>

### `close()`
Closes the modal.

### `updateOptions(newOptions)`
Updates the modal configuration.

**Parameters:**
- `newOptions` (Object): New options to merge with existing ones

### `showResponseStatus(message, type)`
Shows a status message in the modal footer.

**Parameters:**
- `message` (string): Status message
- `type` (string): 'loading', 'success', or 'error'

### `hideResponseStatus()`
Hides the status message.

### `isModalOpen()`
Returns whether the modal is currently open.

**Returns:** boolean

### `destroy()`
Destroys the modal and cleans up resources.

## CSS Classes

The component uses the following CSS classes for styling:

- `.adaptive-card-modal` - Main modal container
- `.adaptive-card-modal-content` - Modal content wrapper
- `.adaptive-card-modal-body` - Card content area
- `.adaptive-card-modal-footer` - Footer with status messages
- `.adaptive-card-response-status` - Status message styling
- `.modal-close` - Close button (follows MCSChat styling)

## Integration with MCSChat

The component is automatically initialized in the main application:

```javascript
// In src/core/application.js
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';

// During app initialization
globalAdaptiveCardModal.init();
```

This ensures the global instance is ready for use throughout the application.

## DirectLine Integration

The modal automatically integrates with MCSChat's DirectLine system:

```javascript
// The modal will automatically use available DirectLine managers:
// 1. window.MCSChatApp?.directLineManager (preferred)
// 2. window.directLineManager (fallback)
// 3. window.directLine (legacy fallback)
```

## Examples

See `src/examples/adaptiveCardUsage.js` for complete examples including:

- Simple card display
- Form with custom action handling
- Agent-specific configuration cards
- Custom modal instances

## Styling Improvements

The modal now features:

- **White background** (`#ffffff`) for optimal readability
- **Proper contrast** with dark text (`#323130`) on white
- **MCSChat-style close button** matching the application design
- **Flexible height** with scrolling for long forms
- **Responsive design** that works on mobile and desktop
- **Proper shadows and borders** for visual separation

## Migration from Legacy

The legacy adaptive card methods in `MessageRenderer` have been replaced:

```javascript
// OLD (removed)
this.createAdaptiveCardModal()
this.handleAdaptiveCardAction()
this.sendAdaptiveCardResponse()

// NEW (using common component)
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';
globalAdaptiveCardModal.open(cardContent);
```

## Browser Support

- Modern browsers with ES6+ support
- Microsoft Adaptive Cards 2.9.0+
- Mobile browsers (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Modal not opening
- Ensure `globalAdaptiveCardModal.init()` has been called
- Check browser console for JavaScript errors
- Verify adaptive card content is valid JSON

### Actions not working
- Ensure DirectLine manager is properly configured
- Check the `onAction` handler for custom processing
- Verify adaptive card schema version compatibility

### Styling issues
- Check CSS imports for `css/components/messages.css`
- Verify modal CSS classes are properly loaded
- Ensure no conflicting CSS rules

### Mobile display issues
- Test modal width and height on different screen sizes
- Check for CSS viewport meta tag in HTML
- Verify touch interactions work properly
