# Batch 2: 模块系统清理 — 设计方案

## 任务 A: CommonJS 移除

### 方案

直接删除每个文件中的 CommonJS 回退代码块。典型模式：

```javascript
// 删除这段代码
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassName;
}
```

保留文件中已有的 `export class` 或 `export default` 语句不变。

### 执行顺序

1. 逐文件定位 CommonJS 代码块
2. 删除代码块
3. 确认 ES Module `export` 语句完整
4. 保存并测试

## 任务 B: DirectLineConnector 去重

### 分析步骤

```bash
# 1. 确认哪个文件被实际引用
grep -rn "DirectLineConnector" src/ --include="*.js" | grep "import"

# 2. 比较两个文件的导出
grep -n "export" src/core/DirectLineConnector.js
grep -n "export" src/components/directline/DirectLineConnector.js

# 3. 确认 application.js 引用的是哪个
grep "DirectLineConnector" src/core/application.js
```

### 预期方案（待分析确认）

- 如果 `src/core/DirectLineConnector.js` 是遗留 monolithic 版本，且当前系统已迁移到三组件架构 → 删除 `src/core/` 版本
- 如果两者都在用 → 需要合并，将 `src/core/` 独有的功能迁移到三组件架构中

### 风险

| 风险 | 缓解 |
|------|------|
| 删除错误的实现导致连接断裂 | 删除前完整 grep 确认引用关系 |
| 两个文件有互补功能 | 先列出功能差异矩阵再决定 |
| 其他组件依赖特定实现的内部 API | 检查所有 `import` 路径 |
