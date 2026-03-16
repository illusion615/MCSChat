# Batch 4: CSS 设计令牌迁移 — 测试计划

## T1: 硬编码值清零验证

```bash
# 颜色硬编码
grep -rn "#[0-9a-fA-F]\{3,8\}" css/components/ --include="*.css"
# 预期: 无结果（或仅部分有充分理由保留的）

# RGB 硬编码
grep -rn "rgb(" css/components/ --include="*.css"
# 预期: 无结果或仅在 token 定义中
```

- [ ] css/components/ 无硬编码颜色值

## T2: Token 完整性

```bash
# 检查 variables.css 中定义的 token 是否被使用
grep -rn "var(--" css/components/ --include="*.css" | head -30
```

- [ ] 新增的 token 都在 variables.css 中定义
- [ ] 无未定义的 `var(--*)` 引用

## T3: 视觉回归测试

对以下页面进行截图对比（重构前 vs 重构后）：

### 桌面端
- [ ] 主聊天界面（含消息气泡）
- [ ] Agent 管理面板
- [ ] 设置面板
- [ ] AI Companion 面板（含 KPI 卡片）
- [ ] About 页面
- [ ] 通知消息（成功/警告/错误变体）

### 移动端（DevTools 模拟 iPhone 14）
- [ ] 主聊天界面
- [ ] 展开的面板
- [ ] 消息气泡样式

### 对比要点
- [ ] 颜色一致
- [ ] 间距一致
- [ ] 圆角一致
- [ ] 渐变效果一致
- [ ] 阴影效果一致

## T4: CSS 加载顺序验证

- [ ] `variables.css` 在所有组件 CSS 之前加载（检查 index.html link 顺序）
- [ ] 浏览器 DevTools → Computed Styles 确认 token 正确解析（非空值）

## T5: 边界场景

- [ ] 极长消息的显示
- [ ] 空状态页面的显示
- [ ] 错误状态的颜色正确（红色系）
- [ ] 成功状态的颜色正确（绿色系）
- [ ] 禁用状态的颜色正确（灰色系）
