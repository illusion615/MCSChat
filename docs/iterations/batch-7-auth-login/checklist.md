# Batch 7: 认证登录界面 — 执行检查清单

## 执行前

- [ ] Batch 6 已完成
- [ ] 通读需求和设计文档
- [ ] 研究 Copilot Studio 的认证接入方式和 DirectLine token API
- [ ] 理解现有 agentManager 的数据结构

## 执行中

### Phase 1: 数据层
- [ ] agentManager 新增 authType 和 authConfig 字段
- [ ] SecureStorage 适配 token 存取
- [ ] 确保向后兼容（现有 Agent 默认 authType='none'）

### Phase 2: AuthService 模块
- [ ] 创建 src/services/authService.js
- [ ] 实现 PKCE 生成（code_verifier / code_challenge）
- [ ] 实现弹出窗口登录流程
- [ ] 实现 token 获取（authorization_code → access_token）
- [ ] 实现 token 存储和过期检测
- [ ] 实现登出清理

### Phase 3: DirectLine 适配
- [ ] DirectLineService 支持 token 初始化
- [ ] application.js connectToAgent() 支持 token 模式

### Phase 4: UI
- [ ] index.html 添加认证配置表单
- [ ] Agent 管理面板：认证类型切换
- [ ] 登录状态显示
- [ ] 登录/登出按钮
- [ ] CSS 样式（使用设计令牌）

### Phase 5: 测试
- [ ] 运行测试计划 T1-T6

## 执行后

- [ ] CHANGELOG.md 追加 Added 条目
- [ ] TODO.md 更新
- [ ] 更新 docs/en/features/ 添加认证功能文档
- [ ] 更新 README.md（新功能）
- [ ] Git commit
- [ ] 更新 docs/iterations/TODO.md
