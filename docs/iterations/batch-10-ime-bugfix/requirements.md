# Batch 10: IME 回车误触发送修复 — 需求文档

## 目标

修复消息输入框中输入法（IME）组合输入时，敲回车确认候选词会误触发消息发送的问题。

## 当前问题

使用中文/日文等 IME 输入法时：
1. 用户输入拼音/假名
2. 按回车确认候选词（IME composition 完成）
3. 输入框同时触发了 `keydown` → Enter → `sendMessage()`
4. 导致未完成的消息被提前发送

## 期望行为

- IME 组合状态下的回车（确认候选词）**不触发发送**
- 仅在非 IME 组合状态下的回车触发发送

## 技术方案

使用 `compositionstart` / `compositionend` 事件或 `KeyboardEvent.isComposing` 属性：

```javascript
inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        sendMessage();
    }
});
```

## 涉及模块

- `src/core/application.js` — Enter 键事件处理

## 验收标准

1. 中文输入法输入时，按回车确认候选词不触发发送
2. 非 IME 状态下按回车正常触发发送
3. Shift+Enter 换行行为不受影响（如有）
