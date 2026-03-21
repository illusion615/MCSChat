# Batch 19: 粘贴图片发送 — 设计方案

## 架构设计

### 数据流

```
用户按 Ctrl/Cmd+V
    │
    ▼
[application.js] paste 事件监听
    │ ── 检测 clipboardData.items 中的 image/* 类型
    │ ── 无图片 → 放行默认粘贴行为（纯文本）
    │ ── 有图片 → e.preventDefault()
    │
    ▼
提取图片 Blob → 包装为 File 对象
    │ ── 文件名: pasted-image-{timestamp}.png
    │ ── 校验大小（4MB 限制）
    │ ── 推入 this.selectedFiles 数组
    │
    ▼
[复用] showFilePreview()
    │ ── 在文件预览区显示图片缩略图
    │
用户点击发送（或再粘贴更多图片）
    │
    ▼
[复用] sendMessageWithFiles()
    │ ── DirectLine REST upload
```

### 关键实现

```javascript
// 在 attachEventListeners() 中添加
DOMUtils.addEventListener(this.elements.userInput, 'paste', (e) => {
    this.handlePasteImage(e);
});

handlePasteImage(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return; // 非图片粘贴，放行
    
    e.preventDefault(); // 阻止默认粘贴行为
    
    for (const item of imageItems) {
        const blob = item.getAsFile();
        if (!blob) continue;
        
        // 大小校验
        if (blob.size > Application.MAX_FILE_SIZE) {
            this.showErrorMessage('Pasted image too large (max 4 MB)');
            continue;
        }
        
        // 包装为 File 对象
        const ext = blob.type.split('/')[1] || 'png';
        const fileName = `pasted-image-${Date.now()}.${ext}`;
        const file = new File([blob], fileName, { type: blob.type });
        
        this.selectedFiles.push(file);
    }
    
    if (this.selectedFiles.length > 0) {
        this.showFilePreview();
    }
}
```

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| Safari 剪贴板 API 兼容性 | Safari 支持 paste 事件的 clipboardData.items，已验证 |
| 粘贴的图片可能非常大（截屏 Retina 显示器） | 复用已有 4MB 校验，超限拒绝 |
| 部分网站图片复制后可能为 URL 而非 Blob | 检测 items 类型，仅处理 image/* ，URL 文本走默认粘贴 |
| 移动端不支持 paste 事件 | 桌面端优先，移动端降级为无效果 |
