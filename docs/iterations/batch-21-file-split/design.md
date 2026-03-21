# Batch 21: 技术债 Phase 2 — 巨型文件拆分 — 设计方案

## 拆分架构

```
src/ai/
├── aiCompanion.js          # 核心控制器 (~2,500 LOC)
├── autoQAEngine.js         # AutoQA 质检引擎 (~1,680 LOC)  ← NEW
├── kpiAnalyzer.js          # KPI 分析 + Insights (~1,760 LOC) ← NEW
├── thinkingSimulator.js    # Thinking 模拟系统 (~1,600 LOC)  ← NEW
├── modelRegistry.js        # 模型注册管理 (~410 LOC)         ← NEW
└── promptManager.js        # 提示词管理 (保持不变)
```

## 模块接口设计

### 1. AutoQAEngine (autoQAEngine.js)

```javascript
export class AutoQAEngine {
    constructor(companion) {
        this.companion = companion;
        // state: isRunning, isPaused, config, rounds, etc.
    }
    
    // Public API (called from AICompanion proxy methods)
    async startAutoQA(config) { ... }
    async stopAutoQA(reason) { ... }
    toggleAutoQAPause() { ... }
    showAutoQAConfigModal() { ... }
    getAutoQAStatus() { ... }
    
    // Test case persistence
    loadAutoQATestCases() { ... }
    saveAutoQATestCase(config) { ... }
    updateAutoQATestCase(id, updates) { ... }
    deleteAutoQATestCase(id) { ... }
    
    // Internal (uses companion._llmRequest, companion.renderMessage, etc.)
    _executeAutoQARound() { ... }
    _handleAutoQAAgentMessage(event) { ... }
    _evaluateAutoQARound(activity) { ... }
    _generateAutoQAReport(reason) { ... }
    _callAutoQALLM(prompt) { ... }
}
```

### 2. KPIAnalyzer (kpiAnalyzer.js)

```javascript
export class KPIAnalyzer {
    constructor(companion) {
        this.companion = companion;
        // state: kpiData, kpiOptimization, previousKpiData, etc.
    }
    
    // Public API
    async analyzeMessageForKPIs(messageData) { ... }
    updateKPIDisplay() { ... }
    resetKPIs() { ... }
    
    // Internal
    calculateFastKPIs(messageData, context) { ... }
    scheduleLLMAnalysis(messageData, context) { ... }
    async performLLMAnalysis(messageData, context) { ... }
    async generateAndDisplayKPIExplanation(results) { ... }
    buildKPIExplanationPrompt(results) { ... }
    showKPICalculatingIndicators() { ... }
    hideKPICalculatingIndicators() { ... }
    _setKPIInsightsStatus(state) { ... }
}
```

### 3. ThinkingSimulator (thinkingSimulator.js)

```javascript
export class ThinkingSimulator {
    constructor(companion) {
        this.companion = companion;
        // state: thinkingState, etc.
    }
    
    // Public API
    async startThinkingPreparation(userMessage) { ... }
    async displayThinkingSimulation(userMessage) { ... }
    async simulateThinkingProcess(userMessage) { ... }
    async continuousThinkingLoop() { ... }
    stopThinking() { ... }
    
    // Internal
    async generateThinkingPrompts(userMessage) { ... }
    async generateAIThinkingContent(userMessage) { ... }
    async streamThoughtInMainChat(div, text) { ... }
    async generateIntelligentThinkingConclusion(response, message) { ... }
}
```

### 4. ModelRegistry (modelRegistry.js)

```javascript
export class ModelRegistry {
    // No companion dependency — pure data layer
    
    loadRegisteredModels() { ... }
    getRegisteredModel(id) { ... }
    async registerModel(config) { ... }
    async updateRegisteredModel(id, config) { ... }
    deleteRegisteredModel(id) { ... }
    async testModelConnection(config) { ... }
    renderRegisteredModelsTable() { ... }
    
    // Token tracking
    formatTokenCount(count) { ... }
    resetSpecificModelTokens(id) { ... }
}
```

## AICompanion 代理方法

拆分后 AICompanion 上保留薄代理方法，保持外部接口不变：

```javascript
// 代理到 autoQA
startAutoQA(config) { return this.autoQAEngine.startAutoQA(config); }
stopAutoQA(reason) { return this.autoQAEngine.stopAutoQA(reason); }
showAutoQAConfigModal() { this.autoQAEngine.showAutoQAConfigModal(); }

// 代理到 kpiAnalyzer
analyzeMessageForKPIs(data) { return this.kpiAnalyzer.analyzeMessageForKPIs(data); }
updateKPIDisplay() { this.kpiAnalyzer.updateKPIDisplay(); }

// 代理到 thinkingSimulator
startThinkingPreparation(msg) { return this.thinkingSimulator.startThinkingPreparation(msg); }

// 代理到 modelRegistry
loadRegisteredModels() { return this.modelRegistry.loadRegisteredModels(); }
```

## 执行顺序

1. **AutoQA** — 最独立，最大块，风险最低
2. **ModelRegistry** — 纯数据层，无 UI 耦合
3. **KPIAnalyzer** — 有 DOM 操作但边界清晰
4. **ThinkingSimulator** — 最复杂耦合，最后处理

每个模块提取后立即测试，确认无回归再进行下一个。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/ai/aiCompanion.js` | 删除提取的代码，添加 import 和代理方法 |
| `src/ai/autoQAEngine.js` | 新建 |
| `src/ai/kpiAnalyzer.js` | 新建 |
| `src/ai/thinkingSimulator.js` | 新建 |
| `src/ai/modelRegistry.js` | 新建 |
