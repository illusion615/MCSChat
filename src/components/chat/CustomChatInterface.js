/**
 * CustomChatInterface - 原生JavaScript聊天界面组件
 * 基于test-real-directline.html中的聊天控件技术，提供更好的用户体验
 * 
 * 技术特点：
 * - 纯原生HTML/CSS/JavaScript实现，无框架依赖
 * - 集成项目现有的DirectLineConnector和MessageQueueManager
 * - 现代CSS设计，支持自定义主题
 * - 完整的消息处理：文本、附件、建议操作
 * - 实时状态更新和输入提示
 */

class CustomChatInterface {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            container: options.container || document.body,
            theme: options.theme || 'default',
            autoScroll: options.autoScroll !== false,
            showTimestamp: options.showTimestamp !== false,
            showTypingIndicator: options.showTypingIndicator !== false,
            enableSuggestedActions: options.enableSuggestedActions !== false,
            maxMessages: options.maxMessages || 1000,
            placeholder: options.placeholder || 'Type your message...',
            ...options
        };

        // 状态管理
        this.directLineConnector = null;
        this.messageQueueManager = null;
        this.isConnected = false;
        this.messageCount = { sent: 0, received: 0 };
        this.typingTimer = null;
        this.conversationId = null;

        // DOM 元素引用
        this.elements = {};
        
        // 事件回调
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onMessage: null,
            onError: null,
            onTyping: null
        };

        this.init();
    }

    /**
     * 初始化聊天界面
     */
    init() {
        this.createChatInterface();
        this.attachEventListeners();
        this.applyTheme();
    }

    /**
     * 创建聊天界面HTML结构
     */
    createChatInterface() {
        const chatHTML = `
            <div class="custom-chat-interface" data-theme="${this.options.theme}">
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages">
                        <div class="welcome-message">
                            <h3>💬 Chat Ready</h3>
                            <p>Connect to your bot to start chatting</p>
                        </div>
                    </div>
                    <div class="chat-input-container">
                        <form class="chat-input-form" id="chatForm">
                            <input type="text" 
                                   class="chat-input" 
                                   id="messageInput" 
                                   placeholder="${this.options.placeholder}" 
                                   disabled>
                            <button type="submit" class="send-btn" id="sendBtn" disabled>
                                <span class="send-icon">➤</span>
                            </button>
                        </form>
                    </div>
                </div>
                <div class="chat-status" id="chatStatus">
                    <span class="status-indicator" id="statusIndicator">●</span>
                    <span class="status-text" id="statusText">Disconnected</span>
                </div>
            </div>
        `;

        // 添加到容器
        if (typeof this.options.container === 'string') {
            this.container = document.querySelector(this.options.container);
        } else {
            this.container = this.options.container;
        }
        
        this.container.innerHTML = chatHTML;

        // 获取DOM元素引用
        this.elements = {
            chatContainer: this.container.querySelector('.chat-container'),
            chatMessages: this.container.querySelector('#chatMessages'),
            chatForm: this.container.querySelector('#chatForm'),
            messageInput: this.container.querySelector('#messageInput'),
            sendBtn: this.container.querySelector('#sendBtn'),
            statusIndicator: this.container.querySelector('#statusIndicator'),
            statusText: this.container.querySelector('#statusText')
        };
    }

    /**
     * 添加事件监听器
     */
    attachEventListeners() {
        // 消息发送表单
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // 输入框回车发送
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 输入框输入事件（可用于发送输入指示）
        this.elements.messageInput.addEventListener('input', () => {
            // 可以在这里添加"用户正在输入"的指示
        });
    }

    /**
     * 连接到DirectLine
     */
    async connect(secret, options = {}) {
        if (this.isConnected) {
            throw new Error('Already connected');
        }

        try {
            // 创建DirectLineConnector实例
            this.directLineConnector = new DirectLineConnector({
                autoGreeting: options.autoGreeting !== false,
                greetingDelay: options.greetingDelay || 1000,
                logLevel: options.logLevel || 'info'
            });

            // 设置DirectLineConnector事件回调
            this.directLineConnector.setCallback('onConnectionStatusChange', (status, statusText) => {
                this.handleConnectionStatus(status, statusText);
                
                // 当连接成功时初始化MessageQueueManager
                if (status === 2 && !this.messageQueueManager) { // 2 = Online
                    this.initializeMessageQueueManager();
                }
            });

            this.directLineConnector.setCallback('onError', (error) => {
                this.handleError('DirectLine connection error', error);
            });

            this.directLineConnector.setCallback('onLog', (level, message) => {
                this.log(`[DirectLineConnector] ${message}`);
            });

            // 连接到DirectLine
            this.updateStatus('connecting', 'Connecting...');
            await this.directLineConnector.connectUnauthenticated(secret, {
                webSocket: options.webSocket !== false,
                timeout: options.timeout || 20000,
                pollingInterval: options.pollingInterval || 1000,
                domain: options.domain
            });

            this.log('Connection established successfully');
            return true;

        } catch (error) {
            this.handleError('Connection failed', error);
            throw error;
        }
    }

    /**
     * 初始化消息队列管理器
     */
    initializeMessageQueueManager() {
        try {
            // 创建MessageQueueManager实例
            this.messageQueueManager = new MessageQueueManager(this.directLineConnector, {
                maxHistorySize: this.options.maxMessages,
                enableHistory: true
            });

            // 设置MessageQueueManager事件回调
            this.messageQueueManager.setCallback('onMessageReceived', (activity) => {
                this.handleActivity(activity);
            });

            this.messageQueueManager.setCallback('onError', (error) => {
                this.handleError('Message queue error', error);
            });

            // 初始化消息监听
            this.messageQueueManager.initializeMessageListener();
            
            this.log('MessageQueueManager initialized successfully');
        } catch (error) {
            this.handleError('Failed to initialize MessageQueueManager', error);
        }
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.directLineConnector) {
            this.directLineConnector.disconnect();
            this.directLineConnector = null;
        }
        
        if (this.messageQueueManager) {
            this.messageQueueManager = null;
        }
        
        this.isConnected = false;
        this.updateStatus('disconnected', 'Disconnected');
        this.setInputEnabled(false);
        
        if (this.callbacks.onDisconnect) {
            this.callbacks.onDisconnect();
        }
    }

    /**
     * 发送消息
     */
    sendMessage() {
        const messageText = this.elements.messageInput.value.trim();
        
        // 添加详细的调试日志
        this.log('sendMessage called', { 
            messageText: messageText, 
            messageLength: messageText.length,
            isConnected: this.isConnected,
            directLineConnectorExists: !!this.directLineConnector,
            directLineConnectorConnected: this.directLineConnector ? this.directLineConnector.isConnected : false
        });
        
        if (!messageText) {
            this.log('Message is empty, not sending');
            return;
        }
        
        if (!this.isConnected) {
            this.log('Chat interface not connected, not sending message');
            return;
        }
        
        if (!this.directLineConnector) {
            this.log('DirectLineConnector not available, not sending message');
            return;
        }
        
        if (!this.directLineConnector.isConnected) {
            this.log('DirectLineConnector not connected, not sending message');
            return;
        }

        // 创建消息活动
        const activity = {
            from: { id: 'user', name: 'User' },
            type: 'message',
            text: messageText,
            timestamp: new Date().toISOString()
        };

        // 显示用户消息
        this.addMessage('user', activity);

        // 发送到机器人
        try {
            this.log('Attempting to send message via DirectLineConnector', { text: messageText });
            const sendObservable = this.directLineConnector.sendMessage(messageText);
            this.log('DirectLineConnector.sendMessage returned observable', { observable: !!sendObservable });
            
            // 订阅Observable来处理发送结果
            sendObservable.subscribe({
                next: (id) => {
                    this.messageCount.sent++;
                    this.log('Message sent successfully', { text: messageText, id: id });
                },
                error: (error) => {
                    this.handleError('Failed to send message', error);
                    this.log('Message send failed', { text: messageText, error: error.message });
                }
            });
            
        } catch (error) {
            this.handleError('Failed to send message', error);
            this.log('Exception in sendMessage', { error: error.message });
        }

        // 清空输入框
        this.elements.messageInput.value = '';
        this.elements.messageInput.focus();
    }

    /**
     * 处理接收到的活动
     */
    handleActivity(activity) {
        // 跳过用户自己的消息（回声防止）
        if (activity.from && activity.from.id === 'user') {
            return;
        }

        switch (activity.type) {
            case 'message':
                this.handleMessageActivity(activity);
                break;
            case 'typing':
                this.handleTypingActivity(activity);
                break;
            case 'conversationUpdate':
                this.handleConversationUpdate(activity);
                break;
            default:
                this.log('Unhandled activity type', activity.type);
                break;
        }
    }

    /**
     * 处理消息活动
     */
    handleMessageActivity(activity) {
        this.messageCount.received++;
        this.clearTypingIndicator();
        this.addMessage('bot', activity);

        if (this.callbacks.onMessage) {
            this.callbacks.onMessage(activity);
        }
    }

    /**
     * 处理输入指示活动
     */
    handleTypingActivity(activity) {
        if (this.options.showTypingIndicator) {
            this.showTypingIndicator();
        }

        if (this.callbacks.onTyping) {
            this.callbacks.onTyping(activity);
        }
    }

    /**
     * 处理会话更新
     */
    handleConversationUpdate(activity) {
        if (activity.conversation && activity.conversation.id) {
            this.conversationId = activity.conversation.id;
        }
    }

    /**
     * 添加消息到聊天界面
     */
    addMessage(type, activity) {
        const messageDiv = this.createMessageBubble(type, activity);
        this.elements.chatMessages.appendChild(messageDiv);
        
        if (this.options.autoScroll) {
            this.scrollToBottom();
        }

        // 限制消息数量
        this.limitMessages();
    }

    /**
     * 创建消息气泡
     */
    createMessageBubble(type, activity) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        // 添加消息文本
        if (activity.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = activity.text;
            bubbleDiv.appendChild(textDiv);
        }

        // 添加附件
        if (activity.attachments && activity.attachments.length > 0) {
            const attachmentsDiv = this.createAttachmentsElement(activity.attachments);
            bubbleDiv.appendChild(attachmentsDiv);
        }

        // 添加建议操作
        if (this.options.enableSuggestedActions && 
            activity.suggestedActions && 
            activity.suggestedActions.actions) {
            const actionsDiv = this.createSuggestedActionsElement(activity.suggestedActions.actions);
            bubbleDiv.appendChild(actionsDiv);
        }

        // 添加时间戳
        if (this.options.showTimestamp) {
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';
            metaDiv.textContent = new Date(activity.timestamp || Date.now()).toLocaleTimeString();
            bubbleDiv.appendChild(metaDiv);
        }

        messageDiv.appendChild(bubbleDiv);
        return messageDiv;
    }

    /**
     * 创建附件元素
     */
    createAttachmentsElement(attachments) {
        const attachmentsDiv = document.createElement('div');
        attachmentsDiv.className = 'message-attachments';
        
        attachments.forEach(attachment => {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'attachment';
            attachmentDiv.innerHTML = `
                <span class="attachment-icon">📎</span>
                <span class="attachment-name">${attachment.name || attachment.contentType || 'Attachment'}</span>
            `;
            attachmentsDiv.appendChild(attachmentDiv);
        });
        
        return attachmentsDiv;
    }

    /**
     * 创建建议操作元素
     */
    createSuggestedActionsElement(actions) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'suggested-actions';
        
        actions.forEach(action => {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'suggested-action';
            actionBtn.textContent = action.title || action.value;
            actionBtn.addEventListener('click', () => {
                this.elements.messageInput.value = action.value || action.title;
                this.sendMessage();
            });
            actionsDiv.appendChild(actionBtn);
        });
        
        return actionsDiv;
    }

    /**
     * 显示输入指示器
     */
    showTypingIndicator() {
        this.clearTypingIndicator();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="typing-content">
                <span class="typing-text">Bot is typing</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        this.elements.chatMessages.appendChild(typingDiv);
        
        if (this.options.autoScroll) {
            this.scrollToBottom();
        }

        // 自动清除输入指示器
        this.typingTimer = setTimeout(() => {
            this.clearTypingIndicator();
        }, 5000);
    }

    /**
     * 清除输入指示器
     */
    clearTypingIndicator() {
        const existing = this.elements.chatMessages.querySelector('#typingIndicator');
        if (existing) {
            existing.remove();
        }
        
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
    }

    /**
     * 处理连接状态变化
     */
    handleConnectionStatus(status, statusText) {
        // DirectLineConnector传递数字状态码，需要转换
        let normalizedStatus;
        
        if (typeof status === 'number') {
            // 数字状态码映射
            switch (status) {
                case 0: // Uninitialized
                    normalizedStatus = 'disconnected';
                    break;
                case 1: // Connecting
                    normalizedStatus = 'connecting';
                    break;
                case 2: // Online
                    normalizedStatus = 'connected';
                    break;
                case 3: // ExpiredToken
                case 4: // FailedToConnect
                    normalizedStatus = 'error';
                    break;
                case 5: // Ended
                    normalizedStatus = 'disconnected';
                    break;
                default:
                    normalizedStatus = 'disconnected';
                    break;
            }
        } else {
            // 字符串状态直接使用
            normalizedStatus = status;
        }

        this.log(`Connection status changed: ${normalizedStatus} (${status}) - ${statusText || ''}`);

        // 处理状态变化
        switch (normalizedStatus) {
            case 'connecting':
                this.updateStatus('connecting', 'Connecting...');
                break;
            case 'connected':
                this.isConnected = true;
                this.updateStatus('connected', 'Connected');
                this.setInputEnabled(true);
                this.clearWelcomeMessage();
                if (this.callbacks.onConnect) {
                    this.callbacks.onConnect();
                }
                break;
            case 'disconnected':
                this.isConnected = false;
                this.updateStatus('disconnected', 'Disconnected');
                this.setInputEnabled(false);
                if (this.callbacks.onDisconnect) {
                    this.callbacks.onDisconnect();
                }
                break;
            case 'error':
                this.updateStatus('error', 'Connection Error');
                this.handleError('Connection error', statusText || 'Connection failed');
                break;
            default:
                this.log('Unknown connection status', normalizedStatus);
                break;
        }
    }

    /**
     * 更新连接状态显示
     */
    updateStatus(status, text) {
        this.elements.statusIndicator.className = `status-indicator status-${status}`;
        this.elements.statusText.textContent = text;
    }

    /**
     * 启用/禁用输入
     */
    setInputEnabled(enabled) {
        this.elements.messageInput.disabled = !enabled;
        this.elements.sendBtn.disabled = !enabled;
        
        if (enabled) {
            this.elements.messageInput.focus();
        }
    }

    /**
     * 清除欢迎消息
     */
    clearWelcomeMessage() {
        const welcome = this.elements.chatMessages.querySelector('.welcome-message');
        if (welcome) {
            welcome.remove();
        }
    }

    /**
     * 发送会话更新
     */
    sendConversationUpdate() {
        if (!this.directLineConnector || !this.directLineConnector.isConnected) return;

        try {
            // DirectLineConnector已经内置了自动问候功能
            // 这里可以发送额外的会话更新如果需要
            this.log('Conversation update handled by DirectLineConnector');
        } catch (error) {
            this.handleError('Failed to send conversation update', error);
        }
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    /**
     * 限制消息数量
     */
    limitMessages() {
        const messages = this.elements.chatMessages.querySelectorAll('.message');
        if (messages.length > this.options.maxMessages) {
            const excess = messages.length - this.options.maxMessages;
            for (let i = 0; i < excess; i++) {
                messages[i].remove();
            }
        }
    }

    /**
     * 清空聊天记录
     */
    clearChat() {
        this.elements.chatMessages.innerHTML = `
            <div class="welcome-message">
                <h3>💬 Chat Ready</h3>
                <p>Connect to your bot to start chatting</p>
            </div>
        `;
        this.messageCount = { sent: 0, received: 0 };
    }

    /**
     * 应用主题
     */
    applyTheme() {
        // 主题样式将通过CSS类应用
        const chatInterface = this.container.querySelector('.custom-chat-interface');
        chatInterface.setAttribute('data-theme', this.options.theme);
    }

    /**
     * 设置事件回调
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
            this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
        }
    }

    /**
     * 错误处理
     */
    handleError(message, error) {
        console.error(message, error);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(message, error);
        }
    }

    /**
     * 日志记录
     */
    log(message, data = null) {
        console.log(`[CustomChatInterface] ${message}`, data);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            isConnected: this.isConnected,
            messagesSent: this.messageCount.sent,
            messagesReceived: this.messageCount.received,
            conversationId: this.conversationId,
            directLineConnector: this.directLineConnector ? {
                currentAuthMode: this.directLineConnector.currentAuthMode,
                isConnected: this.directLineConnector.isConnected
            } : null,
            messageQueueManager: this.messageQueueManager ? {
                messageCount: this.messageQueueManager.messageCount,
                historySize: this.messageQueueManager.messageHistory.length
            } : null
        };
    }

    /**
     * 销毁聊天界面
     */
    destroy() {
        this.disconnect();
        
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
        
        // 清理组件实例
        this.directLineConnector = null;
        this.messageQueueManager = null;
        
        this.container.innerHTML = '';
    }
}

// ES Module export
export { CustomChatInterface };

// 全局访问（如果直接在浏览器中使用）
if (typeof window !== 'undefined') {
    window.CustomChatInterface = CustomChatInterface;
}
