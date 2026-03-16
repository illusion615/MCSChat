# Batch 7: 认证登录界面 — 需求文档

## 目标

增加认证登录界面，允许用户添加需要登录认证的 Copilot Studio Agent。

## 背景

当前 MCSChat 的 Agent 管理仅支持 DirectLine Secret 方式连接。部分 Copilot Studio Agent 配置了身份验证（如 Azure AD / Entra ID），需要用户先登录才能建立会话。

## 需求

### 功能需求

1. **登录界面**
   - 在 Agent 管理面板中增加认证类型选择（无认证 / 需要登录）
   - 当选择"需要登录"时，显示认证配置表单
   - 支持 OAuth2 / Azure AD 认证流程

2. **认证配置项**
   - Tenant ID（Azure AD 租户 ID）
   - Client ID（应用注册 ID）
   - Redirect URI（回调地址）
   - Scope（权限范围）
   - Token Endpoint（可选，默认使用 Azure AD 标准端点）

3. **登录流程**
   - 用户配置认证信息后，点击"登录"触发 OAuth2 授权码流程
   - 弹出登录窗口或跳转到 IdP 登录页
   - 回调后获取 access token
   - 使用 token 替代 DirectLine Secret 建立连接

4. **Token 管理**
   - Token 存储使用现有的 AES-256-GCM 加密层（SecureStorage）
   - 自动检测 token 过期并提示重新登录
   - 支持登出操作（清除 token）

5. **UI/UX**
   - 登录状态在 Agent 管理面板中可视化（已登录/未登录/已过期）
   - 登录失败时显示清晰的错误信息
   - 支持"记住登录"选项

### 非功能需求

- 认证信息加密存储，不以明文暴露
- 遵循 OAuth2 安全最佳实践（PKCE、state 参数防 CSRF）
- 纯浏览器实现，不依赖后端服务器

## 涉及模块

| 模块 | 变更 |
|------|------|
| `src/managers/agentManager.js` | 新增认证类型和认证配置字段 |
| `src/core/application.js` | 连接流程支持 token-based 认证 |
| `src/components/directline/DirectLineService.js` | 扩展支持 token 初始化（除 secret 外） |
| `src/utils/secureStorage.js` | 存储认证 token |
| `index.html` | 新增登录 UI 表单 |
| `css/components/` | 登录界面样式 |
| 新建: `src/services/authService.js` | OAuth2 认证流程管理 |

## 验收标准

1. 可配置带认证的 Copilot Studio Agent
2. OAuth2 登录流程完整（授权码 + PKCE）
3. Token 加密存储，过期自动提示
4. 登录/登出/状态显示正常
5. 不影响现有无认证 Agent 的使用
