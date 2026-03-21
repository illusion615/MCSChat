# Batch 19: 粘贴图片发送 — 执行检查清单

## 执行前

- [ ] 确认 Batch 16 文件上传管线已可用（selectedFiles + showFilePreview + sendMessageWithFiles）
- [ ] 确认 paste 事件在 input[type=text] 上可触发（Chrome/Safari）
- [ ] 设计方案用户确认

## 执行中

### Phase 1: Paste 事件监听

- [ ] application.js: attachEventListeners 中添加 userInput paste 监听
- [ ] application.js: 新增 handlePasteImage(e) 方法
- [ ] 检测 clipboardData.items 中 image/* 类型
- [ ] 非图片粘贴放行默认行为

### Phase 2: 图片转文件

- [ ] 从 DataTransferItem.getAsFile() 获取 Blob
- [ ] 包装为 File 对象（自动生成文件名）
- [ ] 复用 4MB 大小校验
- [ ] 追加到 this.selectedFiles 数组

### Phase 3: 预览与发送

- [ ] 复用 showFilePreview() 显示图片缩略图
- [ ] 验证发送流程复用 sendMessageWithFiles()
- [ ] 验证粘贴图片 + 已选文件的混合发送

### Phase 4: 文档同步

- [ ] CHANGELOG.md 追加
- [ ] TODO.md 更新
- [ ] docs/iterations/TODO.md 更新

## 执行后

- [ ] 用户测试确认截图粘贴发送正常
- [ ] 用户测试确认网页图片粘贴发送正常
- [ ] 用户测试确认纯文本粘贴不受影响
- [ ] 用户测试确认超大图片被拒绝
