---
description: "新增功能的标准流程。先分析设计，确认后再实现，完成后同步文档。"
---

# 新功能开发流程

请实现以下功能：**{{feature_description}}**

## 第一步：现状分析

1. 扫描相关模块代码，理解当前架构
2. 确定新功能应归属的模块（core / managers / services / components / ui / ai / utils）
3. 检查是否有已存在的相关实现可以复用

**输出：** 分析结论和设计方案。等用户确认后再实现。

## 第二步：设计确认

1. 遵循单一职责——每个文件一个主导出
2. 使用事件驱动（`setCallback`）实现组件间通信
3. CSS 使用设计令牌，新样式放入对应的 `css/components/` 文件
4. 如需新 SVG 图标，添加到 svg-icon-manager

**设计要点：**
- 最小化变更范围，不做无关重构
- 保持与现有模式一致（ES Modules、单例导出、camelCase）
- 不引入 npm 依赖

## 第三步：实现

按确认的设计方案实现，实现完成后自查并请用户测试。

## 第四步：文档同步

- [ ] TODO.md 勾选/新增
- [ ] CHANGELOG.md 追加 Added 条目
- [ ] docs/ 更新（如涉及功能/架构文档）
- [ ] README.md 更新（如用户可见变更）
