# Batch 2: 模块系统清理 — 执行检查清单

## 执行前

- [x] Batch 1 已完成
- [x] 当前分支干净
- [x] 通读需求和设计文档

## 执行中

### Phase 1: CommonJS 移除
- [x] `src/components/chat/CustomChatInterface.js` — 删除 CommonJS 回退块
- [x] `src/components/directline/MessageQueueManager.js` — 删除 CommonJS 回退块
- [x] `src/components/directline/WebChatRenderer.js` — 删除 CommonJS 回退块
- [x] `src/components/directline/DirectLineConnector.js` — 删除 CommonJS 回退块
- [x] `src/core/DirectLineConnector.js` — 删除 CommonJS 回退块
- [x] `src/utils/safeLocalStorage.js` — 删除 CommonJS 回退块
- [x] 每个文件保存后确认 ES export 语句完整

### Phase 2: DirectLineConnector 分析
- [x] 全局 grep 确认引用关系
- [x] 列出两个实现的功能差异矩阵
- [x] 确定保留哪个版本
- [x] 确定是否需要功能迁移
- [x] **等待用户确认方案**

### Phase 3: DirectLineConnector 去重执行
- [x] 按确认方案执行合并/删除
- [x] 更新所有 import 路径
- [x] 确认无断链引用

## 执行后

- [x] 运行测试计划 T1-T6
- [x] 全部通过
- [x] CHANGELOG.md 追加 Changed/Removed 条目
- [x] Git commit
- [x] 更新 `docs/iterations/TODO.md`
