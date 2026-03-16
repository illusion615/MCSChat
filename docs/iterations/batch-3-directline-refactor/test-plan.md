# Batch 3: DirectLine 全量替换 — 验证记录

## 验证目标

确认新架构在“连接可用、消息可达、初始化可恢复、历史路径已清理”四个维度达标。

## 验证矩阵

| 编号 | 验证项 | 验证方式 | 结果 | 备注 |
|------|--------|----------|------|------|
| V1 | 单一实现生效 | 检查 directline 目录与导出入口 | 通过 | 目录仅保留 DirectLineService.js 与 index.js |
| V2 | 主应用已切换新事件模型 | 检查 application 初始化接线 | 通过 | 已接入 status/message/typing/greeting/error |
| V3 | 历史实现清理完成 | 检查旧组件导入引用 | 通过 | 旧 Manager/Connector/Queue/Renderer/Adapter 引用已移除 |
| V4 | 初始化可正常结束 | 手工验证 greeting 路径 | 通过 | greeting 到达可触发 app:init:complete |
| V5 | 初始化异常可恢复 | 检查 timeout/error 兜底路径 | 通过 | greetingTimeout + error + 15s safety timeout 均可释放 |
| V6 | 基础消息链路可用 | 手工发送/接收消息验证 | 通过 | 正常收发，typing 与完成消息均可处理 |

## 回归问题验证

| 问题 | 处理 | 结果 |
|------|------|------|
| 启动死循环（splash 不消失） | 增加事件桥接和兜底释放路径 | 已修复 |

## 结论

Batch 3 的关键目标已达到：架构完成收敛，核心消息链路可用，初始化流程具备异常恢复能力。

## 残余风险（非阻塞）

1. 暂未做长时压测（持续高频消息场景）。
2. 原生 streaming 协议能力仍待 Batch 8 调研。
