# System Architecture

Comprehensive overview of MCS Chat's architecture, components, and design patterns.

## Architecture Overview

MCS Chat follows a **modular, component-based architecture** designed for scalability, maintainability, and extensibility.

### Core Principles

- **Modular Design**: Self-contained components with clear interfaces
- **Event-Driven Architecture**: Loose coupling through event systems
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Client-Side Focus**: Minimal server dependencies
- **Extensible Framework**: Plugin-ready architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presentation  │    │   Application   │    │   Data Layer    │
│     Layer       │    │     Layer       │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • UI Components │    │ • Core Logic    │    │ • Local Storage │
│ • Message       │◄──►│ • Managers      │◄──►│ • Session Mgmt  │
│   Rendering     │    │ • Services      │    │ • State Mgmt    │
│ • Event         │    │ • AI Integration│    │ • Data Models   │
│   Handling      │    │ • Utilities     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External      │    │   Browser APIs  │    │   Third-Party   │
│   Services      │    │                 │    │   Libraries     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • OpenAI API    │    │ • DOM API       │    │ • Marked.js     │
│ • Anthropic API │    │ • Storage API   │    │ • DOMPurify     │
│ • Ollama        │    │ • Fetch API     │    │ • ES6 Modules   │
│ • Azure OpenAI  │    │ • Event API     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Directory Structure

### Root Level
```
MCSChat/
├── index.html              # Main application entry point
├── chat-server.js          # Node.js development server
├── ollama-proxy.js         # CORS proxy for Ollama
├── utils/                  # Development utilities and debugging tools
├── legacy/                 # Legacy files including styles-legacy.css
└── test-*.html            # Feature test pages
```

### Source Code Organization
```
src/
├── main.js                 # Application bootstrap and initialization
├── core/
│   └── application.js      # Core application logic and lifecycle
├── managers/
│   ├── agentManager.js     # Agent management and configuration
│   └── sessionManager.js   # Conversation session management
├── services/
│   └── directLineManager.js # AI provider communication
├── ui/
│   └── messageRenderer.js  # Message rendering and display
├── utils/
│   ├── domUtils.js         # DOM manipulation utilities
│   ├── encryption.js       # Data encryption utilities
│   ├── helpers.js          # General helper functions
│   └── secureStorage.js    # Secure local storage wrapper
└── ai/
    └── aiCompanion.js      # AI Companion features and logic
```

### Static Assets
```
images/                     # Application icons and assets
lib/                       # Third-party libraries
legacy/                    # Legacy compatibility files
docs/                      # Documentation files
```

## Core Components

### 1. Application Core (`src/core/application.js`)

**Purpose**: Central application controller and lifecycle management

**Key Responsibilities**:
- Application initialization and startup
- Component orchestration and communication
- Global state management
- Error handling and recovery
- Plugin and extension loading

**Key Methods**:
```javascript
class Application {
  async initialize()          // Bootstrap application
  setupEventHandlers()        // Configure global event listeners
  loadUserSettings()          // Load user preferences
  initializeComponents()      // Initialize all modules
  handleGlobalErrors()        // Global error handling
}
```

**Event System**:
```javascript
// Application events
'app:initialized'           // App fully loaded
'app:settings-changed'      // Settings updated
'app:error'                // Global error occurred
'app:shutdown'             // App shutting down
```

### 2. Session Manager (`src/managers/sessionManager.js`)

**Purpose**: Manages conversation sessions and data persistence

**Key Responsibilities**:
- Conversation lifecycle management
- Message history persistence
- Session state tracking
- Data export/import
- Conversation search and filtering

**Data Model**:
```javascript
// Session structure
{
  id: "unique-session-id",
  title: "Conversation Title",
  agent: "agent-identifier",
  messages: [...],
  metadata: {
    created: timestamp,
    modified: timestamp,
    messageCount: number,
    tokens: number
  },
  settings: {...}
}
```

**Key Methods**:
```javascript
class SessionManager {
  createSession(agent)        // Create new conversation
  saveMessage(sessionId, msg) // Save message to session
  loadSession(sessionId)      // Load conversation
  deleteSession(sessionId)    // Remove conversation
  exportSessions()           // Export all data
  searchSessions(query)      // Search conversations
}
```

### 3. Agent Manager (`src/managers/agentManager.js`)

**Purpose**: Manages AI agents and their configurations

**Key Responsibilities**:
- Agent registration and management
- Agent configuration persistence
- Agent selection and switching
- Custom agent creation
- Agent capability management

**Agent Model**:
```javascript
// Agent structure
{
  id: "unique-agent-id",
  name: "Display Name",
  description: "Agent description",
  systemPrompt: "System instructions",
  temperature: 0.7,
  maxTokens: 2048,
  model: "model-name",
  provider: "provider-name",
  enabled: true,
  isDefault: false,
  isCustom: false
}
```

**Key Methods**:
```javascript
class AgentManager {
  registerAgent(config)       // Add new agent
  updateAgent(id, config)     // Modify agent
  getAgent(id)               // Retrieve agent
  listAgents()               // Get all agents
  setActiveAgent(id)         // Switch active agent
  deleteAgent(id)            // Remove custom agent
}
```

### 4. Direct Line Manager (`src/services/directLineManager.js`)

**Purpose**: Handles communication with AI service providers

**Key Responsibilities**:
- API communication management
- Request/response handling
- Streaming support
- Rate limiting and throttling
- Error handling and retries
- Multi-provider support

**Provider Interface**:
```javascript
// Standardized provider interface
class AIProvider {
  async sendMessage(message, config)
  async streamMessage(message, config, callback)
  validateConfig(config)
  getModels()
  getRateLimits()
  handleError(error)
}
```

**Supported Providers**:
- **OpenAI**: GPT models via OpenAI API
- **Anthropic**: Claude models via Anthropic API
- **Ollama**: Local models via Ollama server
- **Azure OpenAI**: GPT models via Azure
- **Custom**: Extensible for additional providers

### 5. Message Renderer (`src/ui/messageRenderer.js`)

**Purpose**: Handles message display and formatting

**Key Responsibilities**:
- Message HTML generation
- Markdown processing and sanitization
- Code syntax highlighting
- Image and file handling
- User/agent icon management
- Message interaction features

**Rendering Pipeline**:
```
Raw Message → Markdown Parser → HTML Sanitizer → Syntax Highlighter → DOM Insertion
```

**Key Methods**:
```javascript
class MessageRenderer {
  renderMessage(message)      // Convert message to HTML
  renderMarkdown(text)       // Process markdown
  highlightCode(code, lang)  // Syntax highlighting
  sanitizeHTML(html)         // Security sanitization
  createMessageElement(msg)  // Create DOM element
  updateMessage(id, content) // Update existing message
}
```

### 6. AI Companion (`src/ai/aiCompanion.js`)

**Purpose**: Provides intelligent assistance and automation

**Key Responsibilities**:
- Automatic title generation
- Suggested action generation
- Context analysis
- Proactive assistance
- Learning user preferences

**Core Features**:
```javascript
class AICompanion {
  scheduleConversationTitleUpdate()  // Auto title generation
  generateSuggestedActions()         // Context-based suggestions
  analyzeConversation()             // Conversation analysis
  provideProactiveHelp()            // Proactive assistance
  learnUserPreferences()            // Adaptive learning
}
```

## Data Flow Architecture

### Message Flow

```
User Input → Validation → Session Storage → AI Provider → Response Processing → UI Update
    ↓            ↓             ↓              ↓              ↓              ↓
Event Bus ← Validation ← Storage Event ← API Response ← Processing ← DOM Update
```

### Detailed Flow:

1. **User Input Capture**
   - Event listeners capture user interactions
   - Input validation and sanitization
   - Command parsing and processing

2. **Message Processing**
   - Message formatting and preparation
   - Context building from conversation history
   - Agent-specific prompt construction

3. **AI Provider Communication**
   - API request preparation
   - Authentication and headers
   - Request sending and response handling

4. **Response Processing**
   - Response validation and parsing
   - Content sanitization and formatting
   - Error handling and fallbacks

5. **UI Update**
   - DOM element creation/update
   - Smooth animations and transitions
   - State synchronization

6. **Data Persistence**
   - Local storage update
   - Session state management
   - Backup and recovery handling

## Event System Architecture

### Event Bus Pattern

MCS Chat uses a centralized event bus for component communication:

```javascript
// Event bus implementation
class EventBus {
  on(event, callback)         // Subscribe to event
  off(event, callback)        // Unsubscribe from event
  emit(event, data)          // Publish event
  once(event, callback)       // Subscribe once
}

// Global event bus
window.eventBus = new EventBus();
```

### Core Events

#### Application Events
```javascript
'app:initialized'           // Application ready
'app:error'                // Application error
'app:settings-changed'      // Settings updated
'app:theme-changed'        // Theme switched
```

#### Session Events
```javascript
'session:created'          // New conversation started
'session:loaded'           // Conversation loaded
'session:message-added'    // Message added to session
'session:title-updated'    // Conversation title changed
'session:deleted'          // Conversation deleted
```

#### Agent Events
```javascript
'agent:changed'            // Active agent switched
'agent:configured'         // Agent settings updated
'agent:created'            // New agent created
'agent:deleted'            // Agent removed
```

#### Message Events
```javascript
'message:sending'          // Message being sent
'message:sent'             // Message sent successfully
'message:received'         // Response received
'message:error'            // Message sending failed
'message:streaming'        // Streaming response chunk
```

#### UI Events
```javascript
'ui:message-rendered'      // Message displayed
'ui:scroll-to-bottom'      // Auto-scroll requested
'ui:modal-opened'          // Modal dialog opened
'ui:settings-opened'       // Settings panel opened
```

## State Management

### Application State

MCS Chat uses a hybrid state management approach:

1. **Local Component State**: For UI-specific state
2. **Global Application State**: For shared application data
3. **Persistent State**: For user settings and data

```javascript
// Global state structure
window.appState = {
  currentSession: null,
  activeAgent: null,
  user: {
    settings: {...},
    preferences: {...},
    customAgents: [...]
  },
  ui: {
    theme: 'dark',
    sidebarOpen: true,
    settingsOpen: false
  },
  system: {
    initialized: false,
    loading: false,
    error: null
  }
};
```

### State Persistence

#### Local Storage Schema
```javascript
// Storage keys and structure
'mcschat_settings'         // User settings object
'mcschat_sessions'         // Conversation sessions array
'mcschat_agents'           // Custom agents array
'mcschat_user_icon'        // Selected user icon
'mcschat_api_keys'         // Encrypted API keys (if enabled)
```

#### Data Encryption
- Sensitive data encrypted before storage
- AES-256 encryption for API keys
- User-configurable encryption options
- Secure key derivation from user input

## Security Architecture

### Client-Side Security

#### Input Validation
```javascript
// Multi-layer validation
function validateInput(input) {
  // 1. Length validation
  if (input.length > MAX_MESSAGE_LENGTH) return false;
  
  // 2. Content filtering
  if (containsProhibitedContent(input)) return false;
  
  // 3. Injection prevention
  if (containsSuspiciousPatterns(input)) return false;
  
  return true;
}
```

#### HTML Sanitization
```javascript
// DOMPurify integration
function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class', 'id'],
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form']
  });
}
```

#### Data Encryption
```javascript
// Encryption utilities
class EncryptionService {
  async encrypt(data, password)    // Encrypt sensitive data
  async decrypt(encrypted, pwd)    // Decrypt stored data
  generateSalt()                   // Generate random salt
  deriveKey(password, salt)        // Derive encryption key
}
```

### API Security

#### Request Authentication
```javascript
// Secure API request handling
class SecureAPIClient {
  setAPIKey(key, provider)         // Store encrypted API key
  getAPIKey(provider)              // Retrieve and decrypt key
  makeSecureRequest(endpoint, data) // Authenticated request
  validateResponse(response)        // Response validation
}
```

#### Rate Limiting
```javascript
// Built-in rate limiting
class RateLimiter {
  constructor(maxRequests, timeWindow)
  async checkLimit(identifier)
  incrementCounter(identifier)
  resetCounter(identifier)
}
```

## Performance Architecture

### Optimization Strategies

#### Lazy Loading
```javascript
// Component lazy loading
async function loadComponent(name) {
  const module = await import(`./components/${name}.js`);
  return module.default;
}
```

#### Virtual Scrolling
```javascript
// Virtual scrolling for large conversations
class VirtualScrollManager {
  constructor(container, itemHeight)
  calculateVisibleRange()
  renderVisibleItems()
  updateScrollPosition()
}
```

#### Caching Strategy
```javascript
// Multi-level caching
class CacheManager {
  memoryCache = new Map()        // In-memory cache
  persistentCache = {}           // Local storage cache
  
  get(key, level = 'memory')
  set(key, value, level = 'memory', ttl)
  invalidate(key)
  clear(level)
}
```

### Memory Management

#### Garbage Collection
```javascript
// Automatic cleanup
class MemoryManager {
  scheduleCleanup()              // Schedule periodic cleanup
  cleanupOldSessions()           // Remove old conversation data
  optimizeMessageHistory()       // Compress message storage
  clearUnusedCache()             // Clear expired cache entries
}
```

#### Resource Monitoring
```javascript
// Performance monitoring
class PerformanceMonitor {
  trackMemoryUsage()             // Monitor memory consumption
  trackRenderTime()              // Monitor UI rendering performance
  trackAPILatency()              // Monitor API response times
  generateReport()               // Performance report
}
```

## Extensibility Architecture

### Plugin System

#### Plugin Interface
```javascript
// Standard plugin interface
class Plugin {
  constructor(config)
  async initialize()             // Plugin initialization
  async activate()               // Plugin activation
  async deactivate()             // Plugin deactivation
  getInfo()                      // Plugin metadata
  getCommands()                  // Available commands
  handleCommand(command, args)   // Command handler
}
```

#### Plugin Manager
```javascript
class PluginManager {
  loadPlugin(path)               // Load plugin from file
  registerPlugin(plugin)         // Register plugin instance
  activatePlugin(id)             // Activate plugin
  deactivatePlugin(id)           // Deactivate plugin
  listPlugins()                  // Get all plugins
  executeCommand(plugin, cmd)    // Execute plugin command
}
```

### Extension Points

#### Custom Providers
```javascript
// Custom AI provider interface
class CustomProvider {
  constructor(config)
  async sendMessage(message, options)
  async streamMessage(message, options, callback)
  validateConfig(config)
  getCapabilities()
}
```

#### Custom Renderers
```javascript
// Custom message renderer
class CustomRenderer {
  canRender(messageType)
  renderMessage(message)
  renderPreview(message)
  getActions(message)
}
```

#### Custom Themes
```javascript
// Theme interface
class Theme {
  constructor(config)
  getName()
  getColors()
  getStyles()
  apply()
  remove()
}
```

## Deployment Architecture

### Build Process
```javascript
// Build configuration
{
  "entry": "src/main.js",
  "output": "dist/",
  "minification": true,
  "sourceMap": true,
  "bundling": "modules",
  "optimization": {
    "treeshaking": true,
    "compression": "gzip",
    "caching": true
  }
}
```

### Distribution Targets
- **Web Application**: Standard web deployment
- **Progressive Web App**: PWA with offline support
- **Electron App**: Desktop application wrapper
- **Browser Extension**: Browser extension version
- **Docker Container**: Containerized deployment

## Future Architecture Considerations

### Planned Enhancements
- **WebAssembly Integration**: Performance-critical components
- **Web Workers**: Background processing
- **Service Workers**: Offline functionality
- **WebRTC**: Real-time communication
- **IndexedDB**: Advanced local storage

### Scalability Considerations
- **Modular Loading**: Dynamic module loading
- **Federation**: Micro-frontend architecture
- **CDN Integration**: Asset delivery optimization
- **Caching Strategies**: Advanced caching layers
- **Performance Monitoring**: Real-time performance tracking

---

**Note**: This architecture is designed to be modular and extensible. Each component can be developed, tested, and deployed independently while maintaining clear interfaces and contracts.
