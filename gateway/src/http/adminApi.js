/**
 * Administrative surface for the Router console.
 *
 * This module owns authentication for `/admin`, read models for logs, metrics
 * and conversations, export endpoints, and the restart entry point. It never
 * calls D2E, never reads the MSAL cache, and never calls `process.exit` — a
 * restart is expressed through `lifecycle.requestRestart()`.
 */

import { randomUUID } from 'node:crypto';

import express from 'express';
import rateLimit from 'express-rate-limit';

import { GatewayError } from '../errors.js';
import { reference } from '../observability/logStore.js';
import { SECRET_NAMES } from '../secrets/secretProvider.js';
import { clearedCookie, parseCookies, sessionCookie, signSession, verifySession } from './session.js';
import { registerVerificationRoutes } from './verificationApi.js';

const ADMIN_COOKIE = 'mcschat_admin';
const ADMIN_COOKIE_PATH = '/admin';
const ADMIN_SCOPE = 'admin';
const MAX_ADMIN_STREAMS = 8;
const METRICS_PUSH_INTERVAL_MS = 5_000;

function asyncRoute(handler) {
    return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function fileTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function attachDownload(response, kind, extension, contentType) {
    response.set('Content-Type', contentType);
    response.set('Content-Disposition', `attachment; filename="router-${kind}-${fileTimestamp()}.${extension}"`);
}

function logsFilterFrom(query) {
    return {
        level: ['debug', 'info', 'warn', 'error'].includes(query.level) ? query.level : undefined,
        q: query.q ? String(query.q).slice(0, 200) : undefined,
        correlationId: query.correlationId ? String(query.correlationId).slice(0, 128) : undefined,
        since: query.since,
        limit: query.limit,
    };
}

function formatLogLine(entry) {
    const fields = Object.entries(entry.fields || {})
        .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
        .join(' ');
    return [
        entry.at,
        entry.level.toUpperCase().padEnd(5),
        entry.correlationId ? `[${entry.correlationId}]` : '',
        entry.message,
        entry.code ? `code=${entry.code}` : '',
        fields,
    ].filter(Boolean).join(' ');
}

export function createAdminRouter({
    config,
    secretProvider,
    identity,
    conversationStore,
    d2eClient,
    adminCredential,
    logStore,
    metrics,
    lifecycle,
    logger = console,
}) {
    const router = express.Router();
    const sessionTtlMs = (Number(config.adminSessionTtlMinutes) || 60) * 60_000;
    let activeStreams = 0;

    router.use(rateLimit({
        windowMs: 60_000,
        limit: 300,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: request => request.path === '/api/stream'
            || request.path.startsWith('/api/verification/'),
        handler: (request, response, next) => {
            metrics.recordRateLimit();
            next(new GatewayError('RATE_LIMITED', 'Too many administrative requests', {
                status: 429,
                retryable: true,
            }));
        },
    }));

    async function adminSessionFrom(request) {
        const signingKey = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
        return verifySession(parseCookies(request)[ADMIN_COOKIE], signingKey, { scope: ADMIN_SCOPE });
    }

    const requireAdmin = asyncRoute(async (request, response, next) => {
        const credentialState = await adminCredential.status();
        // With no password configured the console is open; the UI surfaces this
        // and offers to set one.
        if (!credentialState.protected) {
            request.adminSession = { sessionId: 'open', via: 'unprotected' };
            return next();
        }
        const providedKey = String(request.get('x-admin-key') || '').trim();
        if (providedKey && await adminCredential.verify(providedKey)) {
            request.adminSession = { sessionId: 'header', via: 'api-key' };
            return next();
        }
        const session = await adminSessionFrom(request);
        if (session) {
            request.adminSession = { sessionId: session.sessionId, via: 'cookie' };
            return next();
        }
        metrics.recordUnauthorized();
        throw new GatewayError('ADMIN_AUTHENTICATION_REQUIRED', 'Valid administrator credentials are required', {
            status: 401,
        });
    });

    /**
     * The verification passthrough additionally accepts the loopback browser
     * session so the local verification page needs no sign-in. On a loopback
     * runtime that session is obtainable by any process on this machine, so the
     * boundary here is "local" rather than "administrator" — the routes are
     * therefore only registered while `localDevelopment` is set.
     */
    const requireVerificationAccess = asyncRoute(async (request, response, next) => {
        const providedKey = String(request.get('x-admin-key') || '').trim();
        if (providedKey && await adminCredential.verify(providedKey)) {
            request.adminSession = { sessionId: 'header', via: 'api-key' };
            return next();
        }
        const signingKey = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
        const cookies = parseCookies(request);
        const adminSession = verifySession(cookies[ADMIN_COOKIE], signingKey, { scope: ADMIN_SCOPE });
        if (adminSession) {
            request.adminSession = { sessionId: adminSession.sessionId, via: 'cookie' };
            return next();
        }
        if (config.localDevelopment) {
            const localSession = verifySession(cookies.mcschat_local, signingKey, { scope: 'prototype' });
            if (localSession) {
                request.adminSession = { sessionId: 'local', via: 'loopback' };
                return next();
            }
        }
        metrics.recordUnauthorized();
        throw new GatewayError('ADMIN_AUTHENTICATION_REQUIRED', 'A Router session is required', {
            status: 401,
        });
    });

    router.post('/session', asyncRoute(async (request, response) => {
        const provided = String(request.body?.adminKey || request.get('x-admin-key') || '').trim();
        if (!provided || !await adminCredential.verify(provided)) {
            metrics.recordUnauthorized();
            logger.warn('Administrator sign-in rejected', {
                route: '/admin/session',
                correlationId: request.correlationId,
                code: 'ADMIN_AUTHENTICATION_REQUIRED',
            });
            throw new GatewayError('ADMIN_AUTHENTICATION_REQUIRED', 'Valid administrator credentials are required', {
                status: 401,
            });
        }
        const signingKey = await secretProvider.get(SECRET_NAMES.adminSessionSigningKey);
        const sessionId = randomUUID().slice(0, 8);
        const expiresAt = Date.now() + sessionTtlMs;
        const token = signSession({ scope: ADMIN_SCOPE, sessionId, issuedAt: Date.now(), expiresAt }, signingKey);
        response.set('Set-Cookie', sessionCookie(ADMIN_COOKIE, token, {
            maxAgeSeconds: Math.floor(sessionTtlMs / 1000),
            path: ADMIN_COOKIE_PATH,
        }));
        metrics.recordAdminEvent('signIn');
        logger.info('Administrator signed in', {
            route: '/admin/session',
            correlationId: request.correlationId,
            sessionRef: sessionId,
        });
        response.json({ sessionId, expiresAt: new Date(expiresAt).toISOString() });
    }));

    router.delete('/session', asyncRoute(async (request, response) => {
        const session = await adminSessionFrom(request);
        response.set('Set-Cookie', clearedCookie(ADMIN_COOKIE, ADMIN_COOKIE_PATH));
        if (session) {
            metrics.recordAdminEvent('signOut');
            logger.info('Administrator signed out', {
                route: '/admin/session',
                correlationId: request.correlationId,
                sessionRef: session.sessionId,
            });
        }
        response.sendStatus(204);
    }));

    // Readable before sign-in so the console knows whether to show a gate.
    router.get('/api/security', asyncRoute(async (request, response) => {
        response.json(await adminCredential.status());
    }));

    router.post('/api/security/password', requireAdmin, asyncRoute(async (request, response) => {
        const current = await adminCredential.status();
        if (!current.changeable) {
            throw new GatewayError(
                'PASSWORD_MANAGED_EXTERNALLY',
                'LOCAL_ADMIN_API_KEY governs access; remove it from .env.local to manage the password here',
                { status: 409 }
            );
        }
        const nextPassword = String(request.body?.password || '');
        // Changing an existing password requires proving the current one, unless
        // the caller already holds a session established with it.
        if (current.source === 'password' && request.adminSession?.via === 'api-key') {
            const currentPassword = String(request.body?.currentPassword || '');
            if (!await adminCredential.verify(currentPassword)) {
                throw new GatewayError('PASSWORD_CURRENT_INVALID', 'The current password is incorrect', {
                    status: 401,
                });
            }
        }
        const state = await adminCredential.set(nextPassword);
        metrics.recordAdminEvent(current.protected ? 'passwordChanged' : 'passwordInitialized');
        logger.warn('Administrator password updated', {
            route: '/admin/api/security/password',
            correlationId: request.correlationId,
            code: current.protected ? 'ADMIN_PASSWORD_CHANGED' : 'ADMIN_PASSWORD_INITIALIZED',
        });
        response.json(state);
    }));

    router.delete('/api/security/password', requireAdmin, asyncRoute(async (request, response) => {
        const state = await adminCredential.clear();
        metrics.recordAdminEvent('passwordCleared');
        logger.warn('Administrator password removed', {
            route: '/admin/api/security/password',
            correlationId: request.correlationId,
            code: 'ADMIN_PASSWORD_CLEARED',
        });
        response.set('Set-Cookie', clearedCookie(ADMIN_COOKIE, ADMIN_COOKIE_PATH));
        response.json(state);
    }));

    router.get('/api/overview', requireAdmin, asyncRoute(async (request, response) => {
        const upstreamIdentity = await identity.status();
        response.json({
            identity: upstreamIdentity,
            security: await adminCredential.status(),
            runtime: {
                ...lifecycle.status(),
                nodeVersion: process.version,
                pid: process.pid,
                restartSupervised: process.env.ROUTER_SUPERVISED === '1',
            },
            router: {
                port: config.port,
                publicBaseUrl: config.publicBaseUrl,
                allowedOrigins: config.allowedOrigins,
                environmentIdPrefix: String(config.environmentId).slice(0, 8),
                schemaName: config.schemaName,
                apiVersion: config.apiVersion,
                conversationTtlMinutes: config.conversationTtlMinutes,
                upstreamTimeoutMs: config.upstreamTimeoutMs,
                restartDrainMs: config.adminRestartDrainMs,
            },
            logs: logStore.stats(),
        });
    }));

    router.post('/api/auth/start', requireAdmin, asyncRoute(async (request, response) => {
        const authorization = await identity.beginAuthorization();
        metrics.recordAdminEvent('authorizationStarted');
        logger.info('Administrator authorization started', {
            route: '/admin/api/auth/start',
            correlationId: request.correlationId,
            sessionRef: request.adminSession?.sessionId,
        });
        response.json({ authorizationUrl: authorization.url });
    }));

    router.post('/api/auth/reset', requireAdmin, asyncRoute(async (request, response) => {
        const result = await identity.signOut();
        metrics.recordAdminEvent('authorizationReset');
        logger.warn('Delegated identity reset by administrator', {
            route: '/admin/api/auth/reset',
            correlationId: request.correlationId,
            sessionRef: request.adminSession?.sessionId,
        });
        response.json(result);
    }));

    /**
     * `conversations.created/closed` are counters that reset with the process, so
     * the live totals come from the store instead of arithmetic on them.
     */
    async function metricsSnapshot() {
        const snapshot = metrics.snapshot();
        const stored = await conversationStore.list().catch(() => []);
        snapshot.conversations.stored = stored.length;
        snapshot.conversations.active = stored.filter(item => item.status !== 'expired').length;
        snapshot.conversations.idle = stored.filter(item => item.turnCount === 0).length;
        return snapshot;
    }

    router.get('/api/logs', requireAdmin, (request, response) => {
        const filter = logsFilterFrom(request.query);
        response.json({ filter, stats: logStore.stats(), entries: logStore.query(filter) });
    });

    router.get('/api/metrics', requireAdmin, asyncRoute(async (request, response) => {
        response.json(await metricsSnapshot());
    }));

    router.get('/api/conversations', requireAdmin, asyncRoute(async (request, response) => {
        const conversations = await conversationStore.list();
        response.json({
            total: conversations.length,
            active: conversations.filter(item => item.status !== 'expired').length,
            conversations,
        });
    }));

    router.delete('/api/conversations/:id', requireAdmin, asyncRoute(async (request, response) => {
        await conversationStore.forceClose(request.params.id);
        metrics.recordConversation('forceClosed');
        logger.warn('Conversation force-closed by administrator', {
            route: '/admin/api/conversations/:id',
            correlationId: request.correlationId,
            sessionRef: request.adminSession?.sessionId,
            conversationRef: reference(request.params.id),
        });
        response.sendStatus(204);
    }));

    router.post('/api/restart', requireAdmin, (request, response) => {
        const outcome = lifecycle.requestRestart({
            reason: 'admin-console',
            sessionRef: request.adminSession?.sessionId,
        });
        metrics.recordAdminEvent('restartRequested');
        response.status(outcome.accepted ? 202 : 409).json({
            restarting: outcome.accepted,
            drainMs: outcome.drainMs,
        });
    });

    router.get('/api/stream', requireAdmin, (request, response) => {
        if (activeStreams >= MAX_ADMIN_STREAMS) {
            throw new GatewayError('ADMIN_STREAM_LIMIT', 'Too many console streams are open', {
                status: 429,
                retryable: true,
            });
        }
        activeStreams += 1;

        response.status(200).set({
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        response.socket?.setNoDelay(true);
        response.flushHeaders();

        const send = (event, data) => {
            if (response.writableEnded) return;
            response.write(`event: ${event}\n`);
            response.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        send('ready', { at: new Date().toISOString(), lastSeq: logStore.stats().lastSeq });

        const unsubscribeLog = logStore.subscribe(entry => send('log', entry));
        const metricsTimer = setInterval(() => {
            metricsSnapshot().then(snapshot => send('metrics', snapshot)).catch(() => undefined);
        }, METRICS_PUSH_INTERVAL_MS);
        metricsTimer.unref?.();
        const unsubscribeDrain = lifecycle.onDrain(({ reason }) => {
            send('shutdown', { reason, at: new Date().toISOString() });
            close();
        });

        let closed = false;
        function close() {
            if (closed) return;
            closed = true;
            activeStreams = Math.max(0, activeStreams - 1);
            clearInterval(metricsTimer);
            unsubscribeLog?.();
            unsubscribeDrain?.();
            if (!response.writableEnded) response.end();
        }

        if (!unsubscribeLog) {
            send('error', { code: 'ADMIN_STREAM_LIMIT' });
            close();
            return;
        }
        request.on('close', close);
    });

    router.get('/api/export/logs', requireAdmin, (request, response) => {
        const filter = logsFilterFrom({ ...request.query, limit: request.query.limit || logStore.capacity });
        const entries = logStore.query(filter);
        const format = ['json', 'ndjson', 'txt'].includes(request.query.format) ? request.query.format : 'json';
        metrics.recordAdminEvent('exportLogs');

        if (format === 'ndjson') {
            attachDownload(response, 'logs', 'ndjson', 'application/x-ndjson; charset=utf-8');
            response.send(entries.map(entry => JSON.stringify(entry)).join('\n'));
            return;
        }
        if (format === 'txt') {
            attachDownload(response, 'logs', 'txt', 'text/plain; charset=utf-8');
            response.send(entries.map(formatLogLine).join('\n'));
            return;
        }
        attachDownload(response, 'logs', 'json', 'application/json; charset=utf-8');
        response.send(JSON.stringify({
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            filter,
            stats: logStore.stats(),
            entries,
        }, null, 2));
    });

    router.get('/api/export/metrics', requireAdmin, asyncRoute(async (request, response) => {
        metrics.recordAdminEvent('exportMetrics');
        attachDownload(response, 'metrics', 'json', 'application/json; charset=utf-8');
        response.send(JSON.stringify({
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            metrics: await metricsSnapshot(),
        }, null, 2));
    }));

    router.get('/api/export/diagnostics', requireAdmin, asyncRoute(async (request, response) => {
        const [upstreamIdentity, conversations] = await Promise.all([
            identity.status(),
            conversationStore.list().catch(() => []),
        ]);
        metrics.recordAdminEvent('exportDiagnostics');
        attachDownload(response, 'diagnostics', 'json', 'application/json; charset=utf-8');
        response.send(JSON.stringify({
            schemaVersion: 1,
            evidenceType: 'router-diagnostics',
            exportedAt: new Date().toISOString(),
            identity: upstreamIdentity,
            runtime: { ...lifecycle.status(), nodeVersion: process.version },
            router: {
                port: config.port,
                environmentIdPrefix: String(config.environmentId).slice(0, 8),
                schemaName: config.schemaName,
                apiVersion: config.apiVersion,
                allowedOrigins: config.allowedOrigins,
            },
            metrics: metrics.snapshot(),
            conversations: conversations.map(({ id, ...rest }) => rest),            logs: { stats: logStore.stats(), entries: logStore.snapshot() },
        }, null, 2));
    }));

    if (config.localDevelopment) {
        registerVerificationRoutes(router, {
            requireAccess: requireVerificationAccess,
            asyncRoute,
            conversationStore,
            d2eClient,
            metrics,
            logger,
        });
    }

    return router;
}
