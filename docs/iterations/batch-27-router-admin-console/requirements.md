# Batch 27: Router 管理控制台 - 需求

## 背景

Batch 26 交付的 D2E Local Router 目前没有任何可观测性基础设施：

- `createApp` 只接收 `logger = console`，全代码仅 2 处 `logger.error`，没有请求日志、没有 turn 生命周期日志
- 完全没有指标采集
- 身份状态只能通过 `GET /readyz` 得到一个 `state` 字符串
- 管理员登录必须手工 `curl -H "X-Admin-Key: ..."`，再把返回的 URL 手工粘进浏览器
- 会话状态只存在 `.local-state/conversations/*.json`，没有查询入口
- 重启服务必须回到终端 Ctrl+C 再手工拉起

用户需要一个可访问的界面来管理登录、查看日志与流量数据，并能重启服务、导出日志。

## 功能需求

### FR-1 管理员会话

- FR-1.1 控制台以 admin key 换取 HttpOnly 会话 cookie，key 只存在内存，不进入 localStorage / URL / 导出文件
- FR-1.2 会话作用域限定 `admin`，`Path=/admin`、`HttpOnly`、`SameSite=Strict`，TTL 60 分钟
- FR-1.3 `authenticateAdmin` 同时接受 `X-Admin-Key` 头与 admin 会话 cookie
- FR-1.4 支持主动登出并立即失效
- FR-1.5 admin API key 与会话签名密钥必须是两个独立 secret

### FR-2 登录与身份管理

- FR-2.1 展示委派身份状态：`ready` / `reauthRequired` / `disabled` / `error`
- FR-2.2 一键触发 Entra 授权并展示授权链接
- FR-2.3 支持清除 MSAL 缓存与账号状态以重新登录
- FR-2.4 展示账号元数据：tenant ID、object ID 前缀、最后更新时间
- FR-2.5 不得展示 UPN、access token、refresh token、client secret、MSAL 缓存内容

### FR-3 日志

- FR-3.1 服务端维护结构化日志环形缓冲
- FR-3.2 日志条目含 `seq` / `at` / `level` / `message` / `correlationId` / `route` / `code`
- FR-3.3 控制台通过 SSE 实时接收新日志
- FR-3.4 支持按级别、关键字、correlationId 过滤
- FR-3.5 支持暂停与继续实时流
- FR-3.6 日志经强制脱敏，不得含 token、secret、MSAL 缓存、UPN、上游真实 conversationId、答案正文

### FR-4 流量与指标

- FR-4.1 请求指标：总量、在途、按路由、按状态码段
- FR-4.2 认证指标：401 次数、管理员授权事件
- FR-4.3 上游 D2E 指标：建会话与 turn 调用次数、错误码分布、耗时 p50/p95
- FR-4.4 Turn 指标：TTFT、总时长、answer 快照数、stage 数、结局分布
- FR-4.5 会话指标：活跃数、创建数、关闭数
- FR-4.6 限流命中数
- FR-4.7 提供近 5 分钟与近 1 小时滚动时间桶供绘制曲线

### FR-5 会话管理

- FR-5.1 列出活跃会话：opaque ID 前 8 位、agentId、状态、创建时间、过期时间、turn 数
- FR-5.2 支持管理员强制关闭指定会话
- FR-5.3 不得展示上游真实 conversationId 与调用方主体原文

### FR-6 重启服务

- FR-6.1 控制台可发起服务重启，需二次确认
- FR-6.2 重启前排空在途 turn，默认宽限 10 秒，可配置
- FR-6.3 重启前向所有 SSE 订阅者发送终止帧
- FR-6.4 重启事件必须记入日志
- FR-6.5 重启后 admin 会话保持有效，页面自动探测恢复并刷新
- FR-6.6 提供不带监督者的直启方式供调试

### FR-7 导出

- FR-7.1 导出日志，支持 `json` / `ndjson` / `txt`，可沿用当前筛选条件
- FR-7.2 导出指标快照
- FR-7.3 导出诊断包：概览 + 指标 + 全量日志 + 脱敏配置摘要 + 运行时信息
- FR-7.4 所有导出物经同一脱敏层，不得含任何敏感material

### FR-8 界面

- FR-8.1 中英双语，可切换，沿用主应用 `data-i18n` 约定与 `appLanguage` 存储键
- FR-8.2 词条表内置于页面，不依赖浏览器应用的翻译包
- FR-8.3 复用 Clawpilot 主题变量，支持 light/dark 自动与手动切换
- FR-8.4 单文件、原生 JS、无构建步骤
- FR-8.5 桌面与移动端可用

## 非功能需求

- NFR-1 监听边界不变，仍只绑定 `127.0.0.1`
- NFR-2 日志与指标仅存内存，不落盘，避免新增 `.local-state` 无界增长
- NFR-3 admin 路由使用独立限流桶，不占用业务路由预算
- NFR-4 现有 27 项测试必须保持全绿
- NFR-5 控制台不引入任何 npm 前端依赖

## 前置修复（并入本批次）

控制台是浏览器客户端，会直接受下列既有缺陷影响，因此并入本批次：

- PRE-1 `generateSecrets.js` 输出 hex 而 `decodeEncryptionKey` 只接受 base64，按文档操作必然启动失败
- PRE-2 CORS 与 correlationId 中间件注册在 `express.json` 与 `rateLimit` 之后，导致 400/413/429 响应缺少 CORS 头与 correlationId
- PRE-3 admin API key 与会话签名密钥复用同一 secret

其余审查项（tool-call ID 泄漏、状态清扫、readyz 开销、dist 僵尸目录等）不在本批次范围，另排。

## 验收标准

- AC-1 浏览器访问 `/admin`，用 admin key 登录后可看到身份状态并完成一次 Entra 授权
- AC-2 发起一次业务 turn，控制台日志页实时出现该 turn 的完整链路且 correlationId 可串联
- AC-3 流量页正确反映请求量、TTFT 与上游调用
- AC-4 会话页可看到活跃会话并成功强制关闭
- AC-5 点击重启，服务在宽限期内排空并自动拉起，页面自动恢复
- AC-6 导出的三类文件均可下载，且断言不含敏感 material
- AC-7 中英切换覆盖全部可见文案
- AC-8 全量测试通过，无 console error
