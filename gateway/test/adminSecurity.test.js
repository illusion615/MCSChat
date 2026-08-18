import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from '../src/http/createApp.js';
import { StateConflictError } from '../src/errors.js';
import { LogStore, RouterLogger } from '../src/observability/logStore.js';
import { RouterMetrics } from '../src/observability/metrics.js';
import { RouterLifecycle } from '../src/runtime/lifecycle.js';
import { AdminCredential } from '../src/security/adminCredential.js';
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

    async remove(path) {
        this.entries.delete(path);
    }

    async list(prefix) {
        return [...this.entries.keys()].filter(key => key.startsWith(`${prefix}/`)).sort();
    }
}

/** `environmentKey: null` models a `.env.local` with no LOCAL_ADMIN_API_KEY. */
async function startConsole({ environmentKey = null } = {}) {
    const secrets = {
        'admin-api-key': environmentKey,
        'admin-session-signing-key': 'signing-key-value',
        'prototype-api-key': 'router-key-value',
    };
    const secretProvider = {
        get: async name => {
            if (!secrets[name]) throw new Error(`Missing local secret configuration: ${name}`);
            return secrets[name];
        },
        tryGet: async name => secrets[name] ?? null,
    };
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
        logBufferSize: 50,
    };
    const stateStore = new MemoryStateStore();
    const logStore = new LogStore({ capacity: config.logBufferSize });
    const logger = new RouterLogger(logStore, { mirror: null });
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
        d2eClient: { createConversation: async () => 'upstream-1' },
        logStore,
        metrics: new RouterMetrics(),
        lifecycle: new RouterLifecycle({ logger, drainMs: 20, exit: () => {} }),
        logger,
    });
    const server = app.listen(0);
    await once(server, 'listening');
    return {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        stateStore,
        async stop() {
            server.close();
            await once(server, 'close');
        },
    };
}

const json = (body, extra = {}) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(extra.headers || {}) },
    body: JSON.stringify(body),
});

test('an unconfigured console is open and reports that it has no password', async () => {
    const harness = await startConsole();
    try {
        const security = await (await fetch(`${harness.baseUrl}/admin/api/security`)).json();
        assert.deepEqual(security, { protected: false, source: 'none', changeable: true });

        const overview = await fetch(`${harness.baseUrl}/admin/api/overview`);
        assert.equal(overview.status, 200);
        assert.equal((await overview.json()).security.protected, false);
    } finally {
        await harness.stop();
    }
});

test('the console can initialize a password, which then guards it', async () => {
    const harness = await startConsole();
    try {
        const saved = await fetch(`${harness.baseUrl}/admin/api/security/password`, json({ password: 'correct horse' }));
        assert.equal(saved.status, 200);
        assert.deepEqual((await saved.json()).source, 'password');

        const locked = await fetch(`${harness.baseUrl}/admin/api/overview`);
        assert.equal(locked.status, 401);

        const wrong = await fetch(`${harness.baseUrl}/admin/session`, json({ adminKey: 'wrong password' }));
        assert.equal(wrong.status, 401);

        const signedIn = await fetch(`${harness.baseUrl}/admin/session`, json({ adminKey: 'correct horse' }));
        assert.equal(signedIn.status, 200);
        const cookie = signedIn.headers.get('set-cookie').split(';')[0];

        const unlocked = await fetch(`${harness.baseUrl}/admin/api/overview`, { headers: { Cookie: cookie } });
        assert.equal(unlocked.status, 200);
    } finally {
        await harness.stop();
    }
});

test('the stored credential keeps only a salted hash', async () => {
    const harness = await startConsole();
    try {
        await fetch(`${harness.baseUrl}/admin/api/security/password`, json({ password: 'correct horse' }));
        const stored = await harness.stateStore.readJson('admin/credential.json');
        assert.equal(stored.value.algorithm, 'scrypt');
        assert.ok(stored.value.salt && stored.value.hash);
        assert.equal(JSON.stringify(stored.value).includes('correct horse'), false);
    } finally {
        await harness.stop();
    }
});

test('short passwords are rejected', async () => {
    const harness = await startConsole();
    try {
        const response = await fetch(`${harness.baseUrl}/admin/api/security/password`, json({ password: 'short' }));
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, 'PASSWORD_INVALID');
        assert.equal((await (await fetch(`${harness.baseUrl}/admin/api/security`)).json()).protected, false);
    } finally {
        await harness.stop();
    }
});

test('a signed-in administrator can change and then remove the password', async () => {
    const harness = await startConsole();
    try {
        await fetch(`${harness.baseUrl}/admin/api/security/password`, json({ password: 'first password' }));
        const signedIn = await fetch(`${harness.baseUrl}/admin/session`, json({ adminKey: 'first password' }));
        const cookie = signedIn.headers.get('set-cookie').split(';')[0];

        const changed = await fetch(
            `${harness.baseUrl}/admin/api/security/password`,
            json({ password: 'second password' }, { headers: { Cookie: cookie } })
        );
        assert.equal(changed.status, 200);
        assert.equal((await fetch(`${harness.baseUrl}/admin/session`, json({ adminKey: 'first password' }))).status, 401);
        assert.equal((await fetch(`${harness.baseUrl}/admin/session`, json({ adminKey: 'second password' }))).status, 200);

        const cleared = await fetch(`${harness.baseUrl}/admin/api/security/password`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
        });
        assert.equal(cleared.status, 200);
        assert.equal((await cleared.json()).protected, false);
        assert.equal((await fetch(`${harness.baseUrl}/admin/api/overview`)).status, 200);
    } finally {
        await harness.stop();
    }
});

test('an environment key still governs access and cannot be changed from the console', async () => {
    const harness = await startConsole({ environmentKey: 'env-admin-key' });
    try {
        const security = await (await fetch(`${harness.baseUrl}/admin/api/security`)).json();
        assert.deepEqual(security, { protected: true, source: 'environment', changeable: false });

        assert.equal((await fetch(`${harness.baseUrl}/admin/api/overview`)).status, 401);
        const withKey = await fetch(`${harness.baseUrl}/admin/api/overview`, {
            headers: { 'X-Admin-Key': 'env-admin-key' },
        });
        assert.equal(withKey.status, 200);

        const rejected = await fetch(
            `${harness.baseUrl}/admin/api/security/password`,
            json({ password: 'new password' }, { headers: { 'X-Admin-Key': 'env-admin-key' } })
        );
        assert.equal(rejected.status, 409);
        assert.equal((await rejected.json()).error.code, 'PASSWORD_MANAGED_EXTERNALLY');
    } finally {
        await harness.stop();
    }
});
