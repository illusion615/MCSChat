# Batch 6: 消息性能指标增强 — 需求文档

## 目标

在用户消息下方的 log 信息中增加关键性能指标，帮助用户了解 Agent 响应的时间分布。

## 需求

### 新增指标

在每条 Agent 回复消息的元信息区域展示以下三个指标：

| 指标 | 全称 | 含义 |
|------|------|------|
| **TTFT** | Time To First Token | 从用户发送消息到收到第一个 token 的时间 |
| **TTLT** | Time To Last Token | 从用户发送消息到收到最后一个 token 的时间 |
| **Total Duration** | Total Duration | 整个响应的总耗时（含渲染） |

### 展示位置

在现有消息元信息行（时间戳、Response time 等）中追加显示，格式参考：

```
5:56:52 PM · Response time: 324ms · TTFT: 180ms · TTLT: 1.2s · Duration: 1.5s
```

### 技术要点

1. **TTFT 计时**：从 `directLineService.sendMessage()` 调用到收到第一个有效 bot `message` 的时间差
2. **TTLT 计时**：从发送到收到最后一个 `activity`（`inputHint: 'acceptingInput'` 或 stream 结束）的时间差
3. **Total Duration**：从发送到消息完全渲染完成的时间差
4. 需要在 `sendMessage()` 时记录起始时间戳
5. 在 DirectLineService 的消息处理链路中计算和记录时间差

## 涉及模块

- `src/core/application.js` — 发送时记录时间戳
- `src/components/directline/DirectLineService.js` — activity 接收时计算 TTFT/TTLT
- `src/ui/messageRenderer.js` — 渲染指标到消息元信息区

## 验收标准

1. 每条 Agent 回复消息下方显示 TTFT、TTLT、Total Duration
2. 时间单位自动选择 ms 或 s（<1000ms 显示 ms，≥1000ms 显示 s 并保留 1 位小数）
3. 不影响现有 Response time 显示
4. 流式消息和非流式消息均正确计时
