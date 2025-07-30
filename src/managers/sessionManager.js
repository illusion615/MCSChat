/**
 * Chat Session Manager
 * Handles chat sessions, message history, and conversation state
 */

import { Utils } from '../utils/helpers.js';
import { DOMUtils } from '../utils/domUtils.js';

export class SessionManager {
    constructor() {
        this.currentSession = null;
        this.sessionStorage = 'chatHistory';
        this.currentSessionStorage = 'currentSession';
        this.initializeElements();
        this.initialize();
        this.setupEventListeners();
    }

    /**
     * Initialize DOM elements
     * @private
     */
    initializeElements() {
        this.elements = {
            sessionList: DOMUtils.getElementById('sessionList'),
            chatWindow: DOMUtils.getElementById('chatWindow')
        };
    }

    /**
     * Initialize session manager
     * @private
     */
    initialize() {
        this.loadCurrentSession();
        this.loadSessionList();
    }

    /**
     * Setup event listeners for session manager
     * @private
     */
    setupEventListeners() {
        // Listen for conversation context requests from AI companion
        window.addEventListener('getConversationContext', (e) => {
            const maxMessages = e.detail?.maxMessages || 10;
            console.log(`[Session Manager] Context request received for ${maxMessages} messages`);
            
            const context = this.getConversationContext(maxMessages);

            // Store the context in the event detail for the caller to access
            e.detail.context = context;
            
            console.log(`[Session Manager] Context provided: ${context.substring(0, 100)}...`);

            // Also dispatch a response event
            window.dispatchEvent(new CustomEvent('conversationContextResponse', {
                detail: { context, maxMessages }
            }));
        });
    }

    /**
     * Get current session ID
     * @returns {string} Current session ID
     */
    getCurrentSession() {
        if (!this.currentSession) {
            this.currentSession = this.createNewSession();
        }
        return this.currentSession;
    }

    /**
     * Create a new session
     * @returns {string} New session ID
     */
    createNewSession() {
        const sessionId = Utils.generateId('session');
        this.currentSession = sessionId;
        this.saveCurrentSession();
        console.log('Created new session:', sessionId);
        return sessionId;
    }

    /**
     * Start a new session
     * @returns {string} New session ID
     */
    startNewSession() {
        const newSession = this.createNewSession();
        this.clearChatWindow();
        this.loadSessionList();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('sessionChanged', {
            detail: { sessionId: newSession }
        }));

        return newSession;
    }

    /**
     * Save current session to localStorage
     * @private
     */
    saveCurrentSession() {
        try {
            localStorage.setItem(this.currentSessionStorage, this.currentSession);
        } catch (error) {
            console.error('Error saving current session:', error);
        }
    }

    /**
     * Clear current session storage
     * Used when starting a new chat to ensure fresh initialization
     */
    clearCurrentSessionStorage() {
        try {
            localStorage.removeItem(this.currentSessionStorage);
            this.currentSession = null;
            console.log('Cleared current session storage');
        } catch (error) {
            console.error('Error clearing current session storage:', error);
        }
    }

    /**
     * Load current session from localStorage
     * @private
     */
    loadCurrentSession() {
        try {
            const saved = localStorage.getItem(this.currentSessionStorage);
            if (saved) {
                this.currentSession = saved;
                console.log('Loaded current session:', this.currentSession);
            }
        } catch (error) {
            console.error('Error loading current session:', error);
        }
    }

    /**
     * Add message to current session
     * @param {Object} message - Message object
     */
    addMessage(message) {
        const sessionId = this.getCurrentSession();
        const chatHistory = this.getChatHistory();

        const messageEntry = {
            ...message,
            session: sessionId,
            timestamp: message.timestamp || new Date().toISOString(),
            id: message.id || Utils.generateId('msg')
        };

        chatHistory.push(messageEntry);
        this.saveChatHistory(chatHistory);

        console.log('Added message to session:', sessionId, messageEntry);
    }

    /**
     * Get messages for specific session
     * @param {string} sessionId - Session ID (optional, defaults to current)
     * @returns {Array} Session messages
     */
    getSessionMessages(sessionId = null) {
        const targetSession = sessionId || this.getCurrentSession();
        const chatHistory = this.getChatHistory();
        return chatHistory.filter(entry => entry.session === targetSession);
    }

    /**
     * Get all chat history
     * @returns {Array} All chat messages
     */
    getChatHistory() {
        try {
            const history = localStorage.getItem(this.sessionStorage);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    }

    /**
     * Save chat history to localStorage
     * @param {Array} history - Chat history array
     * @private
     */
    saveChatHistory(history) {
        try {
            localStorage.setItem(this.sessionStorage, JSON.stringify(history));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    /**
     * Load session list and update UI
     */
    loadSessionList() {
        if (!this.elements.sessionList) return;

        const chatHistory = this.getChatHistory();
        const sessions = this.groupMessagesBySession(chatHistory);

        this.elements.sessionList.innerHTML = '';

        if (Object.keys(sessions).length === 0) {
            this.elements.sessionList.innerHTML = '<div class="no-sessions">No chat history</div>';
            return;
        }

        // Sort sessions by most recent activity
        const sortedSessions = Object.entries(sessions).sort((a, b) => {
            const aTime = new Date(a[1].lastActivity);
            const bTime = new Date(b[1].lastActivity);
            return bTime - aTime;
        });

        sortedSessions.forEach(([sessionId, sessionData]) => {
            const sessionItem = this.createSessionItem(sessionId, sessionData);
            this.elements.sessionList.appendChild(sessionItem);
        });
    }

    /**
     * Group messages by session
     * @param {Array} messages - All messages
     * @returns {Object} Grouped sessions
     * @private
     */
    groupMessagesBySession(messages) {
        const sessions = {};

        messages.forEach(message => {
            if (!sessions[message.session]) {
                sessions[message.session] = {
                    messages: [],
                    lastActivity: message.timestamp,
                    messageCount: 0
                };
            }

            sessions[message.session].messages.push(message);
            sessions[message.session].messageCount++;

            // Update last activity time
            if (new Date(message.timestamp) > new Date(sessions[message.session].lastActivity)) {
                sessions[message.session].lastActivity = message.timestamp;
            }
        });

        return sessions;
    }

    /**
     * Create session item element
     * @param {string} sessionId - Session ID
     * @param {Object} sessionData - Session data
     * @returns {HTMLElement} Session item element
     * @private
     */
    createSessionItem(sessionId, sessionData) {
        const isCurrentSession = sessionId === this.currentSession;
        const lastMessage = sessionData.messages[sessionData.messages.length - 1];
        const preview = this.getMessagePreview(lastMessage);
        const timeAgo = this.getTimeAgo(sessionData.lastActivity);

        const sessionItem = DOMUtils.createElement('div', {
            className: `sessionItem ${isCurrentSession ? 'active' : ''}`,
            dataset: { sessionId }
        });

        // Create session text span (matches legacy structure)
        const sessionText = DOMUtils.createElement('span', {}, Utils.escapeHtml(preview));

        // Create delete icon span (matches legacy structure)  
        const deleteIcon = DOMUtils.createElement('span', {
            className: 'deleteIcon'
        }, '&#215;');

        // Add event listeners
        DOMUtils.addEventListener(sessionText, 'click', () => {
            this.loadSession(sessionId);
        });

        DOMUtils.addEventListener(deleteIcon, 'click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this session?')) {
                this.deleteSession(sessionId);
            }
        });

        DOMUtils.addEventListener(sessionItem, 'click', () => {
            this.loadSession(sessionId);
        });

        // Append children (matches legacy order)
        sessionItem.appendChild(sessionText);
        sessionItem.appendChild(deleteIcon);

        return sessionItem;
    }

    /**
     * Get message preview text
     * @param {Object} message - Message object
     * @returns {string} Preview text
     * @private
     */
    getMessagePreview(message) {
        if (message.text) {
            return Utils.truncate(message.text, 50);
        } else if (message.attachments && message.attachments.length > 0) {
            return `📎 ${message.attachments.length} attachment(s)`;
        } else {
            return 'Message';
        }
    }

    /**
     * Get human-readable time ago
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Time ago string
     * @private
     */
    getTimeAgo(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now - messageTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return messageTime.toLocaleDateString();
    }

    /**
     * Load a specific session
     * @param {string} sessionId - Session ID to load
     */
    loadSession(sessionId) {
        if (sessionId === this.currentSession) return;

        console.log('Loading session:', sessionId);
        this.currentSession = sessionId;
        this.saveCurrentSession();

        // Load session messages
        const messages = this.getSessionMessages(sessionId);
        this.clearChatWindow();

        // Dispatch event with session messages
        window.dispatchEvent(new CustomEvent('sessionLoaded', {
            detail: { sessionId, messages }
        }));

        // Update session list to show active session
        this.loadSessionList();
    }

    /**
     * Delete a session
     * @param {string} sessionId - Session ID to delete
     */
    deleteSession(sessionId) {
        console.log('Deleting session:', sessionId);

        const chatHistory = this.getChatHistory();
        const filteredHistory = chatHistory.filter(message => message.session !== sessionId);

        this.saveChatHistory(filteredHistory);

        // If deleting current session, start a new one
        if (sessionId === this.currentSession) {
            this.startNewSession();
        } else {
            this.loadSessionList();
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('sessionDeleted', {
            detail: { sessionId }
        }));
    }

    /**
     * Clear current chat window
     * @private
     */
    clearChatWindow() {
        if (this.elements.chatWindow) {
            this.elements.chatWindow.innerHTML = '';
        }
    }

    /**
     * Clear all chat history
     */
    clearAllHistory() {
        console.log('Clearing all chat history');
        localStorage.removeItem(this.sessionStorage);
        localStorage.removeItem(this.currentSessionStorage);

        this.currentSession = null;
        this.startNewSession();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('historyCleared'));
    }

    /**
     * Check if current conversation is empty
     * @returns {boolean} True if current conversation has no messages
     */
    isCurrentConversationEmpty() {
        const messages = this.getSessionMessages();
        return messages.length === 0;
    }

    /**
     * Get conversation context for AI analysis
     * @param {number} maxMessages - Maximum number of messages to include
     * @returns {string} Conversation context
     */
    getConversationContext(maxMessages = 50) {
        const messages = this.getSessionMessages();
        console.log(`[Session Manager] Total messages in current session: ${messages.length}`);
        console.log(`[Session Manager] Requested maxMessages: ${maxMessages}`);
        
        const recentMessages = messages.slice(-maxMessages);
        console.log(`[Session Manager] Providing ${recentMessages.length} messages for context`);

        let context = 'Recent conversation:\n';
        recentMessages.forEach((message, index) => {
            const sender = message.from === 'user' ? 'User' : 'Agent';
            const text = message.text || '[Non-text message]';
            context += `${sender}: ${text}\n`;
            
            // Log first few messages for debugging
            if (index < 3) {
                console.log(`[Session Manager] Message ${index + 1}: ${sender} - ${text.substring(0, 50)}...`);
            }
        });

        console.log(`[Session Manager] Context generated with ${(context.match(/\n(User|Agent):/g) || []).length} messages`);
        return context;
    }

    /**
     * Export session data
     * @param {string} sessionId - Session ID to export
     * @returns {Object} Session data
     */
    exportSession(sessionId) {
        const messages = this.getSessionMessages(sessionId);
        return {
            sessionId,
            messages,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Get session statistics
     * @returns {Object} Session statistics
     */
    getStatistics() {
        const chatHistory = this.getChatHistory();
        const sessions = this.groupMessagesBySession(chatHistory);

        return {
            totalSessions: Object.keys(sessions).length,
            totalMessages: chatHistory.length,
            currentSession: this.currentSession,
            currentSessionMessages: this.getSessionMessages().length
        };
    }
}

// Create and export singleton instance
export const sessionManager = new SessionManager();
