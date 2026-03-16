# DirectLineConnector 模块使用指南

> 状态说明（2026-03-15）：本文件为历史参考文档，描述的是已淘汰的 DirectLineConnector 架构。
>
> 当前有效基线：
> 1. `src/components/directline/DirectLineService.js`
> 2. `src/components/directline/README.md`
> 3. `docs/iterations/batch-3-directline-refactor/`

---

## 概述

DirectLineConnector 是一个独立的JavaScript模块，用于统一处理Microsoft Bot Framework DirectLine的连接和消息传递。该模块封装了认证和非认证连接方式，提供了简洁的API来管理聊天机器人连接。

## 特性

- ✅ 支持认证和非认证DirectLine连接
- ✅ 自动和手动问候消息
- ✅ WebSocket和轮询连接模式
- ✅ 连接状态监控和错误处理
- ✅ 与WebChat集成
- ✅ 事件驱动的架构
- ✅ 可配置的日志记录
- ✅ 重连机制

## 安装和引用

### 1. 引入必要的依赖库

```html
<!-- Bot Framework DirectLine -->
<script src="https://unpkg.com/botframework-directlinejs@0.15.6/dist/directline.js"></script>
<!-- Bot Framework WebChat -->
<script src="https://cdn.botframework.com/botframework-webchat/latest/webchat.js"></script>
<!-- DirectLineConnector 模块 -->
<script src="src/components/directline/DirectLineConnector.js"></script>
```

### 2. 基本HTML结构

```html
<div id="webchatContainer"></div>
```

## 基本使用

### 1. 创建连接器实例

```javascript
const connector = new DirectLineConnector({
    autoGreeting: true,           // 自动发送问候
    greetingDelay: 1000,          // 问候延迟（毫秒）
    maxRetries: 3,                // 最大重试次数
    retryDelay: 2000,             // 重试延迟
    logLevel: 'info'              // 日志级别: 'none', 'error', 'warning', 'info'
});
```

### 2. 设置事件回调

```javascript
// 连接状态变化
connector.setCallback('onConnectionStatusChange', (status, statusText) => {
    console.log(`Connection status: ${statusText} (${status})`);
});

// 收到消息
connector.setCallback('onMessageReceived', (activity, messageCount) => {
    console.log(`Received message #${messageCount}:`, activity.text);
});

// 错误处理
connector.setCallback('onError', (error) => {
    console.error('DirectLine error:', error);
});

// 日志记录
connector.setCallback('onLog', (level, message, timestamp) => {
    console.log(`[${timestamp}] [${level}] ${message}`);
});

// 问候状态变化
connector.setCallback('onGreetingStatusChange', (type, message) => {
    console.log(`Greeting: ${type} - ${message}`);
});
```

### 3. 连接到非认证Bot

```javascript
async function connectToBot() {
    try {
        const secret = 'YOUR_DIRECTLINE_SECRET';
        const options = {
            webSocket: true,        // 使用WebSocket
            timeout: 20000,         // 超时时间
            pollingInterval: 1000,  // 轮询间隔
            domain: 'https://directline.botframework.com'  // 可选的自定义域
        };
        
        await connector.connectUnauthenticated(secret, options);
        
        // 渲染WebChat
        const container = document.getElementById('webchatContainer');
        connector.renderWebChat(container);
        
        console.log('Connected successfully!');
    } catch (error) {
        console.error('Connection failed:', error);
    }
}
```

### 4. 连接到认证Bot

```javascript
async function connectToAuthenticatedBot() {
    try {
        const tokenEndpoint = 'YOUR_TOKEN_ENDPOINT_URL';
        const options = {
            webSocket: true,
            timeout: 20000,
            pollingInterval: 1000
        };
        
        await connector.connectAuthenticated(tokenEndpoint, options);
        
        // 渲染WebChat
        const container = document.getElementById('webchatContainer');
        connector.renderWebChat(container);
        
        console.log('Connected to authenticated bot!');
    } catch (error) {
        console.error('Authentication failed:', error);
    }
}
```

## 高级用法

### 1. 自定义WebChat样式

```javascript
const customStyleOptions = {
    accent: '#0078d4',
    backgroundColor: '#f8f9fa',
    bubbleBackground: '#ffffff',
    bubbleFromUserBackground: '#0078d4',
    bubbleFromUserTextColor: '#ffffff',
    bubbleBorderRadius: 8,
    avatarSize: 40,
    botAvatarBackgroundColor: '#0078d4',
    userAvatarBackgroundColor: '#6c757d',
    hideUploadButton: true
};

connector.renderWebChat(container, customStyleOptions);
```

### 2. 手动发送问候

```javascript
// 禁用自动问候
const connector = new DirectLineConnector({
    autoGreeting: false
});

// 手动发送问候
try {
    connector.sendGreeting();
    console.log('Greeting sent manually');
} catch (error) {
    console.error('Failed to send greeting:', error);
}
```

### 3. 发送自定义消息

```javascript
const subscription = connector.sendMessage('Hello, Bot!');
subscription.subscribe({
    next: (id) => console.log('Message sent with ID:', id),
    error: (error) => console.error('Failed to send message:', error)
});
```

### 4. 连接状态监控

```javascript
const info = connector.getConnectionInfo();
console.log('Connection info:', {
    isConnected: info.isConnected,
    authMode: info.authMode,
    messageCount: info.messageCount,
    hasDirectLine: info.hasDirectLine
});
```

### 5. 重新连接

```javascript
async function reconnect() {
    try {
        const connectionData = 'YOUR_SECRET_OR_TOKEN_ENDPOINT';
        await connector.reconnect(connectionData);
        console.log('Reconnected successfully');
    } catch (error) {
        console.error('Reconnection failed:', error);
    }
}
```

### 6. 安全断开连接

```javascript
function disconnect() {
    connector.disconnect();
    console.log('Disconnected from bot');
}

// 完全销毁连接器
function cleanup() {
    connector.destroy();
    console.log('Connector destroyed');
}
```

## 事件回调详解

### onConnectionStatusChange(status, statusText)
- `status`: 数字状态码 (0-5)
  - 0: Uninitialized
  - 1: Connecting  
  - 2: Online
  - 3: ExpiredToken
  - 4: FailedToConnect
  - 5: Ended
- `statusText`: 人类可读的状态描述

### onMessageReceived(activity, messageCount)
- `activity`: Bot Framework活动对象
- `messageCount`: 累计收到的消息数量

### onError(error)
- `error`: Error对象，包含错误信息

### onLog(level, message, timestamp)
- `level`: 日志级别 ('info', 'warning', 'error', 'success')
- `message`: 日志消息
- `timestamp`: ISO时间戳

### onGreetingStatusChange(type, message)
- `type`: 问候状态类型 ('success', 'connected', 'error')
- `message`: 状态描述

## 错误处理

### 常见错误类型

1. **Invalid DirectLine Secret**: 无效的DirectLine密钥格式
2. **Token Request Failed**: 认证token请求失败
3. **Regional Settings Failed**: 区域设置获取失败
4. **Connection Timeout**: 连接超时
5. **DirectLine Not Connected**: DirectLine未连接

### 错误处理最佳实践

```javascript
connector.setCallback('onError', (error) => {
    switch (error.message) {
        case 'Invalid DirectLine secret format':
            showUserError('请检查DirectLine密钥格式');
            break;
        case 'Token request failed':
            showUserError('认证失败，请检查Token端点');
            break;
        default:
            showUserError('连接失败: ' + error.message);
    }
});

async function safeConnect() {
    try {
        await connector.connectUnauthenticated(secret);
        connector.renderWebChat(container);
    } catch (error) {
        console.error('Connection failed:', error);
        // 显示用户友好的错误信息
        showErrorToUser(error.message);
    }
}
```

## 配置选项

### DirectLineConnector构造函数选项

```javascript
const options = {
    autoGreeting: true,          // 是否自动发送问候
    greetingDelay: 1000,         // 问候延迟（毫秒）
    maxRetries: 3,               // 最大重试次数
    retryDelay: 2000,            // 重试延迟（毫秒）
    logLevel: 'info'             // 日志级别
};
```

### 连接选项

```javascript
const connectionOptions = {
    webSocket: true,             // 使用WebSocket
    timeout: 20000,              // 连接超时时间
    pollingInterval: 1000,       // 轮询间隔
    domain: 'custom-domain'      // 自定义域（可选）
};
```

## 最佳实践

1. **错误处理**: 始终使用try-catch包装异步调用
2. **资源清理**: 在页面卸载时调用destroy()
3. **状态管理**: 监听连接状态变化来更新UI
4. **日志记录**: 启用适当的日志级别来调试问题
5. **重连策略**: 实现智能重连机制
6. **用户体验**: 为连接状态提供清晰的视觉反馈

## 示例项目

完整的示例项目请参考：
- `src/components/directline/tests/test-directline-module.html` - 基本使用示例
- `src/components/directline/tests/test-directline-enhanced-unified.html` - 原始统一工具
- `src/components/directline/DirectLineConnector.js` - 模块源代码

## 迁移指南

### 从原始代码迁移到模块

1. **替换全局变量**:
   ```javascript
   // 原始代码
   let directLine = null;
   
   // 模块化代码
   const connector = new DirectLineConnector();
   ```

2. **替换连接函数**:
   ```javascript
   // 原始代码
   await connectToUnauthenticatedBot(secret);
   
   // 模块化代码
   await connector.connectUnauthenticated(secret);
   ```

3. **替换事件处理**:
   ```javascript
   // 原始代码
   directLine.connectionStatus$.subscribe(handleStatus);
   
   // 模块化代码
   connector.setCallback('onConnectionStatusChange', handleStatus);
   ```

## 故障排除

### 常见问题

1. **模块未加载**: 确保正确引入DirectLineConnector.js
2. **WebChat不显示**: 检查容器元素是否存在
3. **连接失败**: 验证密钥或Token端点的有效性
4. **问候不工作**: 检查autoGreeting设置和Bot配置

### 调试技巧

1. 启用详细日志: `logLevel: 'info'`
2. 检查浏览器控制台错误
3. 验证网络请求是否成功
4. 确认Bot Framework服务状态

## 支持

如有问题，请参考：
- Bot Framework文档
- WebChat文档
- DirectLine API文档
