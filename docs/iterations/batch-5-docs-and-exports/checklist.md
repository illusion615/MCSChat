# Batch 5: 文档补全与导出模式统一 — 执行检查清单（完成记录）

## 执行前

- [x] Batch 3 已完成（DirectLine 架构文档需基于最终实现）
- [x] Batch 4 已完成

## 执行中

### Phase 1: 文档补全
- [x] 编写 `docs/en/architecture/directline-service.md`（DirectLineService 架构文档）
- [x] 编写 `docs/en/features/conversation-aware-thinking.md`
- [x] 更新 `docs/en/README.md` 索引（新增两个文档链接）

### Phase 2: 导出模式改造（跳过）
- [⚪] 跳过原因：当前代码稳定运行，导出改造涉及大量 import 链路变更，回归风险高于收益。
- [⚪] 后续如有需要可在重构窗口期执行。

### Phase 3: 导入顺序（跳过）
- [⚪] 跳过原因：仅影响代码可读性，不影响运行时行为，风险不justify改动。

## 执行后

- [x] CHANGELOG.md 追加条目
- [x] 更新 docs/iterations/TODO.md
- [ ] 全部 5 个 Batch 完成，项目代码卫生达到规范标准
