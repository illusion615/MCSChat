import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { constantTimeEqual } from '../crypto/cacheEnvelope.js';
import { D2ETurnReducer } from '../d2e/activityReducer.js';
import { GatewayError } from '../errors.js';
import { LogStore, reference, RouterLogger, toLogger } from '../observability/logStore.js';
import { RouterMetrics } from '../observability/metrics.js';
import { RouterLifecycle } from '../runtime/lifecycle.js';
import { SECRET_NAMES } from '../secrets/secretProvider.js';
import { createAdminRouter } from './adminApi.js';
import { parseCookies, sessionCookie, signSession, verifySession } from './session.js';
import { SseWriter } from './sseWriter.js';

const PACKAGED_PROTOTYPE_PAGE = fileURLToPath(
    new URL('../../public/d2e-router-streaming-test.html', import.meta.url)
);
const REPOSITORY_PROTOTYPE_PAGE = fileURLToPath(
    new URL('../../../examples/d2e-router-streaming-test.html', import.meta.url)
);
const DEFAULT_PROTOTYPE_PAGE = existsSync(PACKAGED_PROTOTYPE_PAGE)
    ? PACKAGED_PROTOTYPE_PAGE
    : REPOSITORY_PROTOTYPE_PAGE;
const PACKAGED_ASSET_ROOT = fileURLToPath(new URL('../../public/assets/', import.meta.url));
const REPOSITORY_ASSET_ROOT = fileURLToPath(new URL('../../../lib/', import.meta.url));
const DEFAULT_ASSET_ROOT = existsSync(PACKAGED_ASSET_ROOT)
    ? PACKAGED_ASSET_ROOT
    : REPOSITORY_ASSET_ROOT;
const ADMIN_CONSOLE_PAGE = fileURLToPath(new URL('../../public/admin.html', import.meta.url));

// Explicit allowlist so the verification page can load its dependencies from
// the Router origin without any path joining on request input.
const PROTOTYPE_ASSETS = Object.freeze({
    'marked.min.js': path.join(DEFAULT_ASSET_ROOT, 'marked.min.js'),
    'purify.min.js': path.join(DEFAULT_ASSET_ROOT, 'purify.min.js'),
    'streamingActivity.js': fileURLToPath(new URL('../../../src/utils/streamingActivity.js', import.meta.url)),
    'fixtures/new-agent-3p-replay.json': fileURLToPath(new URL('../../../examples/fixtures/new-agent-3p-replay.json', import.meta.url)),
    'fixtures/new-agent-3p-expected.json': fileURLToPath(new URL('../../../examples/fixtures/new-agent-3p-expected.json', import.meta.url)),
});

// The verification page renders Adaptive Cards from a CDN; the relaxation is
// applied per response so the admin console keeps the strict global policy.
const PROTOTYPE_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "img-src 'self' data: https:",
].join('; ');

const CORRELATION_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const OPAQUE_ID_PATTERN = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const QUIET_ROUTES = ['/healthz', '/readyz', '/admin/api/stream'];

function asyncRoute(handler) {
    return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function bearerValue(request) {
    const authorization = String(request.get('authorization') || '');
    if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
    return String(request.get('x-api-key') || '').trim();
}

function callerSubject(credential) {
    return `prototype:${createHash('sha256').update(credential).digest('hex')}`;
}

/**
 * `req.route`/`req.baseUrl` are only valid while the router stack is executing,
 * so a label computed on `finish`/`close` splits one route into two. The
 * original URL is stable for the whole request.
 */
function routeLabel(request) {
    const path = String(request.originalUrl || request.url || '/').split('?')[0];
    return `${request.method} ${path.replace(OPAQUE_ID_PATTERN, '/:id')}`.slice(0, 120);
}

/** Separates business traffic from control-plane and support traffic. */
function requestSurface(request) {
    const path = String(request.path || '/');
    if (path.startsWith('/v1/') || path.startsWith('/admin/api/verification/')) return 'business';
    if (path.startsWith('/admin/')) return 'console';
    if (path.startsWith('/prototype') || path.startsWith('/prototype-assets/') || path === '/healthz' || path === '/readyz' || path.startsWith('/local/')) {
        return 'support';
    }
    return 'other';
}

export function createApp({
    config,
    secretProvider,
    identity,
    conversationStore,
    d2eClient,
    adminCredential,
    logStore = new LogStore({ capacity: config.logBufferSize }),
    metrics = new RouterMetrics(),
    lifecycle = new RouterLifecycle({ drainMs: config.adminRestartDrainMs }),
    logger = new RouterLogger(logStore),
    evidenceArchive = null,
    debugCapture = null,
}) {
    const log = toLogger(logger);
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                connectSrc: ["'self'"],
                imgSrc: ["'self'", 'data:'],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));

    // Correlation and CORS run before body parsing and rate limiting so that
    // 400/413/429 responses stay readable by a browser client.
    app.use((request, response, next) => {
        const provided = String(request.get('x-correlation-id') || '').trim();
        request.correlationId = CORRELATION_PATTERN.test(provided) ? provided : randomUUID();
        response.set('X-Correlation-ID', request.correlationId);
        const origin = request.get('origin');
        if (origin && config.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
            response.set('Access-Control-Allow-Origin', origin);
            response.set('Vary', 'Origin');
            response.set(
                'Access-Control-Allow-Headers',
                'Authorization, Content-Type, X-API-Key, X-Admin-Key, X-Correlation-ID'
            );
            response.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        }
        if (request.method === 'OPTIONS') return response.sendStatus(204);
        next();
    });

    app.use((request, response, next) => {
        const releaseRequest = lifecycle.trackRequest();
        const surface = requestSurface(request);
        const finishRequest = metrics.startRequest(surface);
        let settled = false;
        const settle = () => {
            if (settled) return;
            settled = true;
            const durationMs = finishRequest(routeLabel(request), response.statusCode);
            releaseRequest();
            if (QUIET_ROUTES.some(route => request.path.startsWith(route))) return;
            log.debug('Request completed', {
                route: routeLabel(request),
                correlationId: request.correlationId,
                status: response.statusCode,
                durationMs,
            });
        };
        response.on('finish', settle);
        response.on('close', settle);
        next();
    });

    app.use(express.json({ limit: '64kb' }));

    const businessRateLimit = rateLimit({
        windowMs: 60_000,
        limit: 60,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (request, response, next) => {
            metrics.recordRateLimit();
            next(new GatewayError('RATE_LIMITED', 'Too many requests', { status: 429, retryable: true }));
        },
    });

    const authenticateCaller = asyncRoute(async (request, response, next) => {
        const provided = bearerValue(request);
        const expected = await secretProvider.get(SECRET_NAMES.prototypeApiKey);
        if (provided && constantTimeEqual(provided, expected)) {
            request.caller = { subject: callerSubject(provided) };
            return next();
        }
        if (config.localDevelopment) {
            const signingKey = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
            const session = verifySession(parseCookies(request).mcschat_local, signingKey, {
                scope: 'prototype',
            });
            if (session) {
                // The subject follows the credential that actually authenticated.
                request.caller = { subject: callerSubject('local-browser-session') };
                return next();
            }
        }
        metrics.recordUnauthorized();
        throw new GatewayError('AUTHENTICATION_REQUIRED', 'Valid Router credentials are required', {
            status: 401,
        });
    });

    const authenticateAdmin = asyncRoute(async (request, response, next) => {
        if (!(await adminCredential.status()).protected) return next();
        const provided = String(request.get('x-admin-key') || '').trim();
        if (!provided || !await adminCredential.verify(provided)) {
            metrics.recordUnauthorized();
            throw new GatewayError('ADMIN_AUTHENTICATION_REQUIRED', 'Valid administrator credentials are required', {
                status: 401,
            });
        }
        next();
    });

    app.get('/healthz', (request, response) => {
        if (lifecycle.draining) return response.status(503).json({ status: 'stopping' });
        response.json({ status: 'ok' });
    });

    app.get('/readyz', asyncRoute(async (request, response) => {
        if (lifecycle.draining) {
            return response.status(503).json({
                status: 'not-ready',
                upstreamIdentity: { state: 'stopping' },
            });
        }
        const upstreamIdentity = await identity.readiness();
        response.status(upstreamIdentity.state === 'ready' ? 200 : 503).json({
            status: upstreamIdentity.state === 'ready' ? 'ready' : 'not-ready',
            upstreamIdentity,
        });
    }));

    app.get('/admin', (request, response, next) => {
        response.sendFile(ADMIN_CONSOLE_PAGE, error => {
            if (error) next(error);
        });
    });

    app.use('/admin', createAdminRouter({
        config,
        secretProvider,
        identity,
        conversationStore,
        d2eClient,
        adminCredential,
        logStore,
        metrics,
        lifecycle,
        logger: log,
        evidenceArchive,
        debugCapture,
    }));

    if (config.localDevelopment) {
        app.post('/local/bootstrap', asyncRoute(async (request, response) => {
            const signingKey = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
            const token = signSession({
                scope: 'prototype',
                expiresAt: Date.now() + 8 * 60 * 60 * 1000,
            }, signingKey);
            response.set('Set-Cookie', sessionCookie('mcschat_local', token, {
                maxAgeSeconds: 28_800,
                path: '/',
            }));
            response.sendStatus(204);
        }));
    }

    // Retained so the documented curl bootstrap flow keeps working.
    app.post('/admin/auth/start', authenticateAdmin, asyncRoute(async (request, response) => {
        const authorization = await identity.beginAuthorization();
        response.json({ authorizationUrl: authorization.url });
    }));

    app.get('/admin/auth/callback', asyncRoute(async (request, response) => {
        const code = String(request.query.code || '');
        const state = String(request.query.state || '');
        if (!code || !state) {
            throw new GatewayError('AUTH_CALLBACK_INVALID', 'Authorization callback is incomplete', {
                status: 400,
            });
        }
        await identity.completeAuthorization({ code, state });
        log.info('Delegated identity authorization completed', {
            route: 'GET /admin/auth/callback',
            correlationId: request.correlationId,
        });
        response.redirect(302, '/admin?auth=ready');
    }));

    app.get('/prototype', (request, response, next) => {
        const pagePath = config.prototypePagePath || DEFAULT_PROTOTYPE_PAGE;
        response.set('Content-Security-Policy', PROTOTYPE_CSP);
        response.sendFile(path.resolve(pagePath), error => {
            if (error) next(error);
        });
    });

    for (const [assetName, assetPath] of Object.entries(PROTOTYPE_ASSETS)) {
        app.get(`/prototype-assets/${assetName}`, (request, response, next) => {
            response.sendFile(assetPath, error => {
                if (error) next(error);
            });
        });
    }

    app.post('/v1/conversations', businessRateLimit, authenticateCaller, asyncRoute(async (request, response) => {
        const agentId = String(request.body?.agentId || 'knowledge-new');
        if (agentId !== 'knowledge-new') {
            throw new GatewayError('AGENT_ACCESS_DENIED', 'Agent is not available', { status: 403 });
        }
        const startedAt = Date.now();
        let upstreamConversationId;
        try {
            upstreamConversationId = await d2eClient.createConversation();
            metrics.recordUpstream({
                operation: 'createConversation',
                ok: true,
                durationMs: Date.now() - startedAt,
            });
        } catch (error) {
            metrics.recordUpstream({
                operation: 'createConversation',
                ok: false,
                durationMs: Date.now() - startedAt,
                code: error?.code,
            });
            throw error;
        }
        const conversation = await conversationStore.create({
            subject: request.caller.subject,
            agentId,
            upstreamConversationId,
        });
        metrics.recordConversation('created');
        log.info('Conversation created', {
            route: 'POST /v1/conversations',
            correlationId: request.correlationId,
            conversationRef: reference(conversation.id),
            agentId,
        });
        response.status(201).json({
            conversationId: conversation.id,
            expiresAt: conversation.expiresAt,
        });
    }));

    app.post('/v1/conversations/:id/turns', businessRateLimit, authenticateCaller, asyncRoute(async (request, response, next) => {
        const text = String(request.body?.text || '').trim();
        const clientTurnId = String(request.body?.clientTurnId || randomUUID()).slice(0, 128);
        if (!text || text.length > 32_768) {
            throw new GatewayError('INVALID_TURN', 'Turn text must be between 1 and 32768 characters', {
                status: 400,
            });
        }
        const conversationRef = reference(request.params.id);
        const lease = await conversationStore.beginTurn(
            request.params.id,
            request.caller.subject,
            clientTurnId
        );
        const abortController = new AbortController();
        const abortOnClose = () => {
            if (!response.writableEnded) abortController.abort();
        };
        response.once('close', abortOnClose);

        const turnStartedAt = Date.now();
        const trace = debugCapture?.startTurn({
            conversationId: request.params.id,
            turnId: clientTurnId,
            channel: 'reduced-v1',
        });
        trace?.upstreamRequest({
            method: 'POST',
            operation: 'openTurn',
            conversationId: request.params.id,
            text,
        });
        metrics.turnStarted();
        let firstAnswerAt;
        let answerSnapshots = 0;
        let stageEvents = 0;
        let outcome = 'interrupted';
        let outcomeCode;
        let writer;
        let forgetClientTurnId;
        try {
            const upstreamStartedAt = Date.now();
            let upstreamResponse;
            try {
                upstreamResponse = await d2eClient.openTurn({
                    upstreamConversationId: lease.conversation.upstreamConversationId,
                    text,
                    signal: abortController.signal,
                });
                metrics.recordUpstream({
                    operation: 'openTurn',
                    ok: true,
                    durationMs: Date.now() - upstreamStartedAt,
                });
            } catch (error) {
                metrics.recordUpstream({
                    operation: 'openTurn',
                    ok: false,
                    durationMs: Date.now() - upstreamStartedAt,
                    code: error?.code,
                });
                throw error;
            }
            writer = new SseWriter(response);
            writer.open(request.correlationId);
            const reducer = new D2ETurnReducer(clientTurnId);
            await d2eClient.consumeActivities(upstreamResponse, async activity => {
                trace?.frame(activity);
                for (const event of reducer.reduce(activity)) {
                    if (event.type === 'answer') {
                        answerSnapshots += 1;
                        firstAnswerAt ??= Date.now();
                    } else if (event.type === 'stage') {
                        stageEvents += 1;
                    }
                    trace?.event(event);
                    writer.write(event);
                }
                return !reducer.concluded;
            });
            if (!reducer.concluded && !response.writableEnded) {
                outcome = 'error';
                outcomeCode = 'UPSTREAM_STREAM_ENDED_WITHOUT_FINAL';
                writer.writeError('UPSTREAM_STREAM_ENDED_WITHOUT_FINAL', request.correlationId, false);
            } else {
                outcome = 'final';
                writer.end();
            }
        } catch (error) {
            const aborted = error?.name === 'AbortError';
            outcome = aborted ? 'interrupted' : 'error';
            outcomeCode = aborted ? 'CLIENT_DISCONNECTED' : (error?.code || 'STREAM_INTERRUPTED');
            trace?.error({
                code: outcomeCode,
                name: error?.name,
                message: error?.message,
                retryable: Boolean(error?.retryable),
            });
            if (!writer?.opened && error?.code === 'UPSTREAM_IDENTITY_REAUTH_REQUIRED') {
                forgetClientTurnId = clientTurnId;
            }
            if (writer?.opened && !response.writableEnded) {
                writer.writeError(outcomeCode, request.correlationId, Boolean(error.retryable));
            } else if (!response.headersSent) {
                next(error);
            }
        } finally {
            response.off('close', abortOnClose);
            const totalMs = Date.now() - turnStartedAt;
            trace?.finish({
                outcome,
                code: outcomeCode,
                ttftMs: firstAnswerAt ? firstAnswerAt - turnStartedAt : null,
                totalMs,
                answerSnapshots,
                stages: stageEvents,
            });
            metrics.recordTurn({
                outcome,
                code: outcomeCode,
                ttftMs: firstAnswerAt ? firstAnswerAt - turnStartedAt : undefined,
                totalMs,
                answerSnapshots,
                stages: stageEvents,
                conversationRef,
            });
            log[outcome === 'final' ? 'info' : 'warn']('Turn completed', {
                route: 'POST /v1/conversations/:id/turns',
                correlationId: request.correlationId,
                conversationRef,
                code: outcomeCode,
                outcome,
                answerSnapshots,
                stages: stageEvents,
                totalMs,
            });
            await conversationStore.completeTurn(request.params.id, lease.lockOwner, {
                forgetClientTurnId,
            }).catch(error => {
                log.error('Failed to release conversation lock', {
                    correlationId: request.correlationId,
                    conversationRef,
                    code: error.code || 'LOCK_RELEASE_FAILED',
                });
            });
        }
    }));

    app.delete('/v1/conversations/:id', businessRateLimit, authenticateCaller, asyncRoute(async (request, response) => {
        await conversationStore.close(request.params.id, request.caller.subject);
        metrics.recordConversation('closed');
        response.sendStatus(204);
    }));

    app.use((request, response, next) => {
        next(new GatewayError('NOT_FOUND', 'Route was not found', { status: 404 }));
    });

    app.use((error, request, response, next) => {
        if (response.headersSent) return next(error);
        let gatewayError;
        if (error instanceof GatewayError) gatewayError = error;
        else if (error?.type === 'entity.parse.failed') {
            gatewayError = new GatewayError('INVALID_JSON', 'Request body is not valid JSON', {
                status: 400,
                cause: error,
            });
        } else if (error?.type === 'entity.too.large' || error?.status === 413) {
            gatewayError = new GatewayError('REQUEST_TOO_LARGE', 'Request body is too large', {
                status: 413,
                cause: error,
            });
        } else {
            gatewayError = new GatewayError('INTERNAL_ERROR', 'Router request failed', {
                status: 500,
                cause: error,
            });
        }
        log[gatewayError.status >= 500 ? 'error' : 'warn']('Router request failed', {
            route: routeLabel(request),
            correlationId: request.correlationId,
            code: gatewayError.code,
            status: gatewayError.status,
            // System-level cause only (never an upstream response body).
            upstreamCause: gatewayError.cause?.cause?.code || gatewayError.cause?.code,
        });
        response.status(gatewayError.status).json({
            error: {
                code: gatewayError.code,
                message: gatewayError.message,
                retryable: gatewayError.retryable,
                correlationId: request.correlationId,
            },
        });
    });

    app.locals.logStore = logStore;
    app.locals.metrics = metrics;
    app.locals.lifecycle = lifecycle;
    return app;
}
