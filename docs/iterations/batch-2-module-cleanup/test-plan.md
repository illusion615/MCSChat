# Batch 2: 模块系统清理 — 测试计划

## T1: CommonJS 移除验证

```bash
# 确认无 CommonJS 残留
grep -rn "module\.exports" src/ --include="*.js"
grep -rn "typeof module" src/ --include="*.js"
grep -rn "require(" src/ --include="*.js"
```

- [x] 所有三个 grep 命令返回空结果

## T2: ES Module 完整性

```bash
# 确认每个修改文件都有 export 语句
grep -n "export" src/components/chat/CustomChatInterface.js
grep -n "export" src/components/directline/MessageQueueManager.js
grep -n "export" src/components/directline/WebChatRenderer.js
grep -n "export" src/components/directline/DirectLineConnector.js
grep -n "export" src/utils/safeLocalStorage.js
```

- [x] 每个文件至少有一个 `export` 语句

## T3: 应用启动测试

```bash
python -m http.server 8000
```

- [x] 浏览器访问 http://localhost:8000 正常加载
- [x] 控制台无模块导入错误（无 `Cannot find module`、`SyntaxError` 等）
- [x] Splash screen → 主界面流程正常

## T4: DirectLine 功能测试

- [x] 可配置 Agent 并保存
- [x] DirectLine 连接成功建立（控制台日志确认）
- [x] 可发送消息
- [x] 可接收 Agent 回复
- [x] 连接断开后自动重连正常
- [x] Adaptive Card 显示正常

## T5: DirectLineConnector 去重验证

```bash
# 确认仅有一个 DirectLineConnector 文件
find src/ -name "DirectLineConnector.js" -type f
```

- [x] 结果仅有一个文件路径
- [x] 所有 import 语句指向该唯一文件

## T6: 回归测试

- [x] AI Companion 面板功能正常
- [x] 语音功能正常
- [x] 会话管理（新建/切换/删除）正常
- [x] 设置面板所有选项正常
