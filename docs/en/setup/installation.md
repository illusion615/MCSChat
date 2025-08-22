# Installation Guide

Complete installation and setup instructions for different environments.

## System Requirements

### Minimum Requirements
- **Browser**: Modern browser with ES6 support (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- **Memory**: 512MB RAM available for browser
- **Storage**: 50MB free disk space
- **Network**: Internet connection for cloud AI providers

### Recommended Requirements
- **Browser**: Latest version of Chrome, Firefox, or Edge
- **Memory**: 1GB+ RAM for optimal performance
- **Storage**: 100MB+ free disk space
- **Network**: Stable broadband connection (10+ Mbps)

## Installation Options

### Option 1: Direct Download (Simplest)

1. **Download the Repository**
   ```bash
   # Using Git
   git clone https://github.com/illusion615/MCSChat.git
   cd MCSChat
   
   # Or download ZIP from GitHub
   # Extract to your desired location
   ```

2. **Open in Browser**
   - Double-click `index.html`
   - Or drag `index.html` into your browser

### Option 2: Local Development Server (Recommended)

#### Using Python (Built-in)
```bash
# Navigate to project directory
cd MCSChat

# Python 3
python -m http.server 8000

# Python 2 (legacy)
python -m SimpleHTTPServer 8000

# Access at http://localhost:8000
```

#### Using Node.js
```bash
# Install serve globally
npm install -g serve

# Or use npx (no installation)
npx serve .

# Custom port
npx serve . -p 8080

# Access at http://localhost:3000 (or specified port)
```

#### Using the Included Server
```bash
# Using the project's chat server
node chat-server.js

# Access at http://localhost:8080
```

### Option 3: Docker Installation

#### Quick Docker Run
```bash
# Pull and run (when available)
docker run -p 8080:80 mcschat/mcschat:latest

# Access at http://localhost:8080
```

#### Build from Source
```bash
# Clone repository
git clone https://github.com/illusion615/MCSChat.git
cd MCSChat

# Build Docker image
docker build -t mcschat .

# Run container
docker run -p 8080:80 mcschat

# Access at http://localhost:8080
```

[→ Detailed Docker guide](../deployment/docker.md)

## Development Environment Setup

### For Contributors and Developers

1. **Clone the Repository**
   ```bash
   git clone https://github.com/illusion615/MCSChat.git
   cd MCSChat
   ```

2. **Install Dependencies** (Optional)
   ```bash
   # For the CORS proxy (if using local Ollama)
   npm install express cors
   
   # Or install from package.json if available
   npm install
   ```

3. **Setup Development Tools**
   ```bash
   # Install VS Code extensions (recommended)
   # - Live Server
   # - ES6 Modules
   # - JavaScript/TypeScript
   ```

4. **Start Development Server**
   ```bash
   # Option 1: Python
   python -m http.server 8000
   
   # Option 2: VS Code Live Server
   # Right-click index.html → "Open with Live Server"
   
   # Option 3: Node.js
   npx serve .
   ```

### Development Scripts

#### CORS Proxy for Ollama
```bash
# Start Ollama proxy (for local AI models)
node ollama-proxy.js

# Proxy runs on http://localhost:3001
# Ollama server should be on http://localhost:11434
```

#### HTTP Server
```bash
# Start chat application server
node chat-server.js

# Server runs on http://localhost:8080
```

## Verification

### Test Installation
1. Open your browser to the application URL
2. Check for:
   - Interface loads without errors
   - Settings panel opens
   - Console shows no critical errors

### Browser Console Check
1. Press `F12` to open developer tools
2. Check the Console tab for:
   - ✅ No red errors
   - ✅ "Application initialized" message
   - ✅ Module loading success messages

### Basic Functionality Test
1. Click Settings (⚙️ icon)
2. Navigate through sections:
   - Agent Management
   - AI Companion
   - Appearance
3. Verify all UI elements render correctly

## Troubleshooting Installation

### Common Installation Issues

#### "File Not Found" or 404 Errors
- **Cause**: Accessing files directly without a server
- **Solution**: Use a local server (Python, Node.js, etc.)

#### CORS Errors
- **Cause**: Browser security restrictions
- **Solution**: Use HTTP server instead of `file://` protocol

#### Module Loading Errors
- **Cause**: Browser doesn't support ES6 modules
- **Solution**: Use a modern browser or enable experimental features

#### Slow Loading
- **Cause**: Large files or slow network
- **Solution**: Use local server and check network connection

### Browser Compatibility

| Browser | Minimum Version | Recommended | Notes |
|---------|----------------|-------------|-------|
| Chrome | 60+ | Latest | Full support |
| Firefox | 55+ | Latest | Full support |
| Safari | 12+ | Latest | Full support |
| Edge | 79+ | Latest | Full support |
| IE | ❌ | ❌ | Not supported |

### Performance Optimization

#### For Development
- Use browser dev tools for debugging
- Enable source maps for easier debugging
- Use live reload for faster development

#### For Production
- [Production Deployment Guide](../deployment/production.md)
- Enable compression and caching
- Use CDN for static assets

## Next Steps

After successful installation:

1. **[Quick Start Guide](quick-start.md)** - Basic configuration
2. **[Configuration Guide](configuration.md)** - Detailed settings
3. **[AI Companion Setup](ai-companion.md)** - Advanced AI features

## Getting Help

- **[Troubleshooting Guide](../troubleshooting/common-issues.md)**
- **[GitHub Issues](https://github.com/illusion615/MCSChat/issues)**
- **[Community Discussions](https://github.com/illusion615/MCSChat/discussions)**

---

**Note**: For production deployment, see our [Production Deployment Guide](../deployment/production.md) for security and performance considerations.
