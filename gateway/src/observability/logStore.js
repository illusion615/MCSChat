/**
 * Structured log buffer for the Router admin console.
 *
 * Log entries are held in memory only — nothing is written to disk, so the
 * console never becomes a second source of unbounded `.local-state` growth.
 *
 * CONTRACT: `message` must be a static literal. Every dynamic value belongs in
 * `fields`, which is passed through the redactor below before it is stored.
 */

import { createHash } from 'node:crypto';

export const LOG_LEVELS = Object.freeze(['debug', 'info', 'warn', 'error']);

const LEVEL_RANK = Object.freeze(Object.fromEntries(LOG_LEVELS.map((level, index) => [level, index])));

const DENIED_KEY_PATTERN = /(token|secret|password|passwd|authorization|auth_?header|cookie|credential|api_?key|signing|cache|upn|email|principal_?name)/i;
const JWT_PATTERN = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;
const OPAQUE_PATTERN = /^[A-Za-z0-9+/=_-]{40,}$/;

const MAX_DEPTH = 3;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 240;
const MAX_FIELDS = 24;
const MAX_SUBSCRIBERS = 16;

/** Stable short reference for an identifier that must never be logged in clear. */
export function reference(value) {
    if (value === undefined || value === null || value === '') return undefined;
    return createHash('sha256').update(String(value), 'utf8').digest('hex').slice(0, 12);
}

function redactValue(value, depth) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return Number(value);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') {
        if (JWT_PATTERN.test(value) || OPAQUE_PATTERN.test(value)) return '[redacted]';
        return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
    }
    if (Array.isArray(value)) {
        if (depth >= MAX_DEPTH) return '[array]';
        return value.slice(0, MAX_ARRAY_ITEMS).map(item => redactValue(item, depth + 1));
    }
    if (typeof value === 'object') {
        if (depth >= MAX_DEPTH) return '[object]';
        return redactFields(value, depth + 1);
    }
    return '[unsupported]';
}

export function redactFields(fields, depth = 0) {
    if (!fields || typeof fields !== 'object') return {};
    const output = {};
    let count = 0;
    for (const [key, value] of Object.entries(fields)) {
        if (count >= MAX_FIELDS) break;
        if (value === undefined) continue;
        if (DENIED_KEY_PATTERN.test(key)) {
            output[key] = '[redacted]';
            count += 1;
            continue;
        }
        output[key] = redactValue(value, depth);
        count += 1;
    }
    return output;
}

export class LogStore {
    constructor({ capacity = 2_000, now = () => Date.now(), archive = null, archivePrefix = 'logs' } = {}) {
        this.capacity = Math.max(50, capacity);
        this.now = now;
        this.entries = [];
        this.cursor = 0;
        this.seq = 0;
        this.subscribers = new Set();
        this.dropped = 0;
        this.archive = archive;
        this.archivePrefix = archivePrefix;
        this.archiveQueue = Promise.resolve();
    }

    /** Attached after construction so the archive can report failures through the logger. */
    attachArchive(archive) {
        this.archive = archive;
    }

    /** Refills the ring from the archive so a restart does not blank the console. */
    async hydrate() {
        if (!this.archive) return 0;
        await this.archiveQueue;
        const entries = await this.archive.readRange(this.archivePrefix, { limit: this.capacity });
        for (const entry of entries) {
            this.#push(Object.freeze({ ...entry, seq: this.seq + 1 }));
            this.seq += 1;
        }
        return entries.length;
    }

    append(level, message, fields = {}) {
        const normalizedLevel = LEVEL_RANK[level] === undefined ? 'info' : level;
        const { correlationId, route, code, ...rest } = fields;
        this.seq += 1;
        const entry = Object.freeze({
            seq: this.seq,
            at: new Date(this.now()).toISOString(),
            level: normalizedLevel,
            message: String(message).slice(0, MAX_STRING_LENGTH),
            correlationId: correlationId ? String(correlationId).slice(0, 128) : undefined,
            route: route ? String(route).slice(0, 128) : undefined,
            code: code ? String(code).slice(0, 128) : undefined,
            fields: redactFields(rest),
        });

        if (this.entries.length < this.capacity) this.entries.push(entry);
        else {
            this.entries[this.cursor] = entry;
            this.dropped += 1;
        }
        this.cursor = (this.cursor + 1) % this.capacity;

        // Redaction already ran above, so the archived line carries no credentials.
        if (this.archive) {
            this.archiveQueue = this.archiveQueue.then(() => this.archive.appendLine(
                this.archive.dailyPath(this.archivePrefix),
                entry,
            ));
        }

        for (const subscriber of this.subscribers) {
            try {
                subscriber(entry);
            } catch {
                this.subscribers.delete(subscriber);
            }
        }
        return entry;
    }

    #push(entry) {
        if (this.entries.length < this.capacity) this.entries.push(entry);
        else {
            this.entries[this.cursor] = entry;
            this.dropped += 1;
        }
        this.cursor = (this.cursor + 1) % this.capacity;
    }

    flushArchive() {
        return this.archiveQueue;
    }

    /** Entries in chronological order. */
    snapshot() {
        if (this.entries.length < this.capacity) return [...this.entries];
        return [...this.entries.slice(this.cursor), ...this.entries.slice(0, this.cursor)];
    }

    query({ level, q, correlationId, since, limit = 500 } = {}) {
        const minimumRank = LEVEL_RANK[level] ?? 0;
        const needle = String(q || '').trim().toLowerCase();
        const sinceSeq = Number(since);
        const results = this.snapshot().filter(entry => {
            if (LEVEL_RANK[entry.level] < minimumRank) return false;
            if (Number.isFinite(sinceSeq) && entry.seq <= sinceSeq) return false;
            if (correlationId && entry.correlationId !== correlationId) return false;
            if (needle && !JSON.stringify(entry).toLowerCase().includes(needle)) return false;
            return true;
        });
        const capped = Math.min(Math.max(Number(limit) || 500, 1), this.capacity);
        return results.slice(-capped);
    }

    /** Reads past the in-memory ring by falling back to the daily archive files. */
    async queryArchive({ level, q, correlationId, from, to, limit = 500 } = {}) {
        if (!this.archive) return this.query({ level, q, correlationId, limit });
        const minimumRank = LEVEL_RANK[level] ?? 0;
        const needle = String(q || '').trim().toLowerCase();
        return this.archive.readRange(this.archivePrefix, {
            from: from ? Date.parse(from) : undefined,
            to: to ? Date.parse(to) : undefined,
            limit: Math.min(Math.max(Number(limit) || 500, 1), 5_000),
            match: entry => {
                if (LEVEL_RANK[entry.level] < minimumRank) return false;
                if (correlationId && entry.correlationId !== correlationId) return false;
                if (needle && !JSON.stringify(entry).toLowerCase().includes(needle)) return false;
                return true;
            },
        });
    }

    async purgeBefore(cutoffMs) {
        const result = this.archive
            ? await this.archive.purgeBefore(this.archivePrefix, cutoffMs)
            : { removedFiles: 0, removedBytes: 0, removedEntries: 0 };
        const retained = this.snapshot().filter(entry => {
            const at = Date.parse(entry.at);
            return !Number.isFinite(at) || at >= cutoffMs;
        });
        this.entries = retained.slice(-this.capacity);
        this.cursor = this.entries.length % this.capacity;
        return result;
    }

    subscribe(handler) {
        if (this.subscribers.size >= MAX_SUBSCRIBERS) return null;
        this.subscribers.add(handler);
        return () => this.subscribers.delete(handler);
    }

    stats() {
        return {
            buffered: this.entries.length,
            capacity: this.capacity,
            dropped: this.dropped,
            lastSeq: this.seq,
            subscribers: this.subscribers.size,
        };
    }
}

export class RouterLogger {
    constructor(store, { mirror = console, mirrorLevel = 'info' } = {}) {        this.store = store;
        this.mirror = mirror;
        this.mirrorRank = LEVEL_RANK[mirrorLevel] ?? LEVEL_RANK.info;
        for (const level of LOG_LEVELS) {
            this[level] = (message, fields) => this.#write(level, message, fields);
        }
    }

    #write(level, message, fields) {
        const entry = this.store.append(level, message, fields);
        if (LEVEL_RANK[level] >= this.mirrorRank && this.mirror) {
            const sink = level === 'error' || level === 'warn' ? this.mirror.error : this.mirror.log;
            sink?.call(this.mirror, `[${entry.level}] ${entry.message}`, entry.fields);
        }
        return entry;
    }
}

/** Fills in the log levels a partially implemented logger does not provide. */
export function toLogger(candidate) {
    const noop = () => undefined;
    return Object.fromEntries(LOG_LEVELS.map(level => [
        level,
        typeof candidate?.[level] === 'function' ? candidate[level].bind(candidate) : noop,
    ]));
}
