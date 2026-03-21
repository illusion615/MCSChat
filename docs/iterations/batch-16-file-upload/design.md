# Batch 16: 附件上传功能完善 — 设计方案

## 架构设计

### 数据流

```
用户选择文件
    │
    ▼
[application.js] handleFileSelection()
    │ ── 显示文件预览 UI (#filePreviewContainer)
    │ ── 保存 this.selectedFile
    │
用户点击发送
    │
    ▼
[application.js] sendMessage()
    │ ── 渲染用户消息（含附件封面）
    │ ── 禁用发送按钮
    │ ── 显示上传进度
    │
    ▼
[DirectLineService] uploadFile(text, file, onProgress)
    │ ── 获取 conversationId
    │ ── 构造 multipart/form-data
    │ ── XMLHttpRequest POST → DirectLine upload endpoint
    │ ── onprogress → 回调更新进度
    │ ── 成功 → resolve(activityId)
    │ ── 失败 → reject(error)
    │
    ▼
[application.js] 上传完成
    │ ── 隐藏进度
    │ ── 恢复发送按钮
    │ ── 清除 selectedFile
```

### 附件渲染流

```
用户消息渲染:
    renderUserMessage(text, timestamp, attachments)
        │
        ▼
    messageRenderer.renderCompleteMessage(activity)
        │ ── activity.attachments 含本地文件信息
        │
        ▼
    addAttachments(messageDiv, attachments)
        │
        ├── image/* → renderImageAttachment() [已有]
        ├── application/pdf → renderDocumentAttachment() [新增]
        └── 其他 → renderGenericAttachment() [已有，增强]

Bot 回复渲染:
    handleCompleteMessage(activity)
        │ ── activity.attachments 由 DirectLine 返回
        │ ── 复用 addAttachments() 逻辑
```

### DirectLine Upload 接口

```
POST https://directline.botframework.com/v3/directline/conversations/{conversationId}/upload?userId=user
Authorization: Bearer {secret}
Content-Type: multipart/form-data; boundary=----BOUNDARY

------BOUNDARY
Content-Type: {file.type}
Content-Disposition: form-data; name="file"; filename="{file.name}"

[文件字节]
------BOUNDARY
Content-Type: application/vnd.microsoft.activity

{
    "type": "message",
    "from": { "id": "user" },
    "text": "{messageText}"
}
------BOUNDARY--
```

## 模块改动详细设计

### 1. application.js — 文件预览 UI

```javascript
// initializeElements 中补充引用
this.elements.filePreviewContainer = DOMUtils.getElementById('filePreviewContainer');
this.elements.fileName = DOMUtils.getElementById('fileName');
this.elements.fileSize = DOMUtils.getElementById('fileSize');

// showFilePreview(file) — 实装
showFilePreview(file) {
    // 设置文件名、大小
    // 显示 filePreviewContainer
    // 如果是图片，显示小缩略图
}

// hideFilePreview() — 实装
hideFilePreview() {
    // 隐藏 container，清空内容
}
```

### 2. application.js — 附件随用户消息渲染

```javascript
renderUserMessage(text, timestamp, attachments) {
    const activity = {
        from: { id: 'user' },
        text: text,
        timestamp: timestamp || new Date().toISOString(),
        attachments: attachments || []
    };
    messageRenderer.renderCompleteMessage(activity);
}
```

### 3. DirectLineService.js — uploadFile()

```javascript
/**
 * Upload file with message via DirectLine REST API.
 * @param {string} text - Message text
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback (0-1)
 * @returns {Promise<string>} Activity ID
 */
uploadFile(text, file, onProgress) {
    // 获取 conversationId
    // 构造 FormData (file + activity JSON blob)
    // XHR POST with progress tracking
}
```

### 4. messageRenderer.js — 文档附件卡片

新增 `renderDocumentAttachment(attachment, messageDiv)`:
- 文件类型图标（根据 contentType / 扩展名）
- 文件名
- 文件大小（如果可用）
- 可点击打开/下载链接（如果有 contentUrl）

修改 `addAttachments()` 分支:
```javascript
if (contentType === 'application/pdf' || isPdfByName) {
    this.renderDocumentAttachment(attachment, messageDiv);
} else if (contentType.startsWith('image/')) {
    this.renderImageAttachment(attachment, messageDiv);
} else {
    this.renderGenericAttachment(attachment, messageDiv);
}
```

### 5. 上传进度 UI

在 `#filePreviewContainer` 内叠加进度条:
```html
<div id="uploadProgressBar" style="display:none;">
    <div id="uploadProgressFill"></div>
    <span id="uploadProgressText">Uploading...</span>
</div>
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/core/application.js` | 实装 showFilePreview/hideFilePreview；renderUserMessage 增加 attachments 参数；sendMessageWithFile 增加进度回调；initializeElements 补充 DOM 引用 |
| `src/components/directline/DirectLineService.js` | 新增 uploadFile() 方法 |
| `src/ui/messageRenderer.js` | 新增 renderDocumentAttachment()；adjustAttachments() 增加 PDF 分支 |
| `css/components/messages.css` | 新增 .document-attachment 样式 |
| `css/components/chat.css` | 增强 #filePreviewContainer 和上传进度条样式 |
| `index.html` | 在 #filePreviewContainer 内新增进度条 HTML |

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| DirectLine SDK 内部不暴露 conversationId | 通过 `this._directLine.conversationId` 获取（SDK 内部属性但稳定使用） |
| 浏览器跨域限制 | DirectLine upload endpoint 本身支持 CORS |
| 文件大小超限（4MB） | 在 handleFileSelection 中校验并错误提示 |
| secret 暴露在前端 XHR header | 与现有 DirectLine 连接同级风险，后续 Batch 7 token 方案缓解 |
| 上传中用户切换 Agent/新建会话 | 上传中禁用这些操作，或中断上传 |
