import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from '../src/http/createApp.js';
import { StateConflictError } from '../src/errors.js';
import { LogStore, RouterLogger } from '../src/observability/logStore.js';
import { RouterMetrics } from '../src/observability/metrics.js';
import { RouterLifecycle, RESTART_EXIT_CODE } from '../src/runtime/lifecycle.js';
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

async function startAdminApp({ exits = [] } = {}) {
    const config = {
        localDevelopment: true,
        allowedOrigins: ['https://illusion615.github.io'],
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
    const metrics = new RouterMetrics();
    const lifecycle = new RouterLifecycle({
        logger,
        drainMs: 20,
        pollIntervalMs: 5,
        exit: code => exits.push(code),
    });
    const stateStore = new MemoryStateStore();
    const conversationStore = new ConversationStore(stateStore);
    const identityCalls = [];

    const app = createApp({
        config,
        secretProvider,
        adminCredential: new AdminCredential({ stateStore, secretProvider, logger }),
        identity: {
            status: async () => ({
                state: 'ready',
                tenantId: '899aca58-7bdc-45e9-bec6-1cc9d3f12894',
                objectIdPrefix: '00000000',
                updatedAt: '2026-08-18T00:00:00.000Z',
            }),
            readiness: async () => ({ state: 'ready' }),
            beginAuthorization: async () => ({ url: 'https://login.example.test/authorize' }),
            completeAuthorization: async () => ({ state: 'ready' }),
            signOut: async () => { identityCalls.push('signOut'); return { state: 'disabled' }; },
        },
        conversationStore,
        d2eClient: { createConversation: async () => 'upstream-1', openTurn: async () => {}, consumeActivities: async () => 0 },
        logStore,
        metrics,
        lifecycle,
        logger,
    });

    const server = app.listen(0);
    await once(server, 'listening');
    return {
        server,
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        logStore,
        metrics,
        lifecycle,
        conversationStore,
        identityCalls,
        exits,
        async stop() {
            server.close();
            await once(server, 'close');
        },
    };
}

async function signIn(baseUrl, adminKey = SECRETS['admin-api-key']) {
    const response = await fetch(`${baseUrl}/admin/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey }),
    });
    return { response, cookie: (response.headers.get('set-cookie') || '').split(';')[0] };
}

test('admin console rejects missing, wrong and tampered credentials', async () => {
    const harness = await startAdminApp();
    try {
        const anonymous = await fetch(`${harness.baseUrl}/admin/api/overview`);
        assert.equal(anonymous.status, 401);
        assert.equal((await anonymous.json()).error.code, 'ADMIN_AUTHENTICATION_REQUIRED');

        const wrongKey = await signIn(harness.baseUrl, 'not-the-admin-key');
        assert.equal(wrongKey.response.status, 401);

        const { response, cookie } = await signIn(harness.baseUrl);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('set-cookie'), /HttpOnly/);
        assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
        assert.match(response.headers.get('set-cookie'), /Path=\/admin/);

        const tampered = await fetch(`${harness.baseUrl}/admin/api/overview`, {
            headers: { Cookie: `${cookie.slice(0, -2)}xx` },
        });
        assert.equal(tampered.status, 401);

        const authorized = await fetch(`${harness.baseUrl}/admin/api/overview`, { headers: { Cookie: cookie } });
        assert.equal(authorized.status, 200);
    } finally {
        await harness.stop();
    }
});

test('the prototype API key cannot reach the admin surface', async () => {
    const harness = await startAdminApp();
    try {
        const response = await fetch(`${harness.baseUrl}/admin/api/metrics`, {
            headers: { 'X-Admin-Key': SECRETS['prototype-api-key'] },
        });
        assert.equal(response.status, 401);
    } finally {
        await harness.stop();
    }
});

test('overview reports identity, runtime and redacted router configuration', async () => {
    const harness = await startAdminApp();
    try {
        const { cookie } = await signIn(harness.baseUrl);
        const overview = await (await fetch(`${harness.baseUrl}/admin/api/overview`, {
            headers: { Cookie: cookie },
        })).json();

        assert.equal(overview.identity.state, 'ready');
        assert.equal(overview.identity.objectIdPrefix, '00000000');
        assert.equal(overview.router.environmentIdPrefix, '448464af');
        assert.equal(overview.router.environmentIdPrefix.length, 8);
        assert.equal(typeof overview.runtime.uptimeMs, 'number');
        assert.equal(overview.logs.capacity, 100);
    } finally {
        await harness.stop();
    }
});

test('identity reset is delegated to the identity module', async () => {
    const harness = await startAdminApp();
    try {
        const { cookie } = await signIn(harness.baseUrl);
        const response = await fetch(`${harness.baseUrl}/admin/api/auth/reset`, {
            method: 'POST',
            headers: { Cookie: cookie },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { state: 'disabled' });
        assert.deepEqual(harness.identityCalls, ['signOut']);
    } finally {
        await harness.stop();
    }
});

test('conversations can be listed and force-closed without exposing upstream identifiers', async () => {
    const harness = await startAdminApp();
    try {
        const conversation = await harness.conversationStore.create({
            subject: 'prototype:caller',
            agentId: 'knowledge-new',
            upstreamConversationId: 'upstream-secret-id',
        });
        const { cookie } = await signIn(harness.baseUrl);

        const listResponse = await fetch(`${harness.baseUrl}/admin/api/conversations`, {
            headers: { Cookie: cookie },
        });
        const listed = await listResponse.json();
        assert.equal(listed.total, 1);
        assert.equal(listed.active, 1);
        assert.equal(JSON.stringify(listed).includes('upstream-secret-id'), false);
        assert.equal(listed.conversations[0].idPrefix, conversation.id.slice(0, 8));

        const deleted = await fetch(`${harness.baseUrl}/admin/api/conversations/${conversation.id}`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
        });
        assert.equal(deleted.status, 204);
        assert.equal((await harness.conversationStore.list()).length, 0);

        const missing = await fetch(`${harness.baseUrl}/admin/api/conversations/${conversation.id}`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
        });
        assert.equal(missing.status, 404);
    } finally {
        await harness.stop();
    }
});

test('restart is accepted once and drains through the lifecycle', async () => {
    const exits = [];
    const harness = await startAdminApp({ exits });
    try {
        const { cookie } = await signIn(harness.baseUrl);
        const response = await fetch(`${harness.baseUrl}/admin/api/restart`, {
            method: 'POST',
            headers: { Cookie: cookie },
        });
        assert.equal(response.status, 202);
        assert.equal((await response.json()).restarting, true);

        await new Promise(resolve => setTimeout(resolve, 120));
        assert.deepEqual(exits, [RESTART_EXIT_CODE]);
        assert.equal(harness.lifecycle.draining, true);
    } finally {
        await harness.stop();
    }
});

test('exports are downloadable and carry no secret material', async () => {
    const harness = await startAdminApp();
    try {
        harness.logStore.append('info', 'Turn completed', {
            correlationId: 'cid-1',
            accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.c2lnbmF0dXJlLXZhbHVl',
            clientSecret: 'super-secret-value',
            userUpn: 'operator@contoso.com',
        });
        const { cookie } = await signIn(harness.baseUrl);

        for (const [path, expectedType] of [
            ['/admin/api/export/logs?format=json', 'application/json'],
            ['/admin/api/export/logs?format=ndjson', 'application/x-ndjson'],
            ['/admin/api/export/logs?format=txt', 'text/plain'],
            ['/admin/api/export/metrics', 'application/json'],
            ['/admin/api/export/diagnostics', 'application/json'],
        ]) {
            const response = await fetch(`${harness.baseUrl}${path}`, { headers: { Cookie: cookie } });
            assert.equal(response.status, 200, path);
            assert.match(response.headers.get('content-type'), new RegExp(expectedType.replace('/', '\\/')));
            assert.match(response.headers.get('content-disposition'), /^attachment; filename="router-/);

            const body = await response.text();
            for (const forbidden of [
                'super-secret-value',
                'operator@contoso.com',
                'c2lnbmF0dXJlLXZhbHVl',
                SECRETS['admin-api-key'],
                SECRETS['admin-session-signing-key'],
                SECRETS['prototype-api-key'],
            ]) {
                assert.equal(body.includes(forbidden), false, `${path} leaked ${forbidden}`);
            }
        }
    } finally {
        await harness.stop();
    }
});

test('log query endpoint honours level and correlation filters', async () => {
    const harness = await startAdminApp();
    try {
        harness.logStore.append('debug', 'Request completed', { correlationId: 'cid-a' });
        harness.logStore.append('error', 'Router request failed', { correlationId: 'cid-b', code: 'INTERNAL_ERROR' });
        const { cookie } = await signIn(harness.baseUrl);

        const errorsOnly = await (await fetch(`${harness.baseUrl}/admin/api/logs?level=error`, {
            headers: { Cookie: cookie },
        })).json();
        assert.equal(errorsOnly.entries.every(entry => entry.level === 'error'), true);

        const byCorrelation = await (await fetch(`${harness.baseUrl}/admin/api/logs?correlationId=cid-b`, {
            headers: { Cookie: cookie },
        })).json();
        assert.equal(byCorrelation.entries.length, 1);
        assert.equal(byCorrelation.entries[0].code, 'INTERNAL_ERROR');
    } finally {
        await harness.stop();
    }
});

test('signing out clears the admin cookie', async () => {
    const harness = await startAdminApp();
    try {
        const { cookie } = await signIn(harness.baseUrl);
        const response = await fetch(`${harness.baseUrl}/admin/session`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
        });
        assert.equal(response.status, 204);
        assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
    } finally {
        await harness.stop();
    }
});
