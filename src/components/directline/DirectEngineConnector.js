/**
 * DirectEngineConnector
 * ---------------------------------------------------------------------------
 * Alternative connector for Copilot Studio agents using the **Direct-to-Engine
 * (D2E)** Power Platform API with **real Server-Sent-Events streaming**.
 *
 * It is a DROP-IN sibling of `DirectLineService`: it exposes the same
 * EventEmitter surface (`statusChange`, `message`, `messageChunk`,
 * `informative`, `streamCancelled`, `typing`, `greeting`, `connected`,
 * `disconnected`, `error`) and reuses the same `MessageEntry` model, so the
 * existing rendering pipeline in `application.js` works unchanged.
 *
 * Auth: interactive user login via MSAL.js (Public Client / SPA). No secret.
 * Scope: https://api.powerplatform.com/.default
 *
 * This connector is fully isolated — the classic DirectLine path
 * (`DirectLineService`) is untouched and remains the default.
 *
 * Version: 1.0.0
 */

import { MessageEntry } from './DirectLineService.js';

const CONNECTOR_VERSION = '1.0.0';
console.log(`🛰️ [DirectEngineConnector] v${CONNECTOR_VERSION} loaded`);

const POWER_PLATFORM_SCOPE = 'https://api.powerplatform.com/.default';
const API_VERSION = '2022-03-01-preview';

// ── Lightweight EventEmitter (mirrors DirectLineService) ──
class EventEmitter {
    constructor() { this._handlers = {}; }
    on(event, handler) { (this._handlers[event] ||= []).push(handler); }
    off(event, handler) {
        if (!this._handlers[event]) return;
        this._handlers[event] = this._handlers[event].filter(h => h !== handler);
    }
    emit(event, data) {
        if (!this._handlers[event]) return;
        for (const h of this._handlers[event]) {
            try { h(data); } catch (err) { console.error(`[DirectEngineConnector] '${event}' handler error:`, err); }
        }
    }
}

export class DirectEngineConnector extends EventEmitter {
    constructor() {
        super();
        this._status = 'disconnected';
        this._config = null;          // { appClientId, tenantId, environmentId, schemaName }
        this._msal = null;
        this._account = null;
        this._conversationId = null;
        this._entries = [];
        this._activeStreams = new Map(); // streamId → { entry, lastSequence }
        this._greetingReceived = false;
        this._initContext = null;
        this._nativeStreamingSupported = null;
    }

    // ── Public status ──
    getStatus() { return this._status; }
    getHistory() { return this._entries.filter(e => e.from?.id !== 'user'); }

    _setStatus(s) {
        if (this._status === s) return;
        this._status = s;
        this.emit('statusChange', s);
    }

    setInitContext(context) { this._initContext = context; }

    // ── URL construction (mirrors @microsoft/agents-copilotstudio-client, Prod) ──
    _environmentHost() {
        const id = this._config.environmentId.toLowerCase().replaceAll('-', '');
        const suffixLen = 2; // Prod / FirstRelease
        const hexPrefix = id.substring(0, id.length - suffixLen);
        const hexSuffix = id.substring(id.length - suffixLen);
        return `https://${hexPrefix}.${hexSuffix}.environment.api.powerplatform.com`;
    }
    _conversationsUrl(conversationId) {
        let path = `/copilotstudio/dataverse-backed/authenticated/bots/${this._config.schemaName}/conversations`;
        if (conversationId) path += `/${conversationId}`;
        return `${this._environmentHost()}${path}?api-version=${API_VERSION}`;
    }

    // ── Auth (MSAL interactive) ──
    async _ensureMsal() {
        if (this._msal) return this._msal;
        if (typeof msal === 'undefined') {
            throw new Error('MSAL library not loaded. Check the MSAL CDN script in index.html.');
        }
        this._msal = new msal.PublicClientApplication({
            auth: {
                clientId: this._config.appClientId,
                authority: `https://login.microsoftonline.com/${this._config.tenantId}`,
                redirectUri: window.location.origin,
            },
            cache: { cacheLocation: 'sessionStorage' },
        });
        await this._msal.initialize();
        // Reuse an existing signed-in account if present
        const accounts = this._msal.getAllAccounts();
        if (accounts.length > 0) this._account = accounts[0];
        return this._msal;
    }

    async _getToken() {
        const pca = await this._ensureMsal();
        const request = { scopes: [POWER_PLATFORM_SCOPE], account: this._account };
        try {
            const r = await pca.acquireTokenSilent(request);
            this._account = r.account;
            return r.accessToken;
        } catch (_) {
            const r = await pca.acquireTokenPopup({ scopes: [POWER_PLATFORM_SCOPE] });
            this._account = r.account;
            return r.accessToken;
        }
    }

    /**
     * Connect to a Copilot Studio agent via Direct-to-Engine.
     * @param {{appClientId:string, tenantId:string, environmentId:string, schemaName:string}} config
     * @returns {Promise<boolean>}
     */
    async connect(config) {
        if (!config?.appClientId || !config?.tenantId || !config?.environmentId || !config?.schemaName) {
            this.emit('error', new Error('Direct-to-Engine requires appClientId, tenantId, environmentId and schemaName.'));
            return false;
        }
        this.disconnect();
        this._config = { ...config };

        try {
            this._setStatus('connecting');
            // Trigger interactive login up-front so the user authenticates before greeting
            await this._getToken();

            const url = this._conversationsUrl();
            const body = { emitStartConversationEvent: true };
            if (this._initContext && Object.keys(this._initContext).length) {
                // D2E does not accept arbitrary context on start; carry it on first message instead.
            }
            const res = await this._post(url, body);
            this._setStatus('connected');
            this.emit('connected');
            // Consume the start SSE (greeting) in the background
            this._consumeSSE(res).catch(err => this.emit('error', this._friendlyError(err)));
            // Greeting timeout safety
            setTimeout(() => {
                if (!this._greetingReceived) this.emit('greetingTimeout');
            }, 5000);
            return true;
        } catch (err) {
            console.error('[DirectEngineConnector] Connection error:', err);
            this._setStatus('error');
            this.emit('error', this._friendlyError(err));
            return false;
        }
    }

    disconnect() {
        this._conversationId = null;
        this._entries = [];
        this._activeStreams.clear();
        this._greetingReceived = false;
        this._setStatus('disconnected');
    }

    async reconnect(config) {
        this.disconnect();
        return this.connect(config || this._config);
    }

    /**
     * Send a text message and stream the response.
     * @param {string} text
     * @returns {Promise<void>}
     */
    async sendMessage(text) {
        if (this._status !== 'connected') return Promise.reject(new Error('Not connected'));
        const activity = {
            type: 'message',
            text,
            from: { id: 'user' },
            conversation: this._conversationId ? { id: this._conversationId } : undefined,
        };
        if (this._initContext && Object.keys(this._initContext).length) {
            activity.channelData = { ...(activity.channelData || {}), ...this._initContext };
            this._initContext = null; // send once
        }
        const url = this._conversationsUrl(this._conversationId);
        const res = await this._post(url, { activity });
        await this._consumeSSE(res);
    }

    /**
     * Send an Adaptive Card submit response back to the agent.
     * Mirrors a Bot Framework card submit: a message activity whose `value`
     * carries the form data (and a JSON `text` fallback). Routed through the
     * same D2E turn endpoint + SSE consumption as a normal message.
     * @param {Object} value - The Adaptive Card submit data (action.data)
     * @returns {Promise<void>}
     */
    async sendCardResponse(value) {
        if (this._status !== 'connected') return Promise.reject(new Error('Not connected'));
        const activity = {
            type: 'message',
            from: { id: 'user' },
            value: value || {},
            text: '',
            conversation: this._conversationId ? { id: this._conversationId } : undefined,
        };
        const url = this._conversationsUrl(this._conversationId);
        const res = await this._post(url, { activity });
        await this._consumeSSE(res);
    }

    /** File upload is a DirectLine-only capability; not supported on D2E. */
    sendMessageWithFiles() {
        return Promise.reject(new Error('File upload is not supported on Direct-to-Engine connections.'));
    }

    // ── HTTP + SSE ──
    async _post(url, body) {
        const token = await this._getToken();
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${res.statusText} — ${txt.slice(0, 300)}`);
        }
        const cid = res.headers.get('x-ms-conversationid');
        if (cid) this._conversationId = cid;
        return res;
    }

    async _consumeSSE(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventName = '';
        let dataLines = [];
        let eventCount = 0;
        let activityCount = 0;
        let sawContent = false;   // any streaming chunk or final/message with text
        let sawInformative = false;
        console.log('🔌 [D2E SSE] stream opened');

        const dispatch = () => {
            if (!dataLines.length) { eventName = ''; return; }
            const dataStr = dataLines.join('\n');
            dataLines = [];
            const name = eventName; eventName = '';
            eventCount++;
            if (name === 'end' || dataStr === '[DONE]') return;
            let activity;
            try { activity = JSON.parse(dataStr); }
            catch (e) { console.warn('[D2E SSE] non-JSON data, skipped:', e?.message); return; }
            if (activity && activity.type) {
                activityCount++;
                // Track what kind of content we actually received, to diagnose
                // "stuck on informative" cases where the answer never streams.
                const si = this._getStreamInfo(activity);
                if (si.streamType === 'informative') sawInformative = true;
                if (si.streamType === 'streaming' || si.streamType === 'final'
                    || (activity.type === 'message' && activity.text)) sawContent = true;
                // Compact truth-revealing classifier: shows, for EVERY SSE activity,
                // whether it carries text and any livestreaming metadata. This is the
                // single line that tells real (incremental text) vs one-shot delivery.
                console.log(`🧾 [D2E SSE] #${activityCount} type=${activity.type} textLen=${activity.text?.length ?? 0} streamType=${si.streamType ?? '-'} seq=${si.streamSequence ?? '-'} chunkType=${si.chunkType ?? '-'}`);
                // Isolate per-activity errors so one bad activity never kills the
                // SSE read loop (which would drop all subsequent streaming chunks).
                try { this._handleActivity(activity); }
                catch (e) { console.error('[D2E SSE] _handleActivity threw (continuing):', e); }
            }
        };

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let idx;
                while ((idx = buffer.indexOf('\n')) >= 0) {
                    let line = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 1);
                    if (line.endsWith('\r')) line = line.slice(0, -1);
                    if (line === '') { dispatch(); continue; }
                    if (line.startsWith(':')) continue;
                    if (line.startsWith('event:')) eventName = line.slice(6).trim();
                    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
                }
            }
            dispatch();
            console.log(`🔌 [D2E SSE] stream closed — ${eventCount} events, ${activityCount} activities`);
            if (sawInformative && !sawContent) {
                console.warn('⚠️ [D2E SSE] Stream ended with ONLY informative/status messages and NO answer content (no streaming chunks, no final message). The agent did not stream a response — this is a server-side / agent behavior, not a client rendering issue.');
            }
        } catch (e) {
            console.error(`🔌 [D2E SSE] stream error after ${eventCount} events:`, e);
            throw e;
        }
    }

    // ── Stream metadata (mirrors DirectLineService._getStreamInfo) ──
    _getStreamInfo(activity) {
        const cd = activity.channelData || {};
        if (cd.streamType !== undefined || cd.streamId !== undefined || cd.streamSequence !== undefined) {
            return { streamType: cd.streamType, streamId: cd.streamId, streamSequence: cd.streamSequence, chunkType: cd.chunkType };
        }
        const e = Array.isArray(activity.entities) ? activity.entities.find(x => x && x.type === 'streaminfo') : null;
        if (e) return { streamType: e.streamType, streamId: e.streamId, streamSequence: e.streamSequence, chunkType: e.chunkType };
        return {};
    }

    // ── Activity handling (mirrors DirectLineService) ──
    _handleActivity(activity) {
        if (activity.from && activity.from.id === 'user') return;
        const stream = this._getStreamInfo(activity);

        const isStreamingChunk = stream.streamType === 'streaming'
            || stream.streamSequence !== undefined
            || (activity.type === 'typing' && activity.text);

        // Log every NON-chunk activity (informative / message / final / event).
        // Streaming chunks are intentionally not logged here — they would flood
        // the console; their content is shown once, readably, by the app layer.
        if (!isStreamingChunk) {
            console.log(`📡 [D2E Activity] type=${activity.type} id=${activity.id}`, {
                textLen: activity.text?.length,
                streamType: stream.streamType,
                streamId: stream.streamId,
            });
        }

        if (stream.streamType === 'informative') {
            this.emit('informative', { text: activity.text || '', streamId: stream.streamId, timestamp: activity.timestamp });
            return;
        }

        const isChunk = isStreamingChunk;
        if (isChunk) { this._handleStreamingChunk(activity, stream); return; }

        const isFinal = stream.streamType === 'final'
            || (stream.streamId && activity.type === 'message');
        if (isFinal && this._activeStreams.has(stream.streamId)) { this._finalizeStream(activity, stream); return; }

        if (activity.type === 'typing') { this.emit('typing'); return; }

        if (activity.type === 'message') {
            const entry = new MessageEntry(activity);
            if (!this._greetingReceived && entry.text && entry.text.trim().length > 0) {
                this._greetingReceived = true;
                entry.isGreeting = true;
                this.emit('greeting', entry);
            }
            this._entries.push(entry);
            entry.markComplete();
            this.emit('message', entry);
            return;
        }

        if (activity.type === 'conversationUpdate') { this.emit('conversationUpdate', activity); return; }
        if (activity.type === 'event') { this.emit('event', activity); return; }
    }

    _handleStreamingChunk(activity, stream) {
        stream = stream || this._getStreamInfo(activity);
        if (this._nativeStreamingSupported === null) {
            this._nativeStreamingSupported = true;
            console.log('🔥 [DirectEngineConnector] Native streaming active (D2E SSE)');
        }
        const streamId = stream.streamId || activity.replyToId || `stream-${Date.now()}`;
        const text = activity.text || '';
        const seq = stream.streamSequence;

        if (!this._activeStreams.has(streamId)) {
            const entry = new MessageEntry(activity);
            entry.id = activity.id || streamId;
            // Streamed deltas arrive on `typing` activities, but the entry is a real
            // bot MESSAGE being built incrementally. Force type='message' (and a bot
            // `from`) so the shared pipeline (handleCompleteMessage → shouldSkipActivity)
            // does NOT discard the finalized answer as an internal typing activity.
            entry.type = 'message';
            if (!entry.from || !entry.from.id) entry.from = activity.from || { id: 'bot' };
            entry.isComplete = false;
            entry.text = text;
            entry.metrics.firstTokenTime = Date.now();
            entry.meta.wasStreamed = true;
            this._activeStreams.set(streamId, { entry, lastSequence: seq });
            this._entries.push(entry);
            if (!this._greetingReceived && text.trim().length > 0) {
                this._greetingReceived = true;
                entry.isGreeting = true;
                this.emit('greeting', entry);
            }
            this.emit('messageChunk', entry);
        } else {
            const st = this._activeStreams.get(streamId);
            if (seq !== undefined && st.lastSequence !== undefined && seq <= st.lastSequence) return;
            if (seq !== undefined) st.lastSequence = seq;
            const acc = st.entry.text;
            if (!text) { /* contentless */ }
            else if (stream.chunkType === 'delta') st.entry.appendText(text);
            else if (text === acc) { /* dup */ }
            else if (text.startsWith(acc)) st.entry.appendText(text.substring(acc.length));
            else st.entry.appendText(text);
            this.emit('messageChunk', st.entry);
        }
    }

    _finalizeStream(activity, stream) {
        stream = stream || this._getStreamInfo(activity);
        const streamId = stream.streamId;
        const st = this._activeStreams.get(streamId);
        if (!st) return;

        const finalText = activity.text || '';
        const hasContent = finalText.trim().length > 0 || (activity.attachments && activity.attachments.length > 0);
        if (!hasContent) {
            this._activeStreams.delete(streamId);
            const idx = this._entries.indexOf(st.entry);
            if (idx >= 0) this._entries.splice(idx, 1);
            this.emit('streamCancelled', st.entry);
            return;
        }

        if (activity.text) st.entry.text = activity.text;
        if (activity.attachments?.length) st.entry.attachments = activity.attachments;
        if (activity.suggestedActions) st.entry.suggestedActions = activity.suggestedActions;
        // Defensive: ensure the finalized streamed entry is treated as a real message,
        // not the `typing` activity it was first built from (else it is skipped).
        st.entry.type = 'message';
        if (!st.entry.from || !st.entry.from.id) st.entry.from = activity.from || { id: 'bot' };
        st.entry.markComplete();
        this._activeStreams.delete(streamId);
        this.emit('message', st.entry);
    }

    _friendlyError(err) {
        const msg = String(err?.message || err);
        if (/S2SDirectEngineRequiresNoAuthentication/i.test(msg)) {
            return new Error('This agent requires authentication. Direct-to-Engine streaming currently targets anonymous agents. Set the agent to "No authentication" in Copilot Studio, or use the DirectLine connection type.');
        }
        if (/403|AccessDenied|D2EAccessDenied/i.test(msg)) {
            return new Error('Access denied. Your account may not have permission to invoke this agent, or the tenant does not match. ' + msg);
        }
        return err instanceof Error ? err : new Error(msg);
    }
}

// Singleton — mirrors the directLineService export pattern.
export const directEngineConnector = new DirectEngineConnector();
