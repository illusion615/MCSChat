# Batch 4: CSS 设计令牌迁移 — 设计方案

## 策略

### Step 1: 盘点现有 Token

读取 `css/base/variables.css`，列出所有已定义的 CSS 自定义属性及其值。

### Step 2: 全面扫描硬编码值

```bash
# 扫描所有 CSS 组件文件中的硬编码颜色
grep -rn "#[0-9a-fA-F]\{3,8\}" css/components/ --include="*.css"

# 扫描 rgb/rgba
grep -rn "rgb\(a\)\?" css/components/ --include="*.css"

# 扫描硬编码 px 间距（排除 0px 和 1px 边框）
grep -rn "[0-9]\+px" css/components/ --include="*.css" | grep -v "0px\|1px\|border"
```

### Step 3: 建立映射表

对每个硬编码值，确定映射关系：

```
#0078d4  → var(--color-primary)       [已存在]
#605e5c  → var(--color-text-secondary) [已存在?]
#323130  → var(--color-text-primary)   [已存在?]
#107c10  → var(--color-success)        [已存在]
#d13438  → var(--color-danger)         [已存在]
#ffb900  → var(--color-warning)        [已存在]
#fff4ce  → var(--color-warning-bg)     [需新增]
...
```

### Step 4: 补充缺失 Token

在 `variables.css` 的 `:root` 中添加缺失的语义 token。遵循命名规范：
- `--color-{语义}-{变体}` （如 `--color-warning-bg`）
- `--spacing-{尺寸}`（如 `--spacing-sm` = 8px）

### Step 5: 逐文件替换

按文件逐一替换，每替换一个文件后浏览器刷新验证视觉效果。

### 执行顺序

1. `variables.css` — 补充新 token
2. `utilities.css` — 最多违规，先处理
3. `panels.css` — 第二多
4. 其他 `css/components/*.css` — 按扫描结果处理

## 原则

- **一对一映射**：每个硬编码值替换为语义最匹配的 token
- **不改变视觉效果**：替换后页面外观完全一致
- **不过度抽象**：只为实际使用的值创建 token，不预先创建未使用的
- **不动 base/ 和 responsive/**：base 层是 token 定义层；responsive 层仅改硬编码值

## 风险

| 风险 | 缓解 |
|------|------|
| Token 语义不匹配导致将来维护困难 | 每个 token 命名需反映用途而非颜色 |
| 暗色模式兼容性 | 当前无暗色模式，token 化后可更容易添加 |
| 视觉回归 | 逐文件替换 + 浏览器实时对比 |
