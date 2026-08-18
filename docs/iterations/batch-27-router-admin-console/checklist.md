# Batch 27: Router 管理控制台 - 执行检查清单

## 0. 方案与审批

- [x] 0.1 用户提出管理界面需求（登录 / 日志 / 流量）
- [x] 0.2 汇报设计方案
- [x] 0.3 用户确认：中英双语、保留强制关闭、增加重启服务与导出日志
- [x] 0.4 确认前置 P0 修复并入本批次

## 1. 文档先行

- [x] 1.1 requirements.md
- [x] 1.2 design.md
- [x] 1.3 checklist.md
- [x] 1.4 docs/iterations/TODO.md 增加 Batch 27

## 2. 前置修复

- [x] 2.1 PRE-1 `generateSecrets.js` MSAL 密钥改 base64
- [x] 2.2 PRE-2 中间件重排（CORS / correlationId 前移）
- [x] 2.3 PRE-2 限流 429 统一错误信封，健康与 admin 路由独立桶
- [x] 2.4 PRE-2 correlationId 字符白名单
- [x] 2.5 PRE-2 JSON 404 兜底
- [x] 2.6 PRE-3 拆分 `LOCAL_ADMIN_API_KEY` 与签名密钥

## 3. 可观测性内核

- [x] 3.1 `observability/logStore.js` 环形缓冲与级别
- [x] 3.2 redactor 白名单与哈希前缀策略
- [x] 3.3 `subscribe()` 订阅推送与上限
- [x] 3.4 `observability/metrics.js` 计数器
- [x] 3.5 水塘采样分位数
- [x] 3.6 滚动时间桶（5 分钟 / 1 小时）

## 4. Runtime Lifecycle

- [x] 4.1 `runtime/lifecycle.js` 在途请求跟踪
- [x] 4.2 排空序列与 drain 广播
- [x] 4.3 SIGINT / SIGTERM 优雅关闭
- [x] 4.4 `scripts/routerSupervisor.js` 退出码 75 重启
- [x] 4.5 崩溃回退计数
- [x] 4.6 `package.json` 脚本调整

## 5. Admin API

- [x] 5.1 `POST/DELETE /admin/session`
- [x] 5.2 `authenticateAdmin` 接受 header 或 cookie
- [x] 5.3 `GET /admin/api/overview`
- [x] 5.4 `POST /admin/api/auth/start` 与 `/auth/reset`
- [x] 5.5 `delegatedIdentity.signOut()`
- [x] 5.6 `GET /admin/api/logs` 过滤
- [x] 5.7 `GET /admin/api/metrics`
- [x] 5.8 `GET /admin/api/conversations` 与 `conversationStore.list()`
- [x] 5.9 `DELETE /admin/api/conversations/:id`
- [x] 5.10 `POST /admin/api/restart`
- [x] 5.11 `GET /admin/api/stream` SSE
- [x] 5.12 三个导出端点

## 6. createApp 接入

- [x] 6.1 请求计时与在途跟踪中间件
- [x] 6.2 turn 生命周期埋点（TTFT / 结局 / 快照数）
- [x] 6.3 上游调用埋点
- [x] 6.4 `console` 替换为 RouterLogger
- [x] 6.5 挂载 admin 路由与独立限流桶

## 7. 控制台页面

- [x] 7.1 `gateway/public/admin.html` 骨架与 Clawpilot 主题
- [x] 7.2 双语词条表与 `data-i18n` 应用
- [x] 7.3 登录视图与 admin 会话交换
- [x] 7.4 概览与身份操作
- [x] 7.5 流量视图（计数卡 / 折线 / 表格 / 分位数）
- [x] 7.6 日志视图（SSE / 过滤 / 暂停 / 导出）
- [x] 7.7 会话视图与强制关闭
- [x] 7.8 重启交互与自动恢复探测
- [x] 7.9 light/dark 与移动端适配

## 8. 测试

- [x] 8.1 redactor 脱敏单测
- [x] 8.2 logStore 环形缓冲与订阅单测
- [x] 8.3 metrics 分位数与时间桶单测
- [x] 8.4 admin 认证（header / cookie / 过期 / 篡改）单测
- [x] 8.5 导出物不含敏感 material 断言
- [x] 8.6 lifecycle 排空与退出码单测
- [x] 8.7 中间件顺序回归（400/413/429 带 CORS 与 correlationId）
- [x] 8.8 既有 27 项测试全绿

## 9. 文档同步

- [x] 9.1 `gateway/README.md` 管理控制台章节与密钥更正
- [x] 9.2 `gateway/QUICKSTART.md` 更新
- [x] 9.3 `.env.example` 新增变量
- [x] 9.4 batch-26 `design.md` 模块边界表补两行
- [x] 9.5 `CHANGELOG.md` `[Unreleased]` 追加
- [x] 9.6 根 `TODO.md` 更新
- [x] 9.7 `docs/iterations/TODO.md` 更新状态

## 10. 实测

- [x] 10.1 启动服务并访问 `/admin`
- [x] 10.2 admin key 登录与登出
- [x] 10.3 触发一次业务 turn，日志链路可串联
- [x] 10.4 流量数据正确
- [x] 10.5 强制关闭会话
- [x] 10.6 重启并自动恢复
- [x] 10.7 三类导出下载
- [x] 10.8 中英切换覆盖全部文案
- [x] 10.9 light/dark 与移动端视觉
- [x] 10.10 无 console error
- [ ] 10.11 用户确认结果
