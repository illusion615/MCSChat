# 快速开始指南

[🇺🇸 English](../../en/setup/quick-start.md) | [🏠 返回主页](../README.md)

## 📋 系统要求

- **现代网络浏览器** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **本地 Web 服务器** (推荐用于开发)
- **HTTPS 连接** (在线部署需要)

## 🚀 快速安装

### 方法 1: 下载并运行
1. **下载项目**
   ```bash
   git clone https://github.com/illusion615/MCSChat.git
   cd MCSChat
   ```

2. **启动本地服务器**
   ```bash
   # 使用 Python (推荐)
   python -m http.server 8000
   
   # 或使用 Node.js
   npx serve .
   
   # 或使用 PHP
   php -S localhost:8000
   ```

3. **访问应用**
   打开浏览器访问: `http://localhost:8000`

### 方法 2: 使用 VS Code 任务
如果您使用 VS Code，可以直接运行预配置的任务：
- 按 `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
- 输入 "Tasks: Run Task"
- 选择 "Launch Chat Application"

## ⚙️ 基本配置

### 1. AI 服务配置

#### OpenAI GPT
1. 获取 [OpenAI API 密钥](https://platform.openai.com/api-keys)
2. 在聊天界面中点击 **AI 伴侣** 按钮
3. 选择 **OpenAI** 服务
4. 输入您的 API 密钥
5. 选择模型 (推荐: `gpt-4` 或 `gpt-3.5-turbo`)

#### Azure OpenAI
1. 获取 Azure OpenAI 服务凭据
2. 在 AI 伴侣设置中选择 **Azure OpenAI**
3. 配置:
   - API 密钥
   - 端点 URL
   - 部署名称
   - API 版本

#### Anthropic Claude
1. 获取 [Anthropic API 密钥](https://console.anthropic.com/)
2. 选择 **Anthropic** 服务
3. 输入 API 密钥
4. 选择模型 (推荐: `claude-3-sonnet-20240229`)

#### 本地 Ollama
1. [安装 Ollama](https://ollama.ai/)
2. 运行本地模型:
   ```bash
   ollama pull llama2
   ollama serve
   ```
3. 在 AI 伴侣中选择 **Ollama**
4. 确保本地服务在 `http://localhost:11434` 运行

### 2. Microsoft Bot Framework 配置

#### DirectLine 连接
1. 在 [Azure Bot Service](https://portal.azure.com/) 中创建机器人
2. 启用 DirectLine 通道
3. 获取 DirectLine 密钥
4. 在聊天界面中配置:
   - 机器人 ID
   - DirectLine 密钥
   - 端点 URL (可选)

#### Copilot Studio 连接
1. 在 [Copilot Studio](https://copilotstudio.microsoft.com/) 中创建机器人
2. 发布机器人
3. 获取 DirectLine 配置信息
4. 在应用中输入连接详情

## 🔧 高级配置

### 语音设置
- **语音识别**: 支持浏览器内置语音识别
- **文本转语音**: 配置首选语音和语言
- **快捷键**: `Ctrl+M` (macOS: `Cmd+M`) 切换麦克风

### 界面自定义
- **主题**: 支持亮色/暗色主题自动切换
- **布局**: 全宽专业模式或标准聊天模式
- **移动端**: 响应式设计，支持触摸手势

### 安全设置
- **数据加密**: 所有敏感数据使用 AES-256-GCM 客户端加密
- **本地存储**: 凭据安全存储在浏览器本地
- **CORS 配置**: 支持跨域本地模型访问

## 🎯 验证安装

### 1. 基础功能测试
- ✅ 界面正常加载
- ✅ 可以发送消息
- ✅ AI 伴侣面板显示
- ✅ 设置保存正常

### 2. AI 服务测试
1. 配置任一 AI 服务
2. 发送测试消息: "你好，请介绍一下自己"
3. 验证 AI 响应正常
4. 检查 KPI 指标显示

### 3. 机器人连接测试
1. 配置 DirectLine 连接
2. 发送测试消息
3. 验证机器人响应
4. 检查连接状态指示器

## 🚨 常见问题

### CORS 错误
**问题**: 无法连接到本地 AI 服务  
**解决方案**: 
- 确保使用 HTTPS 或 localhost
- 启动 AI 服务时添加 CORS 头

### DirectLine 连接失败
**问题**: 无法连接到 Microsoft 机器人  
**解决方案**:
- 验证 DirectLine 密钥正确
- 检查机器人是否已发布
- 确认网络连接正常

### 移动端问题
**问题**: 移动设备上功能受限  
**解决方案**:
- 使用 HTTPS 访问
- 允许浏览器权限 (麦克风、摄像头)
- 尝试其他移动浏览器

## 📚 下一步

- 📖 阅读 [功能特性文档](../features/) 了解详细功能
- 🛠️ 查看 [故障排除指南](../troubleshooting/) 解决问题
- 🤝 参与 [GitHub 讨论](https://github.com/illusion615/MCSChat/discussions)

## 🔗 相关资源

- [完整功能列表](../features/)
- [API 文档](../architecture/)
- [开发指南](../development/)
- [故障排除](../troubleshooting/)

---

**需要帮助?** [创建 Issue](https://github.com/illusion615/MCSChat/issues) 或查看 [故障排除文档](../troubleshooting/)
