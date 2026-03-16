# Batch 1: 根目录清理 — 需求文档

## 目标

将根目录中不符合规范的文件移至 `docs/` 或删除，恢复根目录仅保留 `README.md`、`TODO.md`、`CHANGELOG.md`、`LICENSE` 及必要的配置/入口文件。

## 背景

项目规范明确规定：根目录禁止创建新的报告/摘要 .md 文件，文档一律放入 `docs/` 对应子目录。但当前根目录堆积了 79 个 .md 文件、21 个测试/调试 .html 文件和 5 个散落的调试 .js 文件，严重违反规范。

## 需清理文件清单

### .md 文件（79 个）— 移入 docs/ 对应子目录或删除

按主题分类归档目标：

| 类别 | 文件数 | 归档目标目录 |
|------|--------|-------------|
| DirectLine 相关 | 23 | `docs/en/architecture/directline/` 或 `docs/en/troubleshooting/` |
| Splash Screen 修复 | 6 | `docs/en/troubleshooting/` |
| Layout/UI 修复 | 7 | `docs/en/troubleshooting/` |
| 消息系统相关 | 4 | `docs/en/architecture/` |
| 语音系统相关 | 6 | `docs/en/features/` 或 `docs/en/troubleshooting/` |
| 认证相关 | 4 | `docs/en/troubleshooting/` |
| 版本追踪 | 3 | `docs/en/development/` |
| About Section | 3 | `docs/en/troubleshooting/` |
| WebChat 相关 | 5 | `docs/en/troubleshooting/` |
| 其他报告/摘要 | 18 | 按内容分别归档 |

**完整文件列表：**

```
ABOUT_SECTION_BUG_FIX.md
ABOUT_SECTION_IMPLEMENTATION_SUMMARY.md
ABOUT_SECTION_MOVED_TO_TOP.md
ADAPTIVE_CARD_ENHANCEMENT.md
ARCHITECTURE_DOCUMENTATION_INDEX.md
AUTHENTICATION_ERROR_RESOLUTION.md
CHAT_COMPONENT_ANALYSIS_REPORT.md
CODE_CLEANUP_SUMMARY.md
COPILOT_STUDIO_AUTH_GUIDE.md
COPILOT_STUDIO_IMPLEMENTATION_SUMMARY.md
COPILOT_STUDIO_LATEST_AUTH_GUIDE.md
CUSTOM_CHAT_INTERFACE_ARCHITECTURE_UPGRADE_REPORT.md
CUSTOM_CHAT_INTERFACE_README.md
CUSTOM_CHAT_INTERFACE_UPGRADE_COMPLETE_SUMMARY.md
CUSTOM_CHAT_LAYOUT_FIX_REPORT.md
DIRECTLINE_400_ERROR_FIX_REPORT.md
DIRECTLINE_ACTIVITY_ANALYSIS.md
DIRECTLINE_ACTIVITY_SCHEMA_ANALYSIS.md
DIRECTLINE_ADAPTER_REMOVAL_SUMMARY.md
DIRECTLINE_CDN_FIX_REPORT.md
DIRECTLINE_COMPONENT_ARCHITECTURE_DESIGN.md
DIRECTLINE_CONNECTION_ERROR_FIX_REPORT.md
DIRECTLINE_CONNECTOR_DESIGN_DOCUMENT.md
DIRECTLINE_CONNECTOR_FEASIBILITY_ANALYSIS.md
DIRECTLINE_CONNECTOR_IMPLEMENTATION_PLAN.md
DIRECTLINE_CONNECTOR_MIGRATION_ANALYSIS.md
DIRECTLINE_DIRECT_INTEGRATION_REPORT.md
DIRECTLINE_EXPORT_FIX_REPORT.md
DIRECTLINE_FILTERING_FIX.md
DIRECTLINE_INTEGRATION_UPGRADE_REPORT.md
DIRECTLINE_MODULE_MIGRATION_SUMMARY.md
DIRECTLINE_REFACTORED_ARCHITECTURE_QUICKSTART.md
DIRECTLINE_REFACTORING_COMPLETION_REPORT.md
DIRECTLINE_SECRET_VALIDATION_ENHANCEMENT_REPORT.md
DIRECTLINE_SEPARATION_OF_CONCERNS_ANALYSIS.md
DIRECTLINE_SEQUENCE_DIAGRAM_COMPARISON.md
DIRECTLINE_TEST_TOOLS_GUIDE.md
DIRECTLINE_WEBCHAT_DEPENDENCY_REMOVAL_REPORT.md
DIRECT_MODIFICATION_WORKLOAD_ANALYSIS.md
DUPLICATE_SPEECH_DIAGNOSTIC.md
DUPLICATE_SPEECH_DIRECTLINE_FIX.md
DUPLICATE_SPEECH_FIX_FINAL.md
ENHANCED_CHAT_WIDGET_DOCUMENTATION.md
GITHUB_PAGES_MIGRATION_SUMMARY.md
HOW_TO_CAPTURE_DIRECTLINE_DATA.md
LATEST_COPILOT_STUDIO_AUTH_SUMMARY.md
LAYOUT_FIX_CORRECTED_IMPLEMENTATION.md
LAYOUT_FIX_IMPLEMENTATION_SUMMARY.md
LAYOUT_FIX_STATUS.md
LAYOUT_ISSUES_ANALYSIS.md
MESSAGE_INTEGRATION_FIX_REPORT.md
MESSAGE_MIGRATION_ERROR_FIX.md
MESSAGE_MIGRATION_FIX_SUMMARY.md
MESSAGE_QUEUE_COMPARISON_ANALYSIS.md
MOVE_ABOUT_TO_TOP_FIX.md
QUICK_START_VERSION_TESTING.md
ROOT_CAUSE_ANALYSIS.md
SPEECH_QUEUE_IMPROVEMENTS.md
SPLASH_SCREEN_ANALYSIS_REPORT.md
SPLASH_SCREEN_EXPORT_FIX_REPORT.md
SPLASH_SCREEN_FINAL_FIX_REPORT.md
SPLASH_SCREEN_FIX_REPORT.md
SPLASH_SCREEN_IMPORT_FIX.md
SPLASH_SCREEN_TIMING_FIX.md
STARTUP_FIX_REPORT.md
TOPIC_SWITCHING_DUPLICATE_SPEECH_FIX.md
UI_LAYOUT_WEBCHAT_FIX_REPORT.md
UNIFIED_QUEUE_TESTING_GUIDE.md
URL_SPEECH_FIX_SUMMARY.md
VERSION_TRACKING.md
VERSION_TRACKING_IMPLEMENTATION_SUMMARY.md
VERSION_TRACKING_SYSTEM.md
VOICE_PLAYBACK_FIX_REPORT.md
WEBCHAT_DISAPPEARING_FIX_REPORT.md
WEBCHAT_QUICK_GUIDE.md
WEBCHAT_REALTIME_PREVIEW_GUIDE.md
WEBCHAT_STORE_FIX_REPORT.md
WEBCHAT_STYLING_FIX_REPORT.md
voice-display-improvement.md
voice-provider-ui-optimization.md
```

### .html 测试/调试文件（21 个，不含 index.html）— 移至 `utils/` 或删除

```
basic-migration-test.html
debug-event-flow.html
debug-settings-panel.html
diagnostic-startup.html
directline-connection-diagnosis.html
directline-connector-simple-demo.html
fix-authentication-error.html
fix-verification-test.html
force-startup-complete.html
migration-test.html
simple-speech-test.html
speech-diagnostic.html
startup-fix-test.html
test-about-section.html
test-adaptive-card-modal.html
test-custom-chat-fixed.html
test-custom-chat-interface-verification.html
test-custom-chat-interface.html
test-message-integration-detailed.html
url-speech-test.html
verify-runtime-fix.html
```

### .js 调试脚本（5 个）— 移至 `utils/` 或删除

```
improved-url-processing.js
test-actual-speech.js
test-url-pronunciation.js
unified-cleanTextForSpeech.js
update-first-url-processing.js
```

## 验收标准

1. 根目录 .md 文件仅剩：README.md、TODO.md、CHANGELOG.md、LICENSE
2. 根目录 .html 文件仅剩：index.html
3. 根目录 .js 文件仅剩：chat-server.js、ollama-proxy.js（服务脚本）
4. 所有移动的文件在新位置可访问
5. 无任何代码引用被破坏（grep 验证无断链）
6. TODO.md 中相关任务状态正确
