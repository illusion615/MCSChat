import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';

import { EncryptedMsalCachePlugin } from '../src/identity/encryptedMsalCachePlugin.js';
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
        if ((current && current.etag !== etag) || (!current && etag)) {
            throw new StateConflictError();
        }
        const next = { data: Buffer.from(data), etag: `etag-${++this.version}` };
        this.entries.set(path, next);
        return { etag: next.etag };
    }
}

function cacheContext(serialized, changed) {
    let value = serialized;
    return {
        cacheHasChanged: changed,
        tokenCache: {
            serialize: () => value,
            deserialize: next => { value = next; },
        },
        value: () => value,
    };
}

test('MSAL cache plugin encrypts persistent cache and restores it', async () => {
    const store = new MemoryStateStore();
    const key = randomBytes(32);
    const plugin = new EncryptedMsalCachePlugin(store, key);
    const writeContext = cacheContext('{"Account":{"id":"value"}}', true);

    await plugin.beforeCacheAccess(writeContext);
    await plugin.afterCacheAccess(writeContext);
    const persisted = await store.read('identity/msal-cache.bin');
    assert.equal(persisted.data.includes(Buffer.from('Account')), false);

    const nextPlugin = new EncryptedMsalCachePlugin(store, key);
    const readContext = cacheContext('', false);
    await nextPlugin.beforeCacheAccess(readContext);
    assert.equal(readContext.value(), '{"Account":{"id":"value"}}');
});

test('MSAL cache plugin rejects a stale ETag write', async () => {
    const store = new MemoryStateStore();
    const key = randomBytes(32);
    const first = new EncryptedMsalCachePlugin(store, key);
    const second = new EncryptedMsalCachePlugin(store, key);
    const firstContext = cacheContext('first', true);
    const secondContext = cacheContext('second', true);

    await first.beforeCacheAccess(firstContext);
    await second.beforeCacheAccess(secondContext);
    await first.afterCacheAccess(firstContext);
    await assert.rejects(() => second.afterCacheAccess(secondContext), StateConflictError);
});
