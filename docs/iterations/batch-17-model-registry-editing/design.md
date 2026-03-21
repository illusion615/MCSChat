# Batch 17: 模型注册可编辑与显示控制 — 设计方案

## 设计目标

以最小侵入方式补齐模型注册闭环，并将新显示控制纳入现有 Appearance 状态管理体系。

## 设计原则

1. 单表单复用: 模型新增与编辑共用同一表单和字段显隐逻辑。
2. 数据源单一: 已注册模型仍以 localStorage 数组为唯一注册表来源，API Key 继续放在 SecureStorage。
3. 状态显式: 表单当前处于 create 还是 edit，由 application.js 明确持有状态。
4. 显示控制即时生效: Appearance 开关改动后直接作用于 DOM 和页面 class，不要求刷新。

## 模型编辑方案

### 数据层

在 `aiCompanion.js` 中抽离模型注册构建逻辑：

- 统一生成 `id / provider / displayName / config`
- 统一处理 SecureStorage 中的 API Key 存储

新增接口：

- `getRegisteredModel(modelId)`
- `updateRegisteredModel(modelId, modelConfig)`

其中 `updateRegisteredModel()` 负责：

1. 读取旧记录。
2. 基于新配置生成新条目。
3. 若新旧 `id` 不同，则替换旧条目并检查目标 `id` 是否已被其他模型占用。
4. 若当前激活模型被编辑，则重新应用 provider 配置并刷新状态视图。

### 事件边界

AI Companion 不直接操作主应用表单，只负责在表格 Edit 按钮点击时派发自定义事件。

事件：

- `editRegisteredModel`

载荷：

- `modelId`

主应用收到事件后读取模型数据并回填表单。

### 表单状态

在 `application.js` 增加一个局部状态对象：

- `mode: 'create' | 'edit'`
- `editingModelId: string | null`

行为：

1. 默认 `create`
2. 点击 Add Model 进入 create
3. 点击 Edit 进入 edit
4. Close / Cancel / 保存成功后重置回 create

补充约束：

- 编辑模式保持原 provider，不支持在同一条记录上跨 provider 改配，避免空 API Key 复用到错误的 SecureStorage 命名空间。
- 若需要改成其他 provider，使用 Add Model 新注册或删除后重新注册。

### API Key 保留策略

编辑模式下如果 API Key 为空：

- 不覆写 SecureStorage 中现有 key
- 仅更新非敏感字段

这样避免用户每次改 Display Name 或 Base URL 都必须重复填 key。

## Appearance 显示控制方案

### 用户消息显示

新增 localStorage 键：

- `appearanceShowUserMessages`

默认值：`true`

实现方式：

1. 页面根节点切换 class，例如 `hide-user-messages`
2. CSS 隐藏用户消息容器
3. 对历史消息和新渲染消息均自动生效

### Metric 信息显示

新增 localStorage 键：

- `appearanceShowMetrics`

默认值：`true`

实现方式：

1. 页面根节点切换 class，例如 `hide-metrics`
2. 隐藏 Agent 消息 metric / meta 区域
3. 隐藏 AI Companion KPI section 与 KPI insights section
4. 保留对话主内容区，不留下明显空白容器

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 编辑后模型 ID 改变导致重复记录 | 在 update 时做冲突检测，阻止覆盖其他模型 |
| 当前激活模型被编辑后 header 状态不同步 | 保存成功后重走当前模型应用与 UI 刷新逻辑 |
| 隐藏用户消息后布局出现空白 | 通过 CSS 直接隐藏整条用户消息容器而非仅隐藏文本 |
| 隐藏 metrics 后 KPI 区留空 | 同时隐藏 KPI section 与 insights section |
