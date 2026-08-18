# D2E Local Router · 快速参考

## 安装 & 启动（5 分钟）

```bash
cd gateway

# 1️⃣ 安装依赖
npm install

# 2️⃣ 生成秘钥
npm run generate:secrets

# 复制并编辑配置（填入 4 个秘钥 + Power Platform 参数）
cp .env.example .env.local
chmod 600 .env.local
nano .env.local

# 3️⃣ 启动服务
npm run start:local
```

如果看到缓存缺失提示，在另一个终端运行：

```bash
curl -X POST http://127.0.0.1:8090/admin/auth/start \
  -H "X-Admin-Key: <LOCAL_ADMIN_SESSION_SIGNING_KEY>" \
  -H "Content-Type: application/json"
```

打开浏览器访问给出的 Entra 授权链接，使用受控用户登录。登录完成后，Router 会自动持久化加密的令牌缓存。

## 验证本地服务

### 方式 A：UI 验证页面（推荐）

```bash
npm run verify:local
# 打开 http://127.0.0.1:8090/prototype
```

- 点 **Connect** → 应显示 "Conversation ready"
- 输入提示词，点 **Send**
- 观察流式响应和最终答案

### 方式 B：API 验证

```bash
# 创建会话
CONV=$(curl -s -X POST http://127.0.0.1:8090/v1/conversations \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" | jq -r '.conversationId')

# 发送转向
curl -N http://127.0.0.1:8090/v1/conversations/$CONV/turns \
  -X POST \
  -H "Authorization: Bearer $LOCAL_PROTOTYPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'
```

## 在主应用中使用

在 `src/core/application.js` 中已集成 D2E 支持。浏览器访问：

```
http://localhost:8000/index.html?agent=new
```

即可使用本地 Router 的 New Agent 路径。

## 测试

```bash
npm test
# 27 个测试用例覆盖流处理、缓存加密、会话管理等
```

## 关键环境变量

| 变量 | 来源 |
|------|------|
| `TENANT_ID` | Azure 租户 ID |
| `ENTRA_CLIENT_ID` | Entra App ID |
| `LOCAL_ENTRA_CLIENT_SECRET` | Entra Certificates & secrets（Entra 门户手动创建） |
| `LOCAL_MSAL_CACHE_ENCRYPTION_KEY` | `npm run generate:secrets` |
| `ALLOWED_UPSTREAM_USER_OID` | 受控 Entra 用户的 Object ID |
| `POWER_PLATFORM_ENVIRONMENT_ID` | Power Platform 管理中心 → 环境 ID |
| `POWER_PLATFORM_SCHEMA_NAME` | Power Platform 解决方案 schema name |
| `LOCAL_PROTOTYPE_API_KEY` | `npm run generate:secrets` |
| `LOCAL_ADMIN_SESSION_SIGNING_KEY` | `npm run generate:secrets` |

## 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `Delegated identity not ready` | 缓存缺失或令牌获取失败 | 完成管理员授权流（见 `npm run start:local` 日志） |
| `401 Unauthorized` | API 密钥不匹配或缺失 | 验证 `Authorization: Bearer <KEY>` 格式 |
| `CORS 错误` | Origin 未在白名单中 | 编辑 `.env.local` 的 `ALLOWED_ORIGINS` |
| `ENOTFOUND` | 上游配置错误 | 验证 Power Platform 环境 ID 和 schema name |

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
