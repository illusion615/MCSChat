# Batch 1: 根目录清理 — 设计方案

## 策略：临时归档 → 测试 → 确认删除

用户确认所有根目录的过时报告/摘要文档、测试 HTML、调试 JS 均为过时文件，不做分类归档，测试确认无影响后直接删除。

### Step 1: 创建临时归档目录

```bash
mkdir -p .archive-batch1/{md,html,js}
```

### Step 2: 引用完整性检查

移动前执行 grep 确认无代码引用：
```bash
grep -rn "\.md\b" src/ --include="*.js"
grep -rn "\.html\b" src/ --include="*.js" | grep -v "index\.html"
```

### Step 3: 批量移动到临时归档

```bash
# .md 文件（排除 README/TODO/CHANGELOG/LICENSE）
ls *.md | grep -v -E '^(README|TODO|CHANGELOG|LICENSE)\.md$' | xargs -I{} mv {} .archive-batch1/md/

# .html 文件（排除 index.html）
ls *.html | grep -v '^index\.html$' | xargs -I{} mv {} .archive-batch1/html/

# .js 调试脚本（排除 chat-server.js 和 ollama-proxy.js）
for f in improved-url-processing.js test-actual-speech.js test-url-pronunciation.js unified-cleanTextForSpeech.js update-first-url-processing.js; do
    [ -f "$f" ] && mv "$f" .archive-batch1/js/
done

# rollback-migration.sh
mv rollback-migration.sh .archive-batch1/ 2>/dev/null
```

### Step 4: 启动服务 → 用户测试

```bash
python -m http.server 8000
```

用户验证应用功能完全不受影响。

### Step 5: 用户确认后彻底删除

```bash
rm -rf .archive-batch1/
```

### Step 6: TODO.md 状态修正

- 将 "Clean markdown files" 的 `[x]` 改回 `[ ]`（实际未完成）→ 本批次完成后标记 `[x]`
- 将 "Review all documents" 的 `[x]` 改回 `[ ]`（实际未完成）→ 本批次完成后标记 `[x]`

## 风险

| 风险 | 缓解措施 |
|------|----------|
| 删除了仍被引用的文件 | 移动前全局 grep 检查 |
| 删除后发现某文件仍有价值 | 临时归档阶段可随时恢复；git 历史永久保留 |
| 应用功能受影响 | 用户测试确认通过后才执行删除 |
