# Batch 25: Livestreaming 兼容性与渲染统一 — 需求文档

## 背景

研究 [BotFramework-WebChat LIVESTREAMING.md](https://github.com/microsoft/BotFramework-WebChat/blob/main/docs/LIVESTREAMING.md) 后发现：

1. **官方 livestreaming 是一套基于 `typing` 活动的约定**，无需改通道协议：
   - `streamType: "informative"` → 低延迟占位提示（"正在搜索…"）
   - `streamType: "streaming"` + `streamSequence` 递增 → 渐进正文（`text` 携带累积全文）
   - `streamType: "final"`（`message`）→ 完整正文，封口
   - 元数据可放 `channelData` **或** `entities[type="streaminfo"]`，两者等价
   - 必须 WebSocket DirectLine（项目已满足）

2. **本项目 DirectLineService 已实现约 70% 的原生 livestreaming**（informative / streaming / final 检测、增量渲染、指标埋点），但：
   - Batch 8 文档结论"不支持原生 streaming"已过期，与代码矛盾
   - 只读 `channelData`，未读 `entities[type="streaminfo"]` → 部分 Copilot Studio 配置下静默失效
   - 未实现 `streamSequence` 乱序保护
   - 未处理空 final（"反悔"）移除气泡
   - 增量渲染走裸 `textContent`，缺 Markdown/KaTeX/图标/指标，且与 final 走不同渲染路径，存在重复气泡隐患

## 目标

在不破坏现有稳定链路、不违反三组件架构边界的前提下，补齐 livestreaming 兼容性缺口并统一渲染路径。

## 范围

### 批次 1 — 兼容性与健壮性（低风险，仅改 DirectLineService）

- 同时读取 `channelData` 和 `entities[type="streaminfo"]` 流元数据
- `streamSequence` 乱序/过期片段丢弃
- 流首片段赋予稳定 id（= streamId），finalize 不覆盖
- 空 final（"反悔"）移除气泡
- 回写 Batch 8 文档结论

### 批次 2 — 渲染统一（中风险，改 application + 复用 messageRenderer）

- 原生 streaming chunk 改走 `messageRenderer` 流式渲染（Markdown/KaTeX/图标/指标）
- final 复用 `messageRenderer.finalizeStreamingMessage`，与 streaming 共享同一气泡元素
- 移除 application 中手搓裸气泡的 `_streamingElements` 逻辑
- 修复 final 时的重复气泡隐患

## 非目标

- 不改 DirectLine 连接方式（已是 WebSocket）
- 不改模拟流式（simulateStreaming）链路 —— 二者并存，互不影响
- 不引入新依赖

## 验收标准

1. Copilot Studio 把流元数据放在 `entities` 时，仍能触发原生流式
2. 乱序片段不导致文本回跳
3. 空 final 正确移除气泡，无残留空壳
4. 原生流式气泡外观与普通消息一致（Markdown/图标/指标）
5. final 不产生重复气泡
6. 文档与代码一致，Batch 8 结论已更新
