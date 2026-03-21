# Batch 18: 技术债 Phase 1 — 死代码清理 — 需求文档

## 目标

识别并移除项目中零运行时引用的死代码模块，减少代码体积和维护负担。

## 背景

2026-03-18 架构审查报告发现以下模块无任何运行时导入/调用：

| 模块 | 行数 | 状态 |
|------|------|------|
| `src/components/chat/CustomChatInterface.js` | 749 | 仅内部自引用 + `window` 全局，外部零导入 |
| `src/components/chat/CustomChatInterface.css` | 220 | 配套样式，随 JS 删除 |
| `src/components/chat/EnhancedChatWidget.js` | 1,219 | 仅被 versionRegistry/aboutSection 以字符串列名，零运行时调用 |
| `src/components/chat/ui/MessageRenderer.js` | 175 | 第三套渲染器，与 src/ui/messageRenderer.js 并行但零引用 |
| `src/components/chat/styles/component.css` | 120 | 配套样式 |
| `src/components/chat/UNIFIED_CHAT_COMPONENT_DESIGN.md` | 131KB | 设计文档，不影响运行 |

同时 `application.js` 存在多处已注释掉的 import 块（speechEngine、LoggingUIManager、SVG icon 旧路径），增加阅读噪音。

## 功能需求

### F1: 归档死代码文件

- 将上述 6 个文件移至临时归档目录 `.archive-phase1/`
- 用户测试确认无回归后彻底删除

### F2: 清理字符串引用

- 从 `versionRegistry.js` 移除 `EnhancedChatWidget` 版本条目和日志输出
- 从 `aboutSection.js` 移除 `EnhancedChatWidget` 模块列名（2 处）

### F3: 清理注释残留

- 移除 `application.js` 中已注释的 import 块和禁用的初始化代码

## 非功能需求

- 不破坏任何现有功能
- 采用"先归档、后删除"策略降低风险
- 完成后同步 CHANGELOG、TODO、迭代追踪文档

## 涉及文件

| 文件 | 改动类型 |
|------|---------|
| 6 个死代码文件 | 删除（归档） |
| `src/core/versionRegistry.js` | 修改：移除已删模块引用 |
| `src/ui/aboutSection.js` | 修改：移除已删模块引用 |
| `src/core/application.js` | 修改：清理注释 |
