/**
 * 统一消息队列管理器
 * 解决MCSChat多队列问题，融合所有消息处理流程于单一队列
 * 
 * 设计特点：
 * - 单一数据源：统一存储所有消息状态
 * - 生命周期管理：从接收到渲染到语音播报的完整流程
 * - 状态追踪：每个消息的处理阶段状态
 * - 性能优化：消除重复存储，减少内存使用
 * - 独立性：不依赖WebChat或其他特定组件
 */

/**
 * 消息状态枚举
 */
export const MessageStatus = {
    QUEUED: 'queued',
    PROCESSING: 'processing',
    RENDERING: 'rendering',
    STREAMING: 'streaming',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

/**
 * 语音状态枚举
 */
export const SpeechStatus = {
    PENDING: 'pending',
    QUEUED: 'queued',
    SPEAKING: 'speaking',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
};

/**
 * 消息类型枚举
 */
export const MessageType = {
    USER_MESSAGE: 'user-message',
    BOT_MESSAGE: 'bot-message',
    TYPING_INDICATOR: 'typing-indicator',
    CONVERSATION_UPDATE: 'conversation-update',
    BOT_EVENT: 'bot-event',
    SYSTEM_MESSAGE: 'system-message',
    ERROR_MESSAGE: 'error-message'
};

/**
 * 统一消息对象创建器
 */
export class UnifiedMessage {
    constructor(messageData) {
        const now = Date.now();
        
        // === 基础信息 ===
        this.id = messageData.id || `msg_${now}_${Math.random().toString(36).substr(2, 9)}`;
        this.timestamp = messageData.timestamp || now;
        this.source = messageData.source || 'unknown';
        this.type = messageData.type || MessageType.BOT_MESSAGE;
        this.priority = messageData.priority || this.calculatePriority();
        
        // === DirectLine原始数据 ===
        this.directLineData = {
            originalActivity: messageData.originalActivity || null,
            messageType: messageData.messageType || 'message',
            from: messageData.from || { id: 'bot' },
            text: messageData.text || '',
            attachments: messageData.attachments || [],
            suggestedActions: messageData.suggestedActions || null,
            channelData: messageData.channelData || null,
            conversationId: messageData.conversationId || null
        };
        
        // === 渲染状态和配置 ===
        this.renderingState = {
            status: MessageStatus.QUEUED,
            renderType: messageData.renderType || 'complete', // 'complete', 'streaming', 'simulate'
            renderStartTime: null,
            renderEndTime: null,
            domElementId: null,
            streamingProgress: 0,
            estimatedDuration: null,
            retryCount: 0,
            maxRetries: 3
        };
        
        // === 语音播报状态和配置 ===
        this.speechState = {
            enabled: messageData.speechEnabled !== false,
            status: SpeechStatus.PENDING,
            provider: messageData.speechProvider || 'webspeech',
            voice: messageData.voice || null,
            rate: messageData.speechRate || 1.0,
            pitch: messageData.speechPitch || 1.0,
            volume: messageData.speechVolume || 1.0,
            processedText: '',
            audioBuffer: null,
            speechStartTime: null,
            speechEndTime: null,
            speechDuration: null,
            autoPlay: messageData.autoPlay || false,
            queuePosition: 0
        };
        
        // === 交互状态 ===
        this.interactionState = {
            hasUserInteracted: false,
            isVisible: false,
            wasRead: false,
            userRating: null,
            bookmarked: false,
            hasSuggestedActions: !!this.directLineData.suggestedActions,
            suggestedActionsHandled: false
        };
        
        // === 处理历史 ===
        this.processingHistory = [
            {
                stage: 'created',
                timestamp: now,
                duration: 0,
                success: true,
                details: { source: this.source, type: this.type }
            }
        ];
        
        // === 元数据 ===
        this.metadata = {
            queuedAt: new Date().toISOString(),
            source: this.source,
            environment: 'production',
            sessionId: messageData.sessionId || 'default',
            conversationTurn: messageData.conversationTurn || 0,
            isStreaming: messageData.isStreaming || false,
            hasAttachments: (this.directLineData.attachments || []).length > 0,
            estimatedComplexity: this.calculateComplexity(),
            ...messageData.metadata
        };
    }
    
    /**
     * 计算消息优先级
     */
    calculatePriority() {
        switch (this.type) {
            case MessageType.ERROR_MESSAGE: return 15;
            case MessageType.SYSTEM_MESSAGE: return 12;
            case MessageType.USER_MESSAGE: return 8;
            case MessageType.BOT_MESSAGE: return 5;
            case MessageType.BOT_EVENT: return 4;
            case MessageType.TYPING_INDICATOR: return 3;
            case MessageType.CONVERSATION_UPDATE: return 2;
            default: return 1;
        }
    }
    
    /**
     * 计算消息复杂度
     */
    calculateComplexity() {
        const textLength = (this.directLineData.text || '').length;
        const hasAttachments = this.metadata.hasAttachments;
        const hasSuggestedActions = this.interactionState.hasSuggestedActions;
        
        if (textLength > 500 || hasAttachments || hasSuggestedActions) {
            return 'high';
        } else if (textLength > 100) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    /**
     * 添加处理历史记录
     */
    addHistoryEntry(stage, success = true, details = {}) {
        const entry = {
            stage,
            timestamp: Date.now(),
            duration: 0,
            success,
            details
        };
        
        // 计算持续时间（与上一个记录的差）
        if (this.processingHistory.length > 0) {
            const lastEntry = this.processingHistory[this.processingHistory.length - 1];
            entry.duration = entry.timestamp - lastEntry.timestamp;
        }
        
        this.processingHistory.push(entry);
    }
    
    /**
     * 更新渲染状态
     */
    updateRenderingState(updates) {
        this.renderingState = { ...this.renderingState, ...updates };
        this.addHistoryEntry(`rendering_${updates.status}`, true, updates);
    }
    
    /**
     * 更新语音状态
     */
    updateSpeechState(updates) {
        this.speechState = { ...this.speechState, ...updates };
        this.addHistoryEntry(`speech_${updates.status}`, true, updates);
    }
}

/**
 * 统一消息队列管理器
 */
export class UnifiedMessageQueueManager {
    constructor(options = {}) {
        // === 核心队列 ===
        this.messageQueue = [];           // 主队列: 所有消息
        this.processingQueue = [];        // 处理队列: 当前处理中
        this.speechQueue = [];            // 语音队列: 待播报消息ID引用
        
        // === 状态索引 (快速查找) ===
        this.messageIndex = new Map();    // id -> message 映射
        this.renderingIndex = new Map();  // 渲染状态索引
        this.speechIndex = new Map();     // 语音状态索引
        this.typeIndex = new Map();       // 类型索引
        
        // === 处理状态 ===
        this.processingState = {
            isProcessingMain: false,
            isProcessingRender: false,
            isProcessingSpeech: false,
            concurrentLimit: options.concurrentLimit || 3,
            currentProcessing: new Set()
        };
        
        // === 配置选项 ===
        this.config = {
            maxQueueSize: options.maxQueueSize || 1000,
            enableHistory: options.enableHistory !== false,
            enableSpeech: options.enableSpeech !== false,
            autoProcessing: options.autoProcessing !== false,
            processingDelay: options.processingDelay || 50,
            renderingConcurrency: options.renderingConcurrency || 2,
            speechConcurrency: options.speechConcurrency || 1,
            cleanupInterval: options.cleanupInterval || 3600000, // 1小时
            ...options
        };
        
        // === 事件系统 ===
        this.eventTarget = new EventTarget();
        this.subscribers = new Map();
        
        // === 统计信息 ===
        this.stats = {
            totalMessages: 0,
            processedMessages: 0,
            failedMessages: 0,
            averageProcessingTime: 0,
            memoryUsage: 0
        };
        
        // === 计时器 ===
        this.timers = {
            cleanup: null,
            processing: null
        };
        
        this.log('info', 'UnifiedMessageQueueManager initialized');
        this.startCleanupTimer();
    }
    
    /**
     * 入队消息
     */
    enqueueMessage(messageData) {
        try {
            // 创建统一消息对象
            const unifiedMessage = new UnifiedMessage(messageData);
            
            // 检查队列大小限制
            if (this.messageQueue.length >= this.config.maxQueueSize) {
                this.performCleanup();
                if (this.messageQueue.length >= this.config.maxQueueSize) {
                    throw new Error(`Queue size limit exceeded: ${this.config.maxQueueSize}`);
                }
            }
            
            // 按优先级插入队列
            const insertIndex = this.findInsertPosition(unifiedMessage);
            this.messageQueue.splice(insertIndex, 0, unifiedMessage);
            
            // 更新所有索引
            this.updateIndexes(unifiedMessage);
            
            // 更新统计
            this.stats.totalMessages++;
            
            // 触发事件
            this.emit('messageEnqueued', { message: unifiedMessage, queueLength: this.messageQueue.length });
            
            // 启动处理
            if (this.config.autoProcessing) {
                this.scheduleProcessing();
            }
            
            this.log('info', `Message enqueued: ${unifiedMessage.id} (type: ${unifiedMessage.type}, priority: ${unifiedMessage.priority})`);
            
            return unifiedMessage.id;
            
        } catch (error) {
            this.log('error', `Failed to enqueue message: ${error.message}`);
            this.stats.failedMessages++;
            throw error;
        }
    }
    
    /**
     * 查找插入位置（按优先级）
     */
    findInsertPosition(message) {
        return this.messageQueue.findIndex(msg => msg.priority < message.priority);
    }
    
    /**
     * 更新所有索引
     */
    updateIndexes(message) {
        this.messageIndex.set(message.id, message);
        this.renderingIndex.set(message.id, message.renderingState);
        this.speechIndex.set(message.id, message.speechState);
        
        // 类型索引
        if (!this.typeIndex.has(message.type)) {
            this.typeIndex.set(message.type, []);
        }
        this.typeIndex.get(message.type).push(message.id);
    }
    
    /**
     * 调度处理
     */
    scheduleProcessing() {
        if (this.timers.processing) {
            return; // 已经调度了
        }
        
        this.timers.processing = setTimeout(() => {
            this.timers.processing = null;
            this.processQueue();
        }, this.config.processingDelay);
    }
    
    /**
     * 处理队列
     */
    async processQueue() {
        if (this.processingState.isProcessingMain || this.messageQueue.length === 0) {
            return;
        }
        
        this.processingState.isProcessingMain = true;
        this.log('info', `Processing queue (${this.messageQueue.length} messages)`);
        
        try {
            const processingPromises = [];
            
            // 并发处理多个消息
            while (this.messageQueue.length > 0 && 
                   this.processingState.currentProcessing.size < this.config.concurrentLimit) {
                
                const message = this.messageQueue.shift();
                this.processingState.currentProcessing.add(message.id);
                
                const processingPromise = this.processMessage(message)
                    .finally(() => {
                        this.processingState.currentProcessing.delete(message.id);
                    });
                
                processingPromises.push(processingPromise);
            }
            
            // 等待当前批次完成
            if (processingPromises.length > 0) {
                await Promise.allSettled(processingPromises);
            }
            
            // 如果还有消息，继续处理
            if (this.messageQueue.length > 0) {
                this.scheduleProcessing();
            }
            
        } catch (error) {
            this.log('error', `Queue processing error: ${error.message}`);
        } finally {
            this.processingState.isProcessingMain = false;
        }
    }
    
    /**
     * 处理单个消息
     */
    async processMessage(message) {
        const startTime = Date.now();
        
        try {
            message.addHistoryEntry('processing_start');
            
            // 阶段1: 渲染处理
            await this.processRendering(message);
            
            // 阶段2: 语音处理（如果启用）
            if (this.config.enableSpeech && message.speechState.enabled) {
                await this.processSpeech(message);
            }
            
            // 阶段3: 完成处理
            await this.finalizeMessage(message);
            
            message.addHistoryEntry('processing_complete', true);
            this.stats.processedMessages++;
            
            // 更新平均处理时间
            const processingTime = Date.now() - startTime;
            this.updateAverageProcessingTime(processingTime);
            
            this.emit('messageProcessed', { message, processingTime });
            this.log('info', `Message processed: ${message.id} (${processingTime}ms)`);
            
        } catch (error) {
            message.addHistoryEntry('processing_error', false, { error: error.message });
            this.stats.failedMessages++;
            this.emit('messageError', { message, error });
            this.log('error', `Message processing failed: ${message.id} - ${error.message}`);
        }
    }
    
    /**
     * 处理渲染
     */
    async processRendering(message) {
        message.updateRenderingState({ 
            status: MessageStatus.RENDERING,
            renderStartTime: Date.now()
        });
        
        try {
            // 触发渲染事件，让外部处理器处理实际渲染
            const renderingPromise = new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Rendering timeout'));
                }, 30000); // 30秒超时
                
                const handleRenderingComplete = (event) => {
                    if (event.detail.messageId === message.id) {
                        clearTimeout(timeoutId);
                        this.eventTarget.removeEventListener('renderingComplete', handleRenderingComplete);
                        resolve(event.detail);
                    }
                };
                
                const handleRenderingError = (event) => {
                    if (event.detail.messageId === message.id) {
                        clearTimeout(timeoutId);
                        this.eventTarget.removeEventListener('renderingError', handleRenderingError);
                        reject(new Error(event.detail.error));
                    }
                };
                
                this.eventTarget.addEventListener('renderingComplete', handleRenderingComplete);
                this.eventTarget.addEventListener('renderingError', handleRenderingError);
            });
            
            // 发出渲染请求
            this.emit('renderingRequested', { message });
            
            // 等待渲染完成
            await renderingPromise;
            
            message.updateRenderingState({ 
                status: MessageStatus.COMPLETED,
                renderEndTime: Date.now()
            });
            
        } catch (error) {
            message.updateRenderingState({ 
                status: MessageStatus.FAILED,
                renderEndTime: Date.now()
            });
            throw error;
        }
    }
    
    /**
     * 处理语音
     */
    async processSpeech(message) {
        if (!message.speechState.enabled) {
            return;
        }
        
        message.updateSpeechState({ 
            status: SpeechStatus.QUEUED,
            queuePosition: this.speechQueue.length
        });
        
        this.speechQueue.push(message.id);
        
        // 触发语音处理（异步）
        this.processSpeechQueue();
    }
    
    /**
     * 处理语音队列
     */
    async processSpeechQueue() {
        if (this.processingState.isProcessingSpeech || this.speechQueue.length === 0) {
            return;
        }
        
        this.processingState.isProcessingSpeech = true;
        
        try {
            while (this.speechQueue.length > 0) {
                const messageId = this.speechQueue.shift();
                const message = this.messageIndex.get(messageId);
                
                if (message) {
                    await this.processSingleSpeech(message);
                }
            }
        } finally {
            this.processingState.isProcessingSpeech = false;
        }
    }
    
    /**
     * 处理单个语音
     */
    async processSingleSpeech(message) {
        try {
            message.updateSpeechState({ 
                status: SpeechStatus.SPEAKING,
                speechStartTime: Date.now()
            });
            
            // 触发语音播放事件
            this.emit('speechRequested', { message });
            
            // 语音处理完成由外部通知
            // 这里只是更新状态，实际语音播放由外部组件处理
            
        } catch (error) {
            message.updateSpeechState({ 
                status: SpeechStatus.FAILED
            });
            this.log('error', `Speech processing failed: ${message.id} - ${error.message}`);
        }
    }
    
    /**
     * 完成消息处理
     */
    async finalizeMessage(message) {
        // 移动到历史记录（如果启用）
        if (this.config.enableHistory) {
            // 保持在主队列中，但标记为已完成
            message.interactionState.wasRead = true;
        }
        
        this.emit('messageFinalized', { message });
    }
    
    /**
     * 通知渲染完成
     */
    notifyRenderingComplete(messageId, details = {}) {
        this.eventTarget.dispatchEvent(new CustomEvent('renderingComplete', {
            detail: { messageId, ...details }
        }));
    }
    
    /**
     * 通知渲染错误
     */
    notifyRenderingError(messageId, error) {
        this.eventTarget.dispatchEvent(new CustomEvent('renderingError', {
            detail: { messageId, error }
        }));
    }
    
    /**
     * 通知语音完成
     */
    notifySpeechComplete(messageId, details = {}) {
        const message = this.messageIndex.get(messageId);
        if (message) {
            message.updateSpeechState({ 
                status: SpeechStatus.COMPLETED,
                speechEndTime: Date.now(),
                ...details
            });
            this.emit('speechComplete', { message });
        }
    }
    
    /**
     * 事件发射器
     */
    emit(eventType, data) {
        this.eventTarget.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
    
    /**
     * 事件监听器
     */
    on(eventType, callback) {
        this.eventTarget.addEventListener(eventType, callback);
        return () => this.eventTarget.removeEventListener(eventType, callback);
    }
    
    /**
     * 获取消息
     */
    getMessage(messageId) {
        return this.messageIndex.get(messageId);
    }
    
    /**
     * 获取队列状态
     */
    getQueueStatus() {
        return {
            mainQueue: {
                total: this.messageQueue.length,
                pending: this.messageQueue.filter(m => m.renderingState.status === MessageStatus.QUEUED).length,
                processing: this.messageQueue.filter(m => m.renderingState.status === MessageStatus.PROCESSING).length,
                rendering: this.messageQueue.filter(m => m.renderingState.status === MessageStatus.RENDERING).length,
                completed: this.messageQueue.filter(m => m.renderingState.status === MessageStatus.COMPLETED).length
            },
            speechQueue: {
                pending: this.speechQueue.length,
                speaking: Array.from(this.speechIndex.values()).filter(s => s.status === SpeechStatus.SPEAKING).length
            },
            processing: {
                isProcessingMain: this.processingState.isProcessingMain,
                isProcessingRender: this.processingState.isProcessingRender,
                isProcessingSpeech: this.processingState.isProcessingSpeech,
                currentProcessing: this.processingState.currentProcessing.size
            },
            stats: this.stats
        };
    }
    
    /**
     * 性能清理
     */
    performCleanup() {
        const cutoffTime = Date.now() - this.config.cleanupInterval;
        const initialLength = this.messageQueue.length;
        
        // 清理已完成的旧消息
        this.messageQueue = this.messageQueue.filter(message => {
            if (message.timestamp < cutoffTime && 
                message.renderingState.status === MessageStatus.COMPLETED &&
                message.speechState.status === SpeechStatus.COMPLETED) {
                
                this.removeFromIndexes(message.id);
                return false;
            }
            return true;
        });
        
        const cleanedCount = initialLength - this.messageQueue.length;
        if (cleanedCount > 0) {
            this.log('info', `Cleaned up ${cleanedCount} old messages`);
        }
    }
    
    /**
     * 从索引中移除消息
     */
    removeFromIndexes(messageId) {
        const message = this.messageIndex.get(messageId);
        if (message) {
            this.messageIndex.delete(messageId);
            this.renderingIndex.delete(messageId);
            this.speechIndex.delete(messageId);
            
            // 从类型索引中移除
            const typeMessages = this.typeIndex.get(message.type);
            if (typeMessages) {
                const index = typeMessages.indexOf(messageId);
                if (index > -1) {
                    typeMessages.splice(index, 1);
                }
            }
        }
    }
    
    /**
     * 启动清理定时器
     */
    startCleanupTimer() {
        if (this.timers.cleanup) {
            clearInterval(this.timers.cleanup);
        }
        
        this.timers.cleanup = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupInterval);
    }
    
    /**
     * 更新平均处理时间
     */
    updateAverageProcessingTime(newTime) {
        const total = this.stats.averageProcessingTime * this.stats.processedMessages + newTime;
        this.stats.averageProcessingTime = total / (this.stats.processedMessages + 1);
    }
    
    /**
     * 日志记录
     */
    log(level, message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [UnifiedMessageQueue] [${level.toUpperCase()}] ${message}`;
        
        if (level === 'error') {
            console.error(logMessage);
        } else if (level === 'warn') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    }
    
    /**
     * 销毁队列管理器
     */
    destroy() {
        // 清理定时器
        if (this.timers.cleanup) {
            clearInterval(this.timers.cleanup);
        }
        if (this.timers.processing) {
            clearTimeout(this.timers.processing);
        }
        
        // 清理队列和索引
        this.messageQueue = [];
        this.processingQueue = [];
        this.speechQueue = [];
        this.messageIndex.clear();
        this.renderingIndex.clear();
        this.speechIndex.clear();
        this.typeIndex.clear();
        
        this.log('info', 'UnifiedMessageQueueManager destroyed');
    }
}

/**
 * 消息队列适配器
 * 提供与现有代码的兼容性
 */
export class MessageQueueAdapter {
    constructor(unifiedQueue) {
        this.unifiedQueue = unifiedQueue;
    }
    
    /**
     * 适配DirectLine活动到统一消息格式
     */
    adaptDirectLineActivity(activity) {
        return {
            id: activity.id,
            originalActivity: activity,
            messageType: activity.type,
            from: activity.from,
            text: activity.text,
            attachments: activity.attachments,
            suggestedActions: activity.suggestedActions,
            channelData: activity.channelData,
            conversationId: activity.conversation?.id,
            type: this.mapActivityType(activity),
            timestamp: new Date(activity.timestamp).getTime()
        };
    }
    
    /**
     * 映射活动类型
     */
    mapActivityType(activity) {
        switch (activity.type) {
            case 'message':
                return activity.from?.id === 'user' ? MessageType.USER_MESSAGE : MessageType.BOT_MESSAGE;
            case 'typing':
                return MessageType.TYPING_INDICATOR;
            case 'conversationUpdate':
                return MessageType.CONVERSATION_UPDATE;
            case 'event':
                return MessageType.BOT_EVENT;
            default:
                return MessageType.BOT_MESSAGE;
        }
    }
    
    /**
     * 处理DirectLine活动
     */
    handleDirectLineActivity(activity) {
        const messageData = this.adaptDirectLineActivity(activity);
        return this.unifiedQueue.enqueueMessage(messageData);
    }
}

// Named exports for ES6 modules
export { UnifiedMessage, UnifiedMessageQueueManager, MessageQueueAdapter, MessageType, MessageStatus, SpeechStatus };

// Default export
export default UnifiedMessageQueueManager;

// Global exposure for non-module environments
if (typeof window !== 'undefined') {
    window.UnifiedMessageQueue = {
        UnifiedMessage,
        UnifiedMessageQueueManager,
        MessageQueueAdapter,
        MessageType,
        MessageStatus,
        SpeechStatus
    };
    console.log('UnifiedMessageQueue exposed to window object');
}
