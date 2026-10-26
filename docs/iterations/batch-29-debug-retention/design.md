# 批次 29 — 设计

## 核心决策：拆开生命周期与保留策略

```
会话功能生命周期        证据保留策略
---------------        ------------
expiresAt (60 min)     retentionDays (30 天)
决定能否发新 turn        决定记录何时消失
    |                       |
    v                       v
active / busy           文件是否存在
  -> expired
  -> closed
```

`expiresAt` 保持不变——上游 Copilot Studio 会话本身会失效，turn 锁语义也依赖它。变的是：**过期不再触发删除**。

## 存储布局

```
.local-state/
├── identity/                        # 不变
├── conversations/<id>.json          # 不再自动删除
├── logs/router-YYYY-MM-DD.ndjson    # 新增，按天轮转
└── debug/<conversationId>/<turnId>.ndjson   # 新增，逐轮轨迹
```

## 组件改动

### 新增 `src/storage/evidenceArchive.js`

统一管理落盘证据的写入、按天分文件、按时间点清理与容量统计。日志与调试轨迹共用同一套文件原语，避免两份轮转逻辑。

```
EvidenceArchive {
  appendLine(relativePath, object)   // 追加一行 NDJSON
  readRange(prefix, { from, to, limit })
  purgeBefore(prefix, cutoffMs)      // 返回删除的文件数与字节数
  stats(prefix)                      // { files, entries?, bytes, oldestAt, newestAt }
}
```

写入使用 append 模式，失败不阻断主流程（调试证据不得影响正常请求）。

### `src/observability/logStore.js`

- 构造参数新增 `archive`
- `append()` 在写入内存环形缓冲的同时追加到 `logs/router-<date>.ndjson`
- 新增 `hydrate()`：启动时从归档回填最近 N 条到环形缓冲，使重启后控制台仍有历史
- `query()` 优先走内存；请求范围早于内存最早一条时回退读归档

脱敏逻辑 `redactFields()` 在写入前执行，因此落盘内容天然不含 token。

### 新增 `src/observability/debugCapture.js`

```
DebugCapture {
  enabled                                   // 运行时可切换
  startTurn({ conversationId, turnId, ... })  -> TurnTrace | null
}

TurnTrace {
  upstreamRequest(shape)
  frame(rawActivity)        // 原始上游 Activity，逐帧
  event(downstreamEvent)    // 归约后发往客户端的事件
  error(details)
  finish({ outcome, timings })
}
```

与 `LogStore` 的脱敏口径**不同**：调试轨迹需要保留 Activity 正文与 thought，只剥离凭据类字段。因此使用独立的 `stripCredentials()`，白名单式保留业务字段、黑名单剥离 `authorization` / `token` / `secret` / `key` / `cookie`。

`enabled === false` 时 `startTurn()` 返回 `null`，调用方用可选链，零开销。

### `src/storage/conversationStore.js`

| 方法 | 改动 |
|------|------|
| `#validate()` | 过期时**不再** `remove()`，仅抛 `CONVERSATION_NOT_FOUND` |
| `close()` | 改为写入 `status: 'closed'`，不删除文件 |
| `forceClose()` | 同上（管理员强制关闭也保留证据） |
| `purgeExpired()` | 移除，由 `purgeBefore(cutoffMs)` 取代 |
| `purgeBefore(cutoffMs)` | 新增，按 `createdAt` 删除早于阈值的记录 |
| `list()` | 状态判定顺序：`closed` > `expired` > 存储值 |

`status` 枚举恢复 `closed`：`'active' | 'busy' | 'closed'`，`expired` 仍为读取时计算。

### `src/server.js`

- `STATE_SWEEP_INTERVAL_MS` 保留，但清扫内容改为：
  - 按 `retentionDays` 清理日志归档、调试轨迹、会话记录
  - PKCE 授权事务仍按原有短 TTL 清扫（安全要求，不适用保留期）
- 启动时调用 `logStore.hydrate()`

### `src/config.js`

```
retentionDays: 30            // RETENTION_DAYS
debugCaptureEnabled: true    // DEBUG_CAPTURE
```

`conversationTtlMinutes` 保持 60 不变。

## 管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| DELETE | `/admin/api/logs?before=<ISO>` | 删除早于该时刻的日志，返回 `{ removedFiles, removedBytes }` |
| DELETE | `/admin/api/conversations?before=<ISO>` | 删除早于该时刻的会话记录与其调试轨迹 |
| GET | `/admin/api/conversations/:id/turns` | 该会话已捕获的轨迹清单 |
| GET | `/admin/api/debug/:conversationId/:turnId` | 下载单轮轨迹（NDJSON） |
| GET | `/admin/api/settings` | 返回 `{ debugCapture, retentionDays, storage }` |
| PATCH | `/admin/api/settings` | 切换 `debugCapture` |

`before` 缺省不允许——必须显式传入，避免误删全部。

## 控制台

仪表盘新增一张「证据存储」卡：

- 日志 / 轨迹 / 会话各自的条目数与占用
- 保留期显示
- 调试捕获开关（切换后立即生效）
- 「清理」按钮 → 弹层选时间点 → 二次确认

会话列表每行新增「轨迹」入口，展开该会话已捕获的轮次并可逐个下载。

## 风险与对策

| 风险 | 对策 |
|------|------|
| 磁盘持续增长 | 30 天保留期 + 控制台显示占用 + 手工清理 |
| 调试轨迹含答案正文 | 仅 loopback 允许；README 与控制台明示；可关闭 |
| 落盘 I/O 拖慢请求 | append 异步执行，失败仅告警不抛出 |
| 归档文件被并发写坏 | 单进程 append-only，行级原子；不做跨进程共享 |

## 不做的事

- 不做日志检索索引（NDJSON 全扫足够本机规模）
- 不做归档压缩（30 天本机量级不必要）
- 不做跨实例一致性（本机原型明确单进程）
