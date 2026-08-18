import { createHash, randomUUID } from 'node:crypto';

import { GatewayError, StateConflictError } from '../errors.js';

const CONVERSATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LOCK_DURATION_MS = 210_000;
const MAX_RECENT_TURNS = 100;

export function hashSubject(subject) {
    return createHash('sha256').update(String(subject), 'utf8').digest('hex');
}

export class ConversationStore {
    constructor(stateStore, {
        ttlMinutes = 60,
        lockDurationMs = DEFAULT_LOCK_DURATION_MS,
        now = () => Date.now(),
    } = {}) {
        this.stateStore = stateStore;
        this.ttlMs = ttlMinutes * 60_000;
        this.lockDurationMs = lockDurationMs;
        this.now = now;
    }

    async create({ subject, agentId, upstreamConversationId }) {
        const createdAt = this.now();
        const id = randomUUID();
        const value = {
            id,
            subjectHash: hashSubject(subject),
            agentId,
            upstreamConversationId,
            status: 'active',
            recentTurnIds: [],
            createdAt: new Date(createdAt).toISOString(),
            updatedAt: new Date(createdAt).toISOString(),
            expiresAt: new Date(createdAt + this.ttlMs).toISOString(),
            version: 1,
        };
        await this.stateStore.writeJson(this.#path(id), value);
        return value;
    }

    async get(id, subject) {
        const entry = await this.#read(id);
        await this.#validate(entry, subject);
        return { ...entry.value };
    }

    async beginTurn(id, subject, clientTurnId) {
        const entry = await this.#read(id);
        await this.#validate(entry, subject);
        const now = this.now();
        if (entry.value.recentTurnIds.includes(clientTurnId)) {
            throw new GatewayError('DUPLICATE_TURN', 'clientTurnId was already accepted', {
                status: 409,
            });
        }
        if (entry.value.status === 'busy' && Date.parse(entry.value.lockExpiresAt) > now) {
            throw new GatewayError('CONVERSATION_BUSY', 'Conversation already has an active turn', {
                status: 409,
                retryable: true,
            });
        }

        const lockOwner = randomUUID();
        const recentTurnIds = [...entry.value.recentTurnIds, clientTurnId].slice(-MAX_RECENT_TURNS);
        const next = {
            ...entry.value,
            status: 'busy',
            lockOwner,
            lockExpiresAt: new Date(now + this.lockDurationMs).toISOString(),
            activeClientTurnId: clientTurnId,
            recentTurnIds,
            updatedAt: new Date(now).toISOString(),
            version: entry.value.version + 1,
        };
        try {
            await this.stateStore.writeJson(this.#path(id), next, { etag: entry.etag });
        } catch (error) {
            if (error instanceof StateConflictError) {
                throw new GatewayError('CONVERSATION_BUSY', 'Conversation state changed concurrently', {
                    status: 409,
                    retryable: true,
                    cause: error,
                });
            }
            throw error;
        }
        return { conversation: next, lockOwner };
    }

    async completeTurn(id, lockOwner, { forgetClientTurnId } = {}) {
        const entry = await this.#read(id);
        if (!entry || entry.value.lockOwner !== lockOwner) return false;
        const recentTurnIds = forgetClientTurnId
            ? entry.value.recentTurnIds.filter(turnId => turnId !== forgetClientTurnId)
            : entry.value.recentTurnIds;
        const next = {
            ...entry.value,
            status: 'active',
            lockOwner: undefined,
            lockExpiresAt: undefined,
            activeClientTurnId: undefined,
            recentTurnIds,
            updatedAt: new Date(this.now()).toISOString(),
            version: entry.value.version + 1,
        };
        await this.stateStore.writeJson(this.#path(id), next, { etag: entry.etag });
        return true;
    }

    async close(id, subject) {
        const entry = await this.#read(id);
        await this.#validate(entry, subject);
        await this.stateStore.remove(this.#path(id), { etag: entry.etag });
    }

    async #read(id) {
        if (!CONVERSATION_ID_PATTERN.test(String(id || ''))) {
            throw new GatewayError('CONVERSATION_NOT_FOUND', 'Conversation was not found', { status: 404 });
        }
        return this.stateStore.readJson(this.#path(id));
    }

    async #validate(entry, subject) {
        if (!entry || entry.value.subjectHash !== hashSubject(subject)) {
            throw new GatewayError('CONVERSATION_NOT_FOUND', 'Conversation was not found', { status: 404 });
        }
        if (Date.parse(entry.value.expiresAt) <= this.now()) {
            await this.stateStore.remove(this.#path(entry.value.id), { etag: entry.etag });
            throw new GatewayError('CONVERSATION_NOT_FOUND', 'Conversation was not found', { status: 404 });
        }
    }

    #path(id) {
        return `conversations/${id}.json`;
    }
}
