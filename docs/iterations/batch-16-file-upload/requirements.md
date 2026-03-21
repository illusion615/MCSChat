# Batch 16: 附件上传功能完善 — 需求文档

## 目标

1. 前端消息窗口显示上传附件的封面卡片（PDF、图片、文档等）
2. 与 Copilot Studio（DirectLine 3.0）正确对接文件上传
3. 上传速度慢时提供上传进度提示

## 背景

当前附件链路存在以下问题：
- `showFilePreview()` / `hideFilePreview()` 是空实现，选择文件后无 UI 反馈
- 用户消息渲染 (`renderUserMessage`) 只传 text，不带 attachments
- `sendMessageWithFile()` 把原生 File 对象直接塞进 `postActivity.attachments`，DirectLine JS SDK 的 `postActivity` 不处理本地文件上传
- 消息渲染层只有 generic attachment 卡片，没有 PDF/文档封面样式
- 上传过程无进度反馈

## 功能需求

### F1: 文件选择预览（输入区）

- 用户通过附件按钮或拖放选择文件后，在 `#filePreviewContainer` 显示：
  - 文件类型图标（PDF/图片/文档/其他）
  - 文件名（截断过长名称）
  - 文件大小（人类可读格式）
  - 移除按钮（×）
- 选择新文件替换旧文件（单文件模式）
- 拖放到聊天窗口也触发选择

### F2: 消息中附件封面展示

- 用户发送带附件消息后，用户消息气泡内显示附件封面卡片：
  - PDF：封面卡片（PDF 图标 + 文件名 + 页数/大小 + 可点击打开）
  - 图片：缩略图预览（复用已有 `renderImageAttachment`）
  - 其他文档：通用文件卡片（类型图标 + 文件名 + 大小）
- Bot 回复中的附件继续使用已有 `addAttachments()` 逻辑
- 附件卡片在消息文本下方显示

### F3: DirectLine 文件上传对接

- 新增 `uploadFile()` 方法到 DirectLineService：
  - 使用 DirectLine REST API `POST /v3/directline/conversations/{conversationId}/upload`
  - 支持 multipart/form-data（文件 + activity JSON）
  - 需获取 conversationId（从 DirectLine SDK 实例读取）
- `sendMessageWithFile()` 调用新的 `uploadFile()` 而非 `postActivity`
- 上传成功后接收 activity ID 确认

### F4: 上传进度提示

- 使用 XMLHttpRequest 实现上传（可获取 `upload.onprogress`）
- 在 `#filePreviewContainer` 区域叠加显示：
  - 进度条（百分比）
  - 状态文字（"Uploading..." → "Processing..." → "Sent"）
- 上传中禁用发送按钮，完成后恢复
- 上传失败显示错误提示并恢复可用状态

## 非功能需求

- 文件大小限制：单文件不超过 4MB（DirectLine 限制）
- 支持格式：.pdf, .doc, .docx, .txt, .xlsx, .pptx, .png, .jpg, .jpeg, .gif, .webp
- 不引入新的 npm 包或 CDN 依赖
- 不破坏 DirectLineService 的事件边界（上传方法仅在服务内部处理 HTTP）

## 涉及文件预估

| 文件 | 改动类型 |
|------|---------|
| `src/core/application.js` | 修改：实装文件预览 UI、拖放、附件随消息渲染 |
| `src/components/directline/DirectLineService.js` | 新增：`uploadFile()` 方法 |
| `src/ui/messageRenderer.js` | 新增：文档附件封面卡片渲染 |
| `css/components/messages.css` | 新增：附件封面卡片样式 |
| `css/components/chat.css` | 修改：文件预览容器和进度条样式 |
| `index.html` | 可能微调：进度条元素 |

## Copilot Studio 对接说明

- Copilot Studio 自定义前端通过 DirectLine 3.0 协议通信
- 附件上传走 REST upload endpoint，不走 WebSocket postActivity
- DirectLine JS SDK (`botframework-directlinejs@0.15.8`) 的 `postActivity` 不自动处理本地 File 对象
- 需要手动构造 multipart 请求发送到 upload endpoint
- conversationId 可从 DirectLine SDK 内部状态获取
- 认证使用现有 secret（与连接相同）

## 参考文档

- [Direct Line 3.0 - Send Activity (attachments)](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-direct-line-3-0-send-activity)
- [Publish to custom app](https://learn.microsoft.com/en-us/microsoft-copilot-studio/publication-connect-bot-to-custom-application)
- [DirectLine JS SDK](https://github.com/microsoft/BotFramework-DirectLineJS)
