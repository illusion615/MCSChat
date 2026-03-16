# Batch 13: OpenAI Compatible 接口支持 — 需求文档

## 目标

在 AI Companion 设置中新增"OpenAI Compatible"供应方选项，允许用户连接任何兼容 OpenAI API 协议的 LLM 服务（如 DeepSeek、Groq、Together AI、本地 vLLM/LM Studio 等）。

## 背景

当前 AI Companion 仅硬编码支持 OpenAI、Anthropic、Azure OpenAI、Ollama 四种供应方，无法接入其他兼容 OpenAI `/v1/chat/completions` 协议的服务。大量第三方 LLM 供应方和本地推理框架已采用 OpenAI 兼容协议，用户需要灵活接入。

## 需求

### 配置项

| 字段 | 说明 | 必填 |
|------|------|------|
| Base URL | 服务端点（如 `https://api.deepseek.com/v1`） | 是 |
| API Key | 认证密钥 | 是（加密存储） |
| Model Name | 模型标识（如 `deepseek-chat`） | 是 |
| Display Name | 用户自定义显示名称（如 "DeepSeek"） | 否（默认 "OpenAI Compatible"） |

### 功能要求

1. 在供应方下拉框中新增 "OpenAI Compatible" 选项。
2. 选择后显示 Base URL、API Key、Model Name、Display Name 配置区域。
3. 提供"测试连接"按钮，请求 `/v1/models` 或发送简单 completion 验证连通性。
4. 连接成功后，使用标准 OpenAI `/v1/chat/completions` 协议发送请求。
5. 支持 streaming 响应（与现有 OpenAI streaming 逻辑复用）。
6. API Key 使用 SecureStorage 加密存储。
7. Base URL 和 Model Name 存入 localStorage。

### UI/UX

- 选择 "OpenAI Compatible" 后，显示专属配置区域（类似 Azure 的独立配置块）。
- 测试成功后显示成功提示和检测到的模型信息。
- 测试失败后显示清晰的错误信息（网络不可达 / 认证失败 / 端点格式错误）。

## 涉及模块

| 模块 | 变更 |
|------|------|
| `index.html` | 新增 "OpenAI Compatible" 下拉选项与配置区域 |
| `src/ai/aiCompanion.js` | 新增 `sendToOpenAICompatible()` 方法 |
| `src/core/application.js` | `handleAPIProviderChange()` 支持新供应方 |
| `css/components/` | 配置区域样式 |

## 验收标准

1. 供应方下拉框出现 "OpenAI Compatible" 选项
2. 配置 Base URL + API Key + Model 后可连接第三方服务
3. 测试连接按钮正常工作
4. streaming 输出与现有 OpenAI 行为一致
5. API Key 加密存储
6. 不影响现有四种供应方的正常使用
