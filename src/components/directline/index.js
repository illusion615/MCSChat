/**
 * DirectLine Manager Component - Entry Point
 * 
 * A reusable, feature-rich DirectLine connection manager component
 * for Microsoft Bot Framework integration.
 * 
 * @version 1.0.0
 * @author MCSChat Project
 * @license MIT
 */

// Main component export
export { DirectLineManager, directLineManager } from './DirectLineManager.js';

// Component metadata
export const COMPONENT_INFO = {
    name: 'DirectLineManager',
    version: '1.0.0',
    description: 'Reusable DirectLine connection manager component',
    author: 'MCSChat Project',
    license: 'MIT',

    files: {
        component: './DirectLineManager.js',
        styles: './DirectLineManager.css',
        tests: './DirectLineManager.test.html',
        documentation: './README.md',
        migration: './MIGRATION.md'
    },

    features: [
        'WebSocket streaming with health monitoring',
        'Adaptive typing indicators with intelligent timeouts',
        'Enhanced error handling and connection status management',
        'Event-driven architecture for loose coupling',
        'Comprehensive streaming detection and simulation',
        'Connection retry and recovery mechanisms',
        'Complete styling system with theme support',
        'Comprehensive test suite and documentation'
    ],

    dependencies: [
        'Microsoft Bot Framework DirectLine 3.0 API'
    ],

    compatibility: {
        browsers: ['Chrome 60+', 'Firefox 55+', 'Safari 11+', 'Edge 79+'],
        frameworks: ['Vanilla JS', 'React', 'Vue', 'Angular'],
        environments: ['Web', 'PWA', 'Electron']
    }
};

// Usage examples
export const USAGE_EXAMPLES = {
    basic: `
import { DirectLineManager } from './src/components/directline/index.js';

const manager = new DirectLineManager();
await manager.initialize('your-directline-secret');
await manager.sendMessage('Hello, bot!');
`,

    advanced: `
import { DirectLineManager } from './src/components/directline/index.js';

const manager = new DirectLineManager({
  timeout: 30000,
  webSocket: true,
  pollingInterval: 2000
});

manager.setCallbacks({
  onActivity: (activity) => console.log('Received:', activity),
  onError: (error) => console.error('Error:', error)
});

await manager.initialize('your-directline-secret');
`,

    singleton: `
import { directLineManager } from './src/components/directline/index.js';

// Use pre-configured singleton instance
await directLineManager.initialize('your-directline-secret');
await directLineManager.sendMessage('Hello!');
`
};

// CSS import helper
export const loadStyles = () => {
    if (typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './src/components/directline/DirectLineManager.css';
        document.head.appendChild(link);
    }
};

// Auto-load styles in browser environment
if (typeof document !== 'undefined' && document.readyState !== 'loading') {
    loadStyles();
} else if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', loadStyles);
}
