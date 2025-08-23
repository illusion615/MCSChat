# Development Utilities

This directory contains development tools, debugging utilities, and maintenance scripts used during development and testing.

## 🛠️ Development Scripts

### `emergency-cleanup.js`
Emergency localStorage cleanup script to fix JSON parsing errors and corrupted storage data.

**Usage:**
```javascript
// Run in browser console
<script src="utils/emergency-cleanup.js"></script>
```

### `fix_backdrop_filter.py`
CSS compatibility fix script that automatically adds `-webkit-` prefixes to `backdrop-filter` properties for cross-browser compatibility.

**Usage:**
```bash
python3 utils/fix_backdrop_filter.py
```

### `streaming-example.js`
Example implementation for true streaming with OpenAI API and similar services, demonstrating real-time message streaming patterns.

## 🧪 Testing & Debugging

### `debug-thinking.html`
Standalone debugging page for testing the thinking simulation system with isolated chat interface and logging.

**Features:**
- Isolated thinking simulation testing
- Real-time logging and debugging
- Message structure validation

### `test-splash.html`
Testing page for splash screen functionality with loading progress simulation and transition effects.

**Features:**
- Splash screen timing tests
- Progress bar simulation
- Microsoft Copilot branding validation

## 📝 Usage Notes

- These utilities are for development purposes only
- Not included in production builds
- Use during development, testing, and debugging phases
- Most scripts can be run independently of the main application

## 🔧 Maintenance

These files are maintained separately from the main application codebase and may be updated independently for development workflow improvements.
