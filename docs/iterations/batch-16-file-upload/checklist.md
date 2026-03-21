# Batch 16: 附件上传功能完善 — 执行检查清单

## 执行前

- [x] 根因分析完成（空实现 / postActivity 不支持本地文件 / 无进度回调）
- [x] 设计方案用户确认
- [x] 确认 DirectLine SDK 可访问 conversationId

## 执行中

### Phase 1: 文件选择预览 UI

- [x] application.js: initializeElements 补充 filePreviewContainer / fileName / fileSize DOM 引用
- [x] application.js: 实装 showFilePreview(file) — 显示文件名、大小、类型图标
- [x] application.js: 实装 hideFilePreview() — 隐藏并清空预览
- [x] application.js: handleFileSelection 增加文件大小校验（4MB 限制）
- [x] application.js: handleFileDrop 实装拖放文件选择
- [x] css/components/chat.css: 完善 #filePreviewContainer 样式（图标 / 字体 / 布局）

### Phase 2: 消息中附件封面展示

- [x] application.js: renderUserMessage 增加 attachments 参数传递
- [x] application.js: sendMessage 中构造用户附件对象用于渲染（blob URL + metadata）
- [x] messageRenderer.js: addAttachments 增加 PDF / document 分支
- [x] messageRenderer.js: 新增 renderDocumentAttachment() 方法
- [x] css/components/messages.css: 新增 .document-attachment 样式

### Phase 3: DirectLine Upload API

- [x] DirectLineService.js: 新增 uploadFile(text, file, onProgress) 方法
- [x] DirectLineService.js: 实现 multipart/form-data 构造
- [x] DirectLineService.js: 实现 XHR 上传与 progress 回调
- [x] DirectLineService.js: 获取 conversationId 供 upload endpoint URL 构造
- [x] application.js: sendMessageWithFile 调用 uploadFile 替换原有 sendMessage

### Phase 4: 上传进度 UI

- [x] index.html: #filePreviewContainer 内新增进度条 HTML
- [x] css/components/chat.css: 进度条样式（条 + 百分比文字）
- [x] application.js: 上传中显示进度条、更新百分比
- [x] application.js: 上传中禁用发送按钮
- [x] application.js: 上传完成/失败后恢复 UI 状态

### Phase 5: 文档同步

- [x] CHANGELOG.md 追加 Unreleased 条目
- [x] TODO.md 新增/更新附件上传相关条目
- [x] docs/iterations/TODO.md 补充 Batch 16 条目

## 执行后

- [ ] 用户测试确认文件选择预览正常
- [ ] 用户测试确认消息中附件封面显示正常
- [ ] 用户测试确认文件上传到 Copilot Studio Agent 成功
- [ ] 用户测试确认上传进度条正常显示
- [ ] 用户测试确认大文件（>4MB）拒绝并提示
