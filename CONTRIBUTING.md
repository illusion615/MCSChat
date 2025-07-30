# Contributing to MCS Chat

Thank you for your interest in contributing to MCS Chat! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- Harassment, trolling, or discriminatory comments
- Personal or political attacks
- Public or private harassment
- Publishing private information without consent
- Other conduct inappropriate in a professional setting

### Enforcement

Project maintainers are responsible for clarifying standards and taking corrective action. Report violations to [project email].

## Getting Started

### Ways to Contribute

- **🐛 Bug Reports**: Help us identify and fix issues
- **💡 Feature Requests**: Suggest new features and improvements
- **📝 Documentation**: Improve documentation and guides
- **🎨 Design**: Contribute UI/UX improvements
- **💻 Code**: Submit bug fixes and new features
- **🔍 Testing**: Help test new features and find edge cases
- **🌐 Translation**: Help localize the application (planned)

### Before Contributing

1. **Check existing issues** to avoid duplication
2. **Read documentation** to understand the project
3. **Join discussions** in issues and pull requests
4. **Start small** with documentation or small bug fixes

## Development Setup

### Prerequisites

- **Modern Browser**: Chrome 60+, Firefox 55+, Safari 12+, or Edge 79+
- **Node.js**: Version 14+ (for development tools)
- **Git**: For version control
- **Text Editor**: VS Code recommended with extensions

### Local Development

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/MCSChat.git
   cd MCSChat
   ```

2. **Install Dependencies** (Optional)
   ```bash
   npm install  # For development tools
   ```

3. **Start Development Server**
   ```bash
   # Option 1: Python
   python -m http.server 8000
   
   # Option 2: Node.js
   npx serve .
   
   # Option 3: VS Code Live Server
   # Install Live Server extension, right-click index.html
   ```

4. **Open Application**
   ```
   http://localhost:8000
   ```

### Development Tools

#### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.live-server",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

#### Browser Developer Tools
- **Console**: Monitor logs and errors
- **Network**: Check API calls and performance
- **Application**: Inspect localStorage and session data
- **Sources**: Debug JavaScript with breakpoints

### Project Structure

```
MCSChat/
├── index.html              # Main application entry
├── styles.css              # Global styles
├── src/                    # Source code
│   ├── main.js            # Application bootstrap
│   ├── core/              # Core application logic
│   ├── managers/          # Data and state management
│   ├── services/          # External service integration
│   ├── ui/                # User interface components
│   ├── utils/             # Utility functions
│   └── ai/                # AI-related functionality
├── lib/                   # Third-party libraries
├── images/                # Static assets
├── docs/                  # Documentation files
├── tests/                 # Test files (planned)
└── tools/                 # Development tools (planned)
```

## Contributing Process

### Issue Reporting

#### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Browser: [Chrome 91.0]
- OS: [Windows 10]
- Version: [v2.0.0]

**Additional Context**
Screenshots, logs, or other relevant information
```

#### Feature Requests

Use the feature request template:

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Mockups, examples, or other relevant information
```

### Pull Request Process

#### Before Starting
1. **Create or comment on an issue** to discuss the change
2. **Fork the repository** to your GitHub account
3. **Create a feature branch** from `main`

#### Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add feature: your feature description"

# Push to your fork
git push origin feature/your-feature-name

# Create pull request from GitHub UI
```

#### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(agents): add custom agent creation interface
fix(storage): resolve localStorage quota exceeded error
docs(api): update provider configuration examples
style(ui): improve button hover states
refactor(core): extract common utility functions
```

#### Pull Request Guidelines

1. **Title**: Clear, descriptive title
2. **Description**: Explain what and why
3. **Changes**: List main changes made
4. **Testing**: Describe how you tested the changes
5. **Screenshots**: Include UI changes screenshots
6. **Breaking Changes**: Highlight any breaking changes

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested on mobile
- [ ] Tested with different AI providers

## Screenshots
[If applicable]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings in console
```

### Review Process

1. **Automated Checks**: PR must pass all automated checks
2. **Code Review**: At least one maintainer review required
3. **Testing**: Changes must be manually tested
4. **Documentation**: Update documentation if needed
5. **Merge**: Squash and merge when approved

## Coding Standards

### JavaScript Style Guide

#### General Principles
- **Clarity over cleverness**: Write clear, readable code
- **Consistency**: Follow existing patterns and conventions
- **Modularity**: Keep functions and modules focused and small
- **Documentation**: Comment complex logic and public APIs

#### Code Style

**Variables and Functions:**
```javascript
// Use camelCase for variables and functions
const messageContent = 'Hello world';
const userName = 'John Doe';

function createMessageElement(content) {
  // Function implementation
}

// Use PascalCase for classes
class MessageRenderer {
  constructor() {
    // Class implementation
  }
}

// Use UPPER_SNAKE_CASE for constants
const MAX_MESSAGE_LENGTH = 4000;
const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1',
  ANTHROPIC: 'https://api.anthropic.com/v1'
};
```

**Modern JavaScript Features:**
```javascript
// Use const/let instead of var
const immutableValue = 'constant';
let mutableValue = 'variable';

// Use arrow functions for callbacks
const messages = conversations.map(conv => conv.messages);

// Use async/await instead of .then()
async function fetchResponse() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

// Use destructuring
const { name, description, systemPrompt } = agent;
const [firstMessage, ...restMessages] = conversation.messages;

// Use template literals
const messageHTML = `
  <div class="message ${messageType}">
    <span class="content">${content}</span>
  </div>
`;
```

**Error Handling:**
```javascript
// Use try-catch for async operations
async function saveSession(session) {
  try {
    await storage.setItem(`session_${session.id}`, session);
    eventBus.emit('session:saved', { session });
  } catch (error) {
    console.error('Failed to save session:', error);
    eventBus.emit('session:save-failed', { session, error });
    throw new Error('Session save failed');
  }
}

// Validate inputs
function createAgent(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('Agent config must be an object');
  }
  
  if (!config.name || typeof config.name !== 'string') {
    throw new TypeError('Agent name is required and must be a string');
  }
  
  // Continue with creation
}
```

### HTML Standards

```html
<!-- Use semantic HTML elements -->
<article class="message">
  <header class="message-header">
    <img src="avatar.png" alt="User avatar" class="message-icon">
    <time datetime="2024-01-01T12:00:00Z">12:00 PM</time>
  </header>
  <main class="message-content">
    <p>Message content here</p>
  </main>
</article>

<!-- Include accessibility attributes -->
<button 
  type="button"
  aria-label="Send message"
  aria-describedby="send-help-text"
  class="send-button">
  Send
</button>
<div id="send-help-text" class="sr-only">
  Press Enter to send message
</div>

<!-- Use proper form structure -->
<form class="message-form" novalidate>
  <label for="message-input" class="sr-only">Message</label>
  <textarea 
    id="message-input"
    name="message"
    placeholder="Type your message..."
    required
    aria-describedby="message-help">
  </textarea>
  <div id="message-help" class="help-text">
    Supports markdown formatting
  </div>
</form>
```

### CSS Standards

```css
/* Use CSS custom properties for theming */
:root {
  --primary-color: #007acc;
  --secondary-color: #6c757d;
  --background-color: #1e1e1e;
  --text-color: #ffffff;
  --border-radius: 8px;
  --transition-duration: 0.2s;
}

/* Follow BEM methodology for class naming */
.message {
  /* Block */
}

.message__header {
  /* Element */
}

.message__content {
  /* Element */
}

.message--user {
  /* Modifier */
}

.message--agent {
  /* Modifier */
}

/* Use logical properties when possible */
.container {
  margin-inline: auto;
  padding-block: 2rem;
  border-inline-start: 2px solid var(--primary-color);
}

/* Mobile-first responsive design */
.sidebar {
  width: 100%;
  
  @media (min-width: 768px) {
    width: 300px;
  }
  
  @media (min-width: 1024px) {
    width: 350px;
  }
}
```

### Documentation Standards

```javascript
/**
 * Creates a new conversation session
 * @param {string} agentId - The ID of the agent for this session
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.title] - Custom title for the session
 * @param {Array} [options.initialMessages] - Initial messages to include
 * @returns {Promise<Object>} The created session object
 * @throws {Error} When agentId is invalid or session creation fails
 * 
 * @example
 * const session = await createSession('general_assistant', {
 *   title: 'My Custom Chat',
 *   initialMessages: [{ role: 'user', content: 'Hello!' }]
 * });
 */
async function createSession(agentId, options = {}) {
  // Implementation
}

/**
 * Message object structure
 * @typedef {Object} Message
 * @property {string} id - Unique message identifier
 * @property {string} role - Message role ('user' or 'assistant')
 * @property {string} content - Message content
 * @property {Date} timestamp - When the message was created
 * @property {Object} [metadata] - Additional message metadata
 */
```

## Testing

### Manual Testing

#### Before Submitting PR
1. **Functionality Testing**
   - Test the specific feature/fix
   - Test related functionality
   - Test edge cases and error conditions

2. **Browser Testing**
   - Chrome (latest)
   - Firefox (latest)
   - Safari (if on Mac)
   - Edge (latest)

3. **Device Testing**
   - Desktop (1920x1080, 1366x768)
   - Tablet (768x1024)
   - Mobile (375x667, 414x896)

4. **Performance Testing**
   - Check for memory leaks
   - Test with large conversations
   - Monitor console for errors

#### Testing Checklist
```markdown
- [ ] Feature works as expected
- [ ] No console errors or warnings
- [ ] UI is responsive across screen sizes
- [ ] Accessibility features work (keyboard navigation, screen readers)
- [ ] Performance is acceptable
- [ ] Data persistence works correctly
- [ ] Error handling works properly
- [ ] Integration with existing features works
```

### Automated Testing (Planned)

#### Unit Tests
```javascript
// Example unit test structure
describe('SessionManager', () => {
  describe('createSession', () => {
    it('should create a session with valid agent ID', async () => {
      const sessionManager = new SessionManager();
      const session = await sessionManager.createSession('test-agent');
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.agent).toBe('test-agent');
    });
    
    it('should throw error with invalid agent ID', async () => {
      const sessionManager = new SessionManager();
      
      await expect(sessionManager.createSession(null))
        .rejects
        .toThrow('Invalid agent ID');
    });
  });
});
```

#### Integration Tests
```javascript
// Example integration test
describe('Message Flow', () => {
  it('should send message and receive response', async () => {
    const app = new Application();
    await app.initialize();
    
    const session = await app.createSession('test-agent');
    const response = await app.sendMessage(session.id, 'Hello');
    
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  });
});
```

## Documentation

### Documentation Types

1. **API Documentation**: JSDoc comments in code
2. **User Guides**: Step-by-step instructions
3. **Developer Guides**: Technical documentation
4. **Architecture Docs**: System design and structure
5. **Changelog**: Version history and changes

### Writing Guidelines

#### User Documentation
- **Clear and Concise**: Use simple, direct language
- **Step-by-Step**: Break complex tasks into steps
- **Visual Aids**: Include screenshots and diagrams
- **Examples**: Provide practical examples
- **Troubleshooting**: Include common issues and solutions

#### Technical Documentation
- **Comprehensive**: Cover all aspects thoroughly
- **Accurate**: Keep technical details current
- **Code Examples**: Include working code samples
- **Links**: Reference related documentation
- **Versioning**: Note version-specific information

#### Documentation Structure
```markdown
# Title

Brief description of what this document covers.

## Overview
High-level overview and context

## Prerequisites
What users need before following this guide

## Step-by-Step Instructions
1. First step with details
2. Second step with details
3. Continue...

## Examples
Practical examples and use cases

## Troubleshooting
Common issues and solutions

## Related Documentation
Links to related guides

## Reference
Technical reference information
```

### Updating Documentation

When making changes:
1. **Update relevant docs** in the same PR
2. **Check for broken links** and references
3. **Update examples** if API changes
4. **Add new sections** for new features
5. **Update screenshots** if UI changes

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code review and collaboration
- **Documentation**: Guides and reference materials

### Getting Help

- **Documentation**: Check existing docs first
- **Search Issues**: Look for similar problems/questions
- **Ask Questions**: Create a discussion or issue
- **Be Patient**: Maintainers are volunteers

### Recognition

Contributors will be recognized in:
- **Contributors Section**: Listed in repository
- **Release Notes**: Mentioned in release notes
- **Changelog**: Credited for significant contributions
- **Documentation**: Attributed in relevant docs

### Maintainer Responsibilities

Maintainers commit to:
- **Timely Responses**: Respond to issues and PRs promptly
- **Fair Review**: Provide constructive, helpful feedback
- **Clear Communication**: Explain decisions and reasoning
- **Community Building**: Foster a welcoming environment
- **Quality Assurance**: Maintain code and documentation quality

## Thank You

Thank you for contributing to MCS Chat! Your contributions help make this project better for everyone. Whether you're fixing a typo, reporting a bug, or adding a major feature, every contribution is valuable and appreciated.

---

*This contributing guide is a living document and will be updated as the project evolves. Suggestions for improvements are welcome!*
