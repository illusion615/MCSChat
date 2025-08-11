/**
 * Unified Notification Manager
 * Provides centralized notification system with zone-based positioning
 * Designed for gradual migration from existing notification systems
 */

import { DOMUtils } from '../utils/domUtils.js';

export class UnifiedNotificationManager {
    constructor() {
        this.notifications = new Map(); // Track active notifications
        this.containers = new Map(); // Track zone containers
        this.config = {
            defaultDuration: 5000,
            animationDuration: 300,
            maxNotificationsPerZone: 5
        };

        // Define notification zones
        this.zones = {
            'initialization': {
                position: 'bottom-center',
                priority: 'high',
                container: null, // Will create floating container
                floating: true, // Changed to floating for consistency
                maxNotifications: 1 // Only one initialization message at a time
            },
            'connection': {
                position: 'top-right',
                priority: 'high',
                container: null, // Will create floating container
                floating: true,
                maxNotifications: 3
            },
            'ai-companion': {
                position: 'bottom-left',
                priority: 'high',
                container: null, // Will create floating container
                floating: true,
                maxNotifications: 5
            },
            'logging': {
                position: 'bottom-right',
                priority: 'medium',
                container: null, // Will create floating container
                floating: true,
                maxNotifications: 5
            }
        };

        // Notification types with icons and styling
        this.types = {
            // Initialization types
            'init-loading': { icon: '⟳', zone: 'initialization', priority: 'high' },
            'init-ready': { icon: '✅', zone: 'initialization', priority: 'high' },
            'init-error': { icon: '❌', zone: 'initialization', priority: 'high' },

            // Connection types
            'connection-connecting': { icon: '🔄', zone: 'connection', priority: 'high' },
            'connection-connected': { icon: '✅', zone: 'connection', priority: 'high' },
            'connection-failed': { icon: '❌', zone: 'connection', priority: 'high' },
            'connection-expired': { icon: '⏰', zone: 'connection', priority: 'high' },
            'connection-ended': { icon: '⏹', zone: 'connection', priority: 'high' },

            // Logging types
            'log-info': { icon: 'ℹ', zone: 'logging', priority: 'medium' },
            'log-warning': { icon: '⚠', zone: 'logging', priority: 'medium' },
            'log-error': { icon: '❌', zone: 'logging', priority: 'high' },
            'log-success': { icon: '✅', zone: 'logging', priority: 'medium' },

            // Generic types (commonly used by other components)
            'info': { icon: 'ℹ', zone: 'logging', priority: 'medium' },
            'warning': { icon: '⚠', zone: 'logging', priority: 'medium' },
            'error': { icon: '❌', zone: 'logging', priority: 'high' },
            'success': { icon: '✅', zone: 'logging', priority: 'medium' },
            'loading': { icon: '⟳', zone: 'logging', priority: 'medium' }
        };

        this.initialize();
    }

    /**
     * Initialize the notification system
     * @private
     */
    initialize() {
        console.log('[UnifiedNotificationManager] Initializing notification system...');

        // Create floating containers for zones that need them
        this.createFloatingContainers();

        // Setup cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        console.log('[UnifiedNotificationManager] Notification system ready');
    }

    /**
     * Create floating containers for notification zones
     * @private
     */
    createFloatingContainers() {
        Object.entries(this.zones).forEach(([zoneId, zoneConfig]) => {
            // All zones are now floating
            const container = this.createZoneContainer(zoneId, zoneConfig);
            document.body.appendChild(container);
            this.containers.set(zoneId, container);
            console.log(`[UnifiedNotificationManager] Created floating container for zone: ${zoneId} at position: ${zoneConfig.position}`);
        });
    }

    /**
     * Create a zone container element
     * @param {string} zoneId - Zone identifier
     * @param {Object} zoneConfig - Zone configuration
     * @returns {HTMLElement} Container element
     * @private
     */
    createZoneContainer(zoneId, zoneConfig) {
        const container = DOMUtils.createElement('div', {
            className: `unified-notification-zone unified-zone-${zoneId}`,
            id: `unifiedZone${zoneId.charAt(0).toUpperCase() + zoneId.slice(1)}`
        });

        // Apply positioning styles
        const styles = this.getZoneStyles(zoneConfig.position);
        Object.assign(container.style, styles);

        return container;
    }

    /**
     * Get CSS styles for zone positioning
     * @param {string} position - Position identifier
     * @returns {Object} CSS styles object
     * @private
     */
    getZoneStyles(position) {
        const baseStyles = {
            position: 'fixed',
            zIndex: '10000',
            pointerEvents: 'none', // Allow clicks through empty areas
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '400px'
        };

        const positionStyles = {
            'top-right': {
                top: '20px',
                right: '20px',
                alignItems: 'flex-end'
            },
            'bottom-right': {
                bottom: '20px',
                right: '20px',
                alignItems: 'flex-end'
            },
            'bottom-left': {
                bottom: '20px',
                left: '20px',
                alignItems: 'flex-start'
            },
            'bottom-center': {
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                alignItems: 'center'
            },
            'top-left': {
                top: '20px',
                left: '20px',
                alignItems: 'flex-start'
            }
        };

        return { ...baseStyles, ...positionStyles[position] };
    }

    /**
     * Show a notification
     * @param {string} type - Notification type
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    show(type, message, options = {}) {
        const typeConfig = this.types[type];
        if (!typeConfig) {
            console.warn(`[UnifiedNotificationManager] Unknown notification type: ${type}`);
            return null;
        }

        const notificationId = this.generateId();
        const zoneId = typeConfig.zone;
        const zone = this.zones[zoneId];

        // Merge options with defaults
        const config = {
            duration: options.duration ?? this.config.defaultDuration,
            persistent: options.persistent ?? false,
            ...options
        };

        // Create notification element
        const notification = this.createNotificationElement(
            notificationId,
            type,
            message,
            typeConfig,
            config
        );

        // Get or create container for the zone
        let container = this.getZoneContainer(zoneId);
        if (!container) {
            console.error(`[UnifiedNotificationManager] No container found for zone: ${zoneId}`);
            return null;
        }

        // Manage zone capacity
        this.manageZoneCapacity(container, zone.maxNotifications);

        // Add notification to container
        container.appendChild(notification);
        this.notifications.set(notificationId, {
            element: notification,
            type,
            zoneId,
            config,
            timestamp: Date.now()
        });

        // Show notification with animation
        this.showNotificationWithAnimation(notification, zoneId);

        // Setup auto-hide
        if (!config.persistent && config.duration > 0) {
            setTimeout(() => {
                this.hide(notificationId);
            }, config.duration);
        }

        console.log(`[UnifiedNotificationManager] Shown notification: ${type} in zone: ${zoneId}`);
        return notificationId;
    }

    /**
     * Hide a notification
     * @param {string} notificationId - Notification ID to hide
     */
    hide(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            return;
        }

        const element = notification.element;
        const zoneId = notification.zoneId;

        // Add hide animation based on zone
        const animationName = this.getHideAnimationForZone(zoneId);
        element.style.animation = `${animationName} ${this.config.animationDuration}ms ease-in-out`;

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(notificationId);
            console.log(`[UnifiedNotificationManager] Hidden notification: ${notificationId}`);
        }, this.config.animationDuration);
    }

    /**
     * Get container for a zone
     * @param {string} zoneId - Zone identifier
     * @returns {HTMLElement|null} Container element
     * @private
     */
    getZoneContainer(zoneId) {
        const zone = this.zones[zoneId];
        if (!zone) return null;

        // All zones are now floating
        return this.containers.get(zoneId);
    }

    /**
     * Generate unique notification ID
     * @returns {string} Unique ID
     * @private
     */
    generateId() {
        return `unified-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }    /**
     * Create fallback initialization container
     * @returns {HTMLElement} Fallback container
     * @private
     */
    createFallbackInitContainer() {
        const container = DOMUtils.createElement('div', {
            className: 'unified-notification-zone unified-zone-initialization-fallback',
            id: 'unifiedInitFallback'
        });

        // Apply bottom-center positioning
        const styles = this.getZoneStyles('bottom-center');
        Object.assign(container.style, styles);

        document.body.appendChild(container);
        return container;
    }

    /**
     * Create notification element
     * @param {string} id - Notification ID
     * @param {string} type - Notification type
     * @param {string} message - Message text
     * @param {Object} typeConfig - Type configuration
     * @param {Object} config - Notification configuration
     * @returns {HTMLElement} Notification element
     * @private
     */
    createNotificationElement(id, type, message, typeConfig, config) {
        const notification = DOMUtils.createElement('div', {
            className: `unified-notification unified-notification-${type}`,
            id: id
        });

        // Enable pointer events for this notification
        notification.style.pointerEvents = 'auto';

        // Create icon
        const icon = DOMUtils.createElement('div', {
            className: 'unified-notification-icon'
        });
        icon.textContent = typeConfig.icon;

        // Create content
        const content = DOMUtils.createElement('div', {
            className: 'unified-notification-content'
        });
        content.textContent = message;

        // Create timestamp
        const timestamp = DOMUtils.createElement('div', {
            className: 'unified-notification-timestamp'
        });
        timestamp.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Create close button (only for persistent or long-duration notifications)
        if (config.persistent || config.duration > 10000) {
            const closeBtn = DOMUtils.createElement('button', {
                className: 'unified-notification-close'
            });
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => {
                this.hide(id);
            });
            notification.appendChild(closeBtn);
        }

        // Assemble notification
        notification.appendChild(icon);
        notification.appendChild(content);
        notification.appendChild(timestamp);

        return notification;
    }

    /**
     * Show notification with animation
     * @param {HTMLElement} element - Notification element
     * @param {string} zoneId - Zone identifier for animation selection
     * @private
     */
    showNotificationWithAnimation(element, zoneId) {
        const animationName = this.getShowAnimationForZone(zoneId);
        element.style.animation = `${animationName} ${this.config.animationDuration}ms ease-out`;
    }

    /**
     * Get show animation name based on zone
     * @param {string} zoneId - Zone identifier
     * @returns {string} Animation name
     * @private
     */
    getShowAnimationForZone(zoneId) {
        switch (zoneId) {
            case 'initialization':
                return 'unifiedNotificationSlideInBottom';
            default:
                return 'unifiedNotificationSlideIn';
        }
    }

    /**
     * Get hide animation name based on zone
     * @param {string} zoneId - Zone identifier
     * @returns {string} Animation name
     * @private
     */
    getHideAnimationForZone(zoneId) {
        switch (zoneId) {
            case 'initialization':
                return 'unifiedNotificationSlideOutBottom';
            default:
                return 'unifiedNotificationSlideOut';
        }
    }

    /**
     * Manage zone capacity by removing old notifications
     * @param {HTMLElement} container - Zone container
     * @param {number} maxNotifications - Maximum notifications allowed
     * @private
     */
    manageZoneCapacity(container, maxNotifications) {
        const notifications = container.querySelectorAll('.unified-notification');
        if (notifications.length >= maxNotifications) {
            // Remove oldest notifications
            const toRemove = notifications.length - maxNotifications + 1;
            for (let i = 0; i < toRemove; i++) {
                const oldNotification = notifications[i];
                const oldId = oldNotification.id;
                if (oldId) {
                    this.hide(oldId);
                }
            }
        }
    }

    /**
     * Generate unique notification ID
     * @returns {string} Unique ID
     * @private
     */
    generateId() {
        return `unified-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all notifications in a zone
     * @param {string} zoneId - Zone to clear
     */
    clearZone(zoneId) {
        const container = this.getZoneContainer(zoneId);
        if (!container) return;

        const notifications = container.querySelectorAll('.unified-notification');
        notifications.forEach(notification => {
            const id = notification.id;
            if (id) {
                this.hide(id);
            }
        });

        console.log(`[UnifiedNotificationManager] Cleared zone: ${zoneId}`);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        Object.keys(this.zones).forEach(zoneId => {
            this.clearZone(zoneId);
        });
        console.log('[UnifiedNotificationManager] Cleared all notifications');
    }

    /**
     * Get active notifications count
     * @param {string} zoneId - Optional zone filter
     * @returns {number} Count of active notifications
     */
    getActiveCount(zoneId = null) {
        if (zoneId) {
            return Array.from(this.notifications.values())
                .filter(n => n.zoneId === zoneId).length;
        }
        return this.notifications.size;
    }

    /**
     * Cleanup resources
     * @private
     */
    cleanup() {
        this.clearAll();

        // Remove floating containers
        this.containers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });

        this.containers.clear();
        console.log('[UnifiedNotificationManager] Cleanup completed');
    }
}

// Global instance
let unifiedNotificationManager = null;

/**
 * Get or create the global unified notification manager instance
 * @returns {UnifiedNotificationManager} Global instance
 */
export function getUnifiedNotificationManager() {
    if (!unifiedNotificationManager) {
        unifiedNotificationManager = new UnifiedNotificationManager();
    }
    return unifiedNotificationManager;
}
