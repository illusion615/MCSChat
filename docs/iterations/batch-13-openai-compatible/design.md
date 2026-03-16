# Batch 13: OpenAI Compatible 接口支持 — 设计方案

## 设计目标

以最小改动复用现有 OpenAI 请求/流式链路，仅增加"端点可配置 + 模型可指定"能力。

## 设计原则

1. 协议复用: 直接复用 OpenAI `/v1/chat/completions` 请求格式与 streaming 解析逻辑。
2. 配置隔离: 新供应方的 Base URL / API Key / Model 独立存储，不影响原生 OpenAI 配置。
3. 渐进验证: 先通过测试连接确认端点可达，再用于实际对话。

## 实现策略

### 请求层

新增 `sendToOpenAICompatible()` 方法，与 `sendToOpenAI()` 的差异仅在于：

1. endpoint 从 localStorage 读取（而非硬编码）。
2. model 从 localStorage 读取（而非 settings 下拉框）。
3. API Key 从 SecureStorage 读取独立 key（而非复用 openaiApiKey）。
4. 其余请求体结构、headers、streaming 解析逻辑完全复用。

### 测试连接

1. 优先尝试 `GET {baseUrl}/models`（标准 OpenAI models 端点）。
2. 如 404 或不可用，降级发送一条简单 completion 验证。
3. 返回结果展示模型名称或成功/失败状态。
4. 点击 Test Connection 后按钮进入 `Testing...` 进度态并临时禁用，测试完成后自动恢复，避免重复点击。

### 配置存储

| 数据 | 存储位置 | 格式 |
|------|----------|------|
| Base URL | localStorage `openaiCompatibleBaseUrl` | string |
| Model Name | localStorage `openaiCompatibleModel` | string |
| Display Name | localStorage `openaiCompatibleDisplayName` | string |
| API Key | SecureStorage `openaiCompatibleApiKey` | encrypted |

### UI 配置区域

选中 "OpenAI Compatible" 后显示独立配置块，包含：

1. Base URL 输入框（placeholder: `https://api.example.com/v1`）
2. API Key 输入框（password 类型）
3. Model Name 输入框（placeholder: `model-name`）
4. Display Name 输入框（可选）
5. 测试连接按钮

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 第三方端点响应格式轻微不兼容 | 增加响应格式容错，对非标准字段做安全忽略 |
| CORS 限制导致浏览器无法直接请求 | 在测试连接时明确提示 CORS 限制，建议使用支持 CORS 的端点 |
| 用户误配 URL 格式 | 自动补全 `/v1` 后缀或提示格式要求 |
