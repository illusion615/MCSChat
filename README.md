# MCSChat - Advanced Chatbot Interface

A sophisticated chatbot user interface that demonstrates how to create a customized chat experience with multiple AI backends, featuring Microsoft Copilot Studio integration via DirectLine API, AI companion analysis, and local Ollama model support with real-time streaming capabilities.

## 🚀 Features

### Core Functionality
- **Multi-Agent Management**: Support for multiple chatbot agents with individual configurations
- **AI Companion Analysis**: Real-time conversation analysis with performance metrics and insights
- **Secure Credential Storage**: AES-256 encrypted storage for API keys and secrets
- **Real-time Streaming**: Support for both simulated and genuine streaming responses
- **File Upload Support**: Drag-and-drop file uploads with preview and attachment handling
- **Chat History Management**: Persistent conversation history with session management
- **Responsive Design**: Modern, mobile-friendly interface with customizable font sizes
- **Enhanced Settings Panel**: Organized configuration interface with navigation and sections

### AI Backend Integrations
- **Microsoft Copilot Studio**: Full DirectLine API integration with adaptive cards and suggested actions
- **Local Ollama Models**: Native support for local LLM models with automatic model discovery
- **Multi-Provider API Support**: OpenAI GPT, Anthropic Claude, Azure OpenAI support
- **CORS-Free Local Access**: Built-in proxy server for seamless local model connectivity

### AI Companion Features
- **Performance Analytics**: Real-time KPI tracking (Accuracy, Helpfulness, Completeness, etc.)
- **Conversation Analysis**: AI-powered insights and conversation summarization
- **Agent Performance Monitoring**: Visual metrics with trend analysis and scoring
- **Interactive Analysis**: Quick actions for analyzing responses and suggesting improvements
- **Contextual Insights**: Conversation-aware analysis with detailed explanations

### Advanced Features
- **Streaming Response Display**: Real-time message rendering with typing indicators
- **Adaptive Card Rendering**: Rich card display for complex bot responses
- **Suggested Actions**: Interactive quick-reply buttons for enhanced UX
- **Connection Testing**: Built-in connectivity testing for all configured backends
- **Session Management**: Automatic session handling with conversation continuity
- **Error Handling**: Comprehensive error reporting and recovery mechanisms
- **Font Customization**: Adjustable font sizes for agent and AI companion chats
- **Consolidated Initialization**: Unified startup process for consistent user experience

### Developer Features
- **Modular Architecture**: Clean separation of concerns with reusable components
- **Event-Driven Design**: Comprehensive event handling for all user interactions
- **Debug Console Integration**: Detailed logging for troubleshooting and development
- **Configuration Management**: Centralized settings with organized navigation
- **Extension Ready**: Pluggable architecture for adding new AI providers

## 📋 Quick Start

### Basic Setup
1. **Get DirectLine Secret**: Find your secret in Microsoft Copilot Studio web channel security
   ![DirectLine Secret](image-2.png)

2. **Open the Modular Application**: Launch `index-modular.html` in your browser
   ![Application Interface](image-4.png)

3. **Configure Agent**: Click setup button, navigate to Agent Management section, input your secret, test and save configuration
   ![Agent Configuration](image-1.png)

4. **Enable AI Companion** (Optional): In settings, go to AI Companion section to enable analysis features
   
5. **Customize Appearance** (Optional): Adjust font sizes in the Appearance section for optimal readability

6. **Start Chatting**: Begin interacting with your configured agent
   ![Chat Interface](image-3.png)

### Legacy Version
- For the original monolithic version, use `index.html` with `chat-legacy.js`
- The modular version (`index-modular.html`) is recommended for new deployments

### Local Ollama Setup
1. **Start CORS Proxy**: `node ollama-proxy.js` (handles browser CORS restrictions)
2. **Configure Ollama**: In settings AI Companion section, select "Local Ollama" as API provider
3. **Test Connection**: Use built-in connection test to verify setup
4. **Select Model**: Choose from automatically discovered local models

### AI Companion Configuration
1. **Enable AI Companion**: In settings, check "Enable AI Companion" in the AI Companion section
2. **Select Provider**: Choose from OpenAI GPT, Anthropic Claude, Azure OpenAI, or Local Ollama
3. **Enter Credentials**: Add your API key for cloud providers or configure Ollama URL
4. **Test Connection**: Verify the AI companion connection before use
5. **Start Analysis**: Use quick actions or custom prompts for conversation analysis

### Development Server Setup
```bash
# Start the chat application server
node chat-server.js
# Access at http://localhost:8080

# Start the Ollama CORS proxy (if using local models)
node ollama-proxy.js
# Proxy runs at http://localhost:3001
```

## 🛠️ Technical Architecture

### Frontend Components
- **Chat Interface**: Real-time messaging with streaming support and dual-panel layout
- **Agent Manager**: Multi-agent configuration and switching with status monitoring
- **AI Companion Panel**: Performance analytics, conversation analysis, and KPI tracking
- **Enhanced Settings Panel**: Organized configuration with navigation (Agent Management, AI Companion, Appearance)
- **File Handler**: Drag-and-drop uploads with preview
- **Stream Manager**: Progressive response rendering system
- **Security Layer**: Client-side encryption for sensitive data
- **Font Customization**: User-configurable font sizes for optimal readability

### Backend Integrations
- **DirectLine Client**: Microsoft Bot Framework connectivity
- **Ollama Interface**: Local model API integration  
- **Proxy Server**: CORS-compliant local model access
- **Storage Engine**: Encrypted localStorage with key management

### Security Features
- **AES-256 Encryption**: All credentials encrypted at rest
- **Key Derivation**: Secure key generation and management
- **Session Security**: Temporary credential handling
- **CORS Protection**: Secure cross-origin request handling

## 📁 Project Structure

```
MCSChat/
├── index.html              # Legacy application interface (monolithic)
├── index-modular.html      # Modern modular application interface
├── chat-legacy.js          # Original monolithic application logic (backup)
├── styles.css              # Application styling and responsive design
├── ollama-proxy.js         # CORS proxy server for local Ollama access
├── chat-server.js          # Development HTTP server
├── streaming-example.js    # Reference implementation for streaming APIs
├── images/                 # UI assets and screenshots
├── src/                    # Modular source code architecture
│   ├── main.js             # Application entry point and initialization
│   ├── core/
│   │   └── application.js  # Main application controller and orchestrator
│   ├── managers/
│   │   ├── agentManager.js # Multi-agent configuration and management
│   │   └── sessionManager.js # Chat session and history management
│   ├── services/
│   │   └── directLineManager.js # DirectLine API integration and connection
│   ├── ui/
│   │   └── messageRenderer.js # Message display, adaptive cards, streaming
│   ├── ai/
│   │   └── aiCompanion.js  # Ollama integration and AI companion features
│   └── utils/
│       ├── encryption.js   # AES-256-GCM encryption utilities
│       ├── secureStorage.js # Encrypted localStorage wrapper
│       ├── domUtils.js     # DOM manipulation helpers with error handling
│       └── helpers.js      # General utility functions and ID generation
└── README.md              # This documentation
```

## 🏗️ Module Architecture

### Core Components
- **Application Controller** (`src/core/application.js`): Central orchestrator managing all modules and coordinating application lifecycle
- **Main Entry Point** (`src/main.js`): Application initialization, error handling, and DOM ready management

### Manager Layer
- **AgentManager**: Handles multiple bot configurations, agent switching, and credential management
- **SessionManager**: Manages chat sessions, message history, conversation state, and storage

### Service Layer  
- **DirectLineManager**: Microsoft Bot Framework DirectLine API integration with connection handling

### UI Layer
- **MessageRenderer**: Message display, adaptive card rendering, streaming text, and user interaction

### AI Integration
- **AICompanion**: Ollama model integration, conversation analysis, KPI tracking, and AI-powered insights

### Utility Layer
- **Encryption**: AES-256-GCM encryption for secure credential and conversation storage
- **SecureStorage**: Encrypted localStorage wrapper with key management
- **DOMUtils**: Safe DOM manipulation with comprehensive error handling
- **Helpers**: Common utilities (debounce, throttle, ID generation, formatting)

### Design Patterns
- **ES6 Modules**: Clean import/export system with explicit dependencies
- **Singleton Pattern**: Shared instances for managers and services
- **Event-Driven Architecture**: Modular communication through custom events
- **Separation of Concerns**: Each module has a single, well-defined responsibility

## 🔧 Configuration Options

### Agent Settings (Agent Management Section)
- **Agent Name**: Friendly identifier for the bot
- **DirectLine Secret**: Azure Bot Service authentication key
- **Connection Status**: Real-time connectivity monitoring
- **Streaming Options**: Enable/disable streaming response simulation

### AI Companion Settings (AI Companion Section)
- **Provider Selection**: Choose between OpenAI GPT, Anthropic Claude, Azure OpenAI, or Local Ollama
- **API Configuration**: Secure storage of API keys and credentials
- **Model Selection**: Automatic discovery and selection of available models
- **Connection Testing**: Built-in connectivity verification

### Appearance Settings (Appearance Section)
- **Agent Chat Font Size**: Customizable font size (10-20px) for agent conversation messages
- **AI Companion Font Size**: Separate font size control (8-16px) for companion analysis
- **Real-time Preview**: Instant font size changes with live preview

### Streaming Options
- **Simulation Mode**: Progressive display of complete responses
- **Real Streaming**: Genuine streaming from compatible APIs
- **Provider Selection**: Choose between DirectLine, Ollama, OpenAI, etc.

### File Upload Settings
- **Supported Formats**: Images, documents, and text files
- **Size Limits**: Configurable upload restrictions
- **Preview Mode**: Automatic file preview before sending

## 🔌 API Integration Guide

### Adding New Providers
1. **Implement Provider Interface**: Follow the `sendToOllama` pattern
2. **Add UI Configuration**: Extend the provider selection dropdown
3. **Handle Streaming**: Implement progressive response display
4. **Add Connection Testing**: Create provider-specific health checks

### Custom Streaming Implementation
```javascript
async function handleCustomStreaming(message) {
    // Your streaming implementation here
    // Follow the pattern in handleOllamaStreaming()
}
```

## 🚦 Troubleshooting

### Common Issues
- **CORS Errors**: Use the included `ollama-proxy.js` for local models
- **Connection Failures**: Verify DirectLine secrets and network connectivity
- **File Upload Issues**: Check file size limits and format restrictions
- **Streaming Problems**: Ensure proper API provider configuration

### Debug Mode
Enable detailed logging by opening browser developer tools. All operations are logged with timestamps and context.

---

## 📅 Changelog

### Version 3.2.0 (Current - AI Companion & Enhanced UX)
**Major Features Added:**
- 🆕 **AI Companion Panel**: Complete conversation analysis system with real-time KPI tracking
- 🆕 **Performance Analytics**: Accuracy, Helpfulness, Completeness, Human-likeness, and Efficiency metrics
- 🆕 **Enhanced Settings Panel**: Organized navigation with Agent Management, AI Companion, and Appearance sections
- 🆕 **Font Customization**: User-configurable font sizes for agent chat and AI companion messages
- 🆕 **Consolidated Initialization**: Unified startup process for "New Chat" and page refresh
- 🆕 **Multi-Provider AI Support**: OpenAI GPT, Anthropic Claude, Azure OpenAI, and Local Ollama integration

**UI/UX Improvements:**
- ⚡ **Wider Settings Modal**: Extended to 800px width with responsive navigation
- ⚡ **Section-Based Configuration**: Logical grouping of related settings with quick navigation
- ⚡ **Real-time Font Preview**: Instant font size changes with live preview
- ⚡ **Improved AI Companion Styling**: Consistent message styling with proper user/bot alignment
- ⚡ **Enhanced Mobile Support**: Responsive navigation that adapts to smaller screens
- ⚡ **Better Visual Hierarchy**: Section titles, organized layouts, and improved spacing

**Technical Enhancements:**
- 🔧 **Event-Driven Navigation**: Smooth section switching with active state management
- 🔧 **Persistent Settings**: All customizations saved to localStorage with encryption
- 🔧 **Modular AI Integration**: Clean separation of AI providers with extensible architecture
- 🔧 **Improved Error Handling**: Better user feedback and recovery mechanisms
- 🔧 **Performance Optimization**: Efficient DOM updates and reduced re-renders

### Version 3.1.0 (2025-07-27)
**Added:**
- 🆕 **AI Companion Integration**: Conversation analysis and insights powered by multiple AI providers
- 🆕 **KPI Tracking System**: Real-time performance metrics with visual indicators
- 🆕 **Quick Analysis Actions**: One-click conversation analysis, summarization, and title suggestions
- 🆕 **Conversation Context**: Automatic context inclusion for AI companion analysis
- 🆕 **Interactive Metrics**: Clickable KPI items with detailed explanations and calculations

**Improved:**
- ⚡ **Dual-Panel Layout**: Side-by-side agent chat and AI companion analysis
- ⚡ **Responsive Design**: Adaptive layout for different screen sizes and orientations
- ⚡ **Message Styling**: Enhanced visual distinction between user and bot messages
- ⚡ **Settings Organization**: Improved configuration flow with better user guidance

### Version 3.0.0 (2025-07-26 - Modular Architecture)
**Major Refactoring:**
- 🔄 Complete modular architecture implementation with ES6 modules
- 🔄 Separated monolithic `chat.js` (3799 lines) into focused, maintainable modules
- 🔄 Implemented clean separation of concerns with utils/, managers/, services/, ui/, ai/, and core/ layers
- 🔄 Added singleton pattern for shared instances and improved state management
- 🔄 Created new `index-modular.html` as the recommended entry point
- 🔄 Preserved legacy functionality in `chat-legacy.js` for backward compatibility

**Improved:**
- ⚡ Enhanced maintainability with smaller, focused modules (50-400 lines each)
- ⚡ Better error handling and debugging capabilities across all modules
- ⚡ Improved code reusability and testability through modular design
- ⚡ More intuitive project structure following modern JavaScript best practices

### Version 2.1.0 (2025-07-26)
**Added:**
- 🆕 Native Ollama integration with automatic model discovery
- 🆕 CORS proxy server for browser-based local model access
- 🆕 Multi-provider API framework (OpenAI, Anthropic ready)
- 🆕 Real-time streaming response display
- 🆕 Enhanced error handling with specific troubleshooting guidance
- 🆕 Automatic connection testing for all configured backends

**Improved:**
- ⚡ Enhanced multi-agent management with visual status indicators
- ⚡ Upgraded security with AES-256 encryption for all credentials
- ⚡ Better responsive design for mobile and tablet devices
- ⚡ Optimized DirectLine connection handling with retry logic

**Fixed:**
- 🐛 Resolved CORS issues with local Ollama installations
- 🐛 Fixed streaming message finalization edge cases
- 🐛 Corrected file upload handling for large attachments
- 🐛 Improved session management and conversation continuity

### Version 2.0.0 (2025-07-25)
**Added:**
- 🆕 Multi-agent support with centralized management
- 🆕 Encrypted credential storage with secure key management
- 🆕 File upload with drag-and-drop support
- 🆕 Streaming response simulation for enhanced UX
- 🆕 Session-based chat history management
- 🆕 Comprehensive error handling and user feedback

**Improved:**
- ⚡ Modernized UI with improved accessibility
- ⚡ Enhanced DirectLine integration with better connection stability
- ⚡ Optimized chat history storage and retrieval
- ⚡ Better responsive design for various screen sizes

### Version 1.0.0 (2025-07-24)
**Initial Release:**
- ✨ Basic DirectLine API integration
- ✨ Simple chat interface with message rendering
- ✨ Adaptive card support for rich bot responses
- ✨ Suggested actions for interactive conversations
- ✨ Basic configuration management

---

*Last Updated: July 28, 2025*
*Project maintained by: [MCSChat Contributors](https://github.com/illusion615/MCSChat)*