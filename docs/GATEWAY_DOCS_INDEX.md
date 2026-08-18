# Gateway 文档导航

> 本地 D2E Router 的完整文档指南

## 📚 文档结构

```
gateway/
├── README.md              ← 完整使用指南（包含所有细节）
├── QUICKSTART.md          ← 快速参考（5 分钟快速开始）
└── scripts/
    └── generateSecrets.js ← 秘钥生成工具

docs/
└── gateway-integration.md ← 应用集成指南（如何在 MCSChat 中使用）
```

## 🎯 快速导航

### 🚀 我要快速启动本地 Router

→ [Gateway QUICKSTART.md](../gateway/QUICKSTART.md)

**5 步完成**：
```bash
cd gateway
npm install
npm run generate:secrets
cp .env.example .env.local && nano .env.local && chmod 600 .env.local
npm run start:local
```

### 📖 我要了解 Router 的完整细节

→ [Gateway README.md](../gateway/README.md)

包含：
- 前置条件和依赖
- 详细配置说明（每个环境变量的解释）
- API 端点文档
- 测试和验证
- 故障排查
- 安全最佳实践

### 🔧 我要在 MCSChat 应用中使用 Router

→ [Gateway Integration Guide](gateway-integration.md)

包含：
- 架构概览
- 代码集成点（`src/core/application.js`）
- 事件模型（事件类型和处理）
- 流式响应处理
- 多会话管理
- 错误处理
- 性能优化
- 测试方法
- 常见问题

### 🔑 我需要生成秘钥

→ [scripts/generateSecrets.js](../gateway/scripts/generateSecrets.js)

运行：
```bash
cd gateway && npm run generate:secrets
```

会输出四个秘钥（缓存密钥为 base64，其余为 hex），直接粘贴到 `.env.local`

### 🛠️ 我要管理 Router（登录 / 日志 / 流量 / 重启）

→ 管理控制台：`http://127.0.0.1:8090/admin`

用 `LOCAL_ADMIN_API_KEY` 登录后可以：
- 触发与重置 Entra 委派授权
- 查看实时日志（按级别 / 关键字 / correlationId 过滤）
- 查看流量指标（请求、轮次、TTFT p50/p95、上游调用）
- 查看与强制关闭活跃会话
- 导出日志 / 指标 / 诊断包
- 重启服务（需 `npm run start:local` 带监督者启动）

### 🧪 我要测试验证页面

→ [examples/d2e-router-streaming-test.html](../examples/d2e-router-streaming-test.html)

启动 Router 后访问：
```
http://127.0.0.1:8090/prototype
```

或直接打开 HTML 文件（需要 Router 运行）

### ✅ 我想运行自动化测试

```bash
cd gateway && npm test
```

覆盖流处理、缓存加密、会话并发、可观测性脱敏、管理面认证与导出防泄漏等场景

## 📋 场景查找表

| 场景 | 文档 | 命令 |
|------|------|------|
| 初次设置 | [QUICKSTART](../gateway/QUICKSTART.md) | `npm run start:local` |
| 生成秘钥 | [README](../gateway/README.md#第-4-步生成-4-个秘钥) | `npm run generate:secrets` |
| 配置 .env.local | [README](../gateway/README.md#第-5-步配置-envlocal) | `nano .env.local` |
| 管理员授权 | [README](../gateway/README.md#第-6-步首次启动--管理员授权) | 打开 `http://127.0.0.1:8090/admin` |
| 管理控制台 | [README](../gateway/README.md#管理控制台) | `http://127.0.0.1:8090/admin` |
| UI 验证 | [README](../gateway/README.md#方式-a使用验证页面推荐-ui-演示) | `http://127.0.0.1:8090/prototype` |
| API 验证 | [README](../gateway/README.md#方式-b使用-curl-验证api-验证) | `curl -X POST http://127.0.0.1:8090/v1/conversations ...` |
| 应用集成 | [Integration Guide](gateway-integration.md) | `http://localhost:8000/index.html?agent=new` |
| 故障排查 | [README](../gateway/README.md#故障排查) | — |
| 运行测试 | [README](../gateway/README.md#测试和验证) | `npm test` |
| 假 Router 测试 | [README](../gateway/README.md#常见命令) | `node scripts/fakeRouterServer.js` |

## 🔑 配置关键参数速查

需要从何处获取各个 `.env.local` 参数：

| 参数 | 来源 | 示例 |
|------|------|------|
| TENANT_ID | Azure 租户 ID | `899aca58-7bdc-45e9-bec6-1cc9d3f12894` |
| ENTRA_CLIENT_ID | Entra App Registration | `00000000-0000-0000-0000-000000000000` |
| LOCAL_ENTRA_CLIENT_SECRET | Entra → Certificates & secrets | ⚠️ 需手动创建 |
| ALLOWED_UPSTREAM_USER_OID | Entra → 受控用户 → Object ID | `00000000-0000-0000-0000-000000000000` |
| POWER_PLATFORM_ENVIRONMENT_ID | Power Platform → 环境 | `448464af-64af-ec92-a521-6d203cf6811d` |
| POWER_PLATFORM_SCHEMA_NAME | Power Platform → 解决方案 | `Default_KnowledgeAgentNewCopilot_sodjEw` |
| LOCAL_MSAL_CACHE_ENCRYPTION_KEY | `npm run generate:secrets` | 64 字符十六进制 |
| LOCAL_PROTOTYPE_API_KEY | `npm run generate:secrets` | 32 字符十六进制 |
| LOCAL_ADMIN_SESSION_SIGNING_KEY | `npm run generate:secrets` | 64 字符十六进制 |

## 🚨 常见问题速查

### "Delegated identity not ready"

**原因**：MSAL 缓存缺失或令牌获取失败

**解决**：
1. 运行 `npm run start:local`
2. 按日志提示完成管理员授权（访问 Entra 授权链接）
3. 验证 `ALLOWED_UPSTREAM_USER_OID` 是否正确
4. 检查受控用户是否有 Power Apps 工作区访问权限

→ [详细说明](../gateway/README.md#问题delegated-identity-not-ready)

### "401 Unauthorized"

**原因**：API 密钥不匹配或 Authorization 头格式错误

**解决**：
```bash
# 验证 API 调用格式
curl -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer <YOUR_LOCAL_PROTOTYPE_API_KEY>" \
  -H "Content-Type: application/json"
```

→ [详细说明](../gateway/README.md#问题401-unauthorized-响应)

### "CORS 错误"

**原因**：浏览器来源不在白名单中

**解决**：编辑 `.env.local` 的 `ALLOWED_ORIGINS`

→ [详细说明](../gateway/README.md#问题cors-错误或origin-not-allowed)

### "ENOTFOUND 或网络超时"

**原因**：上游 API 端点配置错误或权限不足

**解决**：验证 `POWER_PLATFORM_ENVIRONMENT_ID` 和 `POWER_PLATFORM_SCHEMA_NAME` 是否正确

→ [详细说明](../gateway/README.md#问题enotfound-或网络超时)

## 🧪 测试流程

### 1️⃣ 单元测试（自动化）

```bash
cd gateway && npm test
# 预期：27 pass, 0 fail
```

### 2️⃣ UI 验证（手动）

```bash
# 启动 Router
npm run start:local

# 打开管理控制台（登录 / 日志 / 流量 / 重启）
# http://127.0.0.1:8090/admin

# 打开流式验证页面
# http://127.0.0.1:8090/prototype
```

### 3️⃣ API 验证（curl）

```bash
# 创建会话
curl -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "knowledge-new"}'

# 发送消息（SSE）
curl -N http://127.0.0.1:8090/v1/conversations/{id}/turns \
  -X POST \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "clientTurnId": "turn-1"}'
```

### 4️⃣ 集成测试（应用）

```
http://localhost:8000/index.html?agent=new
```

1. 点击 Connect → 应显示"Conversation ready"
2. 输入提示词，点 Send
3. 观察流式响应
4. 验证没有控制台错误

## 📊 文档概览

```
Gateway 文档三层结构
═════════════════════════════════════════
│
├─ 第 1 层：快速开始（QUICKSTART.md）
│  └─ 受众：想快速启动的用户
│  └─ 内容：安装 → 配置 → 启动（5 分钟）
│
├─ 第 2 层：完整指南（README.md）
│  └─ 受众：需要全面理解的用户
│  └─ 内容：前置条件 → 详细配置 → API → 测试 → 故障排查
│
└─ 第 3 层：应用集成（gateway-integration.md）
   └─ 受众：在 MCSChat 中使用 Router 的开发者
   └─ 内容：架构 → 集成点 → 事件处理 → 常见问题
```

## 🔄 推荐阅读顺序

### 新用户
1. 本文（导航）
2. [QUICKSTART.md](../gateway/QUICKSTART.md) — 5 分钟快速启动
3. [verification page](../examples/d2e-router-streaming-test.html) — 实际测试

### 开发者
1. [README.md](../gateway/README.md) — 理解完整架构
2. [gateway-integration.md](gateway-integration.md) — 了解如何在应用中使用
3. 查看源代码 — `gateway/src/` 目录

### 故障排查
1. [README.md 故障排查部分](../gateway/README.md#故障排查)
2. [集成指南的错误处理](gateway-integration.md#错误处理)
3. 启用调试日志 → 运行 `npm run verify:local` 或 `npm test`

## 📞 获取帮助

- **Setup 问题** → [QUICKSTART.md](../gateway/QUICKSTART.md)
- **配置问题** → [README.md 配置部分](../gateway/README.md#第-5-步配置-envlocal)
- **运行时问题** → [README.md 故障排查](../gateway/README.md#故障排查)
- **集成问题** → [integration guide](gateway-integration.md)
- **测试失败** → 运行 `npm test` 检查输出

---

**最后更新**：2026-08-18  
**版本**：1.0.0
