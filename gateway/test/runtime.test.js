import assert from 'node:assert/strict';
import test from 'node:test';

import { D2EClient } from '../src/d2e/d2eClient.js';
import { GatewayError, StateConflictError } from '../src/errors.js';
import { ConversationStore } from '../src/storage/conversationStore.js';

class MemoryStateStore {
    constructor() {
        this.entries = new Map();
        this.version = 0;
    }

    async readJson(path) {
        const entry = this.entries.get(path);
        return entry ? { value: structuredClone(entry.value), etag: entry.etag } : null;
    }

    async writeJson(path, value, { etag } = {}) {
        const current = this.entries.get(path);
        if ((current && current.etag !== etag) || (!current && etag)) throw new StateConflictError();
        const next = { value: structuredClone(value), etag: `etag-${++this.version}` };
        this.entries.set(path, next);
        return { etag: next.etag };
    }

    async remove(path, { etag } = {}) {
        const current = this.entries.get(path);
        if (current && etag && current.etag !== etag) throw new StateConflictError();
        this.entries.delete(path);
    }
}

function sseResponse(frames, conversationId = 'upstream-1') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(frames));
            controller.close();
        },
    });
    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'x-ms-conversationid': conversationId,
        },
    });
}

test('conversation store binds subject, serializes turns, and rejects duplicate clientTurnId', async () => {
    const stateStore = new MemoryStateStore();
    const store = new ConversationStore(stateStore);
    const conversation = await store.create({
        subject: 'caller-a',
        agentId: 'knowledge-new',
        upstreamConversationId: 'upstream-1',
    });

    await assert.rejects(() => store.get(conversation.id, 'caller-b'), error => {
        assert.equal(error.code, 'CONVERSATION_NOT_FOUND');
        return true;
    });
    const lease = await store.beginTurn(conversation.id, 'caller-a', 'turn-1');
    await assert.rejects(() => store.beginTurn(conversation.id, 'caller-a', 'turn-2'), error => {
        assert.equal(error.code, 'CONVERSATION_BUSY');
        return true;
    });
    await store.completeTurn(conversation.id, lease.lockOwner);
    await assert.rejects(() => store.beginTurn(conversation.id, 'caller-a', 'turn-1'), error => {
        assert.equal(error.code, 'DUPLICATE_TURN');
        return true;
    });
});

test('conversation store allows the same turn ID after a confirmed pre-send identity failure', async () => {
    const stateStore = new MemoryStateStore();
    const store = new ConversationStore(stateStore);
    const conversation = await store.create({
        subject: 'caller-a',
        agentId: 'knowledge-new',
        upstreamConversationId: 'upstream-1',
    });
    const firstLease = await store.beginTurn(conversation.id, 'caller-a', 'retryable-turn');
    await store.completeTurn(conversation.id, firstLease.lockOwner, {
        forgetClientTurnId: 'retryable-turn',
    });
    const retryLease = await store.beginTurn(conversation.id, 'caller-a', 'retryable-turn');
    assert.equal(retryLease.conversation.activeClientTurnId, 'retryable-turn');
});

test('conversation lease remains exclusive beyond sixty seconds', async () => {
    let now = 0;
    const stateStore = new MemoryStateStore();
    const store = new ConversationStore(stateStore, {
        lockDurationMs: 210_000,
        now: () => now,
    });
    const conversation = await store.create({
        subject: 'caller-a',
        agentId: 'knowledge-new',
        upstreamConversationId: 'upstream-1',
    });
    await store.beginTurn(conversation.id, 'caller-a', 'long-turn');
    now = 61_000;
    await assert.rejects(() => store.beginTurn(conversation.id, 'caller-a', 'second-turn'), error => {
        assert.equal(error.code, 'CONVERSATION_BUSY');
        return true;
    });
});

test('D2E client creates a conversation and streams parsed activities', async () => {
    const requests = [];
    const client = new D2EClient({
        config: {
            environmentHost: 'https://example.test',
            schemaName: 'Default_Test',
            apiVersion: '1',
        },
        identity: { acquireToken: async () => 'opaque-token' },
        fetchImpl: async (url, options) => {
            requests.push({ url, options });
            return sseResponse([
                'data: {"type":"typing","text":"Hello","channelData":{"streamType":"streaming","streamSequence":1}}\n\n',
                'data: {"type":"message","text":"Hello.","channelData":{"streamType":"final"}}\n\n',
            ].join(''));
        },
    });

    const conversationId = await client.createConversation();
    assert.equal(conversationId, 'upstream-1');
    const response = await client.openTurn({
        upstreamConversationId: conversationId,
        text: 'Question',
    });
    const activities = [];
    await client.consumeActivities(response, activity => activities.push(activity));

    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /agenticruntime\/3p/);
    assert.equal(requests[0].options.headers.Authorization, 'Bearer opaque-token');
    assert.equal(activities.length, 2);
    assert.equal(activities[1].channelData.streamType, 'final');
});

test('D2E client maps non-success upstream responses without exposing the body', async () => {
    const client = new D2EClient({
        config: {
            environmentHost: 'https://example.test',
            schemaName: 'Default_Test',
            apiVersion: '1',
        },
        identity: { acquireToken: async () => 'opaque-token' },
        fetchImpl: async () => new Response('sensitive upstream detail', { status: 403 }),
    });
    await assert.rejects(() => client.createConversation(), error => {
        assert.ok(error instanceof GatewayError);
        assert.equal(error.code, 'UPSTREAM_D2E_ERROR');
        assert.equal(error.message.includes('sensitive'), false);
        return true;
    });
});

test('D2E client cancels an upstream reader immediately when the reducer concludes', async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('data: {"type":"message","text":"done"}\n\n'));
        },
        cancel() {
            cancelled = true;
        },
    });
    const client = new D2EClient({
        config: {},
        identity: { acquireToken: async () => 'unused' },
    });
    const count = await client.consumeActivities(new Response(body), () => false);
    assert.equal(count, 1);
    assert.equal(cancelled, true);
});

test('D2E client cancels an upstream reader on an explicit end frame', async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('event: end\ndata: [DONE]\n\n'));
        },
        cancel() {
            cancelled = true;
        },
    });
    const client = new D2EClient({
        config: {},
        identity: { acquireToken: async () => 'unused' },
    });
    assert.equal(await client.consumeActivities(new Response(body), () => true), 0);
    assert.equal(cancelled, true);
});

test('D2E body timeout remains distinct from a client disconnect', async () => {
    const keepAlive = setInterval(() => {}, 1_000);
    const client = new D2EClient({
        config: {
            environmentHost: 'https://example.test',
            schemaName: 'Default_Test',
            apiVersion: '1',
            upstreamTimeoutMs: 20,
        },
        identity: { acquireToken: async () => 'opaque-token' },
        fetchImpl: async (url, options) => {
            let streamController;
            const body = new ReadableStream({
                start(controller) {
                    streamController = controller;
                },
            });
            options.signal.addEventListener('abort', () => {
                streamController.error(new DOMException('Timed out', 'AbortError'));
            }, { once: true });
            return new Response(body, { status: 200 });
        },
    });
    try {
        const response = await client.openTurn({
            upstreamConversationId: 'upstream-1',
            text: 'Question',
        });
        await assert.rejects(() => client.consumeActivities(response, () => true), error => {
            assert.equal(error.code, 'UPSTREAM_TIMEOUT');
            assert.equal(error.retryable, false);
            return true;
        });
    } finally {
        clearInterval(keepAlive);
    }
});

test('ambiguous fetch failures are outcome-unknown and not retryable', async () => {
    const client = new D2EClient({
        config: {
            environmentHost: 'https://example.test',
            schemaName: 'Default_Test',
            apiVersion: '1',
            upstreamTimeoutMs: 5_000,
        },
        identity: { acquireToken: async () => 'opaque-token' },
        fetchImpl: async () => { throw new Error('connection reset'); },
    });
    await assert.rejects(() => client.createConversation(), error => {
        assert.equal(error.code, 'UPSTREAM_OUTCOME_UNKNOWN');
        assert.equal(error.retryable, false);
        return true;
    });
});
