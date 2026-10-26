import assert from 'node:assert/strict';
import test from 'node:test';

import { LogStore, redactFields, reference, RouterLogger, toLogger } from '../src/observability/logStore.js';
import { RouterMetrics } from '../src/observability/metrics.js';
import { RouterLifecycle, RESTART_EXIT_CODE } from '../src/runtime/lifecycle.js';

test('redactor drops sensitive keys and masks opaque values', () => {
    const redacted = redactFields({
        accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        clientSecret: 'super-secret-value',
        userUpn: 'admin@contoso.com',
        cookie: 'mcschat_admin=abc',
        msalCache: '{"AccessToken":{}}',
        route: 'POST /v1/conversations',
        durationMs: 42,
        nested: { authorization: 'Bearer abc', safe: 'value' },
    });

    assert.equal(redacted.accessToken, '[redacted]');
    assert.equal(redacted.clientSecret, '[redacted]');
    assert.equal(redacted.userUpn, '[redacted]');
    assert.equal(redacted.cookie, '[redacted]');
    assert.equal(redacted.msalCache, '[redacted]');
    assert.equal(redacted.route, 'POST /v1/conversations');
    assert.equal(redacted.durationMs, 42);
    assert.equal(redacted.nested.authorization, '[redacted]');
    assert.equal(redacted.nested.safe, 'value');
});

test('redactor masks bare high-entropy strings that were not caught by key name', () => {
    const redacted = redactFields({ value: 'a'.repeat(64), short: 'hello world' });
    assert.equal(redacted.value, '[redacted]');
    assert.equal(redacted.short, 'hello world');
});

test('reference produces a stable short hash and never the original value', () => {
    const original = '5d1a4f18-1c39-4e0a-9a1c-0e1f2a3b4c5d';
    const first = reference(original);
    assert.equal(first, reference(original));
    assert.equal(first.length, 12);
    assert.equal(first.includes(original.slice(0, 8)), false);
    assert.equal(reference(''), undefined);
});

test('log store wraps at capacity and keeps chronological order', () => {
    const store = new LogStore({ capacity: 50 });
    for (let index = 0; index < 120; index += 1) store.append('info', 'Entry appended', { index });

    const entries = store.snapshot();
    assert.equal(entries.length, 50);
    assert.equal(entries[0].fields.index, 70);
    assert.equal(entries.at(-1).fields.index, 119);
    assert.equal(store.stats().dropped, 70);
    assert.equal(store.stats().lastSeq, 120);
});

test('log store filters by level, correlation and free text', () => {
    const store = new LogStore({ capacity: 100 });
    store.append('debug', 'Request completed', { correlationId: 'aaa' });
    store.append('warn', 'Turn completed', { correlationId: 'bbb', outcome: 'error' });
    store.append('error', 'Router request failed', { correlationId: 'bbb', code: 'INTERNAL_ERROR' });

    assert.equal(store.query({ level: 'warn' }).length, 2);
    assert.equal(store.query({ correlationId: 'bbb' }).length, 2);
    assert.equal(store.query({ q: 'INTERNAL_ERROR' }).length, 1);
    assert.equal(store.query({ level: 'debug', since: 2 }).length, 1);
});

test('log store notifies subscribers and honours unsubscribe', () => {
    const store = new LogStore({ capacity: 10 });
    const received = [];
    const unsubscribe = store.subscribe(entry => received.push(entry.message));
    store.append('info', 'First');
    unsubscribe();
    store.append('info', 'Second');
    assert.deepEqual(received, ['First']);
    assert.equal(store.stats().subscribers, 0);
});

test('router logger writes through the redactor and mirrors above the threshold', () => {
    const store = new LogStore({ capacity: 10 });
    const mirrored = [];
    const logger = new RouterLogger(store, {
        mirror: { log: (...args) => mirrored.push(args), error: (...args) => mirrored.push(args) },
        mirrorLevel: 'warn',
    });

    logger.debug('Quiet entry', { clientSecret: 'nope' });
    logger.error('Loud entry', { code: 'BOOM' });

    const entries = store.snapshot();
    assert.equal(entries.length, 2);
    assert.equal(entries[0].fields.clientSecret, '[redacted]');
    assert.equal(entries[1].code, 'BOOM');
    assert.equal(mirrored.length, 1);
});

test('toLogger fills in the levels a partial logger does not implement', () => {
    const calls = [];
    const logger = toLogger({ error: message => calls.push(message) });
    logger.debug('ignored');
    logger.info('ignored');
    logger.error('recorded');
    assert.deepEqual(calls, ['recorded']);
});

test('metrics track request outcomes, latency quantiles and rolling series', () => {
    let clock = 1_700_000_000_000;
    const metrics = new RouterMetrics({ now: () => clock });

    for (let index = 0; index < 10; index += 1) {
        const finish = metrics.startRequest();
        clock += 10;
        finish('POST /v1/conversations', index < 8 ? 201 : 500);
    }

    const snapshot = metrics.snapshot();
    assert.equal(snapshot.requests.total, 10);
    assert.equal(snapshot.requests.inFlight, 0);
    assert.equal(snapshot.requests.byRoute['POST /v1/conversations'], 10);
    assert.equal(snapshot.requests.byStatusClass['2xx'], 8);
    assert.equal(snapshot.requests.byStatusClass['5xx'], 2);
    assert.equal(snapshot.latency.request.count, 10);
    assert.equal(snapshot.latency.request.p50, 10);
    assert.equal(snapshot.series.fiveMinutes.points.length, 60);
    assert.equal(snapshot.series.fiveMinutes.points.at(-1).requests, 10);
    assert.equal(snapshot.series.fiveMinutes.points.at(-1).errors, 2);
});

test('metrics partition request traffic by surface while keeping global totals', () => {
    let clock = Date.now();
    const metrics = new RouterMetrics({ now: () => clock });

    const business = metrics.startRequest('business');
    const consoleReq = metrics.startRequest('console');
    const supportReq = metrics.startRequest('support');
    clock += 12;
    business('POST /v1/conversations/:id/turns', 200);
    clock += 8;
    consoleReq('GET /admin/api/metrics', 200);
    clock += 5;
    supportReq('GET /prototype', 404);

    const snapshot = metrics.snapshot();
    assert.equal(snapshot.requests.total, 3);
    assert.equal(snapshot.requests.bySurface.business, 1);
    assert.equal(snapshot.requests.bySurface.console, 1);
    assert.equal(snapshot.requests.bySurface.support, 1);
    assert.equal(snapshot.requests.byRouteBySurface.business['POST /v1/conversations/:id/turns'], 1);
    assert.equal(snapshot.requests.byRouteBySurface.console['GET /admin/api/metrics'], 1);
    assert.equal(snapshot.requests.byStatusClassBySurface.business['2xx'], 1);
    assert.equal(snapshot.requests.byStatusClassBySurface.support['4xx'], 1);
    assert.equal(snapshot.series.fiveMinutes.points.at(-1).businessRequests, 1);
    assert.equal(snapshot.series.fiveMinutes.points.at(-1).consoleRequests, 1);
    assert.equal(snapshot.series.fiveMinutes.points.at(-1).supportRequests, 1);
    assert.equal(snapshot.series.fiveMinutes.points.at(-1).businessErrors || 0, 0);
    assert.equal(snapshot.series.fiveMinutes.points.at(-1).supportErrors, 1);
    assert.equal(snapshot.latency.request.count, 3);
    assert.equal(snapshot.latency.requestBusiness.count, 1);
});

test('metrics keep the twenty most recent turns with TTFT and outcome', () => {
    const metrics = new RouterMetrics();
    for (let index = 0; index < 25; index += 1) {
        metrics.turnStarted();
        metrics.recordTurn({
            outcome: index % 5 === 0 ? 'error' : 'final',
            ttftMs: 100 + index,
            totalMs: 900 + index,
            answerSnapshots: 3,
            stages: 2,
            conversationRef: `ref-${index}`,
        });
    }
    const snapshot = metrics.snapshot();
    assert.equal(snapshot.turns.started, 25);
    assert.equal(snapshot.recentTurns.length, 20);
    assert.equal(snapshot.recentTurns[0].conversationRef, 'ref-24');
    assert.equal(snapshot.turns.outcomes.error, 5);
    assert.equal(snapshot.turns.outcomes.final, 20);
});

test('lifecycle drains in-flight requests before exiting with the restart code', async () => {
    const exits = [];
    const lifecycle = new RouterLifecycle({
        logger: { warn: () => {}, error: () => {} },
        drainMs: 500,
        pollIntervalMs: 10,
        exit: code => exits.push(code),
    });
    const closed = [];
    lifecycle.attach({ close: () => closed.push('close'), closeAllConnections: () => closed.push('all') });

    const drainEvents = [];
    lifecycle.onDrain(event => drainEvents.push(event.reason));
    const release = lifecycle.trackRequest();
    assert.equal(lifecycle.status().inFlight, 1);

    const shutdown = lifecycle.shutdown({ exitCode: RESTART_EXIT_CODE, reason: 'admin-console' });
    setTimeout(release, 50);
    await shutdown;

    assert.deepEqual(drainEvents, ['admin-console']);
    assert.deepEqual(exits, [RESTART_EXIT_CODE]);
    assert.deepEqual(closed, ['close', 'all']);
    assert.equal(lifecycle.status().inFlight, 0);
});

test('lifecycle refuses a second restart while already draining', () => {
    const lifecycle = new RouterLifecycle({
        logger: { warn: () => {}, error: () => {} },
        exit: () => {},
    });
    lifecycle.draining = true;
    assert.equal(lifecycle.requestRestart({ reason: 'admin-console' }).accepted, false);
});
