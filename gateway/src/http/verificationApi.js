/**
 * Activity passthrough for the Router verification page.
 *
 * `/v1` gives third parties a reduced, sanitized contract. This surface does the
 * opposite: it forwards upstream D2E activities frame-by-frame so the
 * verification page can run the exact rendering pipeline of the direct-connect
 * page, which makes any divergence in the D2E data structure visible.
 *
 * Raw activities carry reasoning text and tool arguments, so this surface is
 * administrator-only and is never reachable with the third-party API key.
 */

import { randomUUID } from 'node:crypto';

import { D2ETurnReducer } from '../d2e/activityReducer.js';
import { GatewayError } from '../errors.js';
import { reference } from '../observability/logStore.js';

const VERIFICATION_SUBJECT = 'admin:verification';
const MAX_ACTIVITY_BYTES = 32_768;

/**
 * Replaces the upstream conversation ID with the Router's opaque ID.
 * Frames that do not mention the upstream ID are forwarded byte-for-byte.
 */
export function rewriteConversationId(data, upstreamConversationId, opaqueConversationId) {
    if (!upstreamConversationId || !data.includes(upstreamConversationId)) return data;
    let activity;
    try {
        activity = JSON.parse(data);
    } catch {
        return data;
    }
    if (activity?.conversation?.id === upstreamConversationId) {
        activity.conversation.id = opaqueConversationId;
    }
    return JSON.stringify(activity);
}

function openPassthroughStream(response, conversationId) {
    response.status(200).set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        // Same header name the upstream uses, so the page reads it unchanged.
        'x-ms-conversationid': conversationId,
    });
    response.socket?.setNoDelay(true);
    response.flushHeaders();
}

function writeFrame(response, frame) {
    if (response.writableEnded) return;
    if (frame.event && frame.event !== 'message') response.write(`event: ${frame.event}\n`);
    if (frame.id) response.write(`id: ${frame.id}\n`);
    for (const line of String(frame.data).split('\n')) response.write(`data: ${line}\n`);
    response.write('\n');
}

export function registerVerificationRoutes(router, {
    requireAccess,
    asyncRoute,
    conversationStore,
    d2eClient,
    metrics,
    logger,
    debugCapture,
}) {
    router.post('/api/verification/conversations', requireAccess, asyncRoute(async (request, response, next) => {
        const startedAt = Date.now();
        const abortController = new AbortController();
        const abortOnClose = () => {
            if (!response.writableEnded) abortController.abort();
        };
        response.once('close', abortOnClose);
        try {
            const upstreamResponse = await d2eClient.openConversation({ signal: abortController.signal });
            const headerConversationId = upstreamResponse.headers.get('x-ms-conversationid');

            const frames = [];
            let upstreamConversationId = headerConversationId;
            await d2eClient.consumeFrames(upstreamResponse, frame => {
                frames.push(frame);
                if (!upstreamConversationId) {
                    try {
                        upstreamConversationId = JSON.parse(frame.data)?.conversation?.id;
                    } catch {
                        // A non-JSON frame simply carries no conversation ID.
                    }
                }
            });
            if (!upstreamConversationId) {
                throw new GatewayError(
                    'UPSTREAM_CONVERSATION_ID_MISSING',
                    'D2E did not return a conversation ID',
                    { status: 502 }
                );
            }

            const conversation = await conversationStore.create({
                subject: VERIFICATION_SUBJECT,
                agentId: 'knowledge-new',
                upstreamConversationId,
            });
            metrics.recordConversation('created');
            metrics.recordUpstream({
                operation: 'verificationConversation',
                ok: true,
                durationMs: Date.now() - startedAt,
            });
            logger.info('Verification conversation created', {
                route: 'POST /admin/api/verification/conversations',
                correlationId: request.correlationId,
                conversationRef: reference(conversation.id),
            });

            openPassthroughStream(response, conversation.id);
            for (const frame of frames) {
                writeFrame(response, {
                    ...frame,
                    data: rewriteConversationId(frame.data, upstreamConversationId, conversation.id),
                });
            }
            response.write('event: end\ndata: [DONE]\n\n');
            response.end();
        } catch (error) {
            metrics.recordUpstream({
                operation: 'verificationConversation',
                ok: false,
                durationMs: Date.now() - startedAt,
                code: error?.code,
            });
            if (!response.headersSent) next(error);
            else response.end();
        } finally {
            response.off('close', abortOnClose);
        }
    }));

    router.post('/api/verification/conversations/:id', requireAccess, asyncRoute(async (request, response, next) => {
        const activity = request.body?.activity;
        if (!activity || typeof activity !== 'object') {
            throw new GatewayError('INVALID_TURN', 'An activity object is required', { status: 400 });
        }
        if (JSON.stringify(activity).length > MAX_ACTIVITY_BYTES) {
            throw new GatewayError('INVALID_TURN', 'Activity payload is too large', { status: 400 });
        }

        const conversationRef = reference(request.params.id);
        const lease = await conversationStore.beginTurn(
            request.params.id,
            VERIFICATION_SUBJECT,
            `verification-${randomUUID()}`
        );
        const upstreamConversationId = lease.conversation.upstreamConversationId;

        const abortController = new AbortController();
        const abortOnClose = () => {
            if (!response.writableEnded) abortController.abort();
        };
        response.once('close', abortOnClose);

        const startedAt = Date.now();
        let frameCount = 0;
        let answerSnapshots = 0;
        let stageEvents = 0;
        let firstAnswerAt;
        let outcome = 'final';
        let outcomeCode;
        // The reducer runs as a pure observer so passthrough turns report the same
        // TTFT / snapshot / stage semantics as the reduced `/v1` path.
        const reducer = new D2ETurnReducer(lease.conversation.activeClientTurnId || 'verification');
        const trace = debugCapture?.startTurn({
            conversationId: request.params.id,
            turnId: lease.conversation.activeClientTurnId || `verification-${Date.now()}`,
            channel: 'verification-passthrough',
        });
        trace?.upstreamRequest({
            method: 'POST',
            operation: 'openRawTurn',
            conversationId: request.params.id,
            activity,
        });
        metrics.turnStarted();
        try {
            const upstreamResponse = await d2eClient.openRawTurn({
                upstreamConversationId,
                activity,
                signal: abortController.signal,
            });
            openPassthroughStream(response, request.params.id);
            await d2eClient.consumeFrames(upstreamResponse, frame => {
                frameCount += 1;
                writeFrame(response, {
                    ...frame,
                    data: rewriteConversationId(frame.data, upstreamConversationId, request.params.id),
                });
                try {
                    const activity = JSON.parse(frame.data);
                    trace?.frame(activity);
                    for (const event of reducer.reduce(activity)) {
                        if (event.type === 'answer') {
                            answerSnapshots += 1;
                            firstAnswerAt ??= Date.now();
                        } else if (event.type === 'stage') {
                            stageEvents += 1;
                        }
                        trace?.event(event);
                    }
                } catch {
                    // Metrics observation must never affect what is forwarded.
                }
                return !response.writableEnded;
            });
            if (!response.writableEnded) {
                response.write('event: end\ndata: [DONE]\n\n');
                response.end();
            }
            if (!reducer.concluded) {
                outcome = 'error';
                outcomeCode = 'UPSTREAM_STREAM_ENDED_WITHOUT_FINAL';
            }
        } catch (error) {
            outcome = error?.name === 'AbortError' ? 'interrupted' : 'error';
            outcomeCode = error?.code || 'PASSTHROUGH_INTERRUPTED';
            trace?.error({
                code: outcomeCode,
                name: error?.name,
                message: error?.message,
                retryable: Boolean(error?.retryable),
            });
            if (!response.headersSent) next(error);
            else if (!response.writableEnded) response.end();
        } finally {
            response.off('close', abortOnClose);
            const durationMs = Date.now() - startedAt;
            trace?.finish({
                outcome,
                code: outcomeCode,
                ttftMs: firstAnswerAt ? firstAnswerAt - startedAt : null,
                totalMs: durationMs,
                answerSnapshots,
                stages: stageEvents,
            });
            metrics.recordTurn({
                outcome,
                code: outcomeCode,
                ttftMs: firstAnswerAt ? firstAnswerAt - startedAt : undefined,
                totalMs: durationMs,
                answerSnapshots,
                stages: stageEvents,
                conversationRef,
            });
            metrics.recordUpstream({
                operation: 'verificationTurn',
                ok: outcome === 'final',
                durationMs,
                code: outcomeCode,
            });
            logger[outcome === 'final' ? 'info' : 'warn']('Verification turn completed', {
                route: 'POST /admin/api/verification/conversations/:id',
                correlationId: request.correlationId,
                conversationRef,
                outcome,
                code: outcomeCode,
                frames: frameCount,
                totalMs: durationMs,
            });
            await conversationStore.completeTurn(request.params.id, lease.lockOwner).catch(error => {
                logger.error('Failed to release verification conversation lock', {
                    correlationId: request.correlationId,
                    conversationRef,
                    code: error.code || 'LOCK_RELEASE_FAILED',
                });
            });
        }
    }));

    // The page releases its conversation on unload so a reload does not leave an
    // unused upstream conversation behind.
    router.delete('/api/verification/conversations/:id', requireAccess, asyncRoute(async (request, response) => {
        await conversationStore.forceClose(request.params.id).catch(error => {
            if (error?.code !== 'CONVERSATION_NOT_FOUND') throw error;
        });
        metrics.recordConversation('closed');
        response.sendStatus(204);
    }));

    return router;
}
