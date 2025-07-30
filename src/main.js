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
        
        // Set up global CSP violation handler
        setupCSPViolationHandler();
        
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

/**
 * Set up global handler for CSP violations and iframe loading issues
 */
function setupCSPViolationHandler() {
    // Listen for security policy violations
    document.addEventListener('securitypolicyviolation', (event) => {
        console.warn('CSP Violation detected:', {
            directive: event.violatedDirective,
            policy: event.originalPolicy,
            source: event.sourceFile,
            line: event.lineNumber,
            column: event.columnNumber,
            blockedURI: event.blockedURI
        });

        // Handle frame-ancestors violations specifically
        if (event.violatedDirective === 'frame-ancestors') {
            console.warn('Frame-ancestors CSP violation - content cannot be embedded in iframe');
            showCSPNotification('Content cannot be displayed due to security policies. Opening in external browser...');
            
            // Try to extract the blocked URL and open externally
            if (event.blockedURI && event.blockedURI !== 'self') {
                setTimeout(() => {
                    window.open(event.blockedURI, '_blank', 'noopener,noreferrer');
                }, 1000);
            }
        }
    });

    // Also listen for console errors that might indicate CSP issues
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ').toLowerCase();
        if (message.includes('refused to frame') || 
            message.includes('frame-ancestors') || 
            message.includes('x-frame-options')) {
            showCSPNotification('Content blocked by security policy. Opening in external browser...');
        }
        originalConsoleError.apply(console, args);
    };
}

/**
 * Show user-friendly notification for CSP violations
 * @param {string} message - Message to display
 */
function showCSPNotification(message) {
    // Prevent duplicate notifications
    if (document.querySelector('.csp-notification')) {
        return;
    }

    const notification = document.createElement('div');
    notification.className = 'csp-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff3cd;
        color: #856404;
        padding: 12px 16px;
        border-radius: 6px;
        border: 1px solid #ffeaa7;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10000;
        max-width: 350px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        animation: slideInFromRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">⚠️</span>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: #856404;">×</button>
        </div>
    `;

    // Add animation styles if not already present
    if (!document.querySelector('#csp-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'csp-notification-styles';
        style.textContent = `
            @keyframes slideInFromRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInFromRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
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
