import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { D2EClient } from '../src/d2e/d2eClient.js';
import { createApp } from '../src/http/createApp.js';
import { rewriteConversationId } from '../src/http/verificationApi.js';
import { StateConflictError } from '../src/errors.js';
import { LogStore, RouterLogger } from '../src/observability/logStore.js';
import { RouterMetrics } from '../src/observability/metrics.js';
import { RouterLifecycle } from '../src/runtime/lifecycle.js';
import { AdminCredential } from '../src/security/adminCredential.js';
import { ConversationStore } from '../src/storage/conversationStore.js';

const SECRETS = Object.freeze({
    'admin-api-key': 'admin-key-value',
    'admin-session-signing-key': 'signing-key-value',
    'prototype-api-key': 'router-key-value',
});

const secretProvider = {
    get: async name => SECRETS[name] ?? 'unset',
    tryGet: async name => SECRETS[name] ?? null,
};

const UPSTREAM_CONVERSATION_ID = 'upstream-conversation-7f3a';

// A representative New Agent frame set: reasoning, tool lifecycle, streaming
// chunks and an authoritative final — everything the page's renderer consumes.
const UPSTREAM_TURN_FRAMES = [
    'data: {"type":"typing","text":"","entities":[{"type":"thought","text":"The user is asking about BIOS."}],"conversation":{"id":"upstream-conversation-7f3a"}}\n\n',
    'data: {"type":"typing","text":"","entities":[{"type":"toolCall","tool_call_id":"search-1","tool_display_name":"Knowledge search","status":"started"}]}\n\n',
    'data: {"type":"typing","text":"Press F1","channelData":{"streamType":"streaming","streamId":"s1","streamSequence":1,"chunkType":"full"}}\n\n',
    'data: {"type":"message","text":"Press F1 during boot.","channelData":{"streamType":"final","streamId":"s1"},"suggestedActions":{"actions":[{"type":"imBack","title":"More","value":"More"}]},"conversation":{"id":"upstream-conversation-7f3a"}}\n\n',
    'event: end\ndata: [DONE]\n\n',
].join('');

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

    async remove(path) {
        this.entries.delete(path);
    }

    async list(prefix) {
        return [...this.entries.keys()].filter(key => key.startsWith(`${prefix}/`)).sort();
    }
}

function sseResponse(body) {
    const encoder = new TextEncoder();
    return new Response(new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(body));
            controller.close();
        },
    }), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-ms-conversationid': UPSTREAM_CONVERSATION_ID },
    });
}

async function startVerificationApp() {
    const upstreamRequests = [];
    const config = {
        localDevelopment: true,
        allowedOrigins: [],
        environmentHost: 'https://example.test',
        environmentId: '448464af-64af-ec92-a521-6d203cf6811d',
        schemaName: 'Default_Test',
        apiVersion: '1',
        port: 8090,
        publicBaseUrl: 'http://localhost:8090',
        upstreamTimeoutMs: 5_000,
        conversationTtlMinutes: 60,
        adminSessionTtlMinutes: 60,
        adminRestartDrainMs: 50,
        logBufferSize: 100,
    };
    const logStore = new LogStore({ capacity: config.logBufferSize });
    const logger = new RouterLogger(logStore, { mirror: null });
    const d2eClient = new D2EClient({
        config,
        identity: { acquireToken: async () => 'opaque-upstream-token' },
        fetchImpl: async (url, options) => {
            upstreamRequests.push({ url, body: JSON.parse(options.body) });
            if (url.includes('/conversations?')) {
                return sseResponse(
                    'data: {"type":"message","text":"Hi there.","conversation":{"id":"upstream-conversation-7f3a"}}\n\n'
                    + 'event: end\ndata: [DONE]\n\n'
                );
            }
            return sseResponse(UPSTREAM_TURN_FRAMES);
        },
    });
    const stateStore = new MemoryStateStore();
    const app = createApp({
        config,
        secretProvider,
        adminCredential: new AdminCredential({ stateStore, secretProvider, logger }),
        identity: {
            status: async () => ({ state: 'ready' }),
            readiness: async () => ({ state: 'ready' }),
            beginAuthorization: async () => ({ url: 'https://login.example.test' }),
            completeAuthorization: async () => ({ state: 'ready' }),
            signOut: async () => ({ state: 'disabled' }),
        },
        conversationStore: new ConversationStore(stateStore),
        d2eClient,
        logStore,
        metrics: new RouterMetrics(),
        lifecycle: new RouterLifecycle({ logger, drainMs: 20, exit: () => {} }),
        logger,
    });
    const server = app.listen(0);
    await once(server, 'listening');
    return {
        server,
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        upstreamRequests,
        async stop() {
            server.close();
            await once(server, 'close');
        },
    };
}

async function signIn(baseUrl) {
    const response = await fetch(`${baseUrl}/admin/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: SECRETS['admin-api-key'] }),
    });
    return (response.headers.get('set-cookie') || '').split(';')[0];
}

/** The verification page's own flow: a loopback session with no key entry. */
async function bootstrapLocalSession(baseUrl) {
    const response = await fetch(`${baseUrl}/local/bootstrap`, { method: 'POST' });
    return (response.headers.get('set-cookie') || '').split(';')[0];
}

/** Mirrors the verification page's consumeSSE frame parsing. */
function parseFrames(text) {
    const frames = [];
    let eventName = '';
    let dataLines = [];
    for (const rawLine of text.split('\n')) {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        if (line === '') {
            if (dataLines.length) frames.push({ event: eventName || 'message', data: dataLines.join('\n') });
            eventName = '';
            dataLines = [];
            continue;
        }
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    return frames;
}

test('conversation ID rewriting only touches the binding field', () => {
    const source = '{"type":"message","text":"hi","conversation":{"id":"upstream-conversation-7f3a"}}';
    const rewritten = rewriteConversationId(source, UPSTREAM_CONVERSATION_ID, 'opaque-1234');
    const parsed = JSON.parse(rewritten);
    assert.equal(parsed.conversation.id, 'opaque-1234');
    assert.equal(parsed.text, 'hi');
    assert.equal(Object.keys(parsed).join(','), 'type,text,conversation');

    const untouched = '{"type":"typing","text":"no ids here"}';
    assert.equal(rewriteConversationId(untouched, UPSTREAM_CONVERSATION_ID, 'opaque-1234'), untouched);

    const malformed = 'not json at all';
    assert.equal(rewriteConversationId(malformed, UPSTREAM_CONVERSATION_ID, 'opaque-1234'), malformed);
});

test('verification passthrough requires a Router session', async () => {
    const harness = await startVerificationApp();
    try {
        const anonymous = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        });
        assert.equal(anonymous.status, 401);

        // A third-party API key is not a Router session and never becomes one.
        const thirdParty = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': SECRETS['prototype-api-key'],
                Authorization: `Bearer ${SECRETS['prototype-api-key']}`,
            },
            body: '{}',
        });
        assert.equal(thirdParty.status, 401);
        assert.equal(harness.upstreamRequests.length, 0);
    } finally {
        await harness.stop();
    }
});

test('the loopback browser session reaches verification without any key entry', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await bootstrapLocalSession(harness.baseUrl);
        assert.match(cookie, /^mcschat_local=/);

        const created = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ emitStartConversationEvent: true }),
        });
        assert.equal(created.status, 200);
        assert.match(created.headers.get('x-ms-conversationid'), /^[0-9a-f-]{36}$/);
        await created.text();
    } finally {
        await harness.stop();
    }
});

test('the loopback session still cannot reach the administrative console API', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await bootstrapLocalSession(harness.baseUrl);
        for (const path of ['/admin/api/overview', '/admin/api/logs', '/admin/api/restart']) {
            const response = await fetch(`${harness.baseUrl}${path}`, {
                method: path.endsWith('restart') ? 'POST' : 'GET',
                headers: { Cookie: cookie },
            });
            assert.equal(response.status, 401, path);
        }
    } finally {
        await harness.stop();
    }
});

test('verification passthrough forwards upstream activities verbatim', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await signIn(harness.baseUrl);

        const created = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ emitStartConversationEvent: true }),
        });
        assert.equal(created.status, 200);
        assert.match(created.headers.get('content-type'), /^text\/event-stream/);
        const opaqueId = created.headers.get('x-ms-conversationid');
        assert.match(opaqueId, /^[0-9a-f-]{36}$/);
        const greeting = parseFrames(await created.text());
        assert.equal(JSON.parse(greeting[0].data).text, 'Hi there.');
        assert.equal(JSON.parse(greeting[0].data).conversation.id, opaqueId);

        const turn = await fetch(`${harness.baseUrl}/admin/api/verification/conversations/${opaqueId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({
                activity: { type: 'message', text: 'How do I enter BIOS?', conversation: { id: opaqueId } },
            }),
        });
        assert.equal(turn.status, 200);
        const body = await turn.text();
        const frames = parseFrames(body).filter(frame => frame.data !== '[DONE]');
        const activities = frames.map(frame => JSON.parse(frame.data));

        // Every structure the page's renderer depends on must survive untouched.
        assert.equal(activities.length, 4);
        assert.equal(activities[0].entities[0].type, 'thought');
        assert.equal(activities[0].entities[0].text, 'The user is asking about BIOS.');
        assert.equal(activities[1].entities[0].tool_call_id, 'search-1');
        assert.equal(activities[1].entities[0].status, 'started');
        assert.deepEqual(activities[2].channelData, {
            streamType: 'streaming', streamId: 's1', streamSequence: 1, chunkType: 'full',
        });
        assert.equal(activities[3].channelData.streamType, 'final');
        assert.equal(activities[3].text, 'Press F1 during boot.');
        assert.equal(activities[3].suggestedActions.actions[0].title, 'More');

        // Only the conversation binding is rewritten.
        assert.equal(activities[3].conversation.id, opaqueId);
        assert.equal(body.includes(UPSTREAM_CONVERSATION_ID), false);

        // The upstream received the caller's activity with the binding forced.
        const forwarded = harness.upstreamRequests.at(-1).body.activity;
        assert.equal(forwarded.text, 'How do I enter BIOS?');
        assert.equal(forwarded.conversation.id, UPSTREAM_CONVERSATION_ID);
    } finally {
        await harness.stop();
    }
});

test('verification turns appear in the administrative conversation list', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await signIn(harness.baseUrl);
        const created = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ emitStartConversationEvent: true }),
        });
        await created.text();

        const listed = await (await fetch(`${harness.baseUrl}/admin/api/conversations`, {
            headers: { Cookie: cookie },
        })).json();
        assert.equal(listed.total, 1);
        assert.equal(listed.conversations[0].agentId, 'knowledge-new');
        assert.equal(JSON.stringify(listed).includes(UPSTREAM_CONVERSATION_ID), false);
    } finally {
        await harness.stop();
    }
});

test('verification rejects a missing or oversized activity without calling upstream', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await signIn(harness.baseUrl);
        const created = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ emitStartConversationEvent: true }),
        });
        const opaqueId = created.headers.get('x-ms-conversationid');
        await created.text();
        const upstreamCallsBefore = harness.upstreamRequests.length;

        const missing = await fetch(`${harness.baseUrl}/admin/api/verification/conversations/${opaqueId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({}),
        });
        assert.equal(missing.status, 400);
        assert.equal((await missing.json()).error.code, 'INVALID_TURN');

        const oversized = await fetch(`${harness.baseUrl}/admin/api/verification/conversations/${opaqueId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ activity: { type: 'message', text: 'x'.repeat(40_000) } }),
        });
        assert.equal(oversized.status, 400);
        assert.equal(harness.upstreamRequests.length, upstreamCallsBefore);
    } finally {
        await harness.stop();
    }
});

test('passthrough turns are counted in the turn metrics like reduced turns', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await bootstrapLocalSession(harness.baseUrl);
        const created = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ emitStartConversationEvent: true }),
        });
        const opaqueId = created.headers.get('x-ms-conversationid');
        await created.text();

        const turn = await fetch(`${harness.baseUrl}/admin/api/verification/conversations/${opaqueId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ activity: { type: 'message', text: 'How do I enter BIOS?' } }),
        });
        await turn.text();

        const metrics = await (await fetch(`${harness.baseUrl}/admin/api/metrics`, {
            headers: { 'X-Admin-Key': SECRETS['admin-api-key'] },
        })).json();

        assert.equal(metrics.turns.started, 1);
        assert.equal(metrics.turns.outcomes.final, 1);
        assert.ok(metrics.turns.answerSnapshots >= 1);
        assert.ok(metrics.turns.stages >= 1);
        assert.equal(metrics.latency.ttft.count, 1);
        assert.equal(metrics.recentTurns.length, 1);
        assert.equal(metrics.recentTurns[0].outcome, 'final');
    } finally {
        await harness.stop();
    }
});

test('metrics report live conversation totals rather than process counters', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await bootstrapLocalSession(harness.baseUrl);
        const created = await fetch(`${harness.baseUrl}/admin/api/verification/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ emitStartConversationEvent: true }),
        });
        const opaqueId = created.headers.get('x-ms-conversationid');
        await created.text();

        const before = await (await fetch(`${harness.baseUrl}/admin/api/metrics`, {
            headers: { 'X-Admin-Key': SECRETS['admin-api-key'] },
        })).json();
        assert.equal(before.conversations.stored, 1);
        assert.equal(before.conversations.active, 1);
        assert.equal(before.conversations.idle, 1);

        const released = await fetch(`${harness.baseUrl}/admin/api/verification/conversations/${opaqueId}`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
        });
        assert.equal(released.status, 204);

        const after = await (await fetch(`${harness.baseUrl}/admin/api/metrics`, {
            headers: { 'X-Admin-Key': SECRETS['admin-api-key'] },
        })).json();
        assert.equal(after.conversations.stored, 0);
        assert.equal(after.conversations.active, 0);
    } finally {
        await harness.stop();
    }
});

test('releasing an unknown conversation is idempotent', async () => {
    const harness = await startVerificationApp();
    try {
        const cookie = await bootstrapLocalSession(harness.baseUrl);
        const response = await fetch(
            `${harness.baseUrl}/admin/api/verification/conversations/6f1d3a7c-1111-4222-8333-444455556666`,
            { method: 'DELETE', headers: { Cookie: cookie } }
        );
        assert.equal(response.status, 204);
    } finally {
        await harness.stop();
    }
});

test('the verification page and its assets are served from the Router origin', async () => {    const harness = await startVerificationApp();
    try {
        const page = await fetch(`${harness.baseUrl}/prototype`);
        assert.equal(page.status, 200);
        assert.match(page.headers.get('content-security-policy'), /https:\/\/unpkg\.com/);
        const html = await page.text();
        assert.equal(html.includes('/prototype-assets/streamingActivity.js'), true);
        assert.equal(html.includes('msal-browser'), false);
        // The page must not ask for any credential.
        assert.equal(html.includes('authGate'), false);
        assert.equal(html.includes('LOCAL_ADMIN_API_KEY'), false);

        for (const asset of [
            'marked.min.js',
            'purify.min.js',
            'streamingActivity.js',
            'fixtures/new-agent-3p-replay.json',
            'fixtures/new-agent-3p-expected.json',
        ]) {
            const response = await fetch(`${harness.baseUrl}/prototype-assets/${asset}`);
            assert.equal(response.status, 200, asset);
        }

        // The relaxation is scoped to the verification page only.
        const console_ = await fetch(`${harness.baseUrl}/admin`);
        assert.equal(console_.headers.get('content-security-policy').includes('unpkg.com'), false);
    } finally {
        await harness.stop();
    }
});
