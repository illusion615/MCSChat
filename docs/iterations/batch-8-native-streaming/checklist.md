# Batch 8: Copilot Studio 原生 Streaming 输出 — 执行检查清单（完成记录）

## ⚠️ 结论更新（2026-06-13，见 Batch 25）

**本批次当年的结论"DirectLine 3.0 不支持原生 streaming"已过期，且与后续实际代码不符。**

后续研究 [BotFramework-WebChat LIVESTREAMING.md](https://github.com/microsoft/BotFramework-WebChat/blob/main/docs/LIVESTREAMING.md) 确认：
Copilot Studio **支持**基于 `typing` 活动的 livestreaming 约定（`channelData` 或 `entities[type="streaminfo"]` 携带 `streamType`/`streamId`/`streamSequence`），
且 DirectLineService 已实现 informative / streaming / final 检测与增量渲染。

完整的兼容性补强与渲染统一在 **Batch 25（Livestreaming 兼容性与渲染统一）** 中完成，
请以 `docs/iterations/batch-25-livestreaming-enhancement/` 为准。

---

## 历史调研记录（当时结论，已被 Batch 25 取代）

当年判断 DirectLine 3.0 不支持原生 token-by-token streaming，理由是：
1. DirectLine 3.0 通过 WebSocket/轮询交付完整 activity
2. 当时观察到的 Copilot Studio message 包含完整文本
3. typing activity 仅表示正在处理

> 实际上 livestreaming 通过 typing 活动 + 流元数据实现，当时未覆盖该约定。

## 执行状态（历史）

- [x] 调研 DirectLine API streaming 文档
- [x] 调研 Copilot Studio streaming 设置
- [x] 输出调研结论（后被 Batch 25 修正）
- [x] CHANGELOG.md 更新
- [x] TODO.md 更新
