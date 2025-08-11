# DirectLine Manager Component

A reusable, feature-rich component for managing Microsoft Bot Framework DirectLine API connections with enhanced streaming support, adaptive typing indicators, and comprehensive error handling.

## 🚀 Features

- **WebSocket Streaming**: Real-time message streaming with health monitoring
- **Adaptive Typing Indicators**: Intelligent timeout calculation based on message context  
- **Enhanced Error Handling**: Detailed error messages and connection status management
- **Event-Driven Architecture**: Loose coupling through custom events
- **Streaming Detection**: Automatic detection and simulation of streaming messages
- **Connection Recovery**: Automatic retry and reconnection mechanisms
- **Health Monitoring**: Real-time connection quality assessment
- **Theme Support**: Dark theme, high contrast, and reduced motion support

## 📦 Installation

### Option 1: Direct Integration
Copy the component files to your project:
```
src/components/directline/
├── DirectLineManager.js     # Main component
├── DirectLineManager.css    # Styles
├── README.md               # This documentation
└── DirectLineManager.test.html  # Test suite
```

### Option 2: ES Module Import
```javascript
import { DirectLineManager } from './src/components/directline/DirectLineManager.js';
```

### Option 3: Singleton Instance
```javascript
import { directLineManager } from './src/components/directline/DirectLineManager.js';
```

## 🔧 Dependencies

- **Microsoft Bot Framework DirectLine API** (auto-detected version)
- **Modern browser** with ES6+ support
- **Utils helper library** (optional, for enhanced functionality)

### Compatibility
The component works with both legacy and modern DirectLine libraries:

#### Legacy DirectLine (botframework-directlinejs@0.11.6) - **Recommended for existing projects**
```html
<script src="https://unpkg.com/botframework-directlinejs@0.11.6/dist/directline.js"></script>
<link rel="stylesheet" href="./src/components/directline/DirectLineManager.css">
```

#### Modern DirectLine (botframework-directline@3.0.3) - **For new projects**
```html
<script src="https://cdn.botframework.com/botframework-directline/3.0.3/directline.js"></script>
<link rel="stylesheet" href="./src/components/directline/DirectLineManager.css">
```

### Auto-Detection
The component automatically detects which DirectLine version is available:
```javascript
const manager = new DirectLineManager();
console.log(manager.directLineVersion); // 'legacy', 'modern', or 'unknown'
```

### Auto-Loading (Built-in)
If no DirectLine library is detected, the component will attempt to load one automatically:
```javascript
// Component will try modern first, then fallback to legacy
const manager = new DirectLineManager();
await manager.initialize('your-secret'); // Auto-loads if needed
```

## 🚦 Quick Start

### Basic Usage
```javascript
import { DirectLineManager } from './src/components/directline/DirectLineManager.js';

const manager = new DirectLineManager();

// Initialize connection
await manager.initialize('your-directline-secret');

// Set up event listeners
manager.setCallbacks({
  onActivity: (activity) => {
    console.log('Received message:', activity);
  },
  onError: (error) => {
    console.error('Connection error:', error);
  }
});

// Send a message
await manager.sendMessage('Hello, bot!');
```

### Advanced Configuration
```javascript
const manager = new DirectLineManager({
  timeout: 30000,           // 30 second timeout
  pollingInterval: 2000,    // 2 second polling fallback
  webSocket: true,          // Enable WebSocket streaming
  domain: 'https://your-custom-domain.com/v3/directline'
});
```

## 📡 Event System

The component uses a robust event-driven architecture for loose coupling:

### Core Events
```javascript
// Connection status changes
window.addEventListener('connectionStatus', (event) => {
  const { status, message, code } = event.detail;
  console.log(`Status: ${status} - ${message}`);
});

// Message received
window.addEventListener('messageReceived', (event) => {
  const activity = event.detail;
  // Handle complete message
});

// Streaming chunk received
window.addEventListener('streamingChunk', (event) => {
  const { chunkNumber, duration, isStreaming } = event.detail;
  // Handle streaming chunk
});

// Typing indicator
window.addEventListener('showTypingIndicator', (event) => {
  const { timestamp, expectedDuration } = event.detail;
  // Show typing animation
});

// Connection errors
window.addEventListener('connectionError', (event) => {
  const { error, message } = event.detail;
  // Handle error state
});
```

### Health Monitoring Events
```javascript
window.addEventListener('streamingHealth', (event) => {
  const { connectionQuality, messagesReceived, isOnline } = event.detail;
  // Monitor connection health
});
```

## 🎨 Styling & Theming

### Basic Usage
```html
<link rel="stylesheet" href="./src/components/directline/DirectLineManager.css">
```

### Connection Status Indicator
```html
<div class="directline-status directline-status--online">
  <div class="directline-status__indicator"></div>
  <span class="directline-status__text">Connected</span>
</div>
```

### Typing Indicator
```html
<div class="directline-typing directline-typing--enhanced">
  <div class="directline-typing__dots">
    <div class="directline-typing__dot"></div>
    <div class="directline-typing__dot"></div>
    <div class="directline-typing__dot"></div>
  </div>
  <span class="directline-typing__text">Bot is typing...</span>
</div>
```

### Custom Theming
```css
:root {
  --directline-status-online: #00c851;
  --directline-status-error: #ff3547;
  --directline-font-family: 'Your Custom Font', sans-serif;
  --directline-border-radius: 8px;
}
```

## 🧪 API Reference

### Constructor
```javascript
new DirectLineManager(config?)
```

**Parameters:**
- `config` (Object, optional): Configuration options
  - `timeout` (number): Connection timeout in milliseconds (default: 20000)
  - `pollingInterval` (number): Polling fallback interval (default: 1000)
  - `webSocket` (boolean): Enable WebSocket streaming (default: true)
  - `domain` (string): DirectLine API domain

### Core Methods

#### `initialize(secret)`
Initialize DirectLine connection.
```javascript
const success = await manager.initialize('your-directline-secret');
```

#### `sendMessage(text, attachments?)`
Send a text message with optional attachments.
```javascript
const messageId = await manager.sendMessage('Hello!', [fileAttachment]);
```

#### `sendActivity(activity)`
Send a custom DirectLine activity.
```javascript
const activityId = await manager.sendActivity({
  type: 'event',
  name: 'customEvent',
  value: { data: 'custom' }
});
```

#### `setCallbacks(callbacks)`
Set callback functions for external integration.
```javascript
manager.setCallbacks({
  onActivity: (activity) => { /* handle activity */ },
  onConnectionStatusChange: (status) => { /* handle status */ },
  onError: (error) => { /* handle error */ }
});
```

### Utility Methods

#### `isConnected()`
Check connection status.
```javascript
const connected = manager.isConnected(); // boolean
```

#### `getStreamingMetrics()`
Get real-time streaming metrics.
```javascript
const metrics = manager.getStreamingMetrics();
// { messagesReceived, connectionQuality, averageLatency }
```

#### `getConfig()`
Get current configuration.
```javascript
const config = manager.getConfig();
```

#### `disconnect()`
Disconnect and cleanup resources.
```javascript
manager.disconnect();
```

#### `restart(secret)`
Restart connection with new secret.
```javascript
const success = await manager.restart('new-directline-secret');
```

### Static Methods

#### `DirectLineManager.getVersion()`
Get component version.
```javascript
const version = DirectLineManager.getVersion(); // '1.0.0'
```

#### `DirectLineManager.getInfo()`
Get component information.
```javascript
const info = DirectLineManager.getInfo();
// { name, version, description, features, dependencies }
```

## 🔄 Connection States

| State           | Description             | CSS Class                          | Event              |
| --------------- | ----------------------- | ---------------------------------- | ------------------ |
| `uninitialized` | Not connected           | `directline-status--uninitialized` | -                  |
| `connecting`    | Establishing connection | `directline-status--connecting`    | `connectionStatus` |
| `online`        | Connected and ready     | `directline-status--online`        | `connectionStatus` |
| `expired`       | Token expired           | `directline-status--expired`       | `connectionError`  |
| `failed`        | Connection failed       | `directline-status--error`         | `connectionError`  |
| `ended`         | Connection ended        | `directline-status--ended`         | `connectionError`  |

## 🎭 Streaming Support

### Automatic Detection
The component automatically detects streaming messages based on:
- `channelData.streaming` property
- Message timing and size patterns
- Attachment and suggested action presence

### Manual Streaming Control
```javascript
// Handle streaming chunks
window.addEventListener('streamingChunk', (event) => {
  const { text, chunkNumber, duration } = event.detail;
  updateMessageDisplay(text, chunkNumber);
});

// Handle streaming end
window.addEventListener('streamingEnd', (event) => {
  const { totalChunks, duration } = event.detail;
  finalizeMessage(totalChunks, duration);
});
```

## 🚨 Error Handling

### Error Categories
1. **Initialization Errors**: Invalid secret, library not loaded
2. **Connection Errors**: Network issues, timeout
3. **Runtime Errors**: Message sending failures, unexpected disconnections

### Error Recovery
```javascript
manager.setCallbacks({
  onError: async (error) => {
    if (error.message.includes('Invalid secret')) {
      // Prompt for new secret
      const newSecret = await promptForSecret();
      await manager.restart(newSecret);
    } else if (error.message.includes('network')) {
      // Retry connection
      setTimeout(() => manager.restart(currentSecret), 5000);
    }
  }
});
```

## 🎯 Best Practices

### 1. Resource Management
```javascript
// Always cleanup when component unmounts
window.addEventListener('beforeunload', () => {
  manager.disconnect();
});
```

### 2. Error Boundaries
```javascript
try {
  await manager.sendMessage(userInput);
} catch (error) {
  // Handle gracefully
  showErrorMessage('Failed to send message. Please try again.');
}
```

### 3. Performance Optimization
```javascript
// Use singleton for global state
import { directLineManager } from './DirectLineManager.js';

// Or create instance per chat session
const sessionManager = new DirectLineManager({
  timeout: 15000 // Shorter timeout for better UX
});
```

## 🧪 Testing

Run the test suite:
```bash
# Open test file in browser
open ./src/components/directline/DirectLineManager.test.html

# Or serve via HTTP
python -m http.server 8000
# Navigate to http://localhost:8000/src/components/directline/DirectLineManager.test.html
```

Test coverage includes:
- ✅ Connection initialization and cleanup
- ✅ Message sending and receiving
- ✅ Error handling and recovery
- ✅ Streaming detection and simulation
- ✅ Event emission and callback execution
- ✅ Health monitoring and metrics

## 🔧 Troubleshooting

### Common Issues

**DirectLine library not found**
```javascript
// Manual loading with error handling
try {
  await manager.initialize('your-secret');
} catch (error) {
  if (error.message.includes('DirectLine library')) {
    // The component will automatically attempt to load from multiple CDNs
    console.log('Component is loading DirectLine library...');
  }
}
```

**Connection timeouts**
```javascript
// Increase timeout for slow networks
const manager = new DirectLineManager({ timeout: 30000 });
```

**CORS issues**
```javascript
// Use custom domain if needed
const manager = new DirectLineManager({
  domain: 'https://your-proxy-domain.com/v3/directline'
});
```

**CDN Loading Issues**
The component automatically tries multiple CDN sources:
1. `https://cdn.botframework.com/botframework-directline/3.0.3/directline.js`
2. `https://unpkg.com/botframework-directline@3.0.3/built/directline.js`
3. `https://cdn.jsdelivr.net/npm/botframework-directline@3.0.3/built/directline.js`

If all CDNs fail, consider:
- Hosting the DirectLine library locally
- Using npm package with bundler
- Checking firewall/network restrictions

### Debug Mode
```javascript
// Enable verbose logging
window.directLineDebug = true;

// Monitor all events
['connectionStatus', 'messageReceived', 'streamingChunk', 'connectionError']
  .forEach(event => {
    window.addEventListener(event, (e) => {
      console.log(`[DirectLine] ${event}:`, e.detail);
    });
  });
```

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📚 Related Documentation

- [Microsoft Bot Framework DirectLine API](https://docs.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-direct-line-3-0-concepts)
- [WebChat Integration Guide](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-channel-connect-webchat)
- [Bot Framework Emulator](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-debug-emulator)

## 📞 Support

For issues and questions:
- Check the [Troubleshooting](#-troubleshooting) section
- Review [test cases](DirectLineManager.test.html) for usage examples
- Open an issue with detailed reproduction steps

---

**Version**: 1.0.0  
**Last Updated**: August 2025  
**Compatibility**: Modern browsers with ES6+ support
