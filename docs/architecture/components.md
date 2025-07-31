# Component Details

Detailed documentation of core components, their APIs, and implementation details.

## Core Application (`src/core/application.js`)

### Overview
The Application class serves as the central coordinator for the entire MCS Chat system, managing component lifecycle, global state, and inter-component communication.

### Class Definition

```javascript
class Application {
  constructor() {
    this.initialized = false;
    this.components = new Map();
    this.eventBus = window.eventBus;
    this.state = window.appState;
  }
}
```

### Key Methods

#### `async initialize()`
Bootstraps the entire application and initializes all components.

```javascript
async initialize() {
  try {
    // 1. Load user settings
    await this.loadUserSettings();
    
    // 2. Initialize core components
    await this.initializeComponents();
    
    // 3. Setup event handlers
    this.setupEventHandlers();
    
    // 4. Apply user preferences
    this.applyUserPreferences();
    
    // 5. Mark as initialized
    this.initialized = true;
    this.eventBus.emit('app:initialized');
    
    console.log('Application initialized successfully');
  } catch (error) {
    this.handleInitializationError(error);
  }
}
```

#### `setupEventHandlers()`
Configures global event listeners and inter-component communication.

```javascript
setupEventHandlers() {
  // Global error handling
  window.addEventListener('error', this.handleGlobalError.bind(this));
  window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
  
  // Application events
  this.eventBus.on('app:settings-changed', this.handleSettingsChange.bind(this));
  this.eventBus.on('app:shutdown', this.shutdown.bind(this));
  
  // Component events
  this.eventBus.on('session:created', this.handleSessionCreated.bind(this));
  this.eventBus.on('agent:changed', this.handleAgentChanged.bind(this));
}
```

#### `loadUserSettings()`
Loads and validates user settings from local storage.

```javascript
async loadUserSettings() {
  const settings = await this.storage.getItem('mcschat_settings');
  if (settings) {
    this.state.user.settings = { ...this.defaultSettings, ...settings };
  } else {
    this.state.user.settings = { ...this.defaultSettings };
  }
  this.validateSettings();
}
```

### Component Registration

```javascript
registerComponent(name, component) {
  this.components.set(name, component);
  this.eventBus.emit('app:component-registered', { name, component });
}

getComponent(name) {
  return this.components.get(name);
}
```

### Error Handling

```javascript
handleGlobalError(event) {
  console.error('Global error:', event.error);
  this.eventBus.emit('app:error', {
    type: 'global',
    error: event.error,
    timestamp: Date.now()
  });
}
```

## Session Manager (`src/managers/sessionManager.js`)

### Overview
Manages conversation sessions, including creation, persistence, search, and lifecycle management.

### Class Definition

```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.currentSession = null;
    this.storage = new SecureStorage('mcschat_sessions');
    this.eventBus = window.eventBus;
  }
}
```

### Session Data Model

```javascript
const sessionSchema = {
  id: String,              // Unique identifier
  title: String,           // Display title
  agent: String,           // Agent identifier
  messages: Array,         // Message history
  metadata: {
    created: Date,         // Creation timestamp
    modified: Date,        // Last modification
    messageCount: Number,  // Total messages
    tokenCount: Number,    // Estimated tokens
    tags: Array           // User-defined tags
  },
  settings: Object        // Session-specific settings
};
```

### Core Methods

#### `createSession(agentId, initialMessage = null)`
Creates a new conversation session.

```javascript
async createSession(agentId, initialMessage = null) {
  const session = {
    id: this.generateSessionId(),
    title: this.generateInitialTitle(),
    agent: agentId,
    messages: initialMessage ? [initialMessage] : [],
    metadata: {
      created: new Date(),
      modified: new Date(),
      messageCount: initialMessage ? 1 : 0,
      tokenCount: 0,
      tags: []
    },
    settings: {}
  };
  
  this.sessions.set(session.id, session);
  await this.persistSession(session);
  
  this.eventBus.emit('session:created', { session });
  return session;
}
```

#### `addMessage(sessionId, message)`
Adds a message to an existing session.

```javascript
async addMessage(sessionId, message) {
  const session = this.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  // Add message with metadata
  const messageWithMetadata = {
    ...message,
    id: this.generateMessageId(),
    timestamp: new Date(),
    sessionId: sessionId
  };
  
  session.messages.push(messageWithMetadata);
  session.metadata.modified = new Date();
  session.metadata.messageCount = session.messages.length;
  
  await this.persistSession(session);
  this.eventBus.emit('session:message-added', { session, message: messageWithMetadata });
  
  return messageWithMetadata;
}
```

#### `loadSession(sessionId)`
Loads a session from storage.

```javascript
async loadSession(sessionId) {
  let session = this.sessions.get(sessionId);
  
  if (!session) {
    // Load from persistent storage
    session = await this.storage.getItem(`session_${sessionId}`);
    if (session) {
      this.sessions.set(sessionId, session);
    }
  }
  
  if (session) {
    this.currentSession = session;
    this.eventBus.emit('session:loaded', { session });
  }
  
  return session;
}
```

#### `searchSessions(query, options = {})`
Searches sessions based on various criteria.

```javascript
async searchSessions(query, options = {}) {
  const {
    searchIn = ['title', 'messages'],
    limit = 50,
    sortBy = 'modified',
    sortOrder = 'desc',
    filters = {}
  } = options;
  
  const allSessions = Array.from(this.sessions.values());
  
  let results = allSessions.filter(session => {
    return this.matchesSearchCriteria(session, query, searchIn, filters);
  });
  
  // Sort results
  results.sort((a, b) => {
    const aValue = a.metadata[sortBy];
    const bValue = b.metadata[sortBy];
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });
  
  return results.slice(0, limit);
}
```

### Data Persistence

```javascript
async persistSession(session) {
  await this.storage.setItem(`session_${session.id}`, session);
  await this.updateSessionIndex(session);
}

async updateSessionIndex(session) {
  const index = await this.storage.getItem('session_index') || [];
  const existingIndex = index.findIndex(item => item.id === session.id);
  
  const indexEntry = {
    id: session.id,
    title: session.title,
    agent: session.agent,
    created: session.metadata.created,
    modified: session.metadata.modified,
    messageCount: session.metadata.messageCount
  };
  
  if (existingIndex >= 0) {
    index[existingIndex] = indexEntry;
  } else {
    index.push(indexEntry);
  }
  
  await this.storage.setItem('session_index', index);
}
```

## Agent Manager (`src/managers/agentManager.js`)

### Overview
Manages AI agents, their configurations, and capabilities within the application.

### Class Definition

```javascript
class AgentManager {
  constructor() {
    this.agents = new Map();
    this.activeAgent = null;
    this.storage = new SecureStorage('mcschat_agents');
    this.eventBus = window.eventBus;
    this.defaultAgents = this.loadDefaultAgents();
  }
}
```

### Agent Data Model

```javascript
const agentSchema = {
  id: String,              // Unique identifier
  name: String,            // Display name
  description: String,     // Agent description
  systemPrompt: String,    // System instructions
  temperature: Number,     // Response creativity (0.0-1.0)
  maxTokens: Number,       // Maximum response length
  model: String,           // AI model to use
  provider: String,        // AI provider
  capabilities: Array,     // Agent capabilities
  settings: Object,        // Agent-specific settings
  metadata: {
    created: Date,         // Creation date
    modified: Date,        // Last modification
    version: String,       // Agent version
    author: String,        // Agent creator
    isDefault: Boolean,    // Default agent flag
    isCustom: Boolean      // Custom agent flag
  }
};
```

### Core Methods

#### `registerAgent(agentConfig)`
Registers a new agent in the system.

```javascript
async registerAgent(agentConfig) {
  const agent = this.validateAgentConfig(agentConfig);
  
  // Set metadata
  agent.metadata = {
    created: new Date(),
    modified: new Date(),
    version: '1.0.0',
    author: 'user',
    isDefault: false,
    isCustom: true,
    ...agent.metadata
  };
  
  this.agents.set(agent.id, agent);
  await this.persistAgent(agent);
  
  this.eventBus.emit('agent:registered', { agent });
  return agent;
}
```

#### `updateAgent(agentId, updates)`
Updates an existing agent configuration.

```javascript
async updateAgent(agentId, updates) {
  const agent = this.agents.get(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }
  
  if (agent.metadata.isDefault && !updates.allowDefaultModification) {
    throw new Error('Cannot modify default agents');
  }
  
  const updatedAgent = {
    ...agent,
    ...updates,
    metadata: {
      ...agent.metadata,
      modified: new Date()
    }
  };
  
  this.validateAgentConfig(updatedAgent);
  this.agents.set(agentId, updatedAgent);
  await this.persistAgent(updatedAgent);
  
  this.eventBus.emit('agent:updated', { agent: updatedAgent });
  return updatedAgent;
}
```

#### `setActiveAgent(agentId)`
Sets the active agent for new conversations.

```javascript
async setActiveAgent(agentId) {
  const agent = this.agents.get(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }
  
  const previousAgent = this.activeAgent;
  this.activeAgent = agent;
  
  // Persist active agent setting
  await this.storage.setItem('active_agent', agentId);
  
  this.eventBus.emit('agent:changed', {
    previousAgent,
    currentAgent: agent
  });
  
  return agent;
}
```

### Default Agents

```javascript
loadDefaultAgents() {
  return [
    {
      id: 'general_assistant',
      name: 'General Assistant',
      description: 'A helpful AI assistant for general questions and tasks',
      systemPrompt: 'You are a helpful, harmless, and honest AI assistant.',
      temperature: 0.7,
      maxTokens: 2048,
      capabilities: ['general', 'reasoning', 'analysis'],
      metadata: { isDefault: true, isCustom: false }
    },
    {
      id: 'code_expert',
      name: 'Code Expert',
      description: 'Specialized in programming and software development',
      systemPrompt: 'You are an expert software developer and programmer...',
      temperature: 0.3,
      maxTokens: 4096,
      capabilities: ['coding', 'debugging', 'architecture'],
      metadata: { isDefault: true, isCustom: false }
    }
    // ... more default agents
  ];
}
```

## Direct Line Manager (`src/services/directLineManager.js`)

### Overview
Handles communication with various AI service providers, managing requests, responses, and streaming.

### Class Definition

```javascript
class DirectLineManager {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.rateLimiter = new RateLimiter();
    this.eventBus = window.eventBus;
    this.initializeProviders();
  }
}
```

### Provider Interface

```javascript
class AIProvider {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.baseURL = config.baseURL;
  }
  
  async sendMessage(message, options) {
    throw new Error('sendMessage must be implemented');
  }
  
  async streamMessage(message, options, callback) {
    throw new Error('streamMessage must be implemented');
  }
  
  validateConfig(config) {
    throw new Error('validateConfig must be implemented');
  }
  
  getModels() {
    throw new Error('getModels must be implemented');
  }
}
```

### OpenAI Provider Implementation

```javascript
class OpenAIProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }
  
  async sendMessage(message, options = {}) {
    const requestBody = {
      model: options.model || 'gpt-3.5-turbo',
      messages: message.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      stream: false
    };
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async streamMessage(message, options = {}, callback) {
    const requestBody = {
      model: options.model || 'gpt-3.5-turbo',
      messages: message.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      stream: true
    };
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              callback(content);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }
  }
}
```

### Request Management

```javascript
async sendRequest(message, options = {}) {
  // Rate limiting check
  await this.rateLimiter.checkLimit(this.activeProvider.name);
  
  // Prepare request
  const requestOptions = this.prepareRequestOptions(message, options);
  
  try {
    // Send request
    const response = await this.activeProvider.sendMessage(message, requestOptions);
    
    // Process response
    return this.processResponse(response);
    
  } catch (error) {
    return this.handleRequestError(error);
  }
}

async streamRequest(message, options = {}, onChunk) {
  await this.rateLimiter.checkLimit(this.activeProvider.name);
  
  const requestOptions = this.prepareRequestOptions(message, options);
  
  try {
    await this.activeProvider.streamMessage(message, requestOptions, (chunk) => {
      this.eventBus.emit('message:streaming', { chunk });
      onChunk(chunk);
    });
  } catch (error) {
    this.handleStreamError(error);
  }
}
```

## Message Renderer (`src/ui/messageRenderer.js`)

### Overview
Handles the rendering of messages, including markdown processing, syntax highlighting, and security sanitization.

### Class Definition

```javascript
class MessageRenderer {
  constructor() {
    this.marked = window.marked;
    this.hljs = window.hljs;
    this.DOMPurify = window.DOMPurify;
    this.setupMarkdownRenderer();
  }
}
```

### Rendering Pipeline

```javascript
renderMessage(message) {
  // 1. Validate input
  if (!message || !message.content) {
    return this.createErrorElement('Invalid message content');
  }
  
  // 2. Process markdown
  const htmlContent = this.processMarkdown(message.content);
  
  // 3. Sanitize HTML
  const sanitizedHTML = this.sanitizeHTML(htmlContent);
  
  // 4. Create DOM element
  const messageElement = this.createMessageElement(message, sanitizedHTML);
  
  // 5. Apply syntax highlighting
  this.applySyntaxHighlighting(messageElement);
  
  // 6. Add interactive features
  this.addInteractiveFeatures(messageElement, message);
  
  return messageElement;
}
```

### Markdown Processing

```javascript
processMarkdown(content) {
  // Configure marked options
  this.marked.setOptions({
    highlight: (code, lang) => this.highlightCode(code, lang),
    breaks: true,
    gfm: true,
    sanitize: false // We handle sanitization separately
  });
  
  // Custom renderer for code blocks
  const renderer = new this.marked.Renderer();
  renderer.code = (code, language) => {
    const validLang = this.hljs.getLanguage(language) ? language : 'plaintext';
    const highlighted = this.hljs.highlight(validLang, code).value;
    return `<pre><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
  };
  
  return this.marked(content, { renderer });
}
```

### HTML Sanitization

```javascript
sanitizeHTML(html) {
  return this.DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'strike', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'href', 'target', 'rel', 'data-*'
    ],
    ALLOW_DATA_ATTR: true,
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    RETURN_DOM_FRAGMENT: false
  });
}
```

### Interactive Features

```javascript
addInteractiveFeatures(messageElement, message) {
  // Add copy buttons to code blocks
  this.addCodeCopyButtons(messageElement);
  
  // Add message actions
  this.addMessageActions(messageElement, message);
  
  // Add link handling
  this.addLinkHandling(messageElement);
  
  // Add image lazy loading
  this.addImageLazyLoading(messageElement);
}

addCodeCopyButtons(element) {
  const codeBlocks = element.querySelectorAll('pre code');
  codeBlocks.forEach(codeBlock => {
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-code-btn';
    copyButton.innerHTML = '📋';
    copyButton.title = 'Copy code';
    
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(codeBlock.textContent);
      copyButton.innerHTML = '✅';
      setTimeout(() => copyButton.innerHTML = '📋', 2000);
    });
    
    codeBlock.parentElement.appendChild(copyButton);
  });
}
```

## AI Companion (`src/ai/aiCompanion.js`)

### Overview
Provides intelligent assistance through automatic title generation, suggested actions, and proactive help.

### Class Definition

```javascript
class AICompanion {
  constructor() {
    this.enabled = true;
    this.titleUpdateTimer = null;
    this.analysisCache = new Map();
    this.eventBus = window.eventBus;
    this.directLineManager = null;
    this.setupEventHandlers();
  }
}
```

### Title Generation

```javascript
async generateConversationTitle(session) {
  if (!this.enabled || !session.messages.length) return;
  
  // Check if title generation is needed
  if (!this.shouldUpdateTitle(session)) return;
  
  try {
    // Prepare context for title generation
    const context = this.prepareContextForTitle(session);
    
    // Generate title using AI
    const titlePrompt = this.buildTitlePrompt(context);
    const response = await this.directLineManager.sendRequest({
      messages: [{ role: 'user', content: titlePrompt }]
    }, {
      model: 'gpt-3.5-turbo',
      maxTokens: 50,
      temperature: 0.3
    });
    
    const newTitle = this.extractTitleFromResponse(response);
    
    if (newTitle && newTitle !== session.title) {
      await this.updateSessionTitle(session.id, newTitle);
    }
    
  } catch (error) {
    console.error('Title generation failed:', error);
  }
}

shouldUpdateTitle(session) {
  // Don't update if manually set
  if (session.metadata.titleManuallySet) return false;
  
  // Need minimum messages
  if (session.messages.length < 3) return false;
  
  // Don't update too frequently
  const lastUpdate = session.metadata.lastTitleUpdate;
  if (lastUpdate && Date.now() - lastUpdate < 30000) return false;
  
  return true;
}
```

### Suggested Actions

```javascript
async generateSuggestedActions(session, lastMessage) {
  if (!this.enabled) return [];
  
  try {
    // Analyze context
    const context = this.analyzeConversationContext(session);
    
    // Generate suggestions based on context
    const suggestions = await this.generateContextualSuggestions(context, lastMessage);
    
    // Filter and rank suggestions
    return this.filterAndRankSuggestions(suggestions);
    
  } catch (error) {
    console.error('Suggestion generation failed:', error);
    return [];
  }
}

analyzeConversationContext(session) {
  const messages = session.messages.slice(-5); // Last 5 messages
  
  return {
    topics: this.extractTopics(messages),
    codePresent: this.detectCodeBlocks(messages),
    questionAsked: this.detectQuestions(messages),
    problemSolving: this.detectProblemSolving(messages),
    needsClarification: this.detectClarificationNeeds(messages)
  };
}
```

### Proactive Assistance

```javascript
async provideProactiveHelp(session) {
  const analysis = await this.analyzeConversation(session);
  
  const helpSuggestions = [];
  
  // Detect patterns that need help
  if (analysis.repetitiveQuestions) {
    helpSuggestions.push({
      type: 'efficiency',
      message: 'I notice similar questions. Would you like me to provide a comprehensive overview?'
    });
  }
  
  if (analysis.complexProblem) {
    helpSuggestions.push({
      type: 'breakdown',
      message: 'This seems complex. Should we break it down into smaller steps?'
    });
  }
  
  if (analysis.missingContext) {
    helpSuggestions.push({
      type: 'context',
      message: 'Some additional context might help me provide better assistance.'
    });
  }
  
  return helpSuggestions;
}
```

## Utility Components

### Secure Storage (`src/utils/secureStorage.js`)

```javascript
class SecureStorage {
  constructor(namespace) {
    this.namespace = namespace;
    this.encryption = new EncryptionService();
  }
  
  async setItem(key, value, encrypted = false) {
    const fullKey = `${this.namespace}_${key}`;
    const serialized = JSON.stringify(value);
    
    if (encrypted) {
      const encryptedData = await this.encryption.encrypt(serialized);
      localStorage.setItem(fullKey, JSON.stringify({ encrypted: true, data: encryptedData }));
    } else {
      localStorage.setItem(fullKey, JSON.stringify({ encrypted: false, data: serialized }));
    }
  }
  
  async getItem(key) {
    const fullKey = `${this.namespace}_${key}`;
    const stored = localStorage.getItem(fullKey);
    
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    if (parsed.encrypted) {
      const decrypted = await this.encryption.decrypt(parsed.data);
      return JSON.parse(decrypted);
    } else {
      return JSON.parse(parsed.data);
    }
  }
}
```

### DOM Utilities (`src/utils/domUtils.js`)

```javascript
class DOMUtils {
  static createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('data-')) {
        element.dataset[key.slice(5)] = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    
    return element;
  }
  
  static async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
}
```

### Mobile Utilities (`src/utils/mobileUtils.js`)

A specialized utility class that handles all mobile-specific functionality, including responsive layout management, touch gestures, and mobile panel controls.

#### Class Definition

```javascript
export class MobileUtils {
  constructor() {
    this.isMobile = false;
    this.sidebarOpen = false;
    this.aiPanelOpen = false;
    this.elements = {};
    this.initialize();
  }
}
```

#### Key Features

**Responsive State Management**
- Automatically detects mobile/desktop state changes
- Manages panel visibility and behavior based on screen size
- Handles orientation changes gracefully

**Touch Gesture Support**
- Swipe-to-open sidebar from left edge
- Swipe-left to close panels
- Touch-optimized interactions

**Panel Management**
- Collapsible sidebar with smooth animations
- Mobile AI companion toggle
- Mutual exclusion between panels
- Proper z-index and overlay management

#### API Reference

```javascript
// Initialize mobile utilities
const mobileUtils = new MobileUtils();

// Check mobile state
mobileUtils.isMobileLayout(); // Returns boolean

// Panel management
mobileUtils.openSidebar();
mobileUtils.closeSidebar();
mobileUtils.toggleAiPanel();

// State checking
mobileUtils.isSidebarOpen(); // Returns boolean
mobileUtils.isAiPanelOpen(); // Returns boolean
```

#### Event Handling

The class sets up comprehensive event handling for:
- Window resize and orientation change
- Touch events for gesture recognition
- Keyboard events (Escape key)
- Element click events for mobile controls

#### CSS Integration

Works closely with CSS media queries and classes:
- `.mobile-open` for panel visibility
- `.mobile-header` for mobile navigation
- `.mobile-ai-toggle` for floating action button
- Responsive breakpoints at 768px and 480px

---

Each component is designed to be modular, testable, and maintainable, with clear interfaces and well-defined responsibilities. The event-driven architecture ensures loose coupling between components while maintaining effective communication.
