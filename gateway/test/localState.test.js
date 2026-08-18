import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { StateConflictError } from '../src/errors.js';
import { LocalFileStateStore } from '../src/storage/localFileStateStore.js';

test('local state store provides atomic ETag persistence with private files', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'mcschat-local-store-'));
    try {
        const store = new LocalFileStateStore(root);
        await store.initialize();
        const first = await store.writeJson('identity/account.json', { state: 'ready' });
        assert.equal((await store.readJson('identity/account.json')).value.state, 'ready');
        assert.equal(await store.permissions('identity/account.json'), 0o600);
        await assert.rejects(
            () => store.writeJson('identity/account.json', { state: 'stale' }),
            StateConflictError
        );
        const second = await store.writeJson(
            'identity/account.json',
            { state: 'reauthRequired' },
            { etag: first.etag }
        );
        assert.notEqual(second.etag, first.etag);
        await store.remove('identity/account.json', { etag: second.etag });
        assert.equal(await store.read('identity/account.json'), null);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('local state store rejects traversal paths', async () => {
    const store = new LocalFileStateStore(path.join(tmpdir(), 'mcschat-local-store-path'));
    await assert.rejects(() => store.write('../secret', 'value'), /Invalid local state path/);
});