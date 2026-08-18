import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';

import { DelegatedIdentity } from '../src/identity/delegatedIdentity.js';
import { StateConflictError } from '../src/errors.js';

class MemoryStateStore {
    constructor() {
        this.entries = new Map();
        this.version = 0;
    }

    async read(path) {
        const entry = this.entries.get(path);
        return entry ? { data: Buffer.from(entry.data), etag: entry.etag } : null;
    }

    async write(path, data, { etag } = {}) {
        const current = this.entries.get(path);
        if ((current && current.etag !== etag) || (!current && etag)) throw new StateConflictError();
        const entry = { data: Buffer.from(data), etag: `etag-${++this.version}` };
        this.entries.set(path, entry);
        return { etag: entry.etag };
    }

    async remove(path, { etag } = {}) {
        const current = this.entries.get(path);
        if (current && current.etag !== etag) throw new StateConflictError();
        this.entries.delete(path);
    }

    async readJson(path) {
        const entry = await this.read(path);
        return entry ? { value: JSON.parse(entry.data.toString('utf8')), etag: entry.etag } : null;
    }

    async writeJson(path, value, options = {}) {
        return this.write(path, Buffer.from(JSON.stringify(value)), options);
    }
}

function configuredIdentity(stateStore) {
    const config = {
        tenantId: '899aca58-7bdc-45e9-bec6-1cc9d3f12894',
        clientId: '00000000-0000-4000-8000-000000000002',
        allowedUpstreamUserOid: '00000000-0000-4000-8000-000000000003',
        scope: 'https://api.powerplatform.com/.default',
        redirectUri: 'https://example.test/admin/auth/callback',
    };
    const identity = new DelegatedIdentity({
        config,
        secretProvider: {},
        stateStore,
        logger: { error: () => {} },
    });
    identity.encryptionKey = randomBytes(32);
    identity.cryptoProvider = {
        generatePkceCodes: async () => ({ verifier: 'verifier', challenge: 'challenge' }),
    };
    return identity;
}

test('PKCE transaction persists encrypted across identity instances and is single-use', async () => {
    const stateStore = new MemoryStateStore();
    const first = configuredIdentity(stateStore);
    first.client = {
        getAuthCodeUrl: async request => `https://login.example.test?state=${request.state}`,
    };
    const authorization = await first.beginAuthorization();
    const transactionPath = `identity/auth-transactions/${authorization.state}.bin`;
    const persisted = await stateStore.read(transactionPath);
    assert.ok(persisted);
    assert.equal(persisted.data.includes(Buffer.from('verifier')), false);

    const second = configuredIdentity(stateStore);
    second.encryptionKey = first.encryptionKey;
    second.client = {
        acquireTokenByCode: async () => ({
            account: {
                homeAccountId: 'home-account',
                idTokenClaims: {
                    tid: second.config.tenantId,
                    oid: second.config.allowedUpstreamUserOid,
                },
            },
        }),
        getTokenCache: () => ({ clear: async () => {} }),
    };
    assert.deepEqual(
        await second.completeAuthorization({ code: 'authorization-code', state: authorization.state }),
        { state: 'ready' }
    );
    assert.equal(await stateStore.read(transactionPath), null);
    await assert.rejects(
        () => second.completeAuthorization({ code: 'authorization-code', state: authorization.state }),
        error => error.code === 'AUTH_STATE_INVALID'
    );
});

test('readiness reports reauthentication when account metadata outlives the MSAL cache', async () => {
    const stateStore = new MemoryStateStore();
    const identity = configuredIdentity(stateStore);
    identity.client = {
        getTokenCache: () => ({ getAccountByHomeId: async () => null }),
    };
    await stateStore.writeJson('identity/account.json', {
        homeAccountId: 'missing-account',
        tenantId: identity.config.tenantId,
        objectId: identity.config.allowedUpstreamUserOid,
        state: 'ready',
        updatedAt: new Date().toISOString(),
    });
    assert.deepEqual(await identity.readiness(), { state: 'reauthRequired' });
    assert.equal((await stateStore.readJson('identity/account.json')).value.state, 'reauthRequired');
});