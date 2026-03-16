---
applyTo: "css/**"
description: "Use when editing CSS files. Enforces the CSS layering system: base (tokens/reset) → layout → components → responsive. All colors and spacing must use design tokens from variables.css. Mobile styles go in responsive/mobile.css only."
---

# CSS 分层与设计令牌规范

## 加载顺序（不可打乱）

1. `base/reset.css` → `variables.css` → `typography.css`
2. `layout/desktop.css`
3. `components/*.css`
4. `responsive/mobile.css`（最后加载，媒体查询覆盖）

## 规则

- 颜色、间距、圆角、渐变等值必须使用 `variables.css` 中的设计令牌（`--color-*`、`--spacing-*`、`--radius-*`、`--gradient-*`）
- 避免 `!important`，通过正确的选择器特异性解决层叠冲突
- 响应式断点和移动端覆盖仅写在 `responsive/mobile.css`
- CSS 类名统一使用 kebab-case（`.chat-container`）
- 组件样式放在 `components/` 对应文件中，不要混入其他层
