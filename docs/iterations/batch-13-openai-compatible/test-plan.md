# Batch 13: OpenAI Compatible 接口支持 — 测试计划

## T1: 配置 UI

- [ ] 供应方下拉框出现 "OpenAI Compatible" 选项
- [ ] 选中后显示专属配置区域
- [ ] 切换到其他供应方后配置区域正确隐藏
- [ ] 切换回来后已填配置保留

## T2: 测试连接

- [ ] 正确 Base URL + API Key 测试成功
- [ ] 错误 Base URL 显示网络错误提示
- [ ] 错误 API Key 显示认证错误提示
- [ ] 空字段提交显示验证提示

## T3: 对话功能

- [ ] 通过 OpenAI Compatible 接口可正常发送消息
- [ ] streaming 输出行为与 OpenAI 一致
- [ ] 非 streaming 响应也能正确显示

## T4: 持久化

- [ ] 刷新页面后配置保留
- [ ] API Key 加密存储（非明文）

## T5: 兼容性

- [ ] 切换到 OpenAI Compatible 后再切回 OpenAI，原有配置不受影响
- [ ] 切换到 Ollama/Azure/Anthropic 功能正常
- [ ] 不影响 Agent 聊天功能
