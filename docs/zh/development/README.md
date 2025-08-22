# 开发指南

[🇺🇸 English](../../en/development/) | [🏠 返回主页](../README.md)

## 🚀 开发环境搭建

### 📋 系统要求
- **Node.js** 16.0+ (推荐 18.x LTS)
- **Git** 2.0+
- **现代代码编辑器** (推荐 VS Code)
- **现代浏览器** (Chrome 90+, Firefox 88+)

### 🛠️ 开发工具安装
```bash
# 克隆项目
git clone https://github.com/illusion615/MCSChat.git
cd MCSChat

# 安装开发依赖 (可选)
npm install -g live-server
npm install -g http-server

# 或使用 Pyt# 压缩和优化# 压缩和优化 (可选)
# 使用工具如 UglifyJS, CSSNano 等
uglifyjs src/main.js -o dist/src/main.min.js
cleancss css/styles.css -o dist/css/styles.min.css

# 4. 更新 HTML 引用
sed -i 's/src\/main.js/src\/main.min.js/g' dist/index.html
sed -i 's/css\/styles.css/css\/styles.min.css/g' dist/index.html使用工具如 UglifyJS, CSSNano 等
uglifyjs src/main.js -o dist/src/main.min.js
cleancss css/styles.css -o dist/css/styles.min.css

# 4. 更新 HTML 引用
sed -i 's/src\/main.js/src\/main.min.js/g' dist/index.html
sed -i 's/legacy\/styles-legacy.css/legacy\/styles-legacy.min.css/g' dist/index.html
python --version  # 确保 Python 3.6+
```

### 🏃 启动开发服务器
```bash
# 方法 1: 使用 Python (推荐)
python -m http.server 8000

# 方法 2: 使用 Node.js
npx serve . -p 8000

# 方法 3: 使用 live-server (自动刷新)
live-server --port=8000 --host=localhost

# 访问应用
open http://localhost:8000
```

## 📁 项目结构详解

```
MCSChat/
├── 📄 index.html           # 主入口页面
├── ⚙️ main.js             # 应用入口脚本
├── 📝 README.md           # 项目说明
├── 📋 CHANGELOG.md        # 版本更新日志
├── 📝 TODO.md             # 待办事项列表
│
├── 📁 src/                # 源代码目录
│   ├── 🎮 main.js         # 应用主逻辑
│   ├── 🤖 ai/             # AI 服务模块
│   │   ├── openai.js      # OpenAI 集成
│   │   ├── anthropic.js   # Anthropic 集成
│   │   ├── azure.js       # Azure OpenAI 集成
│   │   └── ollama.js      # 本地 Ollama 集成
│   └── 🧩 components/     # UI 组件模块
│       ├── chat/          # 聊天界面组件
│       ├── ai-companion/  # AI 伴侣组件
│       ├── settings/      # 设置管理组件
│       └── ui/            # 基础 UI 组件
│
├── 📁 css/                # 模块化样式
│   ├── base/              # 基础样式
│   ├── components/        # 组件样式
│   ├── layout/            # 布局样式
│   └── responsive/        # 响应式样式
│
├── 📁 lib/                # 第三方库
│   ├── marked.min.js      # Markdown 解析
│   ├── katex.min.js       # 数学公式渲染
│   └── purify.min.js      # HTML 净化
│
├── 📁 images/             # 图片资源
├── 📁 docs/               # 文档目录
└── 📁 legacy/             # 遗留代码
```

## 🔧 开发工作流

### 🌿 分支管理
```bash
# 主要分支
main          # 生产环境稳定版本
develop       # 开发主分支
feature/*     # 功能开发分支
hotfix/*      # 紧急修复分支
release/*     # 版本发布分支

# 创建功能分支
git checkout -b feature/new-ai-provider
git checkout -b feature/mobile-optimization
git checkout -b feature/voice-enhancement

# 创建修复分支
git checkout -b hotfix/directline-connection
git checkout -b hotfix/memory-leak-fix
```

### 🔄 开发流程
1. **创建功能分支**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **本地开发**
   ```bash
   # 启动开发服务器
   python -m http.server 8000
   
   # 在另一个终端监听文件变化
   npm run watch  # 如果配置了监听脚本
   ```

3. **代码提交**
   ```bash
   git add .
   git commit -m "feat: add new AI provider support"
   git push origin feature/your-feature-name
   ```

4. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写详细的变更说明
   - 等待代码审查

## 📝 代码规范

### 🎨 JavaScript 规范
```javascript
// ✅ 推荐的代码风格
class AICompanionManager {
  constructor(config) {
    this.config = config;
    this.providers = new Map();
    this.currentProvider = null;
  }
  
  async analyzeConversation(context) {
    try {
      const provider = this.getCurrentProvider();
      const result = await provider.analyze(context);
      return this.processAnalysisResult(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      throw new AIAnalysisError('Failed to analyze conversation', error);
    }
  }
  
  // 使用明确的方法名
  getCurrentProvider() {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    return this.currentProvider;
  }
}

// ❌ 避免的代码风格
function doStuff(x) {
  if (x) {
    return x.data;
  }
}
```

### 🎨 CSS 规范
```css
/* ✅ 推荐的 CSS 组织 */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
}

.chat-container__header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.chat-container__messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chat-container__input {
  padding: 1rem;
  background-color: var(--bg-secondary);
}

/* ❌ 避免的 CSS */
.container { margin: 10px; }
.red { color: red; }
#element1 { font-size: 14px; }
```

### 📝 HTML 规范
```html
<!-- ✅ 推荐的 HTML 结构 -->
<div class="chat-container" role="main" aria-label="聊天界面">
  <header class="chat-container__header">
    <h1 class="chat-title">MCSChat</h1>
    <button 
      class="btn btn--icon" 
      aria-label="设置"
      title="打开设置面板"
    >
      <svg class="icon icon--settings" aria-hidden="true">
        <use xlink:href="#icon-settings"></use>
      </svg>
    </button>
  </header>
  
  <main class="chat-container__messages" aria-live="polite">
    <!-- 消息列表 -->
  </main>
  
  <footer class="chat-container__input">
    <form class="message-form" aria-label="发送消息">
      <input 
        type="text" 
        class="message-input"
        placeholder="输入消息..."
        aria-label="消息输入框"
      >
      <button type="submit" class="btn btn--primary">
        发送
      </button>
    </form>
  </footer>
</div>
```

## 🚀 部署指南

### 📦 构建生产版本
```bash
# 1. 清理和准备
rm -rf dist/
mkdir dist/

# 2. 复制必要文件
cp index.html dist/
cp -r src/ dist/
cp -r css/ dist/
cp -r lib/ dist/
cp -r images/ dist/

# 3. 压缩和优化 (可选)
# 使用工具如 UglifyJS, CSSNano 等
uglifyjs src/main.js -o dist/src/main.min.js
cleancss css/styles.css -o dist/css/styles.min.css

# 4. 更新 HTML 引用
sed -i 's/src\/main.js/src\/main.min.js/g' dist/index.html
sed -i 's/css\/styles.css/css\/styles.min.css/g' dist/index.html
```

### 🌐 静态部署
```bash
# GitHub Pages
git checkout gh-pages
cp -r dist/* .
git add .
git commit -m "Deploy production build"
git push origin gh-pages

# Netlify
# 1. 连接 GitHub 仓库
# 2. 设置构建命令: npm run build
# 3. 设置发布目录: dist

# Vercel
vercel --prod

# Firebase Hosting
firebase deploy
```

### 🐳 Docker 部署
```dockerfile
# Dockerfile
FROM nginx:alpine

# 复制构建文件
COPY dist/ /usr/share/nginx/html/

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```bash
# 构建和运行 Docker 容器
docker build -t mcschat .
docker run -p 8080:80 mcschat
```

## 🤝 贡献指南

### 🔀 Pull Request 流程
1. **Fork 项目**
   ```bash
   # 在 GitHub 上 Fork 项目
   git clone https://github.com/YOUR_USERNAME/MCSChat.git
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **提交变更**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

4. **推送分支**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **创建 Pull Request**
   - 填写详细的变更说明
   - 包含相关的 Issue 编号
   - 添加适当的标签

### 📝 提交消息规范
```bash
# 格式: <type>(<scope>): <description>

# 功能
feat(ai): add Claude support
feat(ui): implement dark theme

# 修复
fix(directline): resolve connection timeout
fix(mobile): fix responsive layout issues

# 文档
docs(readme): update installation guide
docs(api): add AI companion API documentation

# 样式
style(css): improve button hover effects
style(format): fix code indentation

# 重构
refactor(storage): optimize encryption service
refactor(components): modularize chat interface

# 性能
perf(rendering): optimize message rendering
perf(memory): reduce memory usage

# 测试
test(unit): add AI companion tests
test(e2e): add chat flow tests
```

### 🐛 问题报告
创建 Issue 时请包含:

```markdown
## 🐛 问题描述
简要描述遇到的问题

## 🔄 重现步骤
1. 打开应用
2. 点击 '...'
3. 查看错误

## 💭 预期行为
描述您期望发生的事情

## 📷 截图
如果适用，添加截图来帮助解释问题

## 🌍 环境信息
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Chrome 95.0]
- Version: [e.g. v3.6.0]

## 📝 附加信息
添加任何其他相关信息
```

## 🔧 调试技巧

### 🛠️ 开发者工具
```javascript
// 启用调试模式
window.debugMode = true;

// 具体功能调试
window.directLineDebug = true;
window.aiCompanionDebug = true;
window.speechDebug = true;

// 查看内部状态
console.log('当前状态:', window.appState);
console.log('AI 配置:', window.aiConfig);
console.log('连接状态:', window.connectionStatus);
```

### 🔍 性能分析
```javascript
// 性能监控
performance.mark('chat-start');
// ... 执行聊天操作
performance.mark('chat-end');
performance.measure('chat-operation', 'chat-start', 'chat-end');

// 查看性能指标
const measures = performance.getEntriesByType('measure');
console.table(measures);

// 内存使用监控
console.log('内存使用:', performance.memory);
```

### 📊 网络调试
```javascript
// 监控网络请求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Network request:', args[0]);
  return originalFetch.apply(this, args);
};

// DirectLine 连接调试
window.directLineConnection.connectionStatus$.subscribe(status => {
  console.log('DirectLine 状态:', status);
});

window.directLineConnection.activity$.subscribe(activity => {
  console.log('接收到活动:', activity);
});
```

---

**相关资源**:
- 📖 [API 文档](../architecture/api-integration.md)
- 🎨 [设计系统](../architecture/components.md) 
- 🧪 [测试策略](./testing.md)
- 🚀 [部署指南](../deployment/)
