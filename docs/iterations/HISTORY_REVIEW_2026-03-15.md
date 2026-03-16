# 历史文档回顾与反向同步记录（2026-03-15）

## 目的

本记录用于说明“哪些文档代表当前基线、哪些文档属于历史上下文”，帮助后续成员在较长时间后快速恢复项目语境。

## 当前基线结论

1. DirectLine 当前唯一实现为 `DirectLineService`。
2. Batch 3 已完成并具备初始化稳定性兜底。
3. Batch 8-12 规划文档已补齐（requirements/design/checklist/test-plan）。

## 本次回填范围

### A. 迭代体系

- 已更新 `docs/iterations/TODO.md` 为 12 批次完整视图。
- 已将 Batch 3 文档改为完成回顾版。
- 已补齐 Batch 8-12 的 design/checklist/test-plan。
- 已将 Batch 1/2 已完成清单中的待勾选项同步为完成状态。

### B. 架构入口文档

- 已更新 `src/components/directline/README.md` 为当前基线文档。
- 已在 `docs/en/architecture/components.md` 顶部新增当前基线说明。
- 已在 `docs/zh/architecture/README.md` 顶部新增当前基线说明。

### C. 索引与导航

- 已更新 `docs/README.md`，增加当前快照与推荐阅读顺序。
- 已更新 `docs/en/README.md` 与 `docs/zh/README.md` 的当前基线说明与更新时间。

### D. 历史文档标注

- 已在 `docs/DirectLineConnector-Guide.md` 增加历史状态声明。
- 已在 `docs/WEBCHAT_CUSTOMIZATION_GUIDE.md` 增加历史状态声明。

## 当前推荐阅读顺序

1. `docs/iterations/TODO.md`
2. `docs/iterations/batch-3-directline-refactor/`
3. `src/components/directline/README.md`
4. `docs/en/architecture/components.md` 或 `docs/zh/architecture/README.md`

## 后续维护约定

1. 任何批次进入执行阶段，必须同步更新对应 requirements/design/checklist/test-plan。
2. 批次完成当天必须更新 `docs/iterations/TODO.md` 与 `CHANGELOG.md`。
3. 如果架构发生实质变化，必须先更新组件 README，再更新语言索引文档。
