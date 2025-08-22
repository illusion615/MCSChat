# 故障排除指南

[🇺🇸 English](../../en/troubleshooting/) | [🏠 返回主页](../README.md)

## 🚨 常见问题快速修复

### 🔌 连接问题

#### DirectLine 连接失败
**症状**: 
- 连接状态显示 "已断开"
- 无法发送消息到机器人
- 错误提示 "DirectLine connection failed"

**解决方案**:
1. **验证凭据**
   ```javascript
   // 检查 DirectLine 密钥格式
   // 正确格式: secret_xxxxxxxxxxxxxxxxxxxx
   ```
   - 确保 DirectLine 密钥正确且有效
   - 验证机器人 ID 拼写正确
   - 检查 Azure 机器人服务状态

2. **网络诊断**
   ```bash
   # 测试 DirectLine 端点连接
   curl -I https://directline.botframework.com/v3/directline/conversations
   ```
   - 检查防火墙设置
   - 确认网络代理配置
   - 验证 HTTPS 证书有效

3. **配置检查**
   - 确保机器人已发布并可访问
   - 验证 DirectLine 通道已启用
   - 检查端点 URL 配置 (如果使用自定义端点)

#### AI 伴侣连接问题
**症状**:
- AI 分析不工作
- CORS 错误提示
- API 调用失败

**解决方案**:
1. **OpenAI 配置**
   ```javascript
   // 检查 API 密钥格式
   // 格式: sk-xxxxxxxxxxxxxxxxxxxxxxxx
   ```
   - 验证 API 密钥有效且有余额
   - 检查模型名称正确性
   - 确认 API 限制和配额

2. **本地 Ollama 配置**
   ```bash
   # 检查 Ollama 服务状态
   curl http://localhost:11434/api/version
   
   # 启动 Ollama 服务 (如果未运行)
   ollama serve
   ```
   - 确保 Ollama 在 `localhost:11434` 运行
   - 验证模型已下载: `ollama list`
   - 检查 CORS 设置

3. **Azure OpenAI 配置**
   - 验证端点 URL 格式: `https://your-resource.openai.azure.com/`
   - 检查 API 版本: `2023-05-15` 或更新
   - 确认部署名称与模型匹配

### 🎵 语音和音频问题

#### 语音识别不工作
**症状**:
- 麦克风按钮无响应
- 没有语音转文本
- 浏览器权限错误

**解决方案**:
1. **浏览器权限**
   - 允许麦克风访问权限
   - 在地址栏点击锁定图标检查权限
   - 尝试刷新页面并重新授权

2. **HTTPS 要求**
   ```bash
   # 确保使用 HTTPS 或 localhost
   # 语音 API 需要安全连接
   ```
   - 使用 `https://` 访问
   - 或在 `localhost` 测试
   - 检查证书有效性

3. **浏览器兼容性**
   - Chrome: 完全支持
   - Firefox: 需要启用语音识别
   - Safari: 有限支持
   - Edge: 完全支持

#### 文本转语音问题
**症状**:
- 没有语音输出
- 语音延迟或中断
- 声音质量差

**解决方案**:
1. **浏览器设置**
   - 检查系统音量设置
   - 验证浏览器声音未静音
   - 尝试其他网站的音频功能

2. **语音配置**
   - 选择不同的语音选项
   - 调整语音速度和音调
   - 检查语言设置匹配

### 📱 移动端问题

#### 移动界面异常
**症状**:
- 界面元素重叠
- 滚动问题
- 触摸手势不响应

**解决方案**:
1. **浏览器兼容性**
   - 推荐使用 Chrome Mobile
   - 更新到最新浏览器版本
   - 清除浏览器缓存

2. **设备设置**
   ```css
   /* 检查视口设置 */
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```
   - 确保设备方向锁定关闭
   - 检查设备缩放设置
   - 重启浏览器应用

3. **功能限制**
   - 某些高级功能可能在移动端受限
   - 使用简化模式获得更好体验
   - 切换到桌面版本 (如需要)

### ⚡ 性能问题

#### 应用响应缓慢
**症状**:
- 界面加载慢
- 消息发送延迟
- 动画卡顿

**解决方案**:
1. **浏览器优化**
   ```javascript
   // 清除浏览器数据
   // 设置 > 隐私和安全 > 清除浏览数据
   ```
   - 清除缓存和 Cookie
   - 关闭不必要的标签页
   - 禁用浏览器扩展

2. **网络优化**
   ```bash
   # 检查网络速度
   curl -o /dev/null -s -w '%{time_total}\n' https://www.google.com
   ```
   - 检查网络连接稳定性
   - 使用有线连接 (如可能)
   - 尝试不同的 DNS 服务器

3. **设备性能**
   - 关闭其他应用程序
   - 检查内存使用情况
   - 重启设备 (如必要)

#### 内存使用过高
**症状**:
- 浏览器标签页崩溃
- 系统响应慢
- 风扇噪音大

**解决方案**:
1. **应用优化**
   - 清理长对话历史
   - 关闭未使用的功能
   - 减少并发 AI 请求

2. **浏览器管理**
   - 使用任务管理器检查内存
   - 重启浏览器
   - 考虑使用轻量级浏览器

### 🔒 安全和数据问题

#### 数据丢失
**症状**:
- 设置重置
- 对话历史消失
- API 密钥需要重新输入

**解决方案**:
1. **本地存储检查**
   ```javascript
   // 浏览器开发者工具 > 应用 > 本地存储
   // 检查 localStorage 数据
   ```
   - 确保浏览器允许本地存储
   - 检查隐私模式设置
   - 验证存储空间充足

2. **备份数据**
   - 定期导出重要配置
   - 使用浏览器书签备份 API 密钥
   - 考虑外部配置管理

#### 加密问题
**症状**:
- 无法保存敏感数据
- 加密错误提示
- 凭据验证失败

**解决方案**:
1. **浏览器支持**
   - 确保浏览器支持 Web Crypto API
   - 更新到现代浏览器版本
   - 检查安全上下文 (HTTPS)

2. **密钥管理**
   - 重新生成加密密钥
   - 清除损坏的存储数据
   - 重新输入敏感信息

## 🛠️ 调试工具

### 浏览器开发者工具
1. **控制台检查**
   ```javascript
   // 按 F12 打开开发者工具
   // 查看控制台错误信息
   console.log('调试信息');
   ```

2. **网络标签**
   - 监控 API 请求状态
   - 检查响应时间和错误
   - 验证请求头信息

3. **应用存储**
   - 检查 localStorage 数据
   - 验证 sessionStorage 内容
   - 查看 Cookie 设置

### 日志系统
```javascript
// 启用详细日志
window.debugMode = true;

// 查看 DirectLine 连接日志
window.directLineDebug = true;

// AI 伴侣调试模式
window.aiCompanionDebug = true;
```

## 📞 获取帮助

### 社区支持
- **GitHub Issues**: [报告问题](https://github.com/illusion615/MCSChat/issues)
- **讨论论坛**: [GitHub Discussions](https://github.com/illusion615/MCSChat/discussions)
- **文档**: 查看 [完整文档](../README.md)

### 问题报告
创建问题报告时请包含:
1. **环境信息**
   - 操作系统和版本
   - 浏览器类型和版本
   - 设备类型 (桌面/移动)

2. **错误详情**
   - 具体错误消息
   - 重现步骤
   - 预期行为

3. **调试信息**
   - 控制台错误日志
   - 网络请求失败信息
   - 相关截图

### 紧急支持
对于关键问题:
1. 检查 [GitHub Issues](https://github.com/illusion615/MCSChat/issues) 中的已知问题
2. 搜索 [讨论区](https://github.com/illusion615/MCSChat/discussions) 中的解决方案
3. 创建新的 Issue 并标记为 "urgent"

---

**记住**: 大多数问题可以通过重启浏览器、清除缓存或检查网络连接来解决。如果问题持续存在，请不要犹豫寻求社区帮助！
