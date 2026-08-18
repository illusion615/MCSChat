import { createHash, createHmac, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { constantTimeEqual } from '../crypto/cacheEnvelope.js';
import { D2ETurnReducer } from '../d2e/activityReducer.js';
import { GatewayError } from '../errors.js';
import { SECRET_NAMES } from '../secrets/secretProvider.js';
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

function asyncRoute(handler) {
    return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function bearerValue(request) {
    const authorization = String(request.get('authorization') || '');
    if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
    return String(request.get('x-api-key') || '').trim();
}

function callerSubject(apiKey) {
    return `prototype:${createHash('sha256').update(apiKey).digest('hex')}`;
}

function parseCookies(request) {
    return Object.fromEntries(String(request.get('cookie') || '')
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => {
            const separator = part.indexOf('=');
            return separator < 0
                ? [part, '']
                : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
        }));
}

function signLocalSession(payload, signingKey) {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', signingKey).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
}

function verifyLocalSession(token, signingKey) {
    const [encoded, signature] = String(token || '').split('.');
    if (!encoded || !signature) return false;
    const expected = createHmac('sha256', signingKey).update(encoded).digest('base64url');
    if (!constantTimeEqual(signature, expected)) return false;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        return payload.scope === 'prototype' && Number(payload.expiresAt) > Date.now();
    } catch {
        return false;
    }
}

export function createApp({
    config,
    secretProvider,
    identity,
    conversationStore,
    d2eClient,
    logger = console,
}) {
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                connectSrc: ["'self'", ...config.allowedOrigins],
                imgSrc: ["'self'", 'data:'],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use(express.json({ limit: '64kb' }));
    app.use(rateLimit({
        windowMs: 60_000,
        limit: 60,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
    }));
    app.use((request, response, next) => {
        request.correlationId = String(request.get('x-correlation-id') || randomUUID()).slice(0, 128);
        response.set('X-Correlation-ID', request.correlationId);
        const origin = request.get('origin');
        if (origin && config.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
            response.set('Access-Control-Allow-Origin', origin);
            response.set('Vary', 'Origin');
            response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-API-Key, X-Correlation-ID');
            response.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        }
        if (request.method === 'OPTIONS') return response.sendStatus(204);
        next();
    });

    const authenticateCaller = asyncRoute(async (request, response, next) => {
        const provided = bearerValue(request);
        const expected = await secretProvider.get(SECRET_NAMES.prototypeApiKey);
        let authenticated = Boolean(provided) && constantTimeEqual(provided, expected);
        if (!authenticated && config.localDevelopment) {
            const signingKey = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
            authenticated = verifyLocalSession(parseCookies(request).mcschat_local, signingKey);
        }
        if (!authenticated) {
            throw new GatewayError('AUTHENTICATION_REQUIRED', 'Valid Router credentials are required', {
                status: 401,
            });
        }
        request.caller = {
            subject: callerSubject(provided || 'local-browser-session'),
        };
        next();
    });

    const authenticateAdmin = asyncRoute(async (request, response, next) => {
        const provided = String(request.get('x-admin-key') || '').trim();
        const expected = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
        if (!provided || !constantTimeEqual(provided, expected)) {
            throw new GatewayError('ADMIN_AUTHENTICATION_REQUIRED', 'Valid administrator credentials are required', {
                status: 401,
            });
        }
        next();
    });

    app.get('/healthz', (request, response) => response.json({ status: 'ok' }));

    app.get('/readyz', asyncRoute(async (request, response) => {
        const upstreamIdentity = await identity.readiness();
        response.status(upstreamIdentity.state === 'ready' ? 200 : 503).json({
            status: upstreamIdentity.state === 'ready' ? 'ready' : 'not-ready',
            upstreamIdentity,
        });
    }));

    if (config.localDevelopment) {
        app.post('/local/bootstrap', asyncRoute(async (request, response) => {
            const signingKey = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
            const token = signLocalSession({
                scope: 'prototype',
                expiresAt: Date.now() + 8 * 60 * 60 * 1000,
            }, signingKey);
            response.set('Set-Cookie', [
                `mcschat_local=${encodeURIComponent(token)}`,
                'HttpOnly',
                'SameSite=Strict',
                'Path=/',
                'Max-Age=28800',
            ].join('; '));
            response.sendStatus(204);
        }));
    }

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
        response.redirect(302, '/prototype?auth=ready');
    }));

    app.get('/prototype', (request, response, next) => {
        const pagePath = config.prototypePagePath || DEFAULT_PROTOTYPE_PAGE;
        response.sendFile(path.resolve(pagePath), error => {
            if (error) next(error);
        });
    });

    for (const assetName of ['marked.min.js', 'purify.min.js']) {
        app.get(`/prototype-assets/${assetName}`, (request, response, next) => {
            response.sendFile(path.resolve(DEFAULT_ASSET_ROOT, assetName), error => {
                if (error) next(error);
            });
        });
    }

    app.post('/v1/conversations', authenticateCaller, asyncRoute(async (request, response) => {
        const agentId = String(request.body?.agentId || 'knowledge-new');
        if (agentId !== 'knowledge-new') {
            throw new GatewayError('AGENT_ACCESS_DENIED', 'Agent is not available', { status: 403 });
        }
        const upstreamConversationId = await d2eClient.createConversation();
        const conversation = await conversationStore.create({
            subject: request.caller.subject,
            agentId,
            upstreamConversationId,
        });
        response.status(201).json({
            conversationId: conversation.id,
            expiresAt: conversation.expiresAt,
        });
    }));

    app.post('/v1/conversations/:id/turns', authenticateCaller, asyncRoute(async (request, response, next) => {
        const text = String(request.body?.text || '').trim();
        const clientTurnId = String(request.body?.clientTurnId || randomUUID()).slice(0, 128);
        if (!text || text.length > 32_768) {
            throw new GatewayError('INVALID_TURN', 'Turn text must be between 1 and 32768 characters', {
                status: 400,
            });
        }
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
        let writer;
        let forgetClientTurnId;
        try {
            const upstreamResponse = await d2eClient.openTurn({
                upstreamConversationId: lease.conversation.upstreamConversationId,
                text,
                signal: abortController.signal,
            });
            writer = new SseWriter(response);
            writer.open(request.correlationId);
            const reducer = new D2ETurnReducer(clientTurnId);
            await d2eClient.consumeActivities(upstreamResponse, async activity => {
                for (const event of reducer.reduce(activity)) writer.write(event);
                return !reducer.concluded;
            });
            if (!reducer.concluded && !response.writableEnded) {
                writer.writeError('UPSTREAM_STREAM_ENDED_WITHOUT_FINAL', request.correlationId, false);
            } else {
                writer.end();
            }
        } catch (error) {
            if (!writer?.opened && error?.code === 'UPSTREAM_IDENTITY_REAUTH_REQUIRED') {
                forgetClientTurnId = clientTurnId;
            }
            if (writer?.opened && !response.writableEnded) {
                writer.writeError(
                    error?.name === 'AbortError' ? 'CLIENT_DISCONNECTED' : (error.code || 'STREAM_INTERRUPTED'),
                    request.correlationId,
                    Boolean(error.retryable)
                );
            } else if (!response.headersSent) {
                next(error);
            }
        } finally {
            response.off('close', abortOnClose);
            await conversationStore.completeTurn(request.params.id, lease.lockOwner, {
                forgetClientTurnId,
            }).catch(error => {
                logger.error('Failed to release conversation lock', {
                    correlationId: request.correlationId,
                    code: error.code || 'LOCK_RELEASE_FAILED',
                });
            });
        }
    }));

    app.delete('/v1/conversations/:id', authenticateCaller, asyncRoute(async (request, response) => {
        await conversationStore.close(request.params.id, request.caller.subject);
        response.sendStatus(204);
    }));

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
        logger.error('Router request failed', {
            correlationId: request.correlationId,
            code: gatewayError.code,
            status: gatewayError.status,
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

    return app;
}
