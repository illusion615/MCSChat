# Batch 3: DirectLine 全量替换 — 需求文档（完成回顾版）

## 文档定位

本文件记录 Batch 3 的真实目标、范围边界和完成定义，供后续设计回顾与长期维护快速对齐。

- 状态: 已完成
- 完成日期: 2026-03-15
- 关联目录: docs/iterations/batch-3-directline-refactor/

## 背景

历史 DirectLine 相关实现长期并存，存在职责交叉和行为不一致问题：

1. 同时存在多套 Manager/Connector/Adapter 方案，维护成本高。
2. 连接、消息、渲染、欢迎语触发等逻辑分散在不同文件，定位问题成本高。
3. 初始化流程对事件依赖隐式，重构后容易出现 splash 无法释放等回归风险。

## 本批次必须达成的结果

1. 建立单一权威 DirectLine 实现，替换所有历史并行实现。
2. 新实现必须 UI 无关，仅负责连接、活动处理、消息队列与事件发布。
3. 统一消息数据结构，支持后续流式渲染、TTS 与指标扩展。
4. 主应用仅通过显式事件接入，不再依赖旧组件私有状态。
5. 完成历史文件清理，避免“代码已删、文档仍引导使用旧模块”。
6. 确保初始化流程可恢复，避免 greeting 未到达时出现启动死循环。

## 范围边界

### In Scope

- 新建 DirectLineService 作为唯一 DirectLine 组件。
- 在 application 初始化流程中切换到 directLineService.on/off 事件接入。
- 删除历史 DirectLine Manager/Connector/Queue/Renderer/Adapter 相关实现。
- 补齐初始化阶段 greeting、超时、错误三类兜底路径。
- 更新迭代文档与变更日志，形成可回顾记录。

### Out of Scope

- 新增认证登录能力（Batch 7）。
- 原生 streaming 协议接入（Batch 8）。
- streaming 样式和速度配置（Batch 11）。
- Appearance 面板迁移（Batch 12）。

## 完成定义（Definition of Done）

满足以下条件才可视为 Batch 3 完成：

1. 代码层仅保留 DirectLineService 作为 DirectLine 核心实现。
2. application 已接入状态、消息、typing、greeting、错误事件。
3. 启动流程具备 greeting 到达、greeting 超时、连接异常三条释放通路。
4. 历史实现文件已清理，引用链路中无旧实现导入。
5. 批次文档已回填“需求-设计-执行-验证”闭环。

## 实际交付快照

1. 新增并接入 DirectLineService（含 MessageEntry 统一模型）。
2. application 完成事件接线和 document 事件桥接。
3. 已删除 12 个历史 DirectLine 相关实现文件。
4. 已修复初始化死循环，增加 15s 安全超时及错误兜底释放。
5. TODO/CHANGELOG 与本批次文档已同步到完成态。

## 结论

Batch 3 已从“多实现并存”切换为“单实现 + 显式事件边界”，并完成启动稳定性加固。后续所有 DirectLine 相关需求应基于 DirectLineService 演进，不再回到历史组件体系。
