# Batch 19: 粘贴图片发送 — 需求文档

## 目标

支持用户在聊天输入区通过 Ctrl/Cmd+V 粘贴剪贴板中的图片，预览后随消息发送给 Agent。

## 背景

Batch 16 已完善了文件上传基础设施（文件选择预览 UI、DirectLine REST upload API、上传进度条）。当前用户只能通过文件选择按钮或拖放选择图片，不支持直接从剪贴板粘贴截图或复制的网页图片，而这是现代聊天应用的标准交互模式。

## 功能需求

### F1: 剪贴板图片检测

- 在 `#userInput` 输入框上监听 `paste` 事件
- 检测 `clipboardData.items` 中 `type` 以 `image/` 开头的条目
- 忽略非图片粘贴（纯文本粘贴行为不受影响）

### F2: 图片转文件对象

- 将 `DataTransferItem.getAsFile()` 获取的 Blob 转为 File 对象
- 自动生成文件名（格式：`pasted-image-{timestamp}.png`）
- 复用 Batch 16 的 `selectedFiles` 数组和文件大小校验（4MB 限制）

### F3: 预览与发送

- 粘贴后立即在 `#filePreviewContainer` 显示图片缩略图预览
- 复用现有 `showFilePreview()` 方法
- 用户可在发送前移除粘贴的图片
- 发送时复用 `sendMessageWithFiles()` 经由 DirectLine upload API

### F4: 多图与混合

- 支持粘贴图片 + 已选文件的混合发送（追加到 `selectedFiles`）
- 支持连续多次粘贴（每次追加）

## 非功能需求

- 不引入新依赖
- 不改变现有文件上传管线（复用 Batch 16 基础设施）
- 移动端浏览器粘贴行为可能受限，此版本仅保证桌面端 Chrome/Edge/Safari

## 涉及文件预估

| 文件 | 改动类型 |
|------|---------|
| `src/core/application.js` | 修改：添加 paste 事件监听和图片提取逻辑 |
| `css/components/chat.css` | 可能微调：图片缩略图预览样式 |

## 验收标准

1. 在 Chrome 中截图后 Cmd+V，输入区出现图片预览
2. 从网页复制图片后 Cmd+V，输入区出现图片预览
3. 点击发送，图片通过 DirectLine upload 发送给 Agent
4. 粘贴纯文本不受影响，行为与之前一致
5. 粘贴超过 4MB 的图片被拒绝并给出提示
