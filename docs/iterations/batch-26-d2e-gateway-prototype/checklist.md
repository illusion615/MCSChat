# Batch 26: D2E Delegated Gateway 原型验证 - 执行检查清单

## 0. 方案与审批

- [x] 0.1 验证 delegated New Agent `/3p` D2E streaming 可用
- [x] 0.2 验证 app-only S2S 被环境 Private Preview feature gate 阻止
- [x] 0.3 确认 S2S 不进入候选方案
- [x] 0.4 用户确认 delegated-only Gateway 架构
- [x] 0.5 用户批准代码与原型脚手架
- [x] 0.6 用户取消 Azure hosting，确认改为 local Router service

## 1. 文档先行

- [x] 1.1 requirements.md
- [x] 1.2 design.md
- [x] 1.3 checklist.md
- [x] 1.4 docs/iterations/TODO.md 增加 Batch 26

## 2. Gateway 后端

- [x] 2.1 创建隔离 `gateway/` Node.js 22 package
- [x] 2.2 配置验证与稳定错误模型
- [x] 2.3 `.env.local` secret provider 与 mode-600 文件边界
- [x] 2.4 AES-256-GCM cache envelope
- [x] 2.5 local atomic ETag cache plugin
- [x] 2.6 MSAL authorization-code 初始化
- [x] 2.7 `acquireTokenSilent` 与 `reauthRequired`
- [x] 2.8 opaque conversation store
- [x] 2.9 D2E endpoint 与 Activity SSE parser
- [x] 2.10 Activity reducer -> stage/answer/final/error
- [x] 2.11 外部 REST/SSE API
- [x] 2.12 CORS、限流、日志脱敏与 health/readiness

## 3. Router 验证页

- [x] 3.1 新建 `examples/d2e-router-streaming-test.html`
- [x] 3.2 使用 Clawpilot light/dark theme variables
- [x] 3.3 Router URL/API key 配置
- [x] 3.4 Work stages 与 answer snapshot 渲染
- [x] 3.5 TTFT/总耗时/事件计数
- [x] 3.6 raw downstream SSE 日志
- [x] 3.7 脱敏 JSON 导出
- [x] 3.8 桌面/移动端浏览器验证
- [x] 3.9 Connect 自动建会话并启用 composer
- [x] 3.10 同一 conversation 连续 turn 保留可见历史
- [x] 3.11 New conversation 清空历史与旧 turn evidence

## 4. 测试

- [x] 4.1 reducer fixture replay
- [x] 4.2 duplicate/out-of-order/final-only tests
- [x] 4.3 encryption round-trip/tamper tests
- [x] 4.4 cache ETag conflict tests
- [x] 4.5 conversation ownership/concurrency tests
- [x] 4.6 fake upstream SSE integration test
- [x] 4.7 syntax/lint/test command passes

## 5. Azure IaC（已退出实施主线）

- [x] 5.1 subscription-scope `infra/main.bicep`
- [x] 5.2 App Service Plan F1 + Node 22 Web App
- [x] 5.3 Storage Account + Blob container
- [x] 5.4 Key Vault RBAC
- [x] 5.5 Managed Identity role assignments
- [x] 5.6 SCM/FTP auth security settings
- [x] 5.7 no secret values in Bicep
- [x] 5.8 Bicep format/build/conformance
- [x] 5.9 IaC adversarial self-review

以上记录仅保留已经完成的探索证据；Azure hosting 已取消，不属于最终 Router 方案。现有资源和脚手架等待用户完成 local 验证后单独确认清理。

## 6. Local Router 真实验证

- [x] 6.1 Entra app localhost callback 与 delegated permission
- [x] 6.2 `.env.local` 与 `.local-state/` private file setup
- [x] 6.3 管理员一次性交互授权
- [x] 6.4 重启后 silent token recovery
- [x] 6.5 invalid API key 返回 401 且不进入 D2E
- [x] 6.6 CLI 真实 New Agent streaming turn
- [x] 6.7 loopback HttpOnly session 无 key 浏览器验证
- [x] 6.8 浏览器页面端到端 streaming/final 验证
- [x] 6.9 desktop/mobile 与 light/dark 视觉验证
- [x] 6.10 无 console error、URL/Web Storage 无 key、cookie 对 JS 不可见
- [x] 6.11 local-only 依赖回归：27 tests + syntax check

## 7. 结果与文档同步

- [x] 7.1 记录 localhost URL、时间与状态
- [x] 7.2 记录 events/chunks/TTFT/总耗时/final 一致性
- [x] 7.3 Study-Room 文章同步验证过程与结果
- [x] 7.4 README 用户入口更新
- [x] 7.5 TODO.md 添加/更新任务
- [x] 7.6 CHANGELOG.md `[Unreleased]` 追加
- [x] 7.7 docs/iterations/TODO.md 更新状态
- [ ] 7.8 用户确认原型结果
