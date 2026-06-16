# Batch 25: Livestreaming 兼容性与渲染统一 — 设计方案

## 架构层定位

| 层 | 文件 | 改动 |
|----|------|------|
| 通信层 | `src/components/directline/DirectLineService.js` | 流元数据解析、乱序保护、稳定 id、空 final |
| 应用层 | `src/core/application.js` | 流式 chunk 改走 messageRenderer，final 复用 finalize |
| 渲染层 | `src/ui/messageRenderer.js` | 复用现有流式 API，无需新增 |

> 严格遵守三组件边界：DirectLineService 仅负责协议解析与事件发射，不触碰 DOM；渲染统一交给 messageRenderer。

## 批次 1 设计

### 1. 流元数据统一解析 `_getStreamInfo(activity)`

对齐官方 `getActivityLivestreamingMetadata`：优先 `channelData`，回退 `entities[type="streaminfo"]`。

```js
_getStreamInfo(activity) {
    const cd = activity.channelData || {};
    if (cd.streamType || cd.streamId || cd.streamSequence !== undefined) {
        return { streamType: cd.streamType, streamId: cd.streamId, streamSequence: cd.streamSequence };
    }
    const e = Array.isArray(activity.entities)
        ? activity.entities.find(x => x && x.type === 'streaminfo')
        : null;
    if (e) return { streamType: e.streamType, streamId: e.streamId, streamSequence: e.streamSequence };
    return { streamType: undefined, streamId: undefined, streamSequence: undefined };
}
```

`_handleActivity` 用 `_getStreamInfo` 替换所有 `activity.channelData?.streamX` 读取。

### 2. streamSequence 乱序保护

`_activeStreams` 的 value 增加 `lastSequence`。`_handleStreamingChunk` 收到非首片段时：若 `streamSequence !== undefined` 且 `<= lastSequence` → 视为过期片段，直接丢弃。

### 3. 稳定 id

首片段：`entry.id = activity.id || streamId`（保证非空且稳定）。
`_finalizeStream` 不再覆盖 `entry.id`，改为把 final 的真实 activity.id 存入 `_seenIds` 去重，并记录到 `entry.meta.finalId`。

### 4. 空 final（"反悔"）

`_finalizeStream`：若 final 无 text 且无 attachments → 从 `_entries` 移除该 entry，发 `streamCancelled` 事件，application 移除对应气泡。

## 批次 2 设计

### 渲染路径统一

`MessageEntry` 已具备 activity 形态字段（id/from/text/timestamp/attachments/suggestedActions），可直接当 activity 传入 messageRenderer。

- **chunk**：`application.handleStreamingChunk(entry)` → `messageRenderer.handleStreamingMessageDirect(entry)`
  - entry.text 是累积全文，命中 renderer 的非 realtime 分支（`streamingMetadata` 为空）→ 直接用累积文本更新
  - renderer 按 `entry.id`（稳定）作为 key 复用同一气泡，逐次 `updateStreamingContent`（Markdown/KaTeX/链接）
- **标记**：`_handleStreamingChunk` 首片段设 `entry.meta.wasStreamed = true`
- **final**：`_finalizeStream` 仍发 `'message'` → `handleCompleteMessage`；其中检测 `entry.meta.wasStreamed` 为真时调用 `messageRenderer.finalizeStreamingMessage(entry)`（复用同 id 的 streamingState，补齐 attachments/suggestedActions/指标/语音），否则走原有逻辑

### 移除裸气泡逻辑

删除 `application.handleStreamingChunk` 中手搓 `messageContainer`/`_streamingElements` 的代码及 `_streamingElements` 字段。

### 修复重复气泡隐患

统一后 streaming 与 final 共享同一 streamingState（同 id），final 通过 `finalizeStreamingMessage` 收口，不再额外渲染新气泡。

## 回退与兼容

- 模拟流式（`simulateStreaming`）与原生流式互不干扰：原生流式由 `streamType/streamSequence/streaminfo` 触发；无这些标记的普通 message 仍走 `handleCompleteMessage` 的模拟/完整渲染。
- informative 占位逻辑不变。

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| entity 与 channelData 同时存在 | 优先 channelData，二者字段语义一致 |
| 首片段 id 缺失导致 key 不稳 | 强制 `entry.id = streamId` |
| final 与 streaming key 不一致 | finalize 不覆盖 entry.id |
| 语音重复触发 | renderer 首建分支才启动语音，finalize 检查 streamingSpeedMap 去重 |
| 乱序丢片段误删正文 | 仅当 `streamSequence` 明确提供且回退时丢弃 |

## 真实数据验证（2026-06-15）

基于同事抓取的真实 streaming 数据（`dump.json`，Bot Framework SDK 抓包）确认了关键事实，并修正了一处设计假设：

- **片段是 DELTA 增量，不是累积全文**：Copilot Studio 每个 `streaming` 片段只携带新增的几个字（≤10 字符），需累加拼接。**且 bot 通过 `channelData.chunkType: "delta"` 明确声明**（682 片全部携带）——解析应优先读该权威字段，而非猜。原 `_handleStreamingChunk` 假设累积（`text.startsWith(lastText)`），delta 模式下会用小片段整体替换 `entry.text`，导致只剩最后一片。
- **修复**：`_getStreamInfo` 提取 `chunkType`；`_handleStreamingChunk` 优先按 `chunkType==='delta'` 直接 `appendText(text)`，无该字段时回退到 startsWith 启发式。以 `entry.text` 为权威累加器。
- **离线回放验证**：对 `dump.json` 的 682 个片段回放修复后逻辑 + final 覆盖，重建出的 `entry.text` 与 final activity 全文逐字相等（1427 字符，含 citations 脚注）。
- **元数据位置**：实测在 `channelData`（`streamType`/`streamId`/`streamSequence`）；`entities` 仅含裸 `{type:"streaminfo"}` 标记。`_getStreamInfo` 优先读 `channelData` 的设计正确。
- **session id 规则**：首个 informative 活动 `streamId=null`，其自身 id 即 session id，后续片段以 `streamId` 引用——与稳定 id 设计一致。
- 详见 `verification-report.md` 第 11 节。
