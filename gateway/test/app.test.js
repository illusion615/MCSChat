import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { D2EClient } from '../src/d2e/d2eClient.js';
import { createApp } from '../src/http/createApp.js';
import { AdminCredential } from '../src/security/adminCredential.js';
import { ConversationStore } from '../src/storage/conversationStore.js';
import { StateConflictError } from '../src/errors.js';

const SECRETS = Object.freeze({
    'admin-api-key': 'valid-admin-key',
    'admin-session-signing-key': 'admin-signing-key',
    'prototype-api-key': 'valid-router-key',
});

const secretProvider = {
    get: async name => SECRETS[name] ?? 'valid-router-key',
    tryGet: async name => SECRETS[name] ?? null,
};

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
}

function upstreamResponse(body, conversationId = 'upstream-conversation') {    const encoder = new TextEncoder();
    return new Response(new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(body));
            controller.close();
        },
    }), {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'x-ms-conversationid': conversationId,
        },
    });
}

async function startTestApp({ readinessState = 'ready', localDevelopment = false } = {}) {
    const upstreamRequests = [];
    const config = {
        localDevelopment,
        allowedOrigins: ['https://illusion615.github.io'],
        environmentHost: 'https://example.test',
        environmentId: '00000000-0000-0000-0000-000000000000',
        schemaName: 'Default_Test',
        apiVersion: '1',
        port: 0,
        publicBaseUrl: 'http://localhost:8090',
        upstreamTimeoutMs: 5_000,
        conversationTtlMinutes: 60,
        adminSessionTtlMinutes: 60,
        adminRestartDrainMs: 1_000,
        logBufferSize: 200,
    };
    const d2eClient = new D2EClient({
        config,
        identity: { acquireToken: async () => 'opaque-upstream-token' },
        fetchImpl: async (url, options) => {
            upstreamRequests.push({ url, options });
            if (url.includes('/conversations?')) return upstreamResponse('event: end\ndata: [DONE]\n\n');
            return upstreamResponse([
                'data: {"type":"typing","text":"Partial","channelData":{"streamType":"streaming","streamSequence":1}}\n\n',
                'data: {"type":"typing","text":"Partial answer","channelData":{"streamType":"streaming","streamSequence":2}}\n\n',
                'data: {"type":"message","text":"Partial answer.","channelData":{"streamType":"final"}}\n\n',
            ].join(''));
        },
    });
    const stateStore = new MemoryStateStore();
    const app = createApp({
        config,
        secretProvider,
        adminCredential: new AdminCredential({ stateStore, secretProvider, logger: { warn: () => {} } }),
        identity: {
            status: async () => ({ state: 'ready' }),
            readiness: async () => ({ state: readinessState }),
            beginAuthorization: async () => ({ url: 'https://login.example.test' }),
            completeAuthorization: async () => ({ state: 'ready' }),
            signOut: async () => ({ state: 'disabled' }),
        },
        conversationStore: new ConversationStore(stateStore),
        d2eClient,
        logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} },
    });
    const server = app.listen(0);
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    return { server, baseUrl, upstreamRequests };
}

test('Router API authenticates before upstream and streams normalized events', async () => {
    const { server, baseUrl, upstreamRequests } = await startTestApp();
    try {
        const unauthorized = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': 'wrong' },
            body: JSON.stringify({ agentId: 'knowledge-new' }),
        });
        assert.equal(unauthorized.status, 401);
        assert.equal(upstreamRequests.length, 0);

        const created = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': 'valid-router-key' },
            body: JSON.stringify({ agentId: 'knowledge-new' }),
        });
        assert.equal(created.status, 201);
        const conversation = await created.json();
        assert.match(conversation.conversationId, /^[0-9a-f-]{36}$/);

        const turn = await fetch(`${baseUrl}/v1/conversations/${conversation.conversationId}/turns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': 'valid-router-key' },
            body: JSON.stringify({ text: 'Question', clientTurnId: 'client-turn-1' }),
        });
        assert.equal(turn.status, 200);
        assert.match(turn.headers.get('content-type'), /^text\/event-stream/);
        const stream = await turn.text();
        assert.match(stream, /event: answer/);
        assert.match(stream, /"text":"Partial answer"/);
        assert.match(stream, /event: final/);
        assert.match(stream, /"text":"Partial answer\."/);

        const duplicate = await fetch(`${baseUrl}/v1/conversations/${conversation.conversationId}/turns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': 'valid-router-key' },
            body: JSON.stringify({ text: 'Question', clientTurnId: 'client-turn-1' }),
        });
        assert.equal(duplicate.status, 409);
        assert.equal(upstreamRequests.length, 2);
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('administrator authorization start requires its separate key', async () => {
    const { server, baseUrl } = await startTestApp();
    try {
        const unauthorized = await fetch(`${baseUrl}/admin/auth/start`, { method: 'POST' });
        assert.equal(unauthorized.status, 401);

        const authorized = await fetch(`${baseUrl}/admin/auth/start`, {
            method: 'POST',
            headers: { 'X-Admin-Key': 'valid-admin-key' },
        });
        assert.equal(authorized.status, 200);
        assert.deepEqual(await authorized.json(), {
            authorizationUrl: 'https://login.example.test',
        });
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('malformed and oversized JSON return stable client errors', async () => {
    const { server, baseUrl, upstreamRequests } = await startTestApp();
    try {
        const malformed = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': 'valid-router-key' },
            body: '{invalid',
        });
        assert.equal(malformed.status, 400);
        assert.equal((await malformed.json()).error.code, 'INVALID_JSON');

        const oversized = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': 'valid-router-key' },
            body: JSON.stringify({ value: 'x'.repeat(70_000) }),
        });
        assert.equal(oversized.status, 413);
        assert.equal((await oversized.json()).error.code, 'REQUEST_TOO_LARGE');
        assert.equal(upstreamRequests.length, 0);
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('readiness returns 503 when delegated identity needs reauthentication', async () => {
    const { server, baseUrl } = await startTestApp({ readinessState: 'reauthRequired' });
    try {
        const response = await fetch(`${baseUrl}/readyz`);
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), {
            status: 'not-ready',
            upstreamIdentity: { state: 'reauthRequired' },
        });
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('local browser bootstrap authenticates via signed HttpOnly cookie without API key', async () => {
    const { server, baseUrl, upstreamRequests } = await startTestApp({ localDevelopment: true });
    try {
        const bootstrap = await fetch(`${baseUrl}/local/bootstrap`, { method: 'POST' });
        assert.equal(bootstrap.status, 204);
        const cookie = bootstrap.headers.get('set-cookie');
        assert.match(cookie, /mcschat_local=/);
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /SameSite=Strict/);

        const created = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie.split(';')[0] },
            body: JSON.stringify({ agentId: 'knowledge-new' }),
        });
        assert.equal(created.status, 201);
        assert.equal(upstreamRequests.length, 1);
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('client error responses still carry CORS and correlation headers', async () => {
    const { server, baseUrl } = await startTestApp();
    const origin = 'https://illusion615.github.io';
    try {
        const malformed = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Origin: origin, 'X-API-Key': 'valid-router-key' },
            body: '{invalid',
        });
        assert.equal(malformed.status, 400);
        assert.equal(malformed.headers.get('access-control-allow-origin'), origin);
        assert.ok(malformed.headers.get('x-correlation-id'));
        assert.equal((await malformed.json()).error.correlationId, malformed.headers.get('x-correlation-id'));

        const oversized = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Origin: origin, 'X-API-Key': 'valid-router-key' },
            body: JSON.stringify({ value: 'x'.repeat(70_000) }),
        });
        assert.equal(oversized.status, 413);
        assert.equal(oversized.headers.get('access-control-allow-origin'), origin);
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('a malformed correlation header is replaced instead of failing the request', async () => {
    const { server, baseUrl } = await startTestApp();
    try {
        const response = await fetch(`${baseUrl}/healthz`, {
            headers: { 'X-Correlation-ID': 'not valid; header value' },
        });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('x-correlation-id'), /^[0-9a-f-]{36}$/);

        const accepted = await fetch(`${baseUrl}/healthz`, { headers: { 'X-Correlation-ID': 'trace-42' } });
        assert.equal(accepted.headers.get('x-correlation-id'), 'trace-42');
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('one route is reported under a single stable label', async () => {
    const { server, baseUrl } = await startTestApp();
    try {
        const created = await fetch(`${baseUrl}/v1/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': 'valid-router-key' },
            body: JSON.stringify({ agentId: 'knowledge-new' }),
        });
        const { conversationId } = await created.json();

        for (const suffix of ['turns', 'turns']) {
            const response = await fetch(`${baseUrl}/v1/conversations/${conversationId}/${suffix}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': 'valid-router-key' },
                body: JSON.stringify({ text: 'Question' }),
            });
            await response.text();
        }

        const metrics = await (await fetch(`${baseUrl}/admin/api/metrics`, {
            headers: { 'X-Admin-Key': 'valid-admin-key' },
        })).json();
        const turnRoutes = Object.keys(metrics.requests.byRouteBySurface.business || {})
            .filter(route => route.includes('/turns'));
        assert.deepEqual(turnRoutes, ['POST /v1/conversations/:id/turns']);
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('unknown routes return the shared JSON error envelope', async () => {
    const { server, baseUrl } = await startTestApp();
    try {
        const response = await fetch(`${baseUrl}/v1/does-not-exist`);
        assert.equal(response.status, 404);
        assert.match(response.headers.get('content-type'), /application\/json/);
        assert.equal((await response.json()).error.code, 'NOT_FOUND');
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('business rate limiting returns the shared error envelope and spares health checks', async () => {
    const { server, baseUrl } = await startTestApp();
    try {
        let limited;
        for (let attempt = 0; attempt < 65; attempt += 1) {
            limited = await fetch(`${baseUrl}/v1/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': 'wrong' },
                body: JSON.stringify({ agentId: 'knowledge-new' }),
            });
            if (limited.status === 429) break;
        }
        assert.equal(limited.status, 429);
        assert.equal((await limited.json()).error.code, 'RATE_LIMITED');

        const health = await fetch(`${baseUrl}/healthz`);
        assert.equal(health.status, 200);
    } finally {
        server.close();
        await once(server, 'close');
    }
});