# Batch 4: CSS 设计令牌迁移 — 执行检查清单（完成记录）

## 执行前

- [x] Batch 3 已完成
- [x] 通读需求和设计文档

## 执行中

### Phase 1: 盘点
- [x] 读取 variables.css，记录所有现有 token
- [x] 全面扫描 css/components/ 中的硬编码值
- [x] 建立完整的「硬编码值 → token」映射表
- [x] 识别需要新增的 token

### Phase 2: 补充 Token
- [x] 在 variables.css :root 中添加 20+ 新 token（text/surface/border/companion/warning）
- [x] 确认命名语义化

### Phase 3: 文件级替换
- [x] splash.css (4→1)
- [x] navigation.css (11→6)
- [x] buttons.css (17→3)
- [x] panels.css (18→2)
- [x] about-section.css (18→2)
- [x] chat.css (26→12)
- [x] kpi.css (25→23)
- [x] utilities.css (57→9)
- [x] messages.css (55→25)
- [x] modals.css (215→127)

### Phase 4: UI 修复
- [x] Thinking dot 文字单行显示（typing-status-area nowrap）
- [x] Full-width 消息水平 padding 增加
- [x] Full-width 模式新会话持久化修复

## 执行后

- [x] CHANGELOG.md 追加 Changed 条目
- [x] 更新 docs/iterations/TODO.md
- [x] 用户验证通过
