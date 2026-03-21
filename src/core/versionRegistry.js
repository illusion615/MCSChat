/**
 * MCSChat Version Registry
 * Central registry for all module versions
 * This file tracks the version of each module in the application
 * 
 * Version Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes or major refactors
 * - MINOR: New features, non-breaking changes
 * - PATCH: Bug fixes and small improvements
 */

export const APP_VERSION = '3.6.0';
export const BUILD_DATE = '2026-03-21';

/**
 * Module versions registry
 * Update these whenever you modify the corresponding module
 */
export const MODULE_VERSIONS = {
    // Core modules
    'Application': '2.0.0',
    'MessageQueue': '1.5.0',
    'MessageRendererAdapter': '1.0.0',
    
    // DirectLine & Connection
    'DirectLineService': '1.0.0',
    
    // UI Modules
    'MessageRenderer': '2.1.0',
    'MessageAPI': '1.0.0',
    'MessageIntegration': '1.0.1',
    'MessageMigrationAdapter': '1.0.1',
    'EnhancedTypingIndicator': '1.0.0',
    'UnifiedMessageRenderer': '1.0.0',
    
    // AI & Speech
    'AICompanion': '3.0.0',
    'AutoQAEngine': '1.0.0',
    'ModelRegistry': '1.0.0',
    'SpeechEngine': '2.0.0',
    'SpeechQueueManager': '1.0.0',
    'PromptManager': '1.0.0',
    
    // Services
    'SessionManager': '1.0.0',
    'AgentManager': '1.0.0',
    'UnifiedNotificationManager': '1.0.0',
    'KnowledgeHubService': '1.0.0',
    
    // Components
    'CitationPreviewPanel': '1.0.0',
    'AdaptiveCardModal': '1.0.0',
    'IconManager': '2.0.0',
    
    // Utils
    'LocalStorageProtection': '1.0.0',
    'LanguageDetector': '1.0.0',
    'StatusIndicator': '1.0.0',
    'MobileUtils': '1.0.0',
    'I18n': '1.0.0',
};

/**
 * Version changelog - track recent changes
 */
export const VERSION_CHANGELOG = {
    '2.0.0': {
        date: '2025-10-04',
        changes: [
            'Added comprehensive version tracking system',
            'Fixed duplicate speech issue in MessageRenderer',
            'Added user activity filtering in DirectLineManager',
            'Implemented version display on splash screen',
        ]
    },
    '1.2.0': {
        date: '2025-10-03',
        changes: [
            'Fixed topic switching duplicate speech',
            'Improved DirectLine activity handling',
            'Enhanced speech synchronization',
        ]
    }
};

/**
 * Get version information for a specific module
 * @param {string} moduleName - Name of the module
 * @returns {string|null} Version string or null if not found
 */
export function getModuleVersion(moduleName) {
    return MODULE_VERSIONS[moduleName] || null;
}

/**
 * Get all module versions
 * @returns {Object} All module versions
 */
export function getAllVersions() {
    return {
        app: APP_VERSION,
        buildDate: BUILD_DATE,
        modules: { ...MODULE_VERSIONS }
    };
}

/**
 * Get version summary for display
 * @returns {string} Formatted version summary
 */
export function getVersionSummary() {
    const moduleCount = Object.keys(MODULE_VERSIONS).length;
    return `MCSChat v${APP_VERSION} (Build: ${BUILD_DATE}) - ${moduleCount} modules`;
}

/**
 * Log all versions to console
 */
export function logAllVersions() {
    console.log('%c╔═══════════════════════════════════════════════════╗', 'color: #0078d4; font-weight: bold');
    console.log('%c║         MCSChat Version Information               ║', 'color: #0078d4; font-weight: bold');
    console.log('%c╚═══════════════════════════════════════════════════╝', 'color: #0078d4; font-weight: bold');
    console.log(`\n📦 App Version: ${APP_VERSION}`);
    console.log(`📅 Build Date: ${BUILD_DATE}\n`);
    
    console.log('🔧 Core Modules:');
    ['Application', 'MessageQueue', 'MessageRendererAdapter', 'DirectLineService'].forEach(module => {
        if (MODULE_VERSIONS[module]) {
            console.log(`   ${module}: v${MODULE_VERSIONS[module]}`);
        }
    });
    
    console.log('\n🎨 UI Modules:');
    ['MessageRenderer', 'MessageAPI', 'MessageIntegration', 'EnhancedTypingIndicator', 'UnifiedMessageRenderer'].forEach(module => {
        if (MODULE_VERSIONS[module]) {
            console.log(`   ${module}: v${MODULE_VERSIONS[module]}`);
        }
    });
    
    console.log('\n🤖 AI & Speech:');
    ['AICompanion', 'AutoQAEngine', 'ModelRegistry', 'SpeechEngine', 'SpeechQueueManager', 'PromptManager'].forEach(module => {
        if (MODULE_VERSIONS[module]) {
            console.log(`   ${module}: v${MODULE_VERSIONS[module]}`);
        }
    });
    
    console.log('\n📋 Services:');
    ['SessionManager', 'AgentManager', 'UnifiedNotificationManager', 'KnowledgeHubService'].forEach(module => {
        if (MODULE_VERSIONS[module]) {
            console.log(`   ${module}: v${MODULE_VERSIONS[module]}`);
        }
    });
    
    console.log('\n🧩 Components:');
    ['CitationPreviewPanel', 'AdaptiveCardModal', 'IconManager'].forEach(module => {
        if (MODULE_VERSIONS[module]) {
            console.log(`   ${module}: v${MODULE_VERSIONS[module]}`);
        }
    });
    
    console.log('\n🔨 Utils:');
    ['LocalStorageProtection', 'LanguageDetector', 'StatusIndicator', 'MobileUtils', 'I18n'].forEach(module => {
        if (MODULE_VERSIONS[module]) {
            console.log(`   ${module}: v${MODULE_VERSIONS[module]}`);
        }
    });
    
    console.log('\n' + '═'.repeat(60) + '\n');
}

// Auto-log versions when this module is loaded
logAllVersions();
