# Batch 9: Thinking Dot 行为改进 — 设计方案

## 设计目标

将 thinking dot 从“定时器主导”改为“事件主导”，满足消息到达即隐藏的交互预期。

## 目标行为

1. 用户发送后立即显示 thinking dot。
2. Agent 首段有效响应到达后 200ms 内隐藏。
3. 无响应时保持显示，不做误隐藏。

## 状态机设计

### 状态

- idle: 未显示
- thinking: 已显示，等待响应
- settling: 响应已到达，准备收口

### 事件

- showThinking: 用户消息发送成功
- agentResponseArrived: DirectLineService 收到非用户消息
- stopThinking: 强制停止（错误、会话切换、重置）

### 转换规则

1. idle -> thinking: showThinking
2. thinking -> settling: agentResponseArrived
3. settling -> idle: hide 动画结束或最短收口延时到达
4. thinking -> idle: stopThinking

## 实现要点

1. 统一入口: 所有显示/隐藏操作经同一控制器。
2. 去重控制: 防止多个模块重复调用导致闪烁。
3. 事件绑定: 使用 directLineService 的消息事件作为隐藏触发源。
4. 异常兜底: 连接错误、会话切换时立即隐藏。

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 多处旧逻辑并存导致竞争 | 收敛到单一状态机并删除冗余调用 |
| 快速连续消息导致抖动 | 引入最小展示时长与幂等控制 |
| 非文本消息误触发隐藏 | 仅对有效 agent 响应触发隐藏 |
