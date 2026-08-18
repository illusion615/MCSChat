import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { randomBytes } from 'node:crypto';

import { D2ETurnReducer } from '../src/d2e/activityReducer.js';
import { SseFrameParser } from '../src/d2e/sseParser.js';
import {
    constantTimeEqual,
    decryptCache,
    encryptCache,
} from '../src/crypto/cacheEnvelope.js';

const fixtureUrl = new URL('../../examples/fixtures/new-agent-3p-replay.json', import.meta.url);

test('New Agent replay reduces to sanitized staged streaming events', async () => {
    const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
    const reducer = new D2ETurnReducer('turn-1');
    const events = fixture.activities.flatMap(activity => reducer.reduce(activity));
    const answers = events.filter(event => event.type === 'answer');
    const finals = events.filter(event => event.type === 'final');

    assert.equal(answers.length, 2);
    assert.equal(answers[0].text, 'The product is');
    assert.equal(answers[1].text, 'The product is a personal AI agent');
    assert.equal(finals.length, 1);
    assert.equal(finals[0].text, 'The product is a personal AI agent.');
    assert.equal(events.some(event => JSON.stringify(event).includes('The user is asking')), false);
    assert.equal(events.some(event => JSON.stringify(event).includes('SHOULD NOT APPEAR')), false);

    const toolEvents = events.filter(event => event.stageId === 'tool:search-1');
    assert.deepEqual(toolEvents.map(event => event.status), ['started', 'completed']);
    assert.deepEqual(toolEvents.map(event => event.stage), ['tool', 'tool']);
});

test('out-of-order answer snapshots and duplicate finals are ignored', () => {
    const reducer = new D2ETurnReducer('turn-2');
    const first = reducer.reduce({
        type: 'typing',
        text: 'newer',
        channelData: { streamType: 'streaming', streamSequence: 2 },
    });
    const obsolete = reducer.reduce({
        type: 'typing',
        text: 'older',
        channelData: { streamType: 'streaming', streamSequence: 1 },
    });
    const final = reducer.reduce({
        type: 'message',
        text: 'complete',
        channelData: { streamType: 'final' },
    });
    const duplicate = reducer.reduce({ type: 'message', text: 'duplicate' });

    assert.equal(first[0].text, 'newer');
    assert.deepEqual(obsolete, []);
    assert.equal(final.at(-1).type, 'final');
    assert.deepEqual(duplicate, []);
});

test('SSE parser handles CRLF, comments, ids, and multiline data', () => {
    const parser = new SseFrameParser();
    const frames = [
        ...parser.push(': keep-alive\r\nevent: answer\r\nid: 4\r\ndata: {"text":\r\n'),
        ...parser.push('data: "hello"}\r\n\r\n'),
        ...parser.end(),
    ];
    assert.deepEqual(frames, [{
        event: 'answer',
        id: '4',
        data: '{"text":\n"hello"}',
    }]);
});

test('AES-GCM cache envelope round-trips and rejects tampering', () => {
    const key = randomBytes(32);
    const encrypted = encryptCache('serialized-msal-cache', key);
    assert.equal(decryptCache(encrypted, key).toString('utf8'), 'serialized-msal-cache');

    const parsed = JSON.parse(encrypted.toString('utf8'));
    parsed.ciphertext = Buffer.from('tampered').toString('base64');
    assert.throws(
        () => decryptCache(Buffer.from(JSON.stringify(parsed)), key),
        /authentication failed/
    );
});

test('constant-time comparison accepts equal values and rejects unequal values', () => {
    assert.equal(constantTimeEqual('same-value', 'same-value'), true);
    assert.equal(constantTimeEqual('same-value', 'different'), false);
});
