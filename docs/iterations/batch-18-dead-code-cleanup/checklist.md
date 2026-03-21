# Batch 18: 技术债 Phase 1 — 死代码清理 — 执行检查清单

## 执行前

- [x] 架构审查报告完成，识别死代码模块
- [x] grep 确认 CustomChatInterface 零外部引用
- [x] grep 确认 EnhancedChatWidget 仅被 versionRegistry/aboutSection 字符串列名
- [x] grep 确认 chat/ui/MessageRenderer 零外部引用

## 执行中

### Phase 1: 归档文件

- [x] 创建 .archive-phase1/ 临时目录
- [x] 归档 CustomChatInterface.js（749 LOC）
- [x] 归档 CustomChatInterface.css（220 LOC）
- [x] 归档 EnhancedChatWidget.js（1,219 LOC）
- [x] 归档 chat/ui/MessageRenderer.js（175 LOC）
- [x] 归档 chat/styles/component.css（120 LOC）
- [x] 归档 UNIFIED_CHAT_COMPONENT_DESIGN.md（131KB）

### Phase 2: 清理引用

- [x] versionRegistry.js 移除 EnhancedChatWidget 版本条目
- [x] versionRegistry.js 移除 EnhancedChatWidget 日志输出
- [x] aboutSection.js 移除 EnhancedChatWidget 从模块展示列表（2 处）

### Phase 3: 清理注释

- [x] application.js 移除已注释的 SVG icon import
- [x] application.js 移除已注释的 LoggingUIManager import
- [x] application.js 移除已注释的 speechEngine import
- [x] application.js 移除已注释的 setSpeechLoggingManager 调用

### Phase 4: 文档同步

- [x] CHANGELOG.md 追加条目
- [x] TODO.md 更新
- [x] docs/iterations/TODO.md 追加 Batch 18 条目

## 执行后

- [ ] 用户测试确认应用正常运行
- [ ] 确认后删除 .archive-phase1/ 临时目录
