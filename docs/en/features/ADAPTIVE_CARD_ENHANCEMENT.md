# 🎴 Enhanced Adaptive Card Support

## Overview

The MCSChat application now includes comprehensive support for Microsoft Adaptive Cards with modal display and interactive response handling. This enhancement allows users to interact with adaptive cards in a dedicated modal window, providing a better user experience and proper response handling back to the bot.

## Features

### ✅ **Completed Features**

1. **Modal Display**: Adaptive cards open in a dedicated modal window instead of inline rendering
2. **Interactive Response Handling**: Users can submit form data and actions back to the bot
3. **Preview System**: Cards show a preview in chat with an "View Interactive Card" button
4. **Action Support**: Supports Submit actions, OpenUrl actions, and other adaptive card actions
5. **Responsive Design**: Modal adapts to different screen sizes
6. **Error Handling**: Comprehensive error handling for card rendering and response sending
7. **DirectLine Integration**: Seamless integration with existing DirectLine messaging system

### 🔧 **Technical Implementation**

#### Core Files Modified:
- `src/ui/messageRenderer.js` - Enhanced adaptive card rendering with modal support
- `css/components/messages.css` - New styles for adaptive card components and modal

#### New Methods Added:
- `renderAdaptiveCard()` - Enhanced to show preview and modal button
- `createAdaptiveCardPreview()` - Creates card preview content
- `openAdaptiveCardModal()` - Opens card in modal with full interactivity
- `handleAdaptiveCardAction()` - Handles user actions and responses
- `sendAdaptiveCardResponse()` - Sends responses back to bot via DirectLine

## Usage

### For Bot Developers

Send adaptive cards as attachments in DirectLine activities:

```javascript
{
  "type": "message",
  "from": { "id": "bot" },
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.3",
      "body": [
        {
          "type": "TextBlock",
          "text": "Your Adaptive Card",
          "size": "Large",
          "weight": "Bolder"
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "Submit",
          "data": {
            "action": "submit",
            "value": "user_response"
          }
        }
      ]
    }
  }]
}
```

### For End Users

1. **View Cards**: Click "View Interactive Card" button to open modal
2. **Interact**: Fill forms, click buttons, and interact with card elements
3. **Submit**: Responses are automatically sent back to the bot
4. **Navigation**: Use ESC key or close button to exit modal

## Example Card Types

### 1. Simple Feedback Card

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "Feedback Form",
      "size": "Large",
      "weight": "Bolder"
    },
    {
      "type": "Input.Text",
      "id": "feedback",
      "placeholder": "Your feedback",
      "isMultiline": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "rating",
      "style": "compact",
      "placeholder": "Rate your experience",
      "choices": [
        { "title": "Excellent", "value": "5" },
        { "title": "Good", "value": "4" },
        { "title": "Average", "value": "3" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Submit Feedback",
      "data": { "action": "submit_feedback" }
    }
  ]
}
```

### 2. Event Registration Card

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "🎫 Event Registration",
      "size": "Large",
      "weight": "Bolder"
    },
    {
      "type": "Input.Text",
      "id": "name",
      "placeholder": "Full Name",
      "isRequired": true
    },
    {
      "type": "Input.Text",
      "id": "email",
      "placeholder": "Email Address",
      "style": "Email",
      "isRequired": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "ticketType",
      "style": "compact",
      "placeholder": "Select Ticket Type",
      "choices": [
        { "title": "Early Bird - $299", "value": "early_bird" },
        { "title": "Regular - $399", "value": "regular" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Register Now",
      "data": { "action": "register_event" }
    }
  ]
}
```

## Technical Architecture

### Message Flow

1. **Bot sends adaptive card** → DirectLine → Application
2. **Card preview rendered** → Chat interface shows preview + button
3. **User clicks "View Interactive Card"** → Modal opens with full card
4. **User interacts with card** → Form data collected
5. **User submits action** → Response sent via DirectLine → Bot receives

### Response Format

When users submit adaptive card actions, the data is sent back to the bot as:

```javascript
{
  "type": "message",
  "from": { "id": "user" },
  "value": {
    // User's form data and action data
    "action": "submit_feedback",
    "feedback": "Great experience!",
    "rating": "5"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Integration Points

### DirectLine Compatibility
- Works with existing DirectLine managers
- Supports both new component system and legacy implementations
- Automatic fallback to available DirectLine connections

### UI Integration
- Uses existing modal infrastructure
- Consistent with application styling
- Responsive design for mobile devices

### Error Handling
- Graceful fallbacks for missing dependencies
- User-friendly error messages
- Console logging for debugging

## Testing

Use the test file `tests/ui/test-adaptive-card-modal.html` to verify functionality:

1. Start local server: `python3 -m http.server 9010`
2. Open: `http://localhost:9010/tests/ui/test-adaptive-card-modal.html`
3. Test different card types with the provided buttons
4. Verify modal opening, interaction, and response sending

## Browser Support

- **Modern Browsers**: Full support for all features
- **Mobile Browsers**: Responsive modal design
- **Accessibility**: Keyboard navigation (ESC to close)
- **Dependencies**: Requires AdaptiveCards library (automatically loaded)

## Migration from Legacy

The new system is backward compatible with existing adaptive card implementations:

- **Legacy code**: Still works with basic rendering
- **Enhanced features**: Available automatically with new message renderer
- **Configuration**: No additional setup required

## Troubleshooting

### Common Issues

1. **Cards not displaying**: Check AdaptiveCards library is loaded
2. **Modal not opening**: Verify CSS files are included
3. **Responses not sending**: Check DirectLine connection status
4. **Styling issues**: Ensure modal CSS is loaded after base styles

### Debug Mode

Enable debugging by setting:

```javascript
window.adaptiveCardDebug = true;
```

This will provide additional console logging for card rendering and response handling.

## Future Enhancements

Potential improvements for future releases:

- [ ] Card template library for common use cases
- [ ] Enhanced validation for form submissions
- [ ] Offline card caching
- [ ] Custom action types support
- [ ] Card analytics and usage tracking
- [ ] Integration with AI Companion for card generation

---

*For technical support or feature requests, please refer to the main project documentation.*
