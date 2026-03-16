# Batch 10: IME 回车误触发送修复 — 设计方案

## 设计目标

保证输入法组合输入期间的 Enter 仅用于候选确认，不触发消息发送。

## 设计原则

1. 组合输入优先: IME 组合状态下禁止发送。
2. 兼容优先: 对支持 isComposing 与不支持的环境都生效。
3. 行为不倒退: 保持非 IME Enter 发送与 Shift+Enter 换行语义。

## 处理策略

### 输入状态判定

1. 首选 KeyboardEvent.isComposing。
2. 备用状态: compositionstart/compositionend 维护本地 composing 标记。

### Enter 处理规则

1. e.key !== Enter: 不处理。
2. Enter + composing=true: 拦截发送。
3. Enter + Shift: 保留换行。
4. Enter + 非 composing: 触发 sendMessage。

## 事件时序

1. compositionstart -> composing=true
2. keydown Enter（组合中）-> return
3. compositionend -> composing=false
4. keydown Enter（非组合）-> send

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 浏览器对 isComposing 支持差异 | 增加 composition 事件兜底 |
| 快速输入导致状态不同步 | 在 keydown 中双重判定（isComposing + 本地状态） |
| 改动影响快捷键体验 | 补充 Shift+Enter 与英文输入回归测试 |
