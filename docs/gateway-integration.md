# Gateway Integration Guide

## 概述

MCSChat 应用已集成对本地 D2E Router 的支持，可以直接使用 Copilot Studio New Agent（通过 `/agenticruntime/3p` D2E 流）进行对话。

## 架构概览

```
浏览器应用                    本地 Router                  Copilot Studio
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  MCSChat         │      │  D2E Router      │      │  New Agent       │
│  (localhost:8000)│  ←→  │  (127.0.0.1:8090)│  ←→  │  D2E Stream      │
└──────────────────┘      └──────────────────┘      └──────────────────┘
   DirectEngineConnector    • 会话映射             • 令牌管理
                          • Token 缓存             • SSE 活动流
                          • 流标准化
```

## 快速集成

### 方式 1：启动本地 Router

```bash
# 终端 1：启动 MCSChat 应用服务器
cd /Users/wellszhang/Documents/GitHub/MCSChat
python3 -m http.server 8000

# 终端 2：配置并启动本地 Router
cd gateway
npm install
npm run generate:secrets
cp .env.example .env.local
# 编辑 .env.local，填入 4 个 LOCAL_* 秘钥
npm run start:local
```

### 方式 2：在浏览器中访问 New Agent 路由

打开：
```
http://localhost:8000/index.html?agent=new
```

或使用验证页面直接测试：
```
http://localhost:8000/examples/d2e-router-streaming-test.html
```

## 代码集成点

### 1. 应用启动（src/core/application.js）

```javascript
// 检查 ?agent=new 查询参数
const agentType = new URLSearchParams(location.search).get('agent');

if (agentType === 'new') {
  // 使用 D2E Router 连接器
  const connector = new DirectEngineConnector(
    'http://127.0.0.1:8090',  // 本地 Router 地址
    agentUserId                 // 该 Agent 对用户可见的 ID
  );
  
  // 连接事件处理（与 DirectLine 连接器相同的事件模型）
  connector.setCallback('message', handleNewMessage);
  connector.setCallback('typing', handleTyping);
  // ...
}
```

### 2. 连接器事件模型（一致的事件接口）

`DirectEngineConnector` 与 `DirectLineConnector` 使用相同的事件接口：

```javascript
// 事件类型：
connector.setCallback('ready', () => {
  // Router 已就绪，会话已创建
});

connector.setCallback('message', (message) => {
  // message.from: { id, name }
  // message.text: 用户输入或 Bot 响应
  // message.timestamp: 消息时间戳
});

connector.setCallback('activity', (activity) => {
  // 完整活动对象（包括 adaptive cards）
});

connector.setCallback('typing', () => {
  // Bot 正在输入
});

connector.setCallback('error', (error) => {
  // 连接或处理错误
});
```

### 3. 消息发送流程

```javascript
// 用户点击发送按钮时
async function sendMessage(userInput) {
  // 显示用户消息
  renderUserMessage(userInput);
  
  // 通过 connector 发送
  await connector.send({
    text: userInput,
    from: { id: userId, name: userName }
  });
  
  // Router 会返回一系列事件：
  // 1. 'activity': { stage: 'evaluating' }
  // 2. 'activity': { answer: '...' }（多次，流式）
  // 3. 'activity': { final: '完整答案' }
  // 4. 'message': { text: '...' }（最终消息）
}
```

## 流式响应处理

### 事件序列

对于一个 New Agent 请求，Router 会按顺序发送以下事件：

1. **Stage Events**（处理阶段）
   ```javascript
   { type: 'activity', stage: 'evaluating' }
   { type: 'activity', stage: 'generating' }
   ```

2. **Streaming Answer**（流式答案片段，多个）
   ```javascript
   { type: 'activity', answer: '这是第一段' }
   { type: 'activity', answer: '这是第二段' }
   // ...
   ```

3. **Final Answer**（完整答案）
   ```javascript
   { type: 'activity', final: '完整的最终答案' }
   ```

4. **Complete Message**（消息完成）
   ```javascript
   { type: 'message', text: '...' }
   ```

### UI 渲染

```javascript
// 流式处理示例
function handleRouterActivity(activity) {
  if (activity.stage) {
    // 显示处理阶段指示器
    showProcessingStage(activity.stage);
  }
  
  if (activity.answer) {
    // 追加到答案文本框（支持 markdown 渲染）
    appendToAnswer(activity.answer);
  }
  
  if (activity.final) {
    // 显示完整答案（替换流式显示）
    renderFinalAnswer(activity.final);
    hideProcessingIndicator();
  }
  
  if (activity.error) {
    // 显示错误
    showError(activity.error);
  }
}
```

## 配置选项

### 应用配置（主应用 settings panel）

虽然 Router 本身通过 `.env.local` 配置，但应用中可以配置以下项：

1. **Router 地址**（如果需要远程 Router）
   - 默认：`http://127.0.0.1:8090`
   - 可在 agent settings 中修改

2. **Agent ID**
   - 用于标识该 New Agent 在 Router 中的映射
   - 从 Copilot Studio agent 列表获取

### Router 配置（gateway/.env.local）

```bash
# Router 自身配置
PORT=8090                                          # Router 监听端口
TENANT_ID=899aca58-...                           # 租户 ID
ENTRA_CLIENT_ID=00000000-...                     # 应用注册 ID
LOCAL_ENTRA_CLIENT_SECRET=xxx_xxx_xxx            # Entra 秘钥（需手动创建）
LOCAL_MSAL_CACHE_ENCRYPTION_KEY=abc123...        # 令牌缓存加密密钥
ALLOWED_UPSTREAM_USER_OID=00000000-...           # 受控用户 OID
POWER_PLATFORM_ENVIRONMENT_ID=448464af-...      # 工作空间环境 ID
POWER_PLATFORM_SCHEMA_NAME=Default_KnowledgeAgentNewCopilot_sodjEw  # Schema
LOCAL_PROTOTYPE_API_KEY=def456...                # API 密钥（用于浏览器）
LOCAL_ADMIN_SESSION_SIGNING_KEY=ghi789...       # 会话签名密钥
ALLOWED_ORIGINS=http://localhost:8000            # 应用允许的来源
```

## 多会话管理

### 会话生命周期

```javascript
// 创建新会话
connector.newConversation();  // 生成新的 conversationId

// 发送消息到当前会话
await connector.send({ text: '...' });

// 清除会话历史（UI 层，不影响 Router 的服务器端会话）
clearChatHistory();
```

### 会话隔离

每个 Router 会话都有：
- **不透明 ID**：浏览器使用，不暴露内部映射
- **TTL**：默认 60 分钟（可配置），超时自动清理
- **上游映射**：Router 内部维护到实际 Copilot 会话的映射
- **消息历史**：服务器端保留，每个新会话独立

## 错误处理

### 常见错误场景

1. **Router 未就绪**
   ```javascript
   connector.setCallback('error', (error) => {
     if (error.code === 'ROUTER_NOT_READY') {
       showMessage('Router 尚未准备好，请稍候...');
       // 重试连接
       setTimeout(() => connector.connect(), 2000);
     }
   });
   ```

2. **会话超时**
   ```javascript
   if (error.code === 'CONVERSATION_EXPIRED') {
     showMessage('会话已过期，创建新会话...');
     connector.newConversation();
   }
   ```

3. **流处理错误**
   ```javascript
   connector.setCallback('activity', (activity) => {
     if (activity.error) {
       console.error('流错误:', activity.error);
       showError(`处理失败: ${activity.error}`);
     }
   });
   ```

## 性能优化

### 流式显示优化

```javascript
// 合并多个 answer 事件以减少 DOM 操作
let answerBuffer = '';
let bufferTimer = null;

function handleAnswer(chunk) {
  answerBuffer += chunk;
  
  // 每 100ms 批量更新一次 DOM
  if (!bufferTimer) {
    bufferTimer = setTimeout(() => {
      appendToAnswer(answerBuffer);
      answerBuffer = '';
      bufferTimer = null;
    }, 100);
  }
}
```

### 消息历史优化

```javascript
// 对大型对话进行虚拟化滚动
function renderMessagesVirtualized(messages) {
  const visibleRange = getVisibleRange();
  const visibleMessages = messages.slice(
    visibleRange.start,
    visibleRange.end
  );
  
  renderMessages(visibleMessages);
}
```

## 测试

### 本地测试

1. **启动 Router 和应用**
   ```bash
   # 终端 1
   cd gateway && npm run start:local
   
   # 终端 2
   python3 -m http.server 8000
   ```

2. **测试验证页面**
   ```
   http://localhost:8090/prototype
   ```

3. **测试集成应用**
   ```
   http://localhost:8000/index.html?agent=new
   ```

### 自动化测试

```bash
cd gateway
npm test  # 27 个单元测试
```

## 常见问题

### Q: 如何在现有的 DirectLine agent 和 New Agent 之间切换？

A: 使用 query 参数：
- `?agent=new` — 使用本地 Router 的 New Agent
- `?agent=classic` — 使用传统 DirectLine agent
- 默认行为取决于配置

### Q: 本地 Router 可以暴露到互联网吗？

A: **不建议**。Router 仅设计为本地服务（`127.0.0.1:8090`）。如需远程访问，需要：
1. 部署到 Azure（如 Container Apps）
2. 配置公共 endpoint 和认证
3. 设置 HTTPS/TLS

### Q: 如何调试流处理问题？

A: 启用详细日志：
```javascript
// 在浏览器控制台
localStorage.setItem('DEBUG_ROUTER', '1');
location.reload();
```

### Q: Router 在重启后会丢失会话吗？

A: 是的。MSAL 缓存（令牌）会被持久化，但会话映射存储在内存中。应用重新启动时需要重新创建会话。这是预期行为（本地原型）。

## 相关文档

- [Gateway 完整使用指南](../gateway/README.md)
- [Gateway 快速参考](../gateway/QUICKSTART.md)
- [DirectLine 组件架构](DIRECTLINE_COMPONENT_ARCHITECTURE_DESIGN.md)
- [DirectEngine 连接器](../src/components/directline/DirectEngineConnector.js)
