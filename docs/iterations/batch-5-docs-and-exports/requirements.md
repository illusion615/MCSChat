# Batch 5: 文档补全与导出模式统一 — 需求文档

## 目标

1. 补全 `docs/` 中缺失的架构和功能文档
2. 统一多导出文件的导出模式
3. 修正导入顺序

## 任务 A: 文档补全

### A1: DirectLineService 架构文档

**缺失：** `docs/en/architecture/` 中缺少“Batch 3 完成后的单实现 DirectLineService 架构”权威说明。

**应包含：**
- DirectLineService 职责边界
- MessageEntry 数据模型
- 事件契约（status/message/typing/greeting/error 等）
- application 接线方式
- Mermaid 架构图
- 边界约束与后续扩展点

**目标文件：** `docs/en/architecture/directline-service.md`
**中文版：** `docs/zh/architecture/directline-service.md`

### A2: Conversation-Aware Thinking 功能文档

**缺失：** CHANGELOG [Unreleased] 已列出此功能，但 `docs/en/features/` 无对应文档。

**应包含：**
- 功能概述
- 四阶段 Thinking 流程（Analysis → Context-Aware → Practical → Synthesis）
- 语言检测机制
- 超时反馈机制
- 配置项（如有）

**目标文件：** `docs/en/features/conversation-aware-thinking.md`

### A3: docs/ 索引更新

**需更新：** `docs/README.md` 和 `docs/en/README.md` 的导航索引需反映新增文档。

## 任务 B: 多导出文件统一

### 违规文件与处理方案

| 文件 | 当前导出数 | 建议 |
|------|-----------|------|
| `src/components/svg-icon-manager/themes/IconThemes.js` | 7+ | 保留主导出 `ThemeManager` 实例 + themes 常量对象 |
| `src/components/svg-icon-manager/icons/SVGIconCollection.js` | 12+ | 作为图标数据文件，多导出可接受，但应有 index 聚合 |
| `src/components/svg-icon-manager/lib/IconUtils.js` | 15+ | 作为工具函数集合，多导出可接受 |
| `src/components/AdaptiveCardModal.js` | 3 | 收敛为单例 + default export |
| `src/core/application.js` | 3 | 收敛为 `app` 单例 + default export |
| `src/core/versionRegistry.js` | 8+ | 收敛为 `versionRegistry` 对象 |
| `src/services/unifiedNotificationManager.js` | 2 | 收敛为单例实例 |

**原则：**
- 类文件：一个主导出（单例实例），可附加 class export 供类型引用
- 工具函数集合：多 named export 可接受
- 数据文件：多 named export 可接受
- 不强制改造所有文件，优先改造核心模块（application、AdaptiveCardModal、versionRegistry、notificationManager）

## 任务 C: 导入顺序修正

| 文件 | 问题 |
|------|------|
| `src/core/application.js` | managers → services → utils（应 utils → services → managers） |
| `src/ai/aiCompanion.js` | 混合顺序 |

## 验收标准

1. `docs/en/architecture/` 包含 DirectLineService 架构文档
2. `docs/en/features/` 包含 Conversation-Aware Thinking 文档
3. docs/ 索引正确链接新文档
4. 核心模块（application、AdaptiveCardModal、versionRegistry、notificationManager）收敛为单主导出
5. 导入顺序符合 `utils → services → managers → core` 规范
