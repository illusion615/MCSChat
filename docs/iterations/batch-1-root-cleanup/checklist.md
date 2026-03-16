# Batch 1: 根目录清理 — 执行检查清单

## 执行前

- [x] 确认当前分支干净（`git status` 无未提交更改）
- [x] 备份确认：git 历史可回滚
- [x] 通读需求文档和设计方案

## 执行中

### Phase 1: 评估（不做任何修改）
- [x] 逐一审阅 79 个 .md 文件，标记为「归档」或「删除」
- [x] 确认归档目标目录已创建
- [x] grep 检查所有文件是否被代码引用

### Phase 2: 移动 .md 文件
- [x] DirectLine 设计文档（有价值的）→ `docs/en/architecture/directline/`
- [x] 排障修复报告 → `docs/en/troubleshooting/` 或直接删除
- [x] 功能相关文档 → `docs/en/features/` 对应子目录
- [x] 开发/迁移报告 → `docs/en/development/reports/` 或直接删除
- [x] 重复/过时内容 → 直接删除

### Phase 3: 处理 .html 和 .js 文件
- [x] 有调试价值的 .html → `utils/debug/`
- [x] 一次性测试 .html → 删除
- [x] 调试 .js 脚本 → 评估后移动或删除

### Phase 4: 修正 TODO.md
- [x] "Clean markdown files" 状态改回 `[ ]` 或确认完成后改为 `[x]`
- [x] "Review all documents" 状态同上
- [x] 如有新发现的任务，添加到 TODO.md

### Phase 5: 更新文档索引
- [x] `docs/README.md` 更新导航和目录结构
- [x] `ARCHITECTURE_DOCUMENTATION_INDEX.md`（如保留）更新文件路径

## 执行后

- [x] 运行测试计划中的所有测试（T1-T5）
- [x] 全部测试通过
- [x] CHANGELOG.md 追加 Removed/Changed 条目
- [x] Git commit 完成
- [x] 更新 `docs/iterations/TODO.md` 标记 Batch 1 完成
