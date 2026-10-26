import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { DebugCapture, stripCredentials } from '../src/observability/debugCapture.js';
import { LogStore } from '../src/observability/logStore.js';
import { ConversationStore } from '../src/storage/conversationStore.js';
import { LocalFileStateStore } from '../src/storage/localFileStateStore.js';
import { EvidenceArchive } from '../src/storage/evidenceArchive.js';

async function withArchive(run) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mcschat-evidence-'));
    const archive = new EvidenceArchive(directory);
    await archive.initialize();
    try {
        await run({ archive, directory });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}

test('evidence archive persists NDJSON and purges before an exact cutoff', async () => {
    await withArchive(async ({ archive }) => {
        const relative = 'logs/2026-08-19.ndjson';
        await archive.appendLine(relative, { at: '2026-08-19T10:00:00.000Z', message: 'old' });
        await archive.appendLine(relative, { at: '2026-08-19T12:00:00.000Z', message: 'keep' });

        const purged = await archive.purgeBefore('logs', Date.parse('2026-08-19T11:00:00.000Z'));
        assert.equal(purged.removedEntries, 1);
        assert.deepEqual(await archive.readLines(relative), [
            { at: '2026-08-19T12:00:00.000Z', message: 'keep' },
        ]);
    });
});

test('log store hydrates persisted redacted entries after restart', async () => {
    await withArchive(async ({ archive, directory }) => {
        let now = Date.parse('2026-08-19T10:00:00.000Z');
        const first = new LogStore({ capacity: 50, now: () => now, archive });
        first.append('info', 'turn', { authorization: 'Bearer secret', answerLength: 42 });
        await first.flushArchive();

        const secondArchive = new EvidenceArchive(directory);
        await secondArchive.initialize();
        const second = new LogStore({ capacity: 50, archive: secondArchive });
        assert.equal(await second.hydrate(), 1);
        assert.equal(second.snapshot()[0].message, 'turn');
        assert.equal(JSON.stringify(second.snapshot()).includes('Bearer secret'), false);
        assert.equal(second.snapshot()[0].fields.authorization, '[redacted]');
    });
});

test('debug capture keeps Activity text but strips credentials and persists its setting', async () => {
    await withArchive(async ({ archive, directory }) => {
        const stateStore = new LocalFileStateStore(directory);
        await stateStore.initialize();
        const capture = new DebugCapture(archive, { stateStore, enabled: true });
        await capture.initialize();
        const trace = capture.startTurn({ conversationId: '12345678-1234-4123-8123-123456789abc', turnId: 'turn-1', channel: 'test' });
        trace.upstreamRequest({ authorization: 'Bearer abc', text: 'question' });
        trace.frame({ type: 'message', text: 'answer', entities: [{ type: 'thought', text: 'reasoning' }], token: 'secret' });
        trace.finish({ outcome: 'final' });
        await trace.flush();

        const raw = await readFile(path.join(directory, 'debug/12345678-1234-4123-8123-123456789abc/turn-1.ndjson'), 'utf8');
        assert.equal(raw.includes('answer'), true);
        assert.equal(raw.includes('reasoning'), true);
        assert.equal(raw.includes('Bearer abc'), false);
        assert.equal(raw.includes('secret'), false);
        assert.equal(raw.includes('[redacted]'), true);

        await capture.setEnabled(false);
        const restored = new DebugCapture(archive, { stateStore, enabled: true });
        assert.equal(await restored.initialize(), false);
        assert.equal(restored.startTurn({ conversationId: 'x', turnId: 'y', channel: 'test' }), null);
    });
});

test('credential stripping does not remove business keys or text', () => {
    const result = stripCredentials({
        text: 'answer',
        accessToken: 'hidden',
        nested: { toolInput: { query: 'keep' }, cookie: 'hidden' },
    });
    assert.equal(result.text, 'answer');
    assert.equal(result.accessToken, '[redacted]');
    assert.equal(result.nested.toolInput.query, 'keep');
    assert.equal(result.nested.cookie, '[redacted]');
});

test('expired conversations stop accepting turns but remain until retention purge', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mcschat-conversations-'));
    try {
        const stateStore = new LocalFileStateStore(directory);
        await stateStore.initialize();
        let now = Date.parse('2026-08-19T10:00:00.000Z');
        const conversations = new ConversationStore(stateStore, { ttlMinutes: 1, now: () => now });
        const created = await conversations.create({
            subject: 'caller',
            agentId: 'knowledge-new',
            upstreamConversationId: 'upstream-1',
        });
        now += 120_000;

        await assert.rejects(() => conversations.get(created.id, 'caller'), error => error.code === 'CONVERSATION_NOT_FOUND');
        const retained = await conversations.list();
        assert.equal(retained.length, 1);
        assert.equal(retained[0].status, 'expired');
        assert.notEqual(await stateStore.readJson(`conversations/${created.id}.json`), null);

        assert.equal(await conversations.purgeBefore(Date.parse(created.createdAt) + 1), 1);
        assert.equal((await conversations.list()).length, 0);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
