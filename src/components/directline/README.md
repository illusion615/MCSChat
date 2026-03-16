# DirectLine 组件文档（当前基线）

## 文档目的

本文件描述当前可用的 DirectLine 架构基线，避免后续开发误用历史实现。

- 更新时间: 2026-03-15
- 当前状态: 生产基线

## 当前组件结构

```
src/components/directline/
├── DirectLineService.js
├── index.js
└── DirectLineManager.css
```

## 架构结论

1. **单一通信实现**
   - 仅保留 `DirectLineService.js` 负责连接、活动处理、状态发布。

2. **统一消息模型**
   - 使用 `MessageEntry` 作为统一消息数据结构。
   - 同时承载内容、渲染状态、TTS 状态和指标扩展位。

3. **事件驱动接入**
   - 通过 `on/off` 订阅事件，不穿透服务内部状态。

4. **UI 无关**
   - DirectLineService 不直接操作 DOM，不依赖具体渲染组件。

## 对外导出

`index.js` 导出以下对象：

- `DirectLineService`
- `directLineService`（单例）
- `MessageEntry`

## 事件契约（当前）

| 事件 | 含义 |
|------|------|
| `statusChange` | 连接状态变化 |
| `connected` | 连接成功 |
| `disconnected` | 连接断开 |
| `message` | 收到完整消息 |
| `typing` | 收到 typing 活动 |
| `greeting` | 检测到欢迎消息 |
| `greetingTimeout` | 欢迎消息等待超时 |
| `conversationUpdate` | 收到会话更新活动 |
| `event` | 收到 event 活动 |
| `error` | 连接或消息处理错误 |

## 与应用层边界

1. `application.js` 在初始化阶段统一注册 directLineService 事件。
2. 初始化流程通过 greeting/timeout/error 三条路径保证可释放。
3. 与旧 UI 事件的兼容桥接由 `application.js` 负责，不在 DirectLineService 内实现 UI 逻辑。

## 历史实现状态

以下历史实现已退出当前架构，不应继续作为开发入口：

- DirectLineManagerSimple.js
- DirectLineManager.js
- DirectLineManagerEnhanced.js
- DirectLineConnector.js
- MessageQueueManager.js
- WebChatRenderer.js
- DirectLineConnectorAdapter.js
- DirectLineMigrationAdapter.js
- DirectLineDiagnostics.js
- DirectLineHealthMonitor.js
- TestIntegrationHelper.js

## 后续扩展建议

1. 原生 streaming 能力在 Batch 8 评估后接入。
2. streaming 样式与速度控制在 Batch 11 实施。
3. token 认证接入在 Batch 7 实施。

## 关联文档

- `docs/iterations/batch-3-directline-refactor/requirements.md`
- `docs/iterations/batch-3-directline-refactor/design.md`
- `docs/iterations/batch-3-directline-refactor/checklist.md`
- `docs/iterations/batch-3-directline-refactor/test-plan.md`
- `docs/iterations/TODO.md`
