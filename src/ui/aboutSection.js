/**
 * About Section Module
 * Version: 1.0.1
 * 
 * Manages the About section in the settings dialog, displaying version information,
 * module versions, and system information.
 * 
 * Changelog:
 * - 1.0.1: Fixed to work with flat MODULE_VERSIONS structure
 * - 1.0.0: Initial implementation
 */

import { APP_VERSION, BUILD_DATE, MODULE_VERSIONS, getAllVersions } from '../core/versionRegistry.js';

const VERSION = '1.0.1';

/**
 * Initialize the About section
 * Populates all version information and sets up event handlers
 */
export function initializeAboutSection() {
    console.log(`[AboutSection v${VERSION}] Initializing About section...`);
    
    try {
        // Populate app version info
        populateAppVersion();
        
        // Populate module versions by category
        populateModuleVersions();
        
        // Populate system information
        populateSystemInfo();
        
        // Setup event handlers
        setupEventHandlers();
        
        console.log(`[AboutSection v${VERSION}] About section initialized successfully`);
    } catch (error) {
        console.error('[AboutSection] Error initializing About section:', error);
    }
}

/**
 * Populate app version and build date
 */
function populateAppVersion() {
    const appVersionEl = document.getElementById('aboutAppVersion');
    const buildDateEl = document.getElementById('aboutBuildDate');
    
    if (appVersionEl) {
        appVersionEl.textContent = APP_VERSION;
    }
    
    if (buildDateEl) {
        buildDateEl.textContent = BUILD_DATE;
    }
}

/**
 * Populate module versions organized by category
 */
function populateModuleVersions() {
    // Organize modules by category based on the flat MODULE_VERSIONS structure
    const categories = [
        { 
            id: 'aboutCoreModules', 
            name: 'Core', 
            modules: ['Application', 'MessageQueue', 'MessageRendererAdapter', 'DirectLineService']
        },
        { 
            id: 'aboutUIModules', 
            name: 'UI', 
            modules: ['MessageRenderer', 'MessageAPI', 'MessageIntegration', 'MessageMigrationAdapter', 'EnhancedTypingIndicator', 'UnifiedMessageRenderer']
        },
        { 
            id: 'aboutAIModules', 
            name: 'AI & Speech', 
            modules: ['AICompanion', 'AutoQAEngine', 'ModelRegistry', 'SpeechEngine', 'SpeechQueueManager', 'PromptManager']
        },
        { 
            id: 'aboutServicesModules', 
            name: 'Services', 
            modules: ['SessionManager', 'AgentManager', 'UnifiedNotificationManager', 'KnowledgeHubService']
        },
        { 
            id: 'aboutComponentsModules', 
            name: 'Components', 
            modules: ['CitationPreviewPanel', 'AdaptiveCardModal', 'IconManager']
        },
        { 
            id: 'aboutUtilsModules', 
            name: 'Utils', 
            modules: ['LocalStorageProtection', 'LanguageDetector', 'StatusIndicator', 'MobileUtils', 'I18n']
        }
    ];
    
    categories.forEach(category => {
        const containerEl = document.getElementById(category.id);
        if (containerEl) {
            containerEl.innerHTML = ''; // Clear existing content
            
            category.modules.forEach(moduleName => {
                const version = MODULE_VERSIONS[moduleName];
                if (version) {
                    const moduleItem = createModuleItem(moduleName, version);
                    containerEl.appendChild(moduleItem);
                }
            });
        }
    });
}

/**
 * Create a module item element
 * @param {string} moduleName - Name of the module
 * @param {string} version - Version string
 * @returns {HTMLElement} The module item element
 */
function createModuleItem(moduleName, version) {
    const item = document.createElement('div');
    item.className = 'module-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'module-name';
    nameSpan.textContent = moduleName;
    
    const versionSpan = document.createElement('span');
    versionSpan.className = 'module-version';
    versionSpan.textContent = `v${version}`;
    
    item.appendChild(nameSpan);
    item.appendChild(versionSpan);
    
    return item;
}

/**
 * Populate system information
 */
function populateSystemInfo() {
    // Browser info
    const browserInfoEl = document.getElementById('aboutBrowserInfo');
    if (browserInfoEl) {
        browserInfoEl.textContent = getBrowserInfo();
    }
    
    // User agent
    const userAgentEl = document.getElementById('aboutUserAgent');
    if (userAgentEl) {
        userAgentEl.textContent = navigator.userAgent;
    }
    
    // Screen resolution
    const screenResEl = document.getElementById('aboutScreenRes');
    if (screenResEl) {
        screenResEl.textContent = `${window.screen.width} × ${window.screen.height}`;
    }
    
    // Language
    const languageEl = document.getElementById('aboutLanguage');
    if (languageEl) {
        languageEl.textContent = navigator.language || 'Unknown';
    }
}

/**
 * Get browser name and version
 * @returns {string} Browser information
 */
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'Unknown Browser';
    let browserVersion = 'Unknown Version';
    
    // Detect browser
    if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        const match = ua.match(/Firefox\/(\d+\.\d+)/);
        if (match) browserVersion = match[1];
    } else if (ua.indexOf('Edg') > -1) {
        browserName = 'Edge';
        const match = ua.match(/Edg\/(\d+\.\d+)/);
        if (match) browserVersion = match[1];
    } else if (ua.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
        const match = ua.match(/Chrome\/(\d+\.\d+)/);
        if (match) browserVersion = match[1];
    } else if (ua.indexOf('Safari') > -1) {
        browserName = 'Safari';
        const match = ua.match(/Version\/(\d+\.\d+)/);
        if (match) browserVersion = match[1];
    }
    
    return `${browserName} ${browserVersion}`;
}

/**
 * Setup event handlers for About section
 */
function setupEventHandlers() {
    // Copy version info button
    const copyBtn = document.getElementById('copyVersionInfoBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyVersionInfo);
    }
}

/**
 * Copy version information to clipboard
 */
async function copyVersionInfo() {
    try {
        const versionInfo = generateVersionInfoText();
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(versionInfo);
            showCopyFeedback('Version information copied to clipboard!');
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = versionInfo;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showCopyFeedback('Version information copied to clipboard!');
        }
    } catch (error) {
        console.error('[AboutSection] Error copying version info:', error);
        showCopyFeedback('Failed to copy version information', true);
    }
}

/**
 * Generate formatted version information text
 * @returns {string} Formatted version information
 */
function generateVersionInfoText() {
    let text = `MCS Chat Application\n`;
    text += `Version: ${APP_VERSION}\n`;
    text += `Build Date: ${BUILD_DATE}\n`;
    text += `\n`;
    
    // Organize modules by category
    const categories = [
        { name: 'Core Modules', modules: ['Application', 'MessageQueue', 'MessageRendererAdapter', 'DirectLineService'] },
        { name: 'UI Modules', modules: ['MessageRenderer', 'MessageAPI', 'MessageIntegration', 'MessageMigrationAdapter', 'EnhancedTypingIndicator', 'UnifiedMessageRenderer'] },
        { name: 'AI & Speech Modules', modules: ['AICompanion', 'AutoQAEngine', 'ModelRegistry', 'SpeechEngine', 'SpeechQueueManager', 'PromptManager'] },
        { name: 'Services Modules', modules: ['SessionManager', 'AgentManager', 'UnifiedNotificationManager', 'KnowledgeHubService'] },
        { name: 'Components Modules', modules: ['CitationPreviewPanel', 'AdaptiveCardModal', 'IconManager'] },
        { name: 'Utils Modules', modules: ['LocalStorageProtection', 'LanguageDetector', 'StatusIndicator', 'MobileUtils', 'I18n'] }
    ];
    
    categories.forEach(category => {
        text += `\n${category.name}:\n`;
        category.modules.forEach(moduleName => {
            const version = MODULE_VERSIONS[moduleName];
            if (version) {
                text += `  - ${moduleName}: v${version}\n`;
            }
        });
    });
    
    // Add system information
    text += `\nSystem Information:\n`;
    text += `  - Browser: ${getBrowserInfo()}\n`;
    text += `  - User Agent: ${navigator.userAgent}\n`;
    text += `  - Screen Resolution: ${window.screen.width} × ${window.screen.height}\n`;
    text += `  - Language: ${navigator.language || 'Unknown'}\n`;
    
    return text;
}

/**
 * Show copy feedback message
 * @param {string} message - Feedback message
 * @param {boolean} isError - Whether it's an error message
 */
function showCopyFeedback(message, isError = false) {
    const copyBtn = document.getElementById('copyVersionInfoBtn');
    if (!copyBtn) return;
    
    const originalText = copyBtn.textContent;
    copyBtn.textContent = message;
    copyBtn.style.backgroundColor = isError ? '#d13438' : '#0078d4';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
    }, 2000);
}

// Log module version on load
console.log(`[AboutSection] Module loaded (v${VERSION})`);
