# Batch 3: DirectLine 全量替换 — 执行检查清单（完成记录）

## 执行前

- [x] Batch 2 已完成（模块系统清理与引用去重已完成）
- [x] 完成旧实现盘点与引用链路确认
- [x] 与用户确认采用“无向下兼容、彻底替换”策略
- [x] 完成替换范围和风险点确认

## 执行中

### Phase 1: 新架构落地

- [x] 新建 DirectLineService（单一通信组件）
- [x] 引入 MessageEntry 统一消息模型
- [x] 统一 on/off 事件接口及内部事件分发

### Phase 2: 应用集成切换

- [x] application 切换到 directLineService 事件接线
- [x] 替换历史 DirectLineManager/Connector 相关集成点
- [x] 完成 greeting、typing、message、status、error 事件联动

### Phase 3: 历史实现清理

- [x] 删除历史 Manager/Connector/Queue/Renderer/Adapter/Diagnostics 文件
- [x] 清理遗留引用，确保无旧实现导入链路
- [x] 更新 directline 组件导出入口

### Phase 4: 启动稳定性修复

- [x] 修复初始化阶段 splash 卡死问题
- [x] 增加 greeting 超时释放路径
- [x] 增加错误路径释放与 15 秒安全超时兜底

## 执行后

- [x] 完成核心链路验证（连接、消息、typing、greeting、初始化释放）
- [x] CHANGELOG 已追加重构与修复条目
- [x] docs/iterations/TODO 已更新 Batch 3 完成态
- [x] Batch 3 需求/设计/检查/验证文档已回填为回顾版

## 非阻塞后续项

1. 原生 streaming 能力调研与接入（Batch 8）。
2. streaming 样式与速度可配置化（Batch 11）。
3. token 认证链路（Batch 7）。
