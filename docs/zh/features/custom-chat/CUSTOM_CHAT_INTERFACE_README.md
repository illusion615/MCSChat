# CustomChatInterface - 原生聊天组件

> 基于 `tests/directline/test-real-directline.html` 中优秀的聊天控件技术，提取为可重用的独立组件

## 技术特点

### 🚀 核心技术
- **纯原生实现**: 使用原生HTML/CSS/JavaScript，无框架依赖
- **现代设计**: CSS变量、Flexbox、Grid布局，支持响应式
- **DirectLine集成**: 使用项目现有的DirectLineConnector和MessageQueueManager
- **优秀体验**: 流畅动画、实时状态、智能交互

## 技术架构

### 组件关系图

```
CustomChatInterface
├── UI层 (HTML/CSS)
│   ├── 消息显示区域
│   ├── 输入控件
│   └── 状态指示器
├── DirectLineConnector
│   ├── 连接管理
│   ├── 认证处理
│   └── 状态监控
├── MessageQueueManager
│   ├── 消息接收
│   ├── 消息处理
│   └── 历史管理
└── 事件系统
    ├── 连接事件
    ├── 消息事件
    └── 错误事件
```

### 依赖关系

1. **DirectLineConnector**: 处理与Bot Framework的连接
2. **MessageQueueManager**: 管理消息队列和历史
3. **CustomChatInterface**: 提供用户界面和交互

### 🎨 设计优势
相比WebChat SDK，这个组件具有以下优势：

1. **更好的用户体验**
   - 现代化的消息气泡设计
   - 流畅的动画效果
   - 智能的自动滚动
   - 优雅的输入提示

2. **更高的自定义性**
   - 完全可控的样式系统
   - 支持多种主题切换
   - 灵活的配置选项
   - 可扩展的事件系统

3. **更轻量的实现**
   - 无框架依赖，加载速度快
   - 代码结构清晰，易于维护
   - 模块化设计，按需使用

## 快速开始

### 1. 引入文件

```html
<!-- DirectLine SDK -->
<script src="https://unpkg.com/botframework-directlinejs@0.15.6/dist/directline.js"></script>

<!-- 项目组件 -->
<script src="src/components/directline/DirectLineConnector.js"></script>
<script src="src/components/directline/MessageQueueManager.js"></script>

<!-- Custom Chat Interface -->
<link rel="stylesheet" href="src/components/chat/CustomChatInterface.css">
<script src="src/components/chat/CustomChatInterface.js"></script>
```

### 2. 基本使用

```html
<div id="chatContainer"></div>

<script>
// 创建聊天界面
const chatInterface = new CustomChatInterface({
    container: '#chatContainer',
    theme: 'default',
    placeholder: 'Type your message...'
});

// 连接到机器人
chatInterface.connect('YOUR_DIRECTLINE_SECRET')
    .then(() => console.log('Connected!'))
    .catch(error => console.error('Connection failed:', error));
</script>
```

### 3. 高级配置

```javascript
const chatInterface = new CustomChatInterface({
    container: '#chatContainer',
    theme: 'dark',                    // 主题: default, dark, blue, green, purple
    autoScroll: true,                 // 自动滚动到新消息
    showTimestamp: true,              // 显示消息时间戳
    showTypingIndicator: true,        // 显示输入指示器
    enableSuggestedActions: true,     // 启用建议操作
    maxMessages: 1000,                // 最大消息数量
    placeholder: '请输入消息...'       // 输入框占位符
});

// 设置事件回调
chatInterface.on('connect', () => {
    console.log('聊天已连接');
});

chatInterface.on('message', (activity) => {
    console.log('收到消息:', activity.text);
});

chatInterface.on('error', (message, error) => {
    console.error('聊天错误:', message, error);
});
```

## API 文档

### 构造函数

```javascript
new CustomChatInterface(options)
```

#### 参数选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `container` | string/Element | document.body | 聊天界面容器 |
| `theme` | string | 'default' | 主题名称 |
| `autoScroll` | boolean | true | 自动滚动到新消息 |
| `showTimestamp` | boolean | true | 显示消息时间戳 |
| `showTypingIndicator` | boolean | true | 显示输入指示器 |
| `enableSuggestedActions` | boolean | true | 启用建议操作 |
| `maxMessages` | number | 1000 | 最大消息数量 |
| `placeholder` | string | 'Type your message...' | 输入框占位符 |

### 主要方法

#### connect(secret, options)
连接到DirectLine服务

```javascript
chatInterface.connect('YOUR_SECRET', {
    webSocket: true,        // 使用WebSocket
    timeout: 20000,         // 连接超时
    pollingInterval: 1000,  // 轮询间隔
    domain: 'custom-domain' // 自定义域名
});
```

#### disconnect()
断开连接

```javascript
chatInterface.disconnect();
```

#### sendMessage()
发送当前输入框中的消息

```javascript
chatInterface.sendMessage();
```

#### clearChat()
清空聊天记录

```javascript
chatInterface.clearChat();
```

#### getStats()
获取统计信息

```javascript
const stats = chatInterface.getStats();
// {
//     isConnected: true,
//     messagesSent: 5,
//     messagesReceived: 8,
//     conversationId: "conversation-id"
// }
```

#### applyTheme()
应用主题

```javascript
chatInterface.options.theme = 'dark';
chatInterface.applyTheme();
```

#### destroy()
销毁聊天界面

```javascript
chatInterface.destroy();
```

### 事件系统

#### on(event, callback)
注册事件回调

```javascript
chatInterface.on('connect', () => {
    // 连接成功
});

chatInterface.on('disconnect', () => {
    // 连接断开
});

chatInterface.on('message', (activity) => {
    // 收到新消息
});

chatInterface.on('error', (message, error) => {
    // 发生错误
});

chatInterface.on('typing', (activity) => {
    // 机器人正在输入
});
```

## 主题系统

### 内置主题

- `default`: 默认蓝色主题
- `dark`: 深色主题
- `blue`: 蓝色主题
- `green`: 绿色主题
- `purple`: 紫色主题

### 自定义主题

通过CSS变量自定义主题：

```css
.custom-chat-interface[data-theme="custom"] {
    --chat-primary: #ff6b6b;
    --chat-primary-hover: #ff5252;
    --chat-panel-bg: #ffffff;
    --chat-message-bg: #f8f9fa;
    --chat-text: #333333;
    --chat-border: #e1e1e1;
}
```

### 响应式设计

组件自动适配移动设备：

```css
@media (max-width: 768px) {
    .custom-chat-interface {
        height: 100vh;
        border-radius: 0;
    }
}
```

### 紧凑模式

```html
<div class="custom-chat-interface" data-compact="true">
    <!-- 聊天界面 -->
</div>
```

## 功能特性

### 消息处理

- ✅ 文本消息显示
- ✅ 附件处理
- ✅ 建议操作
- ✅ 时间戳显示
- ✅ 用户/机器人消息区分

### 交互体验

- ✅ 输入提示动画
- ✅ 消息滑入动画
- ✅ 自动滚动
- ✅ 状态指示器
- ✅ 错误处理

### 连接管理

- ✅ WebSocket支持
- ✅ 连接状态监控
- ✅ 自动重连
- ✅ 错误恢复

## 使用示例

### 完整示例

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Demo</title>
    
    <script src="https://unpkg.com/botframework-directlinejs@0.15.6/dist/directline.js"></script>
    <link rel="stylesheet" href="src/components/chat/CustomChatInterface.css">
    <script src="src/components/chat/CustomChatInterface.js"></script>
    
    <style>
        #chatContainer {
            width: 400px;
            height: 600px;
            margin: 20px auto;
        }
    </style>
</head>
<body>
    <div id="chatContainer"></div>
    
    <script>
        // 创建聊天界面
        const chat = new CustomChatInterface({
            container: '#chatContainer',
            theme: 'default',
            placeholder: '输入消息...'
        });
        
        // 设置事件监听
        chat.on('connect', () => {
            console.log('聊天已连接');
        });
        
        chat.on('message', (activity) => {
            console.log('新消息:', activity.text);
        });
        
        // 连接到机器人
        chat.connect('YOUR_DIRECTLINE_SECRET');
    </script>
</body>
</html>
```

### React集成示例

```jsx
import React, { useEffect, useRef } from 'react';

function ChatComponent({ secret, theme = 'default' }) {
    const containerRef = useRef(null);
    const chatRef = useRef(null);
    
    useEffect(() => {
        // 创建聊天界面
        chatRef.current = new CustomChatInterface({
            container: containerRef.current,
            theme: theme
        });
        
        // 连接
        if (secret) {
            chatRef.current.connect(secret);
        }
        
        // 清理
        return () => {
            if (chatRef.current) {
                chatRef.current.destroy();
            }
        };
    }, []);
    
    useEffect(() => {
        // 更新主题
        if (chatRef.current) {
            chatRef.current.options.theme = theme;
            chatRef.current.applyTheme();
        }
    }, [theme]);
    
    return <div ref={containerRef} style={{ height: '500px' }} />;
}
```
