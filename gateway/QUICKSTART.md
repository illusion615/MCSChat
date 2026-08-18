# D2E Local Router · 快速参考

## 安装 & 启动（5 分钟）

```bash
cd gateway

# 1. 安装依赖
npm install

# 2. 生成密钥（输出 4 行，直接粘贴进 .env.local）
npm run generate:secrets

# 复制并编辑配置
cp .env.example .env.local
chmod 600 .env.local
nano .env.local

# 3. 启动服务（带重启监督者）
npm run start:local
```

## 首次授权

打开管理控制台：

```
http://127.0.0.1:8090/admin
```

用 `LOCAL_ADMIN_API_KEY` 登录 → 概览页点【开始授权】→ 用受控 Entra 用户完成登录。回调后身份状态变为【身份就绪】，Router 自动持久化加密的令牌缓存。

不用浏览器时：

```bash
curl -X POST http://127.0.0.1:8090/admin/auth/start \
  -H "X-Admin-Key: $LOCAL_ADMIN_API_KEY" \
  -H 'Content-Type: application/json'
```

## 验证本地服务

### 方式 A：UI 验证页面（推荐）

打开 `http://127.0.0.1:8090/prototype`，无需登录。

该页由 `examples/d2e-streaming-test.html` 复制而来，仅替换传输层，所以聊天、Work 面板、性能基准套件、浮动日志与 export raw 全部可用。把两个页面的 export raw 一 diff，除 `conversation.id` 外的任何差异都说明 Router 改了 D2E 数据结构。

### 方式 B：API 验证

```bash
# 创建会话
CONV=$(curl -s -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"knowledge-new"}' | jq -r '.conversationId')

# 发送转向
curl -N http://127.0.0.1:8090/v1/conversations/$CONV/turns \
  -X POST \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"text": "Hello", "clientTurnId": "turn-1"}'
```

### 方式 C：CLI 取证脚本

```bash
npm run verify:local
# 输出脉络、TTFT、事件计数等证据到 evidence/local-router-live.json
```

## 在主应用中使用

在 `src/core/application.js` 中已集成 D2E 支持。浏览器访问：

```
http://localhost:8000/index.html?agent=new
```

即可使用本地 Router 的 New Agent 路径。

## 测试

```bash
npm test        # 全量测试：流处理、缓存加密、会话并发、可观测性、管理面认证与导出脱敏
npm run check   # src/ 与 scripts/ 全量语法检查
```

## 关键环境变量

| 变量 | 来源 |
|------|------|
| `TENANT_ID` | Azure 租户 ID |
| `ENTRA_CLIENT_ID` | Entra App ID |
| `PUBLIC_BASE_URL` | **必填**，Entra redirect URI 前缀（如 `http://localhost:8090`） |
| `LOCAL_ENTRA_CLIENT_SECRET` | Entra Certificates & secrets（Entra 门户手动创建） |
| `LOCAL_MSAL_CACHE_ENCRYPTION_KEY` | `npm run generate:secrets`（**base64**） |
| `ALLOWED_UPSTREAM_USER_OID` | 受控 Entra 用户的 Object ID |
| `POWER_PLATFORM_ENVIRONMENT_ID` | Power Platform 管理中心 → 环境 ID |
| `POWER_PLATFORM_SCHEMA_NAME` | Power Platform 解决方案 schema name |
| `LOCAL_PROTOTYPE_API_KEY` | `npm run generate:secrets` |
| `LOCAL_ADMIN_API_KEY` | `npm run generate:secrets`（**可选**，留空则控制台无密码，在界面里设） |
| `LOCAL_ADMIN_SESSION_SIGNING_KEY` | `npm run generate:secrets`（仅签名 Cookie） |

## 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `MSAL cache encryption key must be 32 bytes encoded as base64` | 密钥填成了 hex | 重跑 `npm run generate:secrets`，用其输出的 base64 值 |
| `Router configuration is incomplete` | 缺少密钥 | 按错误信息列出的变量名补齐 `.env.local` |
| `Delegated identity not ready` | 缓存缺失或令牌获取失败 | 在 `/admin` 完成管理员授权 |
| `401 ADMIN_AUTHENTICATION_REQUIRED` | 控制台密码不对或会话过期 | 重新登录；忘密则删除 `.local-state/admin/credential.json` 后重启 |
| 改了 `.env.local` 但不生效 | 控制台重启不重读 env | 终端 Ctrl+C 后重跑 `npm run start:local` |
| `401 AUTHENTICATION_REQUIRED` | `/v1` API 密钥不匹配 | 验证 `Authorization: Bearer <KEY>` |
| `CORS 错误` | Origin 未在白名单 | 编辑 `.env.local` 的 `ALLOWED_ORIGINS` |
| 重启后服务没起来 | 用了 `start:local:once` | 改用 `npm run start:local`（带监督者） |
| `EADDRINUSE` | 旧进程占用端口 | `lsof -nP -iTCP:8090 -sTCP:LISTEN` 找到后结束 |

## 文件结构

```
gateway/
├── .env.local                    # ⚠️ 秘钥配置（mode 600，不要提交）
├── .local-state/                # 加密的 MSAL 缓存和会话状态
├── src/
│   ├── server.js                # Express 应用入口
│   ├── identity/delegatedIdentity.js  # MSAL 令牌管理
│   ├── d2e/d2eClient.js         # D2E 上游映射
│   ├── d2e/activityReducer.js   # 流标准化
│   ├── storage/                 # 会话和缓存存储
│   └── http/                    # Express 路由
├── scripts/
│   ├── generateSecrets.js       # 生成秘钥
│   ├── fakeRouterServer.js      # 假 Router（无需 Power Platform）
│   └── verifyLocalRouter.js     # 本地验证脚本
└── test/                        # 27 个单元测试

详见 README.md
