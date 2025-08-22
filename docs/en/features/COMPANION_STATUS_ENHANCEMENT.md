# AI Companion Status Visibility Enhancement

## 问题描述
用户反馈：当用户没有设置AI Companion时，右上角的Companion Model状态标识仍然显示，影响用户体验。

## 解决方案
修改AI Companion状态显示逻辑，使其在未启用时完全隐藏状态指示器。

## 修改内容

### 1. 优化HTML结构 (`index.html`)
- 为Companion状态面板添加ID：`companionStatusPanel`
- 便于精确控制整个状态面板的显示/隐藏

```html
<!-- 之前 -->
<div class="panel-controls">
    <span id="llmStatus" class="status-indicator"></span>
    <span id="llmModelName" class="agent-name"></span>
</div>

<!-- 之后 -->
<div class="panel-controls" id="companionStatusPanel">
    <span id="llmStatus" class="status-indicator"></span>
    <span id="llmModelName" class="agent-name"></span>
</div>
```

### 2. 更新AI Companion元素引用 (`src/ai/aiCompanion.js`)
- 在`initializeElements()`中添加`companionStatusPanel`元素引用
- 提供对整个状态面板的直接访问

```javascript
this.elements = {
    // ... 其他元素
    companionStatusPanel: DOMUtils.getElementById('companionStatusPanel'),
    // ... 其他元素
};
```

### 3. 重构状态更新逻辑 (`src/ai/aiCompanion.js`)
- 完全重写`updateStatus()`方法
- 实现智能显示/隐藏逻辑

```javascript
updateStatus() {
    if (!this.elements.llmStatus) return;

    if (!this.isEnabled) {
        // 隐藏整个companion状态面板
        if (this.elements.companionStatusPanel) {
            this.elements.companionStatusPanel.style.display = 'none';
        } else {
            // 后备方案：隐藏单个元素
            this.elements.llmStatus.style.display = 'none';
            if (this.elements.llmModelName) {
                this.elements.llmModelName.style.display = 'none';
            }
        }
        return;
    }

    // AI Companion启用时显示状态面板
    if (this.elements.companionStatusPanel) {
        this.elements.companionStatusPanel.style.display = '';
    } else {
        // 后备方案：显示单个元素
        this.elements.llmStatus.style.display = '';
        if (this.elements.llmModelName) {
            this.elements.llmModelName.style.display = '';
        }
    }
    
    // 继续执行原有的状态更新逻辑...
}
```

## 触发时机
该更新逻辑在以下情况下会被调用：

1. **应用启动时**：`aiCompanion.initialize()` → `updateStatus()`
2. **设置更改时**：用户勾选/取消AI Companion复选框 → `enable()`/`disable()` → `updateStatus()`
3. **设置重载时**：`reloadSettings()` → `updateStatus()`
4. **面板显示时**：`togglePanel(true)` → `updateStatus()`

## 用户体验改进
- ✅ **未启用AI Companion时**：完全隐藏Companion Model状态，界面更简洁
- ✅ **启用AI Companion时**：正常显示状态和模型信息
- ✅ **实时响应**：设置更改立即生效，无需刷新页面
- ✅ **向下兼容**：包含后备逻辑，确保在各种情况下都能正常工作

## 测试覆盖
创建了专门的测试文件验证功能：
- `tests/features/test-companion-status.html` - 单元测试逻辑
- `tests/features/test-companion-main.html` - 集成测试

## 技术亮点
1. **优雅降级**：提供后备方案确保兼容性
2. **精确控制**：隐藏整个面板而非单个元素，视觉效果更佳
3. **最小侵入**：仅修改必要的代码，不影响其他功能
4. **即时响应**：设置更改立即反映在界面上
