# Batch 4: CSS 设计令牌迁移 — 需求文档

## 目标

将 CSS 组件文件中的硬编码颜色值和间距值替换为 `css/base/variables.css` 中定义的设计令牌（CSS 自定义属性）。

## 当前问题

`css/components/utilities.css` 和 `css/components/panels.css` 中存在大量硬编码值：

### Thinking Dot 进度文字换行问题（新增需求）

Thinking dot 的进度提示文字当前存在换行，需要：
- 将文字拉平为单行
- 居中对齐放置在进度条上方
- 确保在不同屏幕宽度下保持单行显示

### utilities.css（约 30+ 硬编码颜色，20+ 硬编码间距）

发现的硬编码颜色：
- `#0078d4` — 应使用 `var(--color-info)` 或 `var(--color-primary)`
- `#605e5c` — 应使用 `var(--color-text-secondary)`
- `#323130` — 应使用 `var(--color-text-primary)`
- `#e1e5e9` — 应使用 `var(--color-border)` 或对应token
- `#fff4ce` — 应使用 `var(--color-warning-bg)` （可能需新增 token）
- `#ffb900` — 应使用 `var(--color-warning)`
- `#8a6914` — 间接色值，需映射
- `#8b5fbf` / `#744c9e` — 紫色系，companion 相关
- `#107c10` — 应使用 `var(--color-success)`
- `#d13438` — 应使用 `var(--color-danger)`
- `#ffffff` / `#fff` — 应使用 `var(--color-surface)` 或对应 token

发现的硬编码间距：
- `8px`、`12px`、`16px`、`20px`、`24px` 等未使用 `var(--spacing-*)`

### panels.css（约 15+ 硬编码颜色）

类似问题，包含 `#605e5c`、`#323130` 等。

### 可能涉及的其他 CSS 文件

需全面扫描 `css/components/` 下所有文件。

## 新增 Token 需求

部分颜色在 `variables.css` 中可能缺乏对应 token，需要按需新增：

| 用途 | 当前值 | 建议 token 名 |
|------|--------|--------------|
| 警告背景色 | `#fff4ce` | `--color-warning-bg` |
| 警告文字色 | `#8a6914` | `--color-warning-text` |
| Companion 主色 | `#8b5fbf` | `--color-companion-primary` |
| Companion 深色 | `#744c9e` | `--color-companion-dark` |

## 验收标准

1. `css/components/` 中无硬编码 hex 颜色（`#` 开头的值）
2. `css/components/` 中间距值使用 `var(--spacing-*)` 或合理的相对单位
3. `variables.css` 中新增的 token 有语义化命名
4. 视觉效果与重构前完全一致（截图对比）
5. 移动端响应式布局不受影响
6. Thinking dot 进度提示文字单行显示，居中对齐在进度条上方，无换行
7. Full-width 模式下消息左右 margin 增大，提升阅读体验
