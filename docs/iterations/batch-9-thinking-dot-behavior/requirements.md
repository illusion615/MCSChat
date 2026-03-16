# Batch 9: Thinking Dot 行为改进 — 需求文档

## 目标

改进 thinking dot 的显示/隐藏机制，使其行为更合理——当 Agent 消息已出现时应立即消失，而不是继续显示固定时间。

## 当前问题

1. Thinking dot 疑似基于固定轮询/定时器机制
2. 即使 Agent 回复消息已经出现在聊天窗口中，thinking dot 仍会持续显示一段时间才消失
3. 视觉上给人"系统卡顿"的错觉

## 期望行为

```
用户发送消息 → thinking dot 立即显示
                  ↓
Agent 第一个消息到达 → thinking dot 立即消失
```

**关键原则：** thinking dot 的消失必须由**消息到达事件驱动**，而非定时器超时。

## 需要分析的问题

1. **当前机制是什么？** 是 `setTimeout` 固定时间？是轮询？是事件驱动但有延迟？
2. **消息到达时是否发送了隐藏事件？** `hideTypingIndicator` 事件是否在消息到达时触发？
3. **是否有多个竞争的显示/隐藏逻辑？** 可能 DirectLineService、application.js、enhancedTypingIndicator 各自管理

## 涉及模块（待分析确认）

| 模块 | 可能相关 |
|------|---------|
| `src/components/directline/DirectLineService.js` | `typing`/`message` 事件与 UI 显示隐藏联动 |
| `src/core/application.js` | thinking simulation 逻辑 |
| `src/ui/enhancedTypingIndicator.js` | 增强版 typing indicator |
| `src/ui/messageRenderer.js` | 消息到达时的隐藏触发 |

## 验收标准

1. Agent 消息出现后 thinking dot 在 200ms 内消失
2. 无固定时间的 thinking dot 残留
3. 快速连续消息场景下行为正常
4. 无消息到达时，thinking dot 保持显示（不提前消失）
