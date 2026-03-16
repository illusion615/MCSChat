# Batch 3: DirectLine 全量替换 — 设计文档（完成回顾版）

## 设计目标

在不保留向下兼容包袱的前提下，将 DirectLine 路径收敛为一个可维护、可扩展、可验证的单实现。

## 设计原则

1. 单一事实来源: DirectLine 仅保留一个权威实现。
2. UI 解耦: 连接与活动处理不直接依赖 DOM 或具体组件。
3. 统一数据模型: 消息生命周期统一落在 MessageEntry。
4. 事件边界清晰: 业务层通过 on/off 接口订阅，不穿透内部状态。
5. 启动可恢复: greeting 未返回、连接错误、初始化异常均可释放启动流程。

## 最终落地架构

### 核心组件

- DirectLineService
    - 连接管理: connect / disconnect / reconnect
    - 活动处理: message / typing / conversationUpdate / event
    - 状态发布: statusChange / connected / disconnected / error
- MessageEntry
    - 统一消息身份、内容、渲染状态、TTS 状态、性能指标、扩展字段
- EventEmitter（内部）
    - 统一事件注册与分发，降低跨模块耦合

### 对 application 的集成方式

application 在 initializeManagers() 中统一注册 directLineService 事件：

1. statusChange -> 连接状态 UI 更新
2. message -> 完整消息处理
3. typing -> 进度指示逻辑
4. greeting / greetingTimeout -> 初始化流程解锁
5. error -> 错误提示 + 启动兜底释放

## 初始化稳定性设计

为避免 splash 卡死，采用三层释放策略：

1. 正常路径: greeting 到达后触发 app:init:complete。
2. 超时路径: greetingTimeout 触发后释放初始化。
3. 异常路径: DirectLine 连接错误时强制释放初始化。

此外增加 15 秒安全超时，防止任何未预期路径导致启动流程悬挂。

## 历史实现清理策略

本批次采用“彻底替换”策略，移除历史 Manager/Connector/Queue/Renderer/Adapter/Diagnostics 等并行实现，避免后续维护出现多路径并存。

## 设计结果与影响

### 直接收益

1. DirectLine 行为集中，问题定位路径显著缩短。
2. 后续 streaming/TTS/指标扩展可以基于 MessageEntry 持续演进。
3. application 与通信层边界明确，减少隐藏依赖。

### 当前限制（留待后续批次）

1. 原生 streaming 协议能力待 Batch 8 调研确认。
2. streaming 样式与速度配置待 Batch 11 实施。
3. token 认证接入待 Batch 7 实施。

## 结论

Batch 3 已完成从“多组件历史演进结构”到“单实现 + 显式事件边界”的架构切换，并完成初始化稳定性闭环。后续相关功能设计应统一围绕 DirectLineService 展开。
