import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseSseStream } from '../src/d2e/sseParser.js';

const baseUrl = String(process.env.PUBLIC_BASE_URL || 'http://localhost:8090').replace(/\/$/, '');
const apiKey = String(process.env.LOCAL_PROTOTYPE_API_KEY || '');
const prompt = process.argv[2] || 'How do I enter BIOS mode?';
const outputPath = path.resolve(process.argv[3] || './evidence/local-router-live.json');

if (!apiKey) throw new Error('LOCAL_PROTOTYPE_API_KEY is required');

function headers(key = apiKey) {
    return {
        'Content-Type': 'application/json',
        'X-API-Key': key,
    };
}

async function jsonResponse(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.code || `HTTP ${response.status}`);
    return body;
}

const startedAt = Date.now();
const readinessResponse = await fetch(`${baseUrl}/readyz`, { cache: 'no-store' });
const readiness = await readinessResponse.json();
if (readinessResponse.status !== 200 || readiness?.upstreamIdentity?.state !== 'ready') {
    throw new Error('Router delegated identity is not ready');
}

const invalidResponse = await fetch(`${baseUrl}/v1/conversations`, {
    method: 'POST',
    headers: headers('invalid-prototype-key'),
    body: JSON.stringify({ agentId: 'knowledge-new' }),
});
const invalidBody = await invalidResponse.json();
if (invalidResponse.status !== 401 || invalidBody?.error?.code !== 'AUTHENTICATION_REQUIRED') {
    throw new Error('Invalid API key did not fail closed');
}

const createResponse = await fetch(`${baseUrl}/v1/conversations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ agentId: 'knowledge-new' }),
});
const conversation = await jsonResponse(createResponse);
const turnStartedAt = Date.now();
const turnResponse = await fetch(
    `${baseUrl}/v1/conversations/${encodeURIComponent(conversation.conversationId)}/turns`,
    {
        method: 'POST',
        headers: { ...headers(), Accept: 'text/event-stream' },
        body: JSON.stringify({ text: prompt, clientTurnId: randomUUID() }),
    }
);
if (!turnResponse.ok || !turnResponse.body) throw new Error(`Turn failed with HTTP ${turnResponse.status}`);

const correlationId = turnResponse.headers.get('x-correlation-id');
const timeline = [];
let firstAnswerAt;
let finalAt;
let finalText = '';
let lastAnswerText = '';
let terminalError;

for await (const frame of parseSseStream(turnResponse.body)) {
    let data;
    try {
        data = JSON.parse(frame.data);
    } catch {
        continue;
    }
    const relativeMs = Date.now() - turnStartedAt;
    timeline.push({ event: frame.event, relativeMs });
    if (frame.event === 'answer' && data.text) {
        firstAnswerAt ??= Date.now();
        lastAnswerText = data.text;
    }
    if (frame.event === 'final') {
        finalAt = Date.now();
        finalText = data.text || '';
    }
    if (frame.event === 'error') terminalError = data.code || 'UNKNOWN';
}

await fetch(`${baseUrl}/v1/conversations/${encodeURIComponent(conversation.conversationId)}`, {
    method: 'DELETE',
    headers: headers(),
});

if (terminalError) throw new Error(`Router stream failed: ${terminalError}`);
if (!finalAt || !finalText) throw new Error('Router stream ended without a final answer');

const answerSnapshots = timeline.filter(item => item.event === 'answer').length;
const finalHash = createHash('sha256').update(finalText, 'utf8').digest('hex');
const lastAnswerHash = lastAnswerText
    ? createHash('sha256').update(lastAnswerText, 'utf8').digest('hex')
    : null;
const evidence = {
    schemaVersion: 1,
    evidenceType: 'local-router-live-d2e',
    capturedAt: new Date().toISOString(),
    gatewayOrigin: new URL(baseUrl).origin,
    upstreamIdentity: 'dedicated-delegated-user',
    agent: {
        runtimeFamily: 'agenticruntime/3p',
        schemaName: 'Default_KnowledgeAgentNewCopilot_sodjEw',
    },
    securityChecks: {
        invalidApiKeyStatus: invalidResponse.status,
        invalidApiKeyCode: invalidBody.error.code,
        apiKeyExported: false,
        tokenExported: false,
    },
    result: {
        status: 'completed',
        correlationId,
        conversationIdPrefix: conversation.conversationId.slice(0, 8),
        eventCount: timeline.length,
        stageEventCount: timeline.filter(item => item.event === 'stage').length,
        answerSnapshotCount: answerSnapshots,
        finalOnly: answerSnapshots === 0,
        ttftMs: (firstAnswerAt || finalAt) - turnStartedAt,
        totalMs: finalAt - turnStartedAt,
        finalTextLength: finalText.length,
        finalTextSha256: finalHash,
        finalMatchesLastSnapshot: lastAnswerHash ? lastAnswerHash === finalHash : null,
        timeline,
    },
    verificationDurationMs: Date.now() - startedAt,
};

await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });

console.log(JSON.stringify({
    status: evidence.result.status,
    eventCount: evidence.result.eventCount,
    stageEventCount: evidence.result.stageEventCount,
    answerSnapshotCount: evidence.result.answerSnapshotCount,
    finalOnly: evidence.result.finalOnly,
    ttftMs: evidence.result.ttftMs,
    totalMs: evidence.result.totalMs,
    finalTextLength: evidence.result.finalTextLength,
    finalMatchesLastSnapshot: evidence.result.finalMatchesLastSnapshot,
    invalidApiKeyStatus: evidence.securityChecks.invalidApiKeyStatus,
    evidencePath: outputPath,
}, null, 2));