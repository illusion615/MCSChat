# MCSChat D2E Local Router · 使用指南

本地 Node.js Router，通过第三方 REST/SSE API 暴露 Copilot Studio New Agent `/agenticruntime/3p` D2E 数据流。

**核心设计**：一台受控 Entra 用户代理 Power Platform 令牌；第三方调用方从不接收或获取 Power Platform 令牌；S2S/应用专属令牌未实现；仅监听 `127.0.0.1`，不是生产互联网网关。

---

## 快速开始

### 第 1 步：前置条件

- **Node.js 22.x 或更新版本**（由 @azure/msal-node 5.5.0 要求）
- **Copilot Studio 中已配置的 New Agent**
- **Entra App Registration**（拥有 Power Platform 权限、Power Apps 授权已获得）
- **一台受控 Entra 用户**（拥有 Power Apps 和该 Copilot 工作区的访问权限）

### 第 2 步：克隆仓库并安装依赖

```bash
# 进入 gateway 目录
cd gateway

# 安装依赖
npm install
```

### 第 3 步：获取必要的配置参数

在 Entra 应用注册和 Power Platform 中获取：

- **Tenant ID**：你的 Azure 租户 ID
- **ENTRA_CLIENT_ID**：应用注册的 Application (client) ID
- **POWER_PLATFORM_ENVIRONMENT_ID**：Copilot 工作空间的环境 ID（Power Platform 管理中心查看）
- **POWER_PLATFORM_SCHEMA_NAME**：Agent 所属的 Power Platform 解决方案内的 schema name

### 第 4 步：生成 4 个秘钥

```bash
# 生成 ENTRA_CLIENT_SECRET（在 Entra App Registration 的 Certificates & secrets 创建，不能是自签名的）
# 这个需要在 Entra 门户手动创建，复制值

# 生成其他三个密钥：
node scripts/generateSecrets.js
```

该脚本会输出三个密钥，分别对应：
- `msal-cache-encryption-key`（AES-256-GCM 对称密钥，用于加密 Token 缓存）
- `prototype-api-key`（验证页面使用的 API 密钥）
- `admin-session-signing-key`（浏览器会话签名密钥）

### 第 5 步：配置 `.env.local`

```bash
# 复制示例配置
cp .env.example .env.local

# 编辑 .env.local，填入 4 个 LOCAL_* 秘钥
nano .env.local
# 或用你常用的编辑器打开
```

**关键参数**：

| 参数 | 来源 | 示例 |
|------|------|------|
| `PORT` | 自定义（本地） | `8090` |
| `TENANT_ID` | Azure 租户 ID | `899aca58-7bdc-45e9-bec6-1cc9d3f12894` |
| `ENTRA_CLIENT_ID` | Entra App Registration | `00000000-0000-0000-0000-000000000000` |
| `LOCAL_ENTRA_CLIENT_SECRET` | Entra Certificates & secrets | `xxx_xxx_xxx` |
| `LOCAL_MSAL_CACHE_ENCRYPTION_KEY` | `generateSecrets.js` 输出 | 64 字符十六进制 |
| `ALLOWED_UPSTREAM_USER_OID` | 受控 Entra 用户的 Object ID | `00000000-0000-0000-0000-000000000000` |
| `POWER_PLATFORM_ENVIRONMENT_ID` | Power Platform 管理中心 | `448464af-64af-ec92-a521-6d203cf6811d` |
| `POWER_PLATFORM_SCHEMA_NAME` | Power Platform 解决方案 | `Default_KnowledgeAgentNewCopilot_sodjEw` |
| `LOCAL_PROTOTYPE_API_KEY` | `generateSecrets.js` 输出 | 32 字符十六进制 |
| `LOCAL_ADMIN_SESSION_SIGNING_KEY` | `generateSecrets.js` 输出 | 64 字符十六进制 |
| `ALLOWED_ORIGINS` | CORS 白名单 | `http://localhost:8000,http://127.0.0.1:8000` |

**安全检查**：

```bash
# 确保文件权限为 600（仅所有者可读）
chmod 600 .env.local

# 验证配置正确性
npm run check
```

### 第 6 步：首次启动 — 管理员授权

```bash
# 启动本地服务
npm run start:local
```

日志会显示：
```
Delegated identity not ready (cache missing). 
Start administrator authorization: POST /admin/auth/start
```

在**另一个终端**中，触发授权流：

```bash
curl -X POST http://127.0.0.1:8090/admin/auth/start \
  -H "X-Admin-Key: <LOCAL_ADMIN_SESSION_SIGNING_KEY>" \
  -H "Content-Type: application/json"
```

会收到：
```json
{
  "authorizationUri": "https://login.microsoftonline.com/.../authorize?client_id=..."
}
```

**访问浏览器**，打开该 URI，使用受控 Entra 用户登录并授予权限。Entra 会回调到 `/admin/auth/callback`，Router 会持久化加密的 MSAL 缓存到 `.local-state/msal-cache.bin`。

日志会显示：
```
Identity ready: Successfully acquired token.
Server listening on 127.0.0.1:8090
```

### 第 7 步：验证本地服务

#### 方式 A：使用验证页面（推荐 UI 演示）

```bash
npm run verify:local
```

打开浏览器：
```
http://127.0.0.1:8090/prototype
```

**在验证页面中**：
1. 点击 **Connect** 按钮，应显示 "Conversation ready"
2. 在文本框中输入提示词，点 **Send**
3. 观察流式响应、处理阶段、最终答案
4. 可选：导出 JSON 格式的转向日志

#### 方式 B：使用 curl 验证（API 验证）

```bash
# 创建会话
CONV_ID=$(curl -s -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H "Content-Type: application/json" | jq -r '.conversationId')

echo "Created conversation: $CONV_ID"

# 发送一个转向，使用 curl 读取 SSE
curl -N http://127.0.0.1:8090/v1/conversations/$CONV_ID/turns \
  -X POST \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'
```

可以观察到：
- `stage: <stageName>` — 当前处理阶段（如 `evaluating`, `generating`）
- `answer: <chunk>` — 增量答案文本
- `final: <fullText>` — 完整答案（流的最后一个事件）

### 第 8 步：集成到主应用

在 MCSChat 浏览器应用中使用 New Agent D2E：

```javascript
// src/core/application.js
const agentType = new URLSearchParams(location.search).get('agent');
if (agentType === 'new') {
  const connector = new DirectEngineConnector(
    'http://127.0.0.1:8090',  // 本地 Router 地址
    agentUserId                 // 该 Agent 对用户可见的 ID
  );
  // ... 连接事件处理
}
```

**验证页面** (examples/d2e-router-streaming-test.html) 已包含完整集成示例，包括：
- Connect 流（创建会话 → 启用 Send）
- 多转向消息历史
- 实时数据流处理
- JSON 证据导出

---

## 常见命令

| 命令 | 用途 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run start:local` | 启动本地服务 |
| `npm run verify:local` | 运行本地验证脚本 |
| `npm test` | 运行 27 个测试用例 |
| `npm run check` | 语法检查 |
| `node scripts/generateSecrets.js` | 生成三个随机秘钥 |
| `node scripts/fakeRouterServer.js` | 启动假 Router（无需 Power Platform） |

---

## 架构和数据流

```
┌─────────────────────┐
│  MCSChat 浏览器应用  │
│ (examples/*.html)   │
└──────────┬──────────┘
           │ REST/SSE
           ↓
┌──────────────────────────┐
│   D2E Local Router       │
│   (gateway/)             │
│                          │
│ • 会话映射               │
│ • Token 缓存管理         │
│ • 流标准化               │
└──────────┬───────────────┘
           │ SSE + Token
           ↓
┌──────────────────────────┐
│  Copilot Studio          │
│  New Agent D2E Upstream  │
│  (/agenticruntime/3p)    │
└──────────────────────────┘
```

**关键特性**：

| 特性 | 说明 |
|------|------|
| **会话映射** | 浏览器获得不透明会话 ID；Router 内部维护到上游会话的映射 |
| **令牌缓存** | MSAL 缓存以 AES-256-GCM 加密，存储在 `.local-state/msal-cache.bin` |
| **SSE 标准化** | 简化上游复杂流为：`stage` → `answer` → `final` \| `error` |
| **会话生命周期** | 60 分钟 TTL（可配置）；超时自动清理 |
| **并发安全** | 使用原子文件写（temp + rename）+ ETag 冲突检测 |

---

## 测试和验证

### 运行完整测试套件

```bash
npm test
```

覆盖范围：
- ✅ New Agent 重放减速（消除重复的 `final` 事件）
- ✅ 晚期/无序块抑制
- ✅ 最终事件去重
- ✅ SSE 帧格式
- ✅ 缓存加密和篡改检测
- ✅ 本地原子 ETag 冲突行为
- ✅ 会话所有权、锁定和重复转向拒绝
- ✅ 假上游 REST/SSE 端到端行为

### 对真实 New Agent 的本地验证

已通过对配置的 New Agent 的验证：
- ✅ 静默缓存恢复（无需再次登录）
- ✅ 标准化 SSE（流事件映射到 `stage` / `answer` / `final`）
- ✅ 最终文本匹配（答案内容正确）
- ✅ 无效密钥拒绝（安全验证）
- ✅ 多转向会话（状态隔离和持久化）

证据记录在 `evidence/local-router-live.json`（已忽略，包含敏感数据）。

---

## 故障排查

### 问题：`Delegated identity not ready`

**症状**：日志显示缓存缺失或令牌获取失败

**解决方案**：
```bash
# 1. 完成管理员授权流（见"第 6 步"）
# 2. 验证 ALLOWED_UPSTREAM_USER_OID 在 .env.local 中是否正确
# 3. 检查受控用户是否有 Power Apps 工作区访问权限
```

### 问题：`401 Unauthorized` 响应

**症状**：API 调用返回 401

**原因**：
- `Authorization` 头缺失或格式错误（应为 `Bearer <API_KEY>`）
- API 密钥不匹配
- 浏览器 HttpOnly 会话 cookie 缺失

**解决方案**：
```bash
# 验证 API 调用格式
curl -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer <YOUR_LOCAL_PROTOTYPE_API_KEY>" \
  -H "Content-Type: application/json"

# 如果是浏览器会话，先调用 /local/bootstrap 获取会话 cookie
curl -c cookies.txt -X POST http://127.0.0.1:8090/local/bootstrap
```

### 问题：`CORS 错误`或`Origin not allowed`

**症状**：浏览器控制台显示 CORS 拒绝

**解决方案**：
```bash
# 检查 .env.local 中的 ALLOWED_ORIGINS
# 确保你的浏览器地址在列表中
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000,https://your-domain.com
```

### 问题：`ENOTFOUND` 或网络超时

**症状**：Router 无法连接上游 Copilot Studio

**原因**：
- 上游 API 端点配置错误
- Power Platform 环境 ID 或 schema name 不匹配
- 受控用户无访问权限

**解决方案**：
```bash
# 验证配置的环境 ID 是否正确
# 在 Power Platform 管理中心确认 schema name
# 检查日志中的上游请求 URL
```

---

## 安全最佳实践

- ✅ 生产环境绝不暴露到互联网（仅 `127.0.0.1` 监听）
- ✅ `.env.local` 权限设为 600（`chmod 600`）
- ✅ MSAL 缓存自动加密（AES-256-GCM）
- ✅ 第三方调用方永不接收 Power Platform 令牌
- ✅ S2S/应用专属模式未实现（仅用户委托）
- ✅ HttpOnly session cookie 用于浏览器认证

---

## 下一步

- 在 `examples/d2e-router-streaming-test.html` 中查看完整集成示例
- 使用 `scripts/generateSecrets.js` 生成新秘钥
- 参考 `src/d2e/` 目录了解数据流处理逻辑
- 检查 `test/` 目录查看完整的测试用例
