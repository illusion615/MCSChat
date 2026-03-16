# Batch 1: 根目录清理 — 测试计划

## 测试目标

确保文件移动/删除后应用功能完全不受影响，且文档仍可访问。

## 测试步骤

### T1: 应用启动测试

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```

验证点：
- [x] index.html 正常加载
- [x] Splash screen 显示正常
- [x] 主聊天界面完全渲染
- [x] 控制台无 404 或模块加载错误

### T2: 功能完整性快速验证

- [x] Agent 管理面板可打开并列出 Agent
- [x] 可发送消息并收到回复
- [x] AI Companion 面板可打开
- [x] 设置面板所有选项可用
- [x] 左侧会话列表正常
- [x] 移动端响应式布局正常（浏览器 DevTools 模拟）

### T3: 引用完整性验证

```bash
# 1. 检查 JS 代码中是否有对已移动/删除文件的引用
grep -rn "\.md\b" src/ --include="*.js" | grep -v node_modules
grep -rn "\.html\b" src/ --include="*.js" | grep -v "index\.html" | grep -v node_modules

# 2. 检查 HTML 中的链接
grep -rn "href=.*\.md" index.html

# 3. 检查 docs/ 内部的交叉引用是否断裂
grep -rn "\.\.\/" docs/ --include="*.md" | head -20
```

- [x] 无断裂引用

### T4: 根目录验证

```bash
# 验证根目录 .md 文件
ls -1 *.md
# 预期输出仅含: CHANGELOG.md, LICENSE (如果是.md), README.md, TODO.md

# 验证根目录 .html 文件
ls -1 *.html
# 预期输出仅含: index.html

# 验证根目录散落 .js
ls -1 *.js
# 预期输出仅含: chat-server.js, ollama-proxy.js
```

- [x] .md 文件 ≤ 4 个
- [x] .html 文件 = 1 个（index.html）
- [x] .js 文件 ≤ 2 个（服务脚本）

### T5: Git 状态检查

```bash
git status
git diff --stat
```

- [x] 所有变更均为 rename（移动）或 delete，无意外修改
- [x] commit 信息清晰描述批量操作
