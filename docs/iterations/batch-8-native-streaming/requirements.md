# Batch 8: Copilot Studio 原生 Streaming 输出 — 需求文档

## 目标

调研并实现 Copilot Studio 的原生 streaming 输出功能，替代当前的模拟流式渲染。

## 背景

当前 MCSChat 通过 DirectLine 接收完整消息后进行模拟流式渲染（逐字/逐段显示）。Copilot Studio 可能已支持原生 streaming（真正的 token-by-token 流式传输），需要调研最新的对接文档确认。

## 调研任务

### 需要确认的问题

1. **Copilot Studio 是否已原生支持 streaming？**
   - 检查最新的 Bot Framework DirectLine API 文档
   - 检查 Copilot Studio 的 streaming 相关设置
   - 确认 DirectLine 3.0 vs Enhanced DirectLine 的差异

2. **如果支持，接入方式是什么？**
   - 是通过 `activity.type === 'typing'` + 增量 text？
   - 是通过 Server-Sent Events (SSE)？
   - 是通过 WebSocket 的增量消息？
   - 是否需要在 Copilot Studio 侧开启特定配置？

3. **与当前架构的兼容性**
   - 对 DirectLineService 的影响
   - 对 messageRenderer 流式渲染逻辑的影响
   - 对 AI Companion 的 KPI 计算（TTFT 等）的影响

### 调研资源

- [Microsoft Bot Framework DirectLine API](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-direct-line-3-0-concepts)
- [Copilot Studio documentation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/)
- [DirectLine JS SDK releases](https://github.com/microsoft/BotFramework-DirectLineJS)

## 实施方案（调研后补充）

- 待调研完成后根据发现设计实施方案
- 如 Copilot Studio 不支持原生 streaming，则记录结论并关闭此批次

## 验收标准

1. 完成调研报告，明确 Copilot Studio streaming 能力现状
2. 如支持：实现原生 streaming 接入，消息真正逐 token 显示
3. 如不支持：记录结论，保持现有模拟流式渲染
