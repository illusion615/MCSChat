# Batch 21: 技术债 Phase 2 — 巨型文件拆分 — 执行检查清单

## 执行前

- [x] 架构审查报告识别 aiCompanion.js 11,785 LOC 为 Critical
- [x] 内部分段扫描完成（12 个功能区域已定位行号范围）
- [ ] 设计方案用户确认

## 执行中

### Phase 1: 提取 AutoQA Engine（~1,680 LOC）

- [ ] 创建 src/ai/autoQAEngine.js
- [ ] 迁移 AutoQA 所有方法（startAutoQA → _escapeHtml、test case 持久化）
- [ ] 迁移 AUTOQA_PERSONALITIES / AUTOQA_DIMENSIONS / AUTOQA_EXIT_MODES 静态常量
- [ ] 在 AICompanion 构造函数中实例化 AutoQAEngine(this)
- [ ] 添加 AICompanion 代理方法
- [ ] 删除 aiCompanion.js 中已迁移代码
- [ ] 测试验证：AutoQA 配置弹窗、运行、停止、报告

### Phase 2: 提取 ModelRegistry（~410 LOC）

- [ ] 创建 src/ai/modelRegistry.js
- [ ] 迁移模型注册/编辑/删除/切换/测试/渲染方法
- [ ] 迁移 token 追踪相关方法
- [ ] 在 AICompanion 中实例化并添加代理
- [ ] 删除已迁移代码
- [ ] 测试验证：模型注册、编辑、切换、删除

### Phase 3: 提取 KPIAnalyzer（~1,760 LOC）

- [ ] 创建 src/ai/kpiAnalyzer.js
- [ ] 迁移 KPI 分析全链路（analyzeMessageForKPIs → _renderFallbackInsights）
- [ ] 迁移 KPI 数据结构（kpiData、kpiOptimization、previousKpiData）
- [ ] 迁移 KPI UI 方法（updateKPIDisplay、showKPICalculatingIndicators 等）
- [ ] 在 AICompanion 中实例化并添加代理
- [ ] 删除已迁移代码
- [ ] 测试验证：KPI 评分更新、Insights 面板、Status indicator

### Phase 4: 提取 ThinkingSimulator（~1,600 LOC）

- [ ] 创建 src/ai/thinkingSimulator.js
- [ ] 迁移 Thinking 模拟全链路
- [ ] 迁移 thinkingState 数据结构
- [ ] 在 AICompanion 中实例化并添加代理
- [ ] 删除已迁移代码
- [ ] 测试验证：Thinking 模拟、continuous thinking、结论生成

### Phase 5: 收尾

- [ ] 验证 aiCompanion.js 行数 ≤ 3,000
- [ ] 验证所有外部接口（window.aiCompanion.xxx）继续工作
- [ ] 全面回归测试
- [ ] CHANGELOG + TODO + 迭代文档同步

## 执行后

- [ ] 用户测试确认所有功能正常
- [ ] 确认 aiCompanion.js 最终行数
