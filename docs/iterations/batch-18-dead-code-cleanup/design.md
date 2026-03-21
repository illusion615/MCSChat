# Batch 18: 技术债 Phase 1 — 死代码清理 — 设计方案

## 设计原则

1. **先归档后删除**：文件先移到 `.archive-phase1/` 临时目录，用户测试通过后再彻底删除
2. **引用完整性检查**：删除前用 grep 确认零外部引用
3. **最小修改**：仅清理直接相关的残留引用，不做顺带重构

## 执行方案

### Phase 1: 确认引用

```
grep -rn 'CustomChatInterface' src/ index.html  → 确认零外部引用
grep -rn 'EnhancedChatWidget' src/ index.html   → 确认仅 versionRegistry + aboutSection 字符串列名
grep -rn 'chat/ui/MessageRenderer' src/ index.html → 确认零外部引用
```

### Phase 2: 归档文件

```
mkdir .archive-phase1/
mv <6 files> .archive-phase1/
```

### Phase 3: 清理引用

- `versionRegistry.js`：删除 `'EnhancedChatWidget': '1.0.0'` 行，删除日志输出数组中的条目
- `aboutSection.js`：从两处模块列表中删除 `'EnhancedChatWidget'`

### Phase 4: 清理注释

- `application.js`：删除 5 行已注释 import 和 2 行已注释初始化代码

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 删除后发现有隐式依赖 | 归档而非直接删除，可随时恢复 |
| versionRegistry 删条目导致 About 页面报错 | 版本查询对不存在的 key 返回 undefined，UI 自动跳过 |
