# Batch 2: 模块系统清理 — 需求文档

## 目标

1. 移除所有 CommonJS 导出回退代码，确保纯 ES Modules
2. 消除 `DirectLineConnector` 的重复实现（`src/core/` vs `src/components/directline/`）

## 任务 A: 移除 CommonJS 回退（6 个文件）

以下文件包含 `if (typeof module !== 'undefined' && module.exports)` 回退块，必须删除：

| 文件 | 位置（约） |
|------|-----------|
| `src/components/chat/CustomChatInterface.js` | L744-745 |
| `src/components/directline/MessageQueueManager.js` | L205-206 |
| `src/components/directline/WebChatRenderer.js` | L414-415 |
| `src/components/directline/DirectLineConnector.js` | L556-557 |
| `src/core/DirectLineConnector.js` | L430-431 |
| `src/utils/safeLocalStorage.js` | L182-183 |

**背景：** 项目是纯浏览器 ES Modules，不经过 Node.js 运行，CommonJS 回退无意义且违反技术栈约束。

## 任务 B: 消除重复 DirectLineConnector

当前两个文件：
- `src/core/DirectLineConnector.js` — 包含消息处理（monolithic）
- `src/components/directline/DirectLineConnector.js` — 三组件架构中的连接器

**需要确定：**
1. 哪个是实际被 `import` 使用的？（全局 grep）
2. 两者功能差异是什么？
3. 是否可以合并为一个，还是需要保留一个、废弃另一个？

## 验收标准

1. `grep -r "module\.exports" src/` 返回空结果
2. `grep -r "typeof module" src/` 返回空结果
3. DirectLineConnector 仅有一个权威实现
4. 应用启动和所有 DirectLine 连接功能正常
5. 控制台无模块加载错误
