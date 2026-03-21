/**
 * ModelRegistry — Model registration, switching, token tracking, and performance testing.
 * Extracted from aiCompanion.js to reduce monolith size.
 */
import { DOMUtils } from '../utils/domUtils.js';
import { SecureStorage } from '../utils/secureStorage.js';
import { Utils } from '../utils/helpers.js';

export class ModelRegistry {
    /**
     * @param {Object} companion - AICompanion instance reference
     */
    constructor(companion) {
        this.companion = companion;
    }

    // ─── Helpers ─────────────────────────────────────────────

    /** Escape HTML for safe insertion */
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Token Tracking ──────────────────────────────────────

    loadModelTokens() {
        return Utils.safeParseLocalStorage('aiCompanion_modelTokens', {}, 'object');
    }

    saveModelTokens() {
        localStorage.setItem('aiCompanion_modelTokens', JSON.stringify(this.companion.tokenTracking.modelTokens));
    }

    loadConversationTokens(conversationId) {
        if (!conversationId) return;
        const stored = localStorage.getItem(`aiCompanion_conversationTokens_${conversationId}`);
        if (stored) {
            this.companion.tokenTracking.conversationTokens = parseInt(stored);
        } else {
            this.companion.tokenTracking.conversationTokens = 0;
        }
        this.companion.tokenTracking.currentConversationId = conversationId;
    }

    saveConversationTokens() {
        if (!this.companion.tokenTracking.currentConversationId) return;
        localStorage.setItem(
            `aiCompanion_conversationTokens_${this.companion.tokenTracking.currentConversationId}`,
            this.companion.tokenTracking.conversationTokens.toString()
        );
    }

    estimateTokenUsage(content, isInput = false) {
        if (!content) return;
        const estimatedTokens = Math.ceil(content.length / 4);
        const usage = isInput
            ? { prompt_tokens: estimatedTokens, completion_tokens: 0 }
            : { prompt_tokens: 0, completion_tokens: estimatedTokens };
        this.trackTokenUsage(usage);
    }

    trackTokenUsage(usage) {
        if (!usage) return;
        const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
        const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;

        this.companion.tokenTracking.conversationTokens += totalTokens;
        this.saveConversationTokens();

        const modelId = this.getCurrentModelId();
        if (!this.companion.tokenTracking.modelTokens[modelId]) {
            this.companion.tokenTracking.modelTokens[modelId] = { total: 0, input: 0, output: 0 };
        }
        this.companion.tokenTracking.modelTokens[modelId].total += totalTokens;
        this.companion.tokenTracking.modelTokens[modelId].input += inputTokens;
        this.companion.tokenTracking.modelTokens[modelId].output += outputTokens;
        this.saveModelTokens();

        this.updateTokenDisplays();

        console.log('[ModelRegistry] Token usage tracked:', {
            input: inputTokens, output: outputTokens, total: totalTokens,
            conversationTotal: this.companion.tokenTracking.conversationTokens,
            modelId, modelTotal: this.companion.tokenTracking.modelTokens[modelId].total
        });
    }

    updateTokenDisplays() {
        this.updateKPIConsumption();
        this.updateModelComparisonView();
    }

    formatTokenCount(count) {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    }

    updateKPIConsumption() {
        if (!this.companion.elements.kpiConsumption) return;
        const tokens = this.companion.tokenTracking.conversationTokens;
        this.companion.elements.kpiConsumption.textContent = this.formatTokenCount(tokens);

        const maxTokens = 10000;
        const percentage = Math.min((tokens / maxTokens) * 100, 100);
        if (this.companion.elements.kpiConsumptionBar) {
            this.companion.elements.kpiConsumptionBar.style.width = `${percentage}%`;
            let color = '#10b981';
            if (percentage > 75) color = '#ef4444';
            else if (percentage > 50) color = '#f59e0b';
            this.companion.elements.kpiConsumptionBar.style.background = color;
        }
    }

    // ─── Model Identification ────────────────────────────────

    getCurrentModelId() {
        const provider = this.companion.currentProvider;
        if (provider === 'ollama') {
            return `ollama_${localStorage.getItem('ollamaSelectedModel') || 'unknown'}`;
        } else if (provider === 'azure') {
            return `azure_${localStorage.getItem('azureDeployment') || 'unknown'}`;
        } else if (provider === 'openai-compatible') {
            return `compat_${localStorage.getItem('openaiCompatibleModel') || 'unknown'}`;
        }
        return provider || 'unknown';
    }

    getCurrentModelName() {
        const provider = this.companion.currentProvider;
        if (provider === 'ollama') {
            const m = localStorage.getItem('ollamaSelectedModel') || 'No Model Selected';
            return m !== 'No Model Selected' ? `Companion Model: ${m}` : 'No Model Selected';
        } else if (provider === 'azure') {
            const d = localStorage.getItem('azureDeployment');
            return d ? `Companion Model: Azure: ${d}` : 'Companion Model: Azure OpenAI';
        } else if (provider === 'openai') {
            return 'Companion Model: OpenAI GPT';
        } else if (provider === 'anthropic') {
            return 'Companion Model: Anthropic Claude';
        } else if (provider === 'openai-compatible') {
            const dn = localStorage.getItem('openaiCompatibleDisplayName');
            const mn = localStorage.getItem('openaiCompatibleModel');
            return `Companion Model: ${dn || mn || 'OpenAI Compatible'}`;
        }
        return 'Companion Model: Unknown Model';
    }

    getModelDisplayName(modelId) {
        if (modelId.startsWith('ollama_')) return modelId.substring(7);
        if (modelId.startsWith('azure_')) return modelId.substring(6);
        if (modelId.startsWith('compat_')) {
            return localStorage.getItem('openaiCompatibleDisplayName') || modelId.substring(7);
        }
        if (modelId === 'openai') return 'OpenAI GPT';
        if (modelId === 'anthropic') return 'Anthropic Claude';
        if (modelId === 'openai-compatible') {
            return localStorage.getItem('openaiCompatibleDisplayName')
                || localStorage.getItem('openaiCompatibleModel')
                || 'OpenAI Compatible';
        }
        return modelId;
    }

    getProviderFromModelId(modelId) {
        if (modelId.startsWith('ollama_')) return 'Ollama';
        if (modelId.startsWith('azure_')) return 'Azure';
        if (modelId.startsWith('compat_') || modelId === 'openai-compatible') return 'OpenAI Compatible';
        if (modelId === 'openai') return 'OpenAI';
        if (modelId === 'anthropic') return 'Anthropic';
        return 'Unknown';
    }

    async syncModelDropdownSelection() {
        if (this.companion.currentProvider !== 'ollama') return;
        const ollamaModelSelect = DOMUtils.getElementById('ollamaModelSelect');
        if (!ollamaModelSelect) return;

        const currentModel = localStorage.getItem('ollamaSelectedModel');
        if (!currentModel) return;

        const hasModels = ollamaModelSelect.options.length > 1 &&
            Array.from(ollamaModelSelect.options).some(o => o.value && o.value !== '');
        if (!hasModels && window.MCSChatApp?.refreshOllamaModels) {
            try {
                await window.MCSChatApp.refreshOllamaModels();
                setTimeout(() => this.syncModelDropdownSelection(), 500);
                return;
            } catch (e) {
                console.error('[ModelRegistry] Failed to refresh models:', e);
            }
        }

        if (Array.from(ollamaModelSelect.options).some(o => o.value === currentModel)) {
            ollamaModelSelect.value = currentModel;
        }
    }

    // ─── Registry CRUD ───────────────────────────────────────

    loadRegisteredModels() {
        return Utils.safeParseLocalStorage('aiCompanion_registeredModels', [], 'array');
    }

    _saveRegisteredModels(models) {
        localStorage.setItem('aiCompanion_registeredModels', JSON.stringify(models));
    }

    getRegisteredModel(modelId) {
        return this.loadRegisteredModels().find(m => m.id === modelId) || null;
    }

    _getRegisteredModelApiKeyStorageKey(provider) {
        switch (provider) {
            case 'openai-compatible': return 'openaiCompatibleApiKey';
            case 'openai': return 'openaiApiKey';
            case 'anthropic': return 'anthropicApiKey';
            case 'azure': return 'azureApiKey';
            default: return null;
        }
    }

    async _storeRegisteredModelApiKey(provider, apiKey) {
        const storageKey = this._getRegisteredModelApiKeyStorageKey(provider);
        if (storageKey && apiKey) await SecureStorage.store(storageKey, apiKey);
    }

    _buildRegisteredModelEntry(modelConfig, existingEntry = null) {
        const provider = modelConfig.provider;
        let modelId, displayName, config;

        switch (provider) {
            case 'openai-compatible':
                modelId = `compat_${modelConfig.model}`;
                displayName = modelConfig.displayName || modelConfig.model;
                config = { baseUrl: modelConfig.baseUrl, model: modelConfig.model, displayName: modelConfig.displayName || '' };
                break;
            case 'openai':
                modelId = 'openai'; displayName = 'OpenAI GPT'; config = {};
                break;
            case 'anthropic':
                modelId = 'anthropic'; displayName = 'Anthropic Claude'; config = {};
                break;
            case 'azure':
                modelId = `azure_${modelConfig.deployment}`;
                displayName = `Azure: ${modelConfig.deployment}`;
                config = { endpoint: modelConfig.endpoint, deployment: modelConfig.deployment, apiVersion: modelConfig.apiVersion || '2024-02-01' };
                break;
            case 'ollama':
                modelId = `ollama_${modelConfig.model}`;
                displayName = modelConfig.model;
                config = { url: modelConfig.url || 'http://localhost:11434', model: modelConfig.model };
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }

        const entry = { id: modelId, provider, displayName, config, registeredAt: existingEntry?.registeredAt || new Date().toISOString() };
        if (existingEntry) entry.updatedAt = new Date().toISOString();
        return entry;
    }

    async registerModel(modelConfig) {
        const models = this.loadRegisteredModels();
        const entry = this._buildRegisteredModelEntry(modelConfig);
        if (modelConfig.reasoningDisabled) entry.reasoningDisabled = true;

        const existingIdx = models.findIndex(m => m.id === entry.id);
        if (existingIdx >= 0) {
            if (models[existingIdx].testMetrics) entry.testMetrics = models[existingIdx].testMetrics;
            models[existingIdx] = entry;
        } else {
            models.push(entry);
        }

        await this._storeRegisteredModelApiKey(entry.provider, modelConfig.apiKey);
        this._saveRegisteredModels(models);
        console.log('[ModelRegistry] Model registered:', entry.id);
        this.renderRegisteredModelsTable();
        return entry;
    }

    async updateRegisteredModel(modelId, modelConfig) {
        const models = this.loadRegisteredModels();
        const existingIdx = models.findIndex(m => m.id === modelId);
        if (existingIdx < 0) throw new Error('Registered model not found.');

        const existingEntry = models[existingIdx];
        const updatedEntry = this._buildRegisteredModelEntry(modelConfig, existingEntry);
        const conflict = models.find((m, i) => i !== existingIdx && m.id === updatedEntry.id);
        if (conflict) throw new Error('Another registered model already uses this identifier.');

        updatedEntry.reasoningDisabled = modelConfig.reasoningDisabled === true;
        if (existingEntry.testMetrics) updatedEntry.testMetrics = existingEntry.testMetrics;

        models[existingIdx] = updatedEntry;
        await this._storeRegisteredModelApiKey(updatedEntry.provider, modelConfig.apiKey);
        this._saveRegisteredModels(models);

        if (this.getCurrentModelId() === modelId) {
            await this.switchToModel(updatedEntry.id);
        } else {
            this.renderRegisteredModelsTable();
        }
        console.log('[ModelRegistry] Model updated:', modelId, '->', updatedEntry.id);
        return updatedEntry;
    }

    deleteRegisteredModel(modelId) {
        const models = this.loadRegisteredModels().filter(m => m.id !== modelId);
        this._saveRegisteredModels(models);
        console.log('[ModelRegistry] Model deleted:', modelId);
        this.renderRegisteredModelsTable();
    }

    // ─── Model Switching ─────────────────────────────────────

    async switchToModel(modelId) {
        const models = this.loadRegisteredModels();
        const model = models.find(m => m.id === modelId);
        if (!model) { console.error('[ModelRegistry] Model not found:', modelId); return; }

        const { provider, config } = model;
        this.companion.currentProvider = provider;
        localStorage.setItem('selectedApiProvider', provider);

        switch (provider) {
            case 'openai-compatible':
                localStorage.setItem('openaiCompatibleBaseUrl', config.baseUrl || '');
                localStorage.setItem('openaiCompatibleModel', config.model || '');
                localStorage.setItem('openaiCompatibleDisplayName', config.displayName || '');
                break;
            case 'azure':
                localStorage.setItem('azureEndpoint', config.endpoint || '');
                localStorage.setItem('azureDeployment', config.deployment || '');
                localStorage.setItem('azureApiVersion', config.apiVersion || '2024-02-01');
                break;
            case 'ollama':
                localStorage.setItem('ollamaUrl', config.url || 'http://localhost:11434');
                localStorage.setItem('ollamaSelectedModel', config.model || '');
                break;
        }

        if (!this.companion.isEnabled) {
            this.companion.enable();
            const checkbox = document.getElementById('enableLLMCheckbox');
            if (checkbox) checkbox.checked = true;
        }

        this.companion.updateStatus();
        this.updateTokenDisplays();
        this.renderRegisteredModelsTable();
        console.log('[ModelRegistry] Switched to model:', modelId, '(provider:', provider, ')');
    }

    isReasoningDisabled() {
        const modelId = this.getCurrentModelId();
        const model = this.loadRegisteredModels().find(m => m.id === modelId);
        return model?.reasoningDisabled === true;
    }

    // ─── Model Testing ───────────────────────────────────────

    async testModelConnection(modelConfig) {
        const { provider } = modelConfig;
        const testPrompt = 'Write a brief one-sentence greeting.';

        try {
            let url, headers, bodyObj;

            if (provider === 'ollama') {
                url = `${modelConfig.url || 'http://localhost:11434'}/api/generate`;
                headers = { 'Content-Type': 'application/json' };
                const opts = { num_predict: 50 };
                if (modelConfig.reasoningDisabled) opts.think = false;
                bodyObj = { model: modelConfig.model, prompt: testPrompt, stream: true, options: opts };
            } else if (provider === 'azure') {
                const endpoint = modelConfig.endpoint;
                const deployment = modelConfig.deployment;
                const apiVersion = modelConfig.apiVersion || '2024-02-01';
                url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
                headers = { 'Content-Type': 'application/json', 'api-key': modelConfig.apiKey };
                bodyObj = { messages: [{ role: 'user', content: testPrompt }], max_tokens: 50, stream: true };
            } else if (provider === 'openai') {
                url = 'https://api.openai.com/v1/chat/completions';
                headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${modelConfig.apiKey}` };
                bodyObj = { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: testPrompt }], max_tokens: 50, stream: true };
            } else if (provider === 'anthropic') {
                url = 'https://api.anthropic.com/v1/messages';
                headers = { 'Content-Type': 'application/json', 'x-api-key': modelConfig.apiKey, 'anthropic-version': '2023-06-01' };
                bodyObj = { model: 'claude-3-haiku-20240307', messages: [{ role: 'user', content: testPrompt }], max_tokens: 50, stream: true };
            } else if (provider === 'openai-compatible') {
                const baseUrl = (modelConfig.baseUrl || '').replace(/\/+$/, '');
                url = baseUrl.endsWith('/chat/completions') ? baseUrl : baseUrl.replace(/\/v1\/?$/, '') + '/v1/chat/completions';
                headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${modelConfig.apiKey}` };
                bodyObj = { model: modelConfig.model, messages: [{ role: 'user', content: testPrompt }], max_tokens: 50, stream: true };
                if (modelConfig.reasoningDisabled) bodyObj.chat_template_kwargs = { enable_thinking: false };
            }

            const startTime = performance.now();
            const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyObj) });
            if (!response.ok) return { ok: false };

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let firstContentTokenTime = null;
            let tokenCount = 0;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;
                    const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        let hasContent = false;
                        if (provider === 'ollama') hasContent = !!parsed.response;
                        else if (provider === 'anthropic') hasContent = parsed.type === 'content_block_delta' && !!parsed.delta?.text;
                        else hasContent = !!parsed.choices?.[0]?.delta?.content;
                        if (hasContent) {
                            tokenCount++;
                            if (firstContentTokenTime === null) firstContentTokenTime = performance.now();
                        }
                    } catch { /* skip */ }
                }
            }

            const endTime = performance.now();
            const ttft = firstContentTokenTime ? Math.round(firstContentTokenTime - startTime) : null;
            const ttlt = Math.round(endTime - startTime);
            const genTime = firstContentTokenTime ? (endTime - firstContentTokenTime) / 1000 : ttlt / 1000;
            const tokensPerSec = genTime > 0 && tokenCount > 0 ? parseFloat((tokenCount / genTime).toFixed(1)) : 0;
            const metrics = { ttft, ttlt, tokensPerSec, outputTokens: tokenCount };
            console.log('[ModelRegistry] Model test metrics:', metrics);
            return { ok: true, metrics };
        } catch (error) {
            console.error('[ModelRegistry] Test connection failed:', error);
            return { ok: false };
        }
    }

    saveModelTestMetrics(modelId, metrics) {
        const models = this.loadRegisteredModels();
        const idx = models.findIndex(m => m.id === modelId);
        if (idx >= 0) {
            models[idx].testMetrics = { ...metrics, testedAt: new Date().toISOString() };
            this._saveRegisteredModels(models);
            this.renderRegisteredModelsTable();
        }
    }

    // ─── UI Rendering ────────────────────────────────────────

    renderRegisteredModelsTable() {
        const container = document.getElementById('registeredModelsTable');
        if (!container) return;

        const models = this.loadRegisteredModels();
        const currentModelId = this.getCurrentModelId();
        const modelTokens = this.companion.tokenTracking.modelTokens;

        if (models.length === 0) {
            const emptyText = window.i18n?.t('models.empty') || 'No models registered. Click \"+ Add Model\" to get started.';
            container.innerHTML = `<div class="reg-models-empty">${this._escapeHtml(emptyText)}</div>`;
            return;
        }

        const providerLabels = { 'openai-compatible': 'Compat', 'openai': 'OpenAI', 'anthropic': 'Anthropic', 'azure': 'Azure', 'ollama': 'Ollama' };

        const hModel = window.i18n?.t('models.model') || 'Model';
        const hProvider = window.i18n?.t('models.provider') || 'Provider';
        const hTokens = window.i18n?.t('models.tokens') || 'Tokens';
        const hPerf = window.i18n?.t('models.perf') || 'Perf';
        const hActions = window.i18n?.t('models.actions') || 'Actions';

        let html = `<div class="reg-models-header-row">
            <div class="reg-col-name">${hModel}</div><div class="reg-col-provider">${hProvider}</div>
            <div class="reg-col-tokens">${hTokens}</div><div class="reg-col-perf">${hPerf}</div>
            <div class="reg-col-actions">${hActions}</div></div>`;

        models.forEach(model => {
            const isCurrent = model.id === currentModelId;
            const tokens = modelTokens[model.id];
            const tokenCount = tokens ? this.formatTokenCount(tokens.total) : '0';
            const metrics = model.testMetrics;
            const reasoningDisabled = model.reasoningDisabled === true;

            let perfHtml;
            if (metrics) {
                const fmtMs = (ms) => {
                    if (ms == null) return '-';
                    if (ms >= 60000) return (ms / 60000).toFixed(1) + 'min';
                    if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
                    return ms + 'ms';
                };
                const ttftStr = fmtMs(metrics.ttft);
                const ttltStr = fmtMs(metrics.ttlt);
                const tpsStr = metrics.tokensPerSec > 0 ? `${metrics.tokensPerSec}` : '-';
                perfHtml = `<span class="reg-perf-metrics" title="TTFT: ${ttftStr} | TTLT: ${ttltStr} | Token/s: ${tpsStr}&#10;Tested: ${new Date(metrics.testedAt).toLocaleString()}">${ttftStr} · ${tpsStr}t/s</span>`;
            } else {
                perfHtml = '<span class="reg-perf-na">-</span>';
            }

            html += `<div class="reg-models-row ${isCurrent ? 'reg-current' : ''}">
                <div class="reg-col-name">${isCurrent ? '<span class="reg-current-badge">★</span>' : ''}${this._escapeHtml(model.displayName)}${reasoningDisabled ? '<span class="reg-noreason-badge" title="Reasoning disabled">⚡</span>' : ''}</div>
                <div class="reg-col-provider"><span class="reg-provider-tag">${providerLabels[model.provider] || model.provider}</span></div>
                <div class="reg-col-tokens">${tokenCount}</div>
                <div class="reg-col-perf">${perfHtml}</div>
                <div class="reg-col-actions">
                    <button class="reg-action-btn reg-switch-btn" data-model-id="${model.id}" title="Switch to this model" ${isCurrent ? 'disabled' : ''}>⚡</button>
                    <button class="reg-action-btn reg-edit-btn" data-model-id="${model.id}" title="Edit model">✎</button>
                    <button class="reg-action-btn reg-reset-btn" data-model-id="${model.id}" title="Reset token usage">↺</button>
                    <button class="reg-action-btn reg-delete-btn" data-model-id="${model.id}" title="Remove model">✕</button>
                </div></div>`;
        });

        container.innerHTML = html;

        container.querySelectorAll('.reg-switch-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchToModel(btn.dataset.modelId));
        });
        container.querySelectorAll('.reg-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('editRegisteredModel', { detail: { modelId: btn.dataset.modelId } }));
            });
        });
        container.querySelectorAll('.reg-reset-btn').forEach(btn => {
            btn.addEventListener('click', () => this.resetSpecificModelTokens(btn.dataset.modelId));
        });
        container.querySelectorAll('.reg-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Remove this model from registry?')) this.deleteRegisteredModel(btn.dataset.modelId);
            });
        });
    }

    updateModelComparisonView() {
        if (!this.companion.elements.modelComparisonTable) return;

        const currentModelId = this.getCurrentModelId();
        const modelTokens = this.companion.tokenTracking.modelTokens;
        const modelEntries = Object.entries(modelTokens);

        if (modelEntries.length === 0) {
            this.companion.elements.modelComparisonTable.innerHTML = '<div class="model-comparison-empty">No token usage data available yet.<br>Start using AI models to see comparison data here.</div>';
            return;
        }

        modelEntries.sort((a, b) => b[1].total - a[1].total);

        let html = '<div class="model-comparison-header-row"><div>Model Name</div><div>Total Tokens</div><div>Input Tokens</div><div>Output Tokens</div><div>Actions</div></div>';

        modelEntries.forEach(([modelId, tokens]) => {
            const displayName = this.getModelDisplayName(modelId);
            const isCurrent = modelId === currentModelId;
            const provider = this.getProviderFromModelId(modelId);

            html += `<div class="model-comparison-row ${isCurrent ? 'current-model' : ''}">
                <div class="model-name ${isCurrent ? 'current' : ''}">${displayName}<span class="provider-tag">${provider}</span>${isCurrent ? ' (current)' : ''}</div>
                <div class="token-stat total">${this.formatTokenCount(tokens.total)}</div>
                <div class="token-stat">${this.formatTokenCount(tokens.input)}</div>
                <div class="token-stat">${this.formatTokenCount(tokens.output)}</div>
                <div class="model-actions"><button type="button" class="model-action-btn reset-model-btn" onclick="aiCompanion.resetSpecificModelTokens('${modelId}')" title="Reset this model's tokens">Reset</button></div>
            </div>`;
        });

        this.companion.elements.modelComparisonTable.innerHTML = html;
    }

    // ─── Token & Model Maintenance ───────────────────────────

    resetModelTokens() {
        const modelId = this.getCurrentModelId();
        if (this.companion.tokenTracking.modelTokens[modelId]) {
            delete this.companion.tokenTracking.modelTokens[modelId];
            this.saveModelTokens();
            this.updateModelComparisonView();
            console.log(`[ModelRegistry] Reset token metrics for model: ${modelId}`);
        }
    }

    resetAllModelTokens() {
        if (confirm('Are you sure you want to reset token metrics for ALL models? This action cannot be undone.')) {
            this.companion.tokenTracking.modelTokens = {};
            this.saveModelTokens();
            this.updateModelComparisonView();
            console.log('[ModelRegistry] Reset token metrics for all models');
        }
    }

    resetSpecificModelTokens(modelId) {
        const displayName = this.getModelDisplayName(modelId);
        if (confirm(`Reset token metrics for "${displayName}"?`)) {
            delete this.companion.tokenTracking.modelTokens[modelId];
            this.saveModelTokens();
            this.updateModelComparisonView();
            console.log(`[ModelRegistry] Reset token metrics for model: ${modelId}`);
        }
    }

    resetModelFirstUseFlag() {
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        if (selectedModel) {
            localStorage.removeItem(`ollama_${selectedModel}_firstUse`);
            console.log(`[ModelRegistry] First-use flag reset for model: ${selectedModel}.`);
            return true;
        }
        return false;
    }

    getModelPerformanceState() {
        const selectedModel = localStorage.getItem('ollamaSelectedModel');
        if (!selectedModel) return { error: 'No model selected' };
        const hasBeenUsed = !!localStorage.getItem(`ollama_${selectedModel}_firstUse`);
        return {
            model: selectedModel,
            hasBeenUsed,
            nextInvocation: hasBeenUsed ? 'Standard response time expected' : 'First use - may take longer for model loading',
            notificationsEnabled: true,
            approachType: 'User-friendly notifications (no hard timeouts)'
        };
    }

    setConversationId(conversationId) {
        this.loadConversationTokens(conversationId);
        this.updateKPIConsumption();
    }
}
