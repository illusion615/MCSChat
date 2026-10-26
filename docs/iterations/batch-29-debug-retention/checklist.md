# 批次 29 — 执行清单

## 1. 配置

- [x] 1.1 `config.js` 新增 `retentionDays`（默认 30，env `RETENTION_DAYS`）
- [x] 1.2 `config.js` 新增 `debugCaptureEnabled`（默认 true，env `DEBUG_CAPTURE`）
- [x] 1.3 `.env.example` 补充两项说明

## 2. 归档存储层

- [x] 2.1 新增 `src/storage/evidenceArchive.js`
- [x] 2.2 `appendLine` / `readRange` / `purgeBefore` / `stats`
- [x] 2.3 目录权限 700、文件权限 600
- [x] 2.4 写入失败不抛出，仅告警

## 3. 日志持久化

- [x] 3.1 `LogStore` 接入 archive sink
- [x] 3.2 新增 `hydrate()`，启动时回填环形缓冲
- [x] 3.3 `query()` 超出内存范围时回退读归档
- [x] 3.4 确认脱敏在落盘前执行

## 4. 会话保留

- [x] 4.1 `#validate()` 过期不再删除记录
- [x] 4.2 `close()` / `forceClose()` 改为标记 `closed`
- [x] 4.3 `purgeExpired()` 替换为 `purgeBefore(cutoffMs)`
- [x] 4.4 `list()` 状态判定加入 `closed`
- [x] 4.5 `server.js` 清扫改为按保留期，PKCE 事务清扫保持不变

## 5. 调试轨迹

- [x] 5.1 新增 `src/observability/debugCapture.js`
- [x] 5.2 `stripCredentials()` —— 保留业务字段，剥离凭据
- [x] 5.3 接入 `/v1` 归约通道
- [x] 5.4 接入 verification 透传通道
- [x] 5.5 运行时开关，关闭时零开销

## 6. 管理 API

- [x] 6.1 `DELETE /admin/api/logs?before=`
- [x] 6.2 `DELETE /admin/api/conversations?before=`
- [x] 6.3 `GET /admin/api/conversations/:id/turns`
- [x] 6.4 `GET /admin/api/debug/:conversationId/:turnId`
- [x] 6.5 `GET` / `PATCH /admin/api/settings`
- [x] 6.6 `before` 缺省时拒绝（避免误删全部）

## 7. 控制台

- [x] 7.1 「证据存储」卡：条目数、占用、保留期
- [x] 7.2 调试捕获开关
- [x] 7.3 清理弹层（选时间点 + 二次确认）
- [x] 7.4 会话行展开轨迹清单并可下载
- [x] 7.5 中英双语

## 8. 测试

- [x] 8.1 归档 append / 读取 / 按时间点清理
- [x] 8.2 重启后日志仍可查询
- [x] 8.3 会话过期后记录仍在、且无法发新 turn
- [x] 8.4 `close()` 后记录标为 closed 而非消失
- [x] 8.5 轨迹包含全部帧且不含 token
- [x] 8.6 关闭捕获后不再产生文件
- [x] 8.7 清理端点缺 `before` 时返回 400

## 9. 实测

- [x] 9.1 真实跑一轮，下载轨迹核对帧数与页面一致
- [x] 9.2 重启 Router，确认日志与会话都还在
- [x] 9.3 控制台清理功能实测

## 10. 文档

- [x] 10.1 `gateway/README.md` 存储与保留期章节
- [x] 10.2 `gateway/QUICKSTART.md`
- [x] 10.3 `docs/GATEWAY_DOCS_INDEX.md`
- [x] 10.4 `CHANGELOG.md`
- [x] 10.5 `docs/iterations/TODO.md`
- [x] 10.6 Study-Room 文章：`status` 枚举恢复 `closed`、`DELETE` 语义改为标记关闭
