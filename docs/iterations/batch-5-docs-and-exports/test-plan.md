# Batch 5: 文档补全与导出模式统一 — 测试计划

## T1: 文档完整性验证

### A1: DirectLineService 架构文档
- [ ] `docs/en/architecture/directline-service.md` 存在
- [ ] 包含服务职责边界说明
- [ ] 包含事件契约说明
- [ ] 包含 MessageEntry 模型说明
- [ ] 包含 Mermaid 架构图
- [ ] Mermaid 图可正确渲染（VS Code / GitHub 预览）

### A2: Conversation-Aware Thinking 文档
- [ ] `docs/en/features/conversation-aware-thinking.md` 存在
- [ ] 内容与 CHANGELOG [Unreleased] 条目一致
- [ ] 与 aiCompanion.js 实际实现一致

### A3: 索引
- [ ] `docs/README.md` 包含新文档链接
- [ ] `docs/en/README.md` 包含新文档链接
- [ ] 所有链接可访问（无 404）

## T2: 导出模式验证

```bash
# 检查核心模块的 export 模式
grep -n "export" src/core/application.js
grep -n "export" src/components/AdaptiveCardModal.js
grep -n "export" src/core/versionRegistry.js
grep -n "export" src/services/unifiedNotificationManager.js
```

- [ ] 每个核心模块有且仅有一个主导出
- [ ] class export（如保留）标注为辅助导出

## T3: 导入完整性

```bash
# 检查是否有断裂的 import
grep -rn "from.*application" src/ --include="*.js"
grep -rn "from.*AdaptiveCardModal" src/ --include="*.js"
grep -rn "from.*versionRegistry" src/ --include="*.js"
grep -rn "from.*NotificationManager" src/ --include="*.js"
```

- [ ] 所有 import 语句与修改后的 export 匹配
- [ ] 无 `undefined` 导入

## T4: 导入顺序验证

- [ ] `src/core/application.js` 导入顺序：utils → services → managers
- [ ] `src/ai/aiCompanion.js` 导入顺序：utils → services → managers

## T5: 应用功能测试

- [ ] 应用正常启动
- [ ] 控制台无模块导入错误
- [ ] Agent 管理正常
- [ ] AI Companion 正常
- [ ] Adaptive Card Modal 正常
- [ ] 通知系统正常
- [ ] 版本信息显示正常
