# Batch 21: 技术债 Phase 2 — 巨型文件拆分 — 需求文档

## 目标

将 `aiCompanion.js`（11,785 LOC）拆分为多个聚焦模块，每个模块不超过 3,000 LOC，提升可维护性和可测试性。

## 背景

架构审查报告显示 `aiCompanion.js` 承载了 8+ 个独立职责领域，远超单文件可维护阈值（~3,000 LOC）。当前分段分析：

| 功能区域 | 行号范围 | 行数 | 独立性 |
|----------|---------|------|--------|
| 核心控制器（构造/初始化/enable/disable/路由） | 1-1085 | ~1,085 | 核心，保留 |
| Thinking 模拟 | 1086-2700 | ~1,600 | 高，可独立 |
| Quick Actions + Benchmark | 2887-3448 | ~560 | 中，依赖 LLM |
| Unified LLM Infrastructure | 3453-3930 | ~480 | 高，纯基础设施 |
| Streaming 处理 | 3930-5022 | ~1,090 | 中，依赖 LLM |
| KPI 分析 | 5023-6475 | ~1,450 | 高，可独立 |
| 标题生成 | 6476-6800 | ~320 | 高，可独立 |
| Settings/UI 管理 | 6800-7648 | ~850 | 中，依赖核心状态 |
| Model Registry | 7648-8060 | ~410 | 高，可独立 |
| Speech 集成 | 8232-9500 | ~1,270 | 高，可独立 |
| KPI Insights 显示 | 9786-10100 | ~310 | 依赖 KPI |
| AutoQA Engine | 10102-11785 | ~1,680 | 高，可独立 |

## 拆分方案

### 保留在 AICompanion（核心控制器）：~2,500 LOC

- 构造函数、初始化、enable/disable
- 消息路由（handleQuickAction、sendToOllama 等调用入口）
- Streaming 处理（与 LLM Bridge 紧耦合，暂留）
- Settings/UI 管理（与核心状态绑定）
- 标题生成（小模块，暂留不值得独立文件）

### 提取为独立模块

| 新模块 | 文件名 | 来源行号 | 预估行数 | 耦合接口 |
|--------|--------|---------|---------|---------|
| AutoQA 引擎 | `autoQAEngine.js` | 10102-11785 | ~1,680 | 通过 companion 实例注入 |
| KPI 分析器 | `kpiAnalyzer.js` | 5023-6475 + 9786-10100 | ~1,760 | 通过 companion 实例注入 |
| Thinking 模拟 | `thinkingSimulator.js` | 1086-2700 | ~1,600 | 通过 companion 实例注入 |
| 模型注册表 | `modelRegistry.js` | 7648-8060 | ~410 | 纯数据层，独立 |

## 耦合策略

采用**委托模式 + 实例注入**：

```javascript
// autoQAEngine.js
export class AutoQAEngine {
    constructor(companion) {
        this.companion = companion; // access renderMessage, _llmRequest, etc.
    }
    // ... all AutoQA methods
}

// aiCompanion.js (after split)
import { AutoQAEngine } from './autoQAEngine.js';
class AICompanion {
    constructor() {
        this.autoQA = new AutoQAEngine(this);
        this.kpiAnalyzer = new KPIAnalyzer(this);
        // ...
    }
}
```

外部代码调用接口不变（`window.aiCompanion.startAutoQA()` 等继续工作），通过在 AICompanion 上保留薄代理方法实现向后兼容。

## 非功能需求

- 浏览器原生 ES Modules，无 bundler
- 所有外部调用接口保持不变
- `window.aiCompanion` 全局引用继续工作
- 拆分后 aiCompanion.js 目标 ≤ 3,000 LOC

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 循环依赖（子模块回调核心） | 用构造函数注入 companion 实例，不反向 import |
| 外部代码依赖 window.aiCompanion.xxx | 在核心保留薄代理方法，委托给子模块 |
| 拆分过程中功能回归 | 每提取一个模块立即测试，逐步推进 |
| 子模块之间互相依赖 | KPI Insights 依赖 KPI Analyzer — 合并到同一模块 |
