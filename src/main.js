/**
 * MCSChat Application Entry Point
 * Main initialization and module orchestration
 */

import { app } from './core/application.js';
import { LocalStorageProtection } from './utils/localStorageProtection.js';
// === IMPORT SIMPLIFIED ICON MANAGER ===
import Icon from './components/svg-icon-manager/index.js';

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

        // Initialize localStorage protection first to prevent JSON parsing errors
        LocalStorageProtection.initialize();

        // Setup icons directly (no more DOM scanning!)
        await setupIcons();

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
 * Setup icons directly where needed - no more DOM scanning!
 */
async function setupIcons() {
    console.log('[Main] Setting up icons with simplified manager...');
    
    // Side command bar icons (wait for full collection)
    await setupSideCommandBar();
    
    // Welcome screen icons (can use fallback icons)
    setupWelcomeIcons();
    
    // Mobile action icons (wait for full collection)
    await setupMobileIcons();
    
    // Other specific icons (can use fallback icons)
    setupOtherIcons();
}

/**
 * Setup side command bar icons with proper visibility
 * Wait for full icon collection to ensure correct icons are loaded
 */
async function setupSideCommandBar() {
    try {
        // Wait for the full icon collection to be loaded
        if (window.Icon && window.Icon.waitForLoad) {
            await window.Icon.waitForLoad();
            console.log('[Main] Full icon collection loaded, setting up side command bar icons...');
        }

        const conversationsBtn = document.getElementById('conversationsButton');
        const helpBtn = document.getElementById('documentationButton');
        const knowledgeBtn = document.getElementById('knowledgeHubButton');
        const settingsBtn = document.getElementById('settingsButton');
        
        if (conversationsBtn && conversationsBtn.children.length === 0) {
            conversationsBtn.innerHTML = ''; // Clear any existing content
            const conversationsIcon = Icon.sideCommand('newChat');
            console.log('[Main] Created conversationsButton icon:', conversationsIcon);
            conversationsBtn.appendChild(conversationsIcon);
        }
        
        if (helpBtn && helpBtn.children.length === 0) {
            helpBtn.innerHTML = ''; // Clear any existing content
            const helpIcon = Icon.sideCommand('help');
            console.log('[Main] Created documentationButton icon:', helpIcon);
            helpBtn.appendChild(helpIcon);
        }
        
        if (knowledgeBtn && knowledgeBtn.children.length === 0) {
            knowledgeBtn.innerHTML = ''; // Clear any existing content
            const knowledgeIcon = Icon.sideCommand('knowledgeHub');
            console.log('[Main] Created knowledgeHubButton icon:', knowledgeIcon);
            knowledgeBtn.appendChild(knowledgeIcon);
        }
        
        if (settingsBtn && settingsBtn.children.length === 0) {
            settingsBtn.innerHTML = ''; // Clear any existing content
            const settingsIcon = Icon.sideCommand('settings');
            console.log('[Main] Created settingsButton icon:', settingsIcon);
            settingsBtn.appendChild(settingsIcon);
        }

    } catch (error) {
        console.warn('[Main] Error setting up side command bar icons, using fallback:', error);
        // Fallback to immediate setup with available icons
        const helpBtn = document.getElementById('documentationButton');
        const knowledgeBtn = document.getElementById('knowledgeHubButton');
        const settingsBtn = document.getElementById('settingsButton');
        
        if (helpBtn) {
            helpBtn.innerHTML = '';
            helpBtn.appendChild(Icon.sideCommand('help'));
        }
        if (knowledgeBtn) {
            knowledgeBtn.innerHTML = '';
            knowledgeBtn.appendChild(Icon.sideCommand('knowledgeHub'));
        }
        if (settingsBtn) {
            settingsBtn.innerHTML = '';
            settingsBtn.appendChild(Icon.sideCommand('settings'));
        }
    }
}

/**
 * Setup welcome screen icons
 */
function setupWelcomeIcons() {
    const welcomeIcon = document.querySelector('.welcome-icon');
    if (welcomeIcon) {
        welcomeIcon.appendChild(Icon.welcome('welcomeDocument'));
    }
}

/**
 * Setup mobile action icons
 * Wait for full icon collection to ensure correct icons are loaded
 */
async function setupMobileIcons() {
    try {
        // Wait for the full icon collection to be loaded
        if (window.Icon && window.Icon.waitForLoad) {
            await window.Icon.waitForLoad();
            console.log('[Main] Full icon collection loaded, setting up mobile icons...');
        }

        // Setup all mobile buttons with proper icons
        const mobileButtons = [
            { id: 'mobileAiToggle', iconName: 'aiCompanion' },
            { id: 'mobileKnowledgeHubBtn', iconName: 'knowledgeHub' },
            { id: 'mobileNewChatBtn', iconName: 'newChat' }
        ];

        mobileButtons.forEach(({ id, iconName }) => {
            const button = document.getElementById(id);
            if (button && button.children.length === 0) {
                const icon = Icon.mobile(iconName);
                console.log(`[Main] Created ${id} icon:`, icon);
                button.appendChild(icon);
            }
        });

    } catch (error) {
        console.warn('[Main] Error setting up mobile icons, using fallback:', error);
        // Fallback to basic setup
        const mobileAiToggle = document.getElementById('mobileAiToggle');
        if (mobileAiToggle && mobileAiToggle.children.length === 0) {
            mobileAiToggle.appendChild(Icon.mobile('aiCompanion'));
        }
    }
}

/**
 * Setup other specific icons
 */
function setupOtherIcons() {
    // Dropdown arrow
    const ollamaModelSelect = document.getElementById('ollamaModelSelect');
    if (ollamaModelSelect) {
        ollamaModelSelect.style.backgroundImage = Icon.dataUri('dropdown', '#605e5c');
    }
    
    // Handle any remaining data-icon elements for backward compatibility
    // (Excludes elements that are now handled by the modern icon system)
    setupDataIconElements();
}

/**
 * Handle remaining data-icon elements (for backward compatibility)
 * Skips elements that are now handled by the modern icon system
 */
function setupDataIconElements() {
    const iconElements = document.querySelectorAll('[data-icon]');
    
    iconElements.forEach(element => {
        const iconName = element.getAttribute('data-icon');
        if (!iconName || element.children.length > 0) return; // Skip if already has content
        
        // Skip elements that are now handled by the modern icon system
        const modernElements = ['togglerightpanelbtn', 'expandAiCompanionBtn', 'companionIcon', 'aiCompanionToggleBtn', 'mobileAiToggle', 'mobileKnowledgeHubBtn', 'mobileNewChatBtn', 'documentationButton', 'knowledgeHubButton', 'settingsButton', 'conversationsButton'];
        if (modernElements.includes(element.id)) return;
        
        // Create icon with default styling
        const iconElement = Icon.create(iconName, {
            size: element.dataset.width || '18px',
            color: 'currentColor'
        });
        
        element.appendChild(iconElement);
    });
}

/**
 * Export icon setup for use in other modules (like aiCompanion.js)
 */
window.setupIcons = setupIcons;
window.Icon = Icon; // Make Icon globally available

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Export app for global access if needed
window.MCSChatApp = app;
