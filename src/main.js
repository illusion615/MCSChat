/**
 * MCSChat Application Entry Point
 * Main initialization and module orchestration
 */

import { app } from './core/application.js';
import { DOMUtils } from './utils/domUtils.js';
import { getUnifiedNotificationManager } from './services/unifiedNotificationManager.js';

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
        // Initialize unified notification system early
        const notificationManager = getUnifiedNotificationManager();
        console.log('[Main] Unified notification system initialized');
        
        // Make notification manager globally available for testing and debugging
        window.unifiedNotificationManager = notificationManager;
        console.log('Starting MCSChat application...');
        
        // Set up global CSP violation handler
        setupCSPViolationHandler();
        
        // Set up global user gesture handler for AudioContext
        setupAudioContextInitialization();
        
        await app.initialize();
        console.log('MCSChat application started successfully');
    } catch (error) {
        console.error('Failed to initialize MCSChat application:', error);

        // Show user-friendly error message
        const errorDiv = DOMUtils.createElement('div');
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
 * Setup CSP violation handler
 */
function setupCSPViolationHandler() {
    document.addEventListener('securitypolicyviolation', (event) => {
        console.warn('CSP Violation:', {
            violatedDirective: event.violatedDirective,
            blockedURI: event.blockedURI,
            originalPolicy: event.originalPolicy
        });
    });
}

/**
 * Setup global AudioContext initialization on first user interaction
 * This ensures Local AI speech will work without AudioContext errors
 */
function setupAudioContextInitialization() {
    let audioContextInitialized = false;
    
    const initializeAudioContext = async () => {
        if (audioContextInitialized) return;
        
        try {
            // Import speech engine and initialize audio context if it's Local AI
            const { speechEngine } = await import('./services/speechEngine.js');
            
            if (speechEngine.settings.provider === 'local_ai' && 
                speechEngine.localAIProvider && 
                speechEngine.localAIProvider.initializeAudioContext) {
                
                await speechEngine.localAIProvider.initializeAudioContext();
                console.log('[Main] AudioContext initialized for Local AI speech');
            }
            
            audioContextInitialized = true;
            
            // Remove listeners after first initialization
            document.removeEventListener('click', initializeAudioContext);
            document.removeEventListener('keydown', initializeAudioContext);
            document.removeEventListener('touchstart', initializeAudioContext);
            
        } catch (error) {
            console.warn('[Main] Failed to initialize AudioContext:', error);
        }
    };
    
    // Listen for first user interaction
    document.addEventListener('click', initializeAudioContext, { once: true });
    document.addEventListener('keydown', initializeAudioContext, { once: true });
    document.addEventListener('touchstart', initializeAudioContext, { once: true });
}

// Global error handlers

/**
 * Show user-friendly notification for CSP violations
 * @param {string} message - Message to display
 */
function showCSPNotification(message) {
    // Prevent duplicate notifications
    if (document.querySelector('.csp-notification')) {
        return;
    }

    const notification = DOMUtils.createElement('div', { className: 'csp-notification' });
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
        const style = DOMUtils.createElement('style', { id: 'csp-notification-styles' });
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
