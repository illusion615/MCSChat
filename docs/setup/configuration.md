# Configuration Guide

Comprehensive configuration options and customization settings for MCS Chat.

## Overview

MCS Chat offers extensive configuration options through the Settings panel and local storage. This guide covers all available settings and their effects.

## Access Settings

### Opening Settings Panel
- Click the ⚙️ gear icon in the top-right corner
- Or press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
- Settings are organized into tabs for easy navigation

### Settings Persistence
- All settings are automatically saved to browser localStorage
- Settings persist across browser sessions
- Export/import settings for backup or sharing

## Agent Management

### Agent Configuration

#### Creating Custom Agents
```javascript
// Agent structure example
{
  "name": "Custom Assistant",
  "description": "Specialized helper for specific tasks",
  "systemPrompt": "You are a helpful assistant specialized in...",
  "temperature": 0.7,
  "maxTokens": 2048,
  "enabled": true
}
```

#### Agent Properties
- **Name**: Display name for the agent
- **Description**: Brief description of agent capabilities
- **System Prompt**: Instructions that define agent behavior
- **Temperature**: Creativity level (0.0 = focused, 1.0 = creative)
- **Max Tokens**: Maximum response length
- **Enabled**: Whether agent appears in selection list

#### Default Agents
1. **General Assistant** - Balanced helper for various tasks
2. **Code Expert** - Programming and technical assistance
3. **Creative Writer** - Content creation and storytelling
4. **Data Analyst** - Data interpretation and analysis
5. **Research Assistant** - Information gathering and synthesis

### Agent Management Actions
- **Add New Agent**: Create custom agents
- **Edit Existing**: Modify agent properties
- **Duplicate Agent**: Copy and customize existing agents
- **Enable/Disable**: Toggle agent availability
- **Delete Agent**: Remove custom agents (defaults protected)

## AI Provider Configuration

### Supported Providers

#### OpenAI
```javascript
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "baseURL": "https://api.openai.com/v1",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

**Available Models**:
- `gpt-4` - Most capable, higher cost
- `gpt-4-turbo` - Fast and capable
- `gpt-3.5-turbo` - Fast and economical

#### Anthropic (Claude)
```javascript
{
  "provider": "anthropic",
  "apiKey": "sk-ant-...",
  "model": "claude-3-sonnet-20240229",
  "baseURL": "https://api.anthropic.com/v1",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

**Available Models**:
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fast and light

#### Local Ollama
```javascript
{
  "provider": "ollama",
  "model": "llama2",
  "baseURL": "http://localhost:11434",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

**Popular Models**:
- `llama2` - Meta's Llama 2
- `codellama` - Code-specialized
- `mistral` - Mistral AI models
- `neural-chat` - Intel's neural chat

#### Azure OpenAI
```javascript
{
  "provider": "azure",
  "apiKey": "your-azure-key",
  "resourceName": "your-resource",
  "deploymentName": "your-deployment",
  "apiVersion": "2023-05-15"
}
```

### API Configuration

#### API Keys Management
- Store keys securely in browser localStorage
- Keys are encrypted before storage
- Option to clear all stored keys
- Import/export encrypted key backups

#### Rate Limiting
- Built-in request throttling
- Configurable delay between requests
- Queue management for concurrent requests
- Error handling and retry logic

## AI Companion Settings

### Auto-Features Configuration

#### Conversation Titles
```javascript
{
  "autoTitleGeneration": true,
  "titleUpdateDelay": 3000,
  "titlePromptTemplate": "Generate a brief title for this conversation",
  "maxTitleLength": 50
}
```

#### Response Suggestions
```javascript
{
  "suggestedActions": true,
  "maxSuggestions": 3,
  "suggestionStyle": "buttons", // or "links"
  "autoSuggestDelay": 1000
}
```

#### Context Management
```javascript
{
  "contextWindowSize": 4000,
  "contextCompressionEnabled": true,
  "conversationMemory": true,
  "summaryGeneration": true
}
```

### AI Companion Behavior
- **Proactive Assistance**: Suggest actions and improvements
- **Context Awareness**: Remember conversation history
- **Smart Responses**: Generate relevant follow-up questions
- **Learning Mode**: Adapt to user preferences over time

## Appearance Customization

### Theme Options

#### Dark Theme (Default)
```css
{
  "theme": "dark",
  "primaryColor": "#007acc",
  "backgroundColor": "#1e1e1e",
  "textColor": "#ffffff",
  "accentColor": "#0078d4"
}
```

#### Light Theme
```css
{
  "theme": "light",
  "primaryColor": "#0078d4",
  "backgroundColor": "#ffffff",
  "textColor": "#323130",
  "accentColor": "#106ebe"
}
```

#### Custom Theme
```css
{
  "theme": "custom",
  "primaryColor": "#your-color",
  "backgroundColor": "#your-bg",
  "textColor": "#your-text",
  "accentColor": "#your-accent"
}
```

### Interface Customization

#### Chat Interface
- **Message Bubble Style**: Rounded, square, or custom
- **Font Size**: Small, medium, large, or custom
- **Line Height**: Comfortable reading spacing
- **Animation Speed**: Message appearance animations

#### Icon Settings
- **User Icons**: Choose from 10 pre-built avatars
- **Custom Icons**: Upload your own user avatar
- **Agent Icons**: Customize agent appearances
- **Icon Size**: Adjust icon dimensions

#### Layout Options
- **Sidebar Width**: Adjustable conversation list width
- **Message Spacing**: Control vertical spacing
- **Compact Mode**: Reduce UI padding for more content
- **Full-Screen Mode**: Hide browser UI elements

## Storage Configuration

### Local Storage Management

#### Data Storage
```javascript
{
  "maxConversations": 100,
  "autoCleanup": true,
  "cleanupThreshold": "30d",
  "compressionEnabled": true
}
```

#### Backup Settings
```javascript
{
  "autoBackup": true,
  "backupInterval": "weekly",
  "maxBackups": 5,
  "includeSettings": true,
  "includeConversations": true
}
```

### Export/Import

#### Export Options
- **Conversations**: Export chat history
- **Settings**: Export configuration
- **Complete Backup**: Everything in one file
- **Selective Export**: Choose specific items

#### Import Formats
- **JSON**: Native format for complete data
- **Markdown**: Conversation text export
- **CSV**: Structured data format
- **Plain Text**: Simple text format

## Security Settings

### Privacy Configuration

#### Data Protection
```javascript
{
  "encryptLocalData": true,
  "clearOnClose": false,
  "anonymizeExports": true,
  "trackingDisabled": true
}
```

#### API Security
```javascript
{
  "validateCertificates": true,
  "requireHttps": true,
  "tokenExpiration": "24h",
  "rateLimitStrict": true
}
```

### Content Filtering
- **Profanity Filter**: Block inappropriate content
- **Content Warnings**: Alert for sensitive topics
- **Safe Mode**: Extra content restrictions
- **Custom Filters**: Define your own content rules

## Performance Settings

### Optimization Options

#### Rendering Performance
```javascript
{
  "virtualScrolling": true,
  "lazyImageLoading": true,
  "animationReduction": false,
  "cacheSize": "50MB"
}
```

#### Network Optimization
```javascript
{
  "requestBatching": true,
  "compressionEnabled": true,
  "timeoutDuration": 30000,
  "retryAttempts": 3
}
```

### Memory Management
- **Conversation Limit**: Maximum stored conversations
- **Message Pruning**: Remove old messages automatically
- **Cache Management**: Control temporary file storage
- **Garbage Collection**: Automatic memory cleanup

## Advanced Configuration

### Developer Options

#### Debug Mode
```javascript
{
  "debugMode": true,
  "verboseLogging": true,
  "showPerformanceMetrics": true,
  "enableConsoleCommands": true
}
```

#### Experimental Features
```javascript
{
  "experimentalFeatures": true,
  "betaUpdates": false,
  "previewMode": false,
  "unstableApis": false
}
```

### Custom CSS/JS
- **Custom Styles**: Override default CSS
- **User Scripts**: Add custom JavaScript
- **Plugin System**: Extend functionality
- **Theme Development**: Create custom themes

## Configuration Examples

### Basic Setup
```javascript
// Minimal configuration for getting started
{
  "provider": "openai",
  "apiKey": "your-api-key",
  "model": "gpt-3.5-turbo",
  "theme": "dark",
  "autoTitleGeneration": true
}
```

### Advanced Setup
```javascript
// Comprehensive configuration
{
  "provider": "anthropic",
  "apiKey": "your-api-key",
  "model": "claude-3-sonnet-20240229",
  "temperature": 0.7,
  "maxTokens": 2048,
  "theme": "custom",
  "customColors": {
    "primary": "#6366f1",
    "background": "#0f172a"
  },
  "aiCompanion": {
    "autoTitleGeneration": true,
    "suggestedActions": true,
    "contextAware": true
  },
  "performance": {
    "virtualScrolling": true,
    "cacheSize": "100MB"
  }
}
```

### Development Setup
```javascript
// Configuration for developers
{
  "debugMode": true,
  "experimentalFeatures": true,
  "verboseLogging": true,
  "provider": "ollama",
  "model": "llama2",
  "baseURL": "http://localhost:11434"
}
```

## Troubleshooting Configuration

### Common Issues

#### Settings Not Saving
- Check browser localStorage permissions
- Verify no incognito/private mode
- Clear browser cache and reload

#### API Connection Issues
- Verify API key format and permissions
- Check network connectivity
- Confirm endpoint URLs are correct

#### Performance Problems
- Reduce cache size if memory is limited
- Disable animations on slower devices
- Lower conversation history limits

### Reset Options
- **Reset All Settings**: Return to defaults
- **Reset Appearance**: Restore default theme
- **Reset API Settings**: Clear all provider data
- **Clear All Data**: Complete application reset

## Next Steps

After configuration:

1. **[Quick Start Guide](quick-start.md)** - Test your setup
2. **[AI Companion Guide](ai-companion.md)** - Advanced AI features
3. **[Features Overview](../features/overview.md)** - Explore capabilities

---

**Note**: Changes to most settings take effect immediately. Some advanced settings may require an application restart.
