# Batch 7: 认证登录界面 — 测试计划

## T1: 无认证 Agent 回归

- [ ] 现有无认证 Agent 的添加/编辑/删除不受影响
- [ ] 无认证 Agent 的连接和消息收发正常
- [ ] Agent 管理面板默认显示"无认证"选项

## T2: 认证配置 UI

- [ ] 选择"需要登录"后显示 OAuth2 配置表单
- [ ] 配置项（Tenant ID / Client ID / Scope）可填写和保存
- [ ] 切换回"无认证"时隐藏配置表单
- [ ] 保存的认证配置重新打开时正确回显

## T3: 登录流程

- [ ] 点击"登录"打开 Azure AD 授权页面
- [ ] 成功登录后回调获取 token
- [ ] 状态显示更新为"已登录"
- [ ] 使用 token 成功建立 DirectLine 连接
- [ ] 连接后可正常收发消息

## T4: 登出与过期

- [ ] 点击"登出"清除 token，状态变为"未登录"
- [ ] Token 过期后提示重新登录
- [ ] 重新登录后恢复正常

## T5: 安全验证

- [ ] Token 存储在 SecureStorage 中（加密）
- [ ] 浏览器 localStorage 中无明文 token
- [ ] PKCE code_verifier 不可被外部获取
- [ ] 登录 URL 包含 state 参数

## T6: 错误处理

- [ ] 填写错误的 Tenant ID / Client ID → 显示清晰错误
- [ ] 用户在登录页取消 → 状态保持"未登录"
- [ ] 网络错误 → 显示重试提示
