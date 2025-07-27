/**
 * MCSChat Application Entry Point
 * Main initialization and module orchestration
 */

import { app } from './core/application.js';

// Initialize application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    initializeApplication();
}

/**
 * Initialize the application
 */
async function initializeApplication() {
    try {
        console.log('Starting MCSChat application...');
        await app.initialize();
        console.log('MCSChat application started successfully');
    } catch (error) {
        console.error('Failed to initialize MCSChat application:', error);

        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 400px;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h3>Application Error</h3>
            <p>Failed to initialize the chat application. Please refresh the page and try again.</p>
            <p><small>Error: ${error.message}</small></p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #721c24; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Reload Page
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Export app for global access if needed
window.MCSChatApp = app;
