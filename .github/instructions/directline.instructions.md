---
applyTo: "src/components/directline/**"
description: "Use when editing DirectLine components. Enforces the three-component architecture boundary: Connector (connection/auth), QueueManager (message queuing/history), WebChatRenderer (UI rendering). Never mix responsibilities across these boundaries."
---

# DirectLine 三组件架构规范

## 组件职责边界

| 组件 | 文件 | 职责 | 禁止事项 |
|------|------|------|----------|
| **Connector** | `DirectLineConnector.js` | 连接建立、认证、token 管理、重连 | 不处理消息内容、不操作 DOM |
| **QueueManager** | `MessageQueueManager.js` | 消息接收、排队、历史管理、去重 | 不管理连接状态、不渲染 UI |
| **WebChatRenderer** | `WebChatRenderer.js` | UI 渲染、用户交互、消息展示 | 不直接调用 DirectLine API、不管理消息队列 |

## 通信方式

组件间通过 `setCallback(eventName, handler)` 松耦合通信，禁止直接引用其他组件的内部状态。

## 修改检查清单

修改任一组件前确认：
1. 变更是否属于该组件的职责范围？
2. 是否需要跨组件协调？如需要，通过回调事件，不要直接耦合。
3. `DirectLineManagerSimple.js` 是兼容包装器——新功能不应加在这里。
