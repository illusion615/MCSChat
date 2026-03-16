# Batch 7: 认证登录界面 — 设计方案

## 设计目标

为需要身份认证的 Copilot Studio Agent 提供前端可用的登录流程，同时保持现有 Secret 模式可继续使用。

## 架构分层

1. 配置层（Agent 管理）
   - 新增认证类型与认证参数配置。
   - 支持无认证和 OAuth2 两种模式。

2. 认证层（AuthService）
   - 负责授权流程、token 获取、登录状态管理。
   - 负责过期检测与登出清理。

3. 存储层（SecureStorage）
   - 负责 token 加密存储与读取。

4. 通信层（DirectLineService）
   - 在现有 secret 连接能力基础上扩展 token 初始化能力。

## 登录流程设计

1. 用户在 Agent 配置中选择“需要登录”。
2. 完成租户、应用、作用域等参数配置。
3. 触发 OAuth2 授权流程并获取 access token。
4. token 入库后更新登录态。
5. 连接时由 application 根据 authType 决定使用 secret 或 token 方式接入 DirectLineService。

## 状态模型

每个 Agent 维护两类状态：

1. 配置状态
   - authType
   - authConfig

2. 运行状态
   - isAuthenticated
   - tokenExpiry
   - lastAuthError

## UI 设计要点

1. Agent 管理面板内显示认证类型切换。
2. 认证模式下显示配置表单与登录状态。
3. 提供登录、登出、状态提示。
4. 错误信息可理解，能指导用户修复配置。

## 安全要求

1. 使用 PKCE 与 state 防止授权码劫持和 CSRF。
2. token 不以明文长期暴露在页面状态中。
3. 回调参数最小化并进行来源校验。

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 浏览器弹窗受限导致登录失败 | 预留 redirect 兜底模式 |
| token 生命周期管理复杂 | 首版先保证可登录和过期提示，再迭代自动刷新 |
| 配置错误定位困难 | 增加参数校验与分级错误提示 |
