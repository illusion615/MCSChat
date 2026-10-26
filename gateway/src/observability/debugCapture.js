const CREDENTIAL_KEY_PATTERN = /(authorization|token|secret|password|cookie|credential|api[-_]?key|signing|client[-_]?assertion)/i;
const MAX_TRACE_BYTES = 262_144;

/**
 * Strips credentials while keeping business payloads.
 *
 * This is deliberately narrower than the log redactor: a turn trace exists so a
 * developer can see the Activity bodies and thought text that the reduced `/v1`
 * contract withholds, so only credential-bearing keys are removed.
 */
export function stripCredentials(value, depth = 0) {
    if (depth > 12 || value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(item => stripCredentials(item, depth + 1));
    if (typeof value !== 'object') return value;
    const result = {};
    for (const [key, item] of Object.entries(value)) {
        if (CREDENTIAL_KEY_PATTERN.test(key)) {
            result[key] = '[redacted]';
            continue;
        }
        result[key] = stripCredentials(item, depth + 1);
    }
    return result;
}

class TurnTrace {
    constructor(archive, relativePath, { now, conversationId, turnId }) {
        this.archive = archive;
        this.relativePath = relativePath;
        this.now = now;
        this.conversationId = conversationId;
        this.turnId = turnId;
        this.sequence = 0;
        this.frames = 0;
        this.bytes = 0;
        this.truncated = false;
        this.writeQueue = Promise.resolve();
    }

    #write(kind, payload) {
        if (this.truncated) return;
        this.sequence += 1;
        const line = {
            seq: this.sequence,
            at: new Date(this.now()).toISOString(),
            kind,
            ...stripCredentials(payload),
        };
        const size = JSON.stringify(line).length;
        if (this.bytes + size > MAX_TRACE_BYTES) {
            this.truncated = true;
            this.writeQueue = this.writeQueue.then(() => this.archive.appendLine(this.relativePath, {
                seq: this.sequence,
                at: line.at,
                kind: 'truncated',
                reason: 'trace exceeded the per-turn byte budget',
                budgetBytes: MAX_TRACE_BYTES,
            }));
            return;
        }
        this.bytes += size;
        this.writeQueue = this.writeQueue.then(() => this.archive.appendLine(this.relativePath, line));
    }

    start(details) {
        this.#write('turn.start', { conversationId: this.conversationId, turnId: this.turnId, ...details });
    }

    upstreamRequest(details) {
        this.#write('upstream.request', details);
    }

    frame(activity) {
        this.frames += 1;
        this.#write('upstream.activity', { index: this.frames, activity });
    }

    event(downstreamEvent) {
        this.#write('downstream.event', { event: downstreamEvent });
    }

    error(details) {
        this.#write('error', details);
    }

    finish(summary) {
        this.#write('turn.end', { frames: this.frames, truncated: this.truncated, ...summary });
    }

    flush() {
        return this.writeQueue;
    }
}

export class DebugCapture {
    constructor(archive, {
        enabled = true,
        prefix = 'debug',
        now = () => Date.now(),
        stateStore = null,
        settingsPath = 'settings/debug-capture.json',
    } = {}) {
        this.archive = archive;
        this.enabled = Boolean(enabled);
        this.prefix = prefix;
        this.now = now;
        this.stateStore = stateStore;
        this.settingsPath = settingsPath;
    }

    async initialize() {
        const entry = await this.stateStore?.readJson(this.settingsPath).catch(() => null);
        if (typeof entry?.value?.enabled === 'boolean') this.enabled = entry.value.enabled;
        return this.enabled;
    }

    async setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (this.stateStore) {
            const current = await this.stateStore.readJson(this.settingsPath).catch(() => null);
            await this.stateStore.writeJson(this.settingsPath, {
                enabled: this.enabled,
                updatedAt: new Date(this.now()).toISOString(),
            }, current ? { etag: current.etag } : undefined);
        }
        return this.enabled;
    }

    /** Returns null when capture is off so callers can use optional chaining at zero cost. */
    startTurn({ conversationId, turnId, channel }) {
        if (!this.enabled || !this.archive || !conversationId || !turnId) return null;
        const safeConversation = String(conversationId).replace(/[^0-9a-zA-Z-]/g, '');
        const safeTurn = String(turnId).replace(/[^0-9a-zA-Z-]/g, '').slice(0, 80);
        if (!safeConversation || !safeTurn) return null;
        const trace = new TurnTrace(
            this.archive,
            `${this.prefix}/${safeConversation}/${safeTurn}.ndjson`,
            { now: this.now, conversationId: safeConversation, turnId: safeTurn },
        );
        trace.start({ channel });
        return trace;
    }

    async listTurns(conversationId) {
        const safeConversation = String(conversationId).replace(/[^0-9a-zA-Z-]/g, '');
        if (!safeConversation || !this.archive) return [];
        return this.archive.listTurnFiles(`${this.prefix}/${safeConversation}`);
    }

    async readTurn(conversationId, turnId) {
        const safeConversation = String(conversationId).replace(/[^0-9a-zA-Z-]/g, '');
        const safeTurn = String(turnId).replace(/[^0-9a-zA-Z-]/g, '').slice(0, 80);
        if (!safeConversation || !safeTurn || !this.archive) return [];
        return this.archive.readLines(`${this.prefix}/${safeConversation}/${safeTurn}.ndjson`);
    }

    async dropConversation(conversationId) {
        const safeConversation = String(conversationId).replace(/[^0-9a-zA-Z-]/g, '');
        if (!safeConversation || !this.archive) return;
        await this.archive.removeTree(`${this.prefix}/${safeConversation}`);
    }

    stats() {
        return this.archive ? this.archive.treeStats(this.prefix) : Promise.resolve({ files: 0, bytes: 0 });
    }
}
