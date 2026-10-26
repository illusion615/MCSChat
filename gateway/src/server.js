import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { fileURLToPath } from 'node:url';

import { loadConfig } from './config.js';
import { D2EClient } from './d2e/d2eClient.js';
import { createApp } from './http/createApp.js';
import { DelegatedIdentity } from './identity/delegatedIdentity.js';
import { DebugCapture } from './observability/debugCapture.js';
import { LogStore, RouterLogger } from './observability/logStore.js';
import { RouterMetrics } from './observability/metrics.js';
import { RouterLifecycle } from './runtime/lifecycle.js';
import { createSecretProvider, SECRET_NAMES } from './secrets/secretProvider.js';
import { AdminCredential } from './security/adminCredential.js';
import { ConversationStore } from './storage/conversationStore.js';
import { EvidenceArchive } from './storage/evidenceArchive.js';
import { LocalFileStateStore } from './storage/localFileStateStore.js';

// The administrator key is optional: the console can run unprotected and offer
// to set a password from its own UI.
const OPTIONAL_SECRETS = new Set([SECRET_NAMES.adminApiKey]);
const STATE_SWEEP_INTERVAL_MS = 5 * 60_000;

/** Drops turn traces whose conversation record is gone, so evidence expires together. */
async function purgeTraceTrees(evidenceArchive, conversationStore) {
    const live = new Set((await conversationStore.list()).map(conversation => conversation.id));
    const directories = await evidenceArchive.listSubdirectories('debug');
    let removed = 0;
    for (const name of directories) {
        if (live.has(name)) continue;
        await evidenceArchive.removeTree(`debug/${name}`);
        removed += 1;
    }
    return removed;
}

/** Fails fast with every missing secret named at once instead of one per request. */
async function verifySecrets(secretProvider) {
    const missing = [];
    for (const name of Object.values(SECRET_NAMES)) {
        if (OPTIONAL_SECRETS.has(name)) continue;
        try {
            await secretProvider.get(name);
        } catch (error) {
            missing.push(error.message);
        }
    }
    if (missing.length) throw new Error(`Router configuration is incomplete:\n  - ${missing.join('\n  - ')}`);
}

export async function startServer(env = process.env) {
    const config = loadConfig(env);
    // Without this, a host that advertises AAAA on an IPv6-less network fails
    // every outbound call with ETIMEDOUT once the 250 ms default elapses.
    setDefaultAutoSelectFamilyAttemptTimeout(config.upstreamConnectAttemptMs);
    const secretProvider = createSecretProvider(env);
    await verifySecrets(secretProvider);

    const logStore = new LogStore({ capacity: config.logBufferSize });
    const logger = new RouterLogger(logStore);
    const metrics = new RouterMetrics();
    const lifecycle = new RouterLifecycle({ logger, drainMs: config.adminRestartDrainMs });

    const stateStore = new LocalFileStateStore(config.localStateDirectory);
    await stateStore.initialize();
    const evidenceArchive = new EvidenceArchive(config.localStateDirectory, {
        onError: error => logger.warn('Evidence archive write failed', { code: error?.code }),
    });
    await evidenceArchive.initialize();
    logStore.attachArchive(evidenceArchive);
    const hydrated = await logStore.hydrate().catch(() => 0);
    const debugCapture = new DebugCapture(evidenceArchive, {
        enabled: config.debugCaptureEnabled,
        stateStore,
    });
    await debugCapture.initialize();
    const adminCredential = new AdminCredential({ stateStore, secretProvider, logger });
    const identity = new DelegatedIdentity({ config, secretProvider, stateStore, logger });
    await identity.initialize();
    const conversationStore = new ConversationStore(stateStore, {
        ttlMinutes: config.conversationTtlMinutes,
        lockDurationMs: config.upstreamTimeoutMs + 30_000,
    });
    const d2eClient = new D2EClient({ config, identity });

    const retentionCutoff = () => Date.now() - config.retentionDays * 86_400_000;
    async function sweepRetention() {
        // Authorization transactions hold short-lived PKCE secrets, so they keep
        // their own aggressive expiry instead of the evidence retention window.
        const [conversations, transactions, logs, traces] = await Promise.all([
            conversationStore.purgeBefore(retentionCutoff()).catch(() => 0),
            identity.purgeExpiredAuthTransactions().catch(() => 0),
            logStore.purgeBefore(retentionCutoff()).catch(() => ({ removedFiles: 0 })),
            purgeTraceTrees(evidenceArchive, conversationStore).catch(() => 0),
        ]);
        if (conversations || transactions || logs.removedFiles || traces) {
            logger.info('Applied evidence retention', {
                retentionDays: config.retentionDays,
                purgedConversations: conversations,
                purgedTransactions: transactions,
                purgedLogFiles: logs.removedFiles,
                purgedTraceTrees: traces,
            });
        }
    }

    await sweepRetention();
    if (hydrated) logger.info('Restored log history from archive', { entries: hydrated });

    const sweep = setInterval(() => { sweepRetention().catch(() => undefined); }, STATE_SWEEP_INTERVAL_MS);
    sweep.unref();

    const app = createApp({
        config,
        secretProvider,
        identity,
        conversationStore,
        d2eClient,
        adminCredential,
        logStore,
        metrics,
        lifecycle,
        logger,
        evidenceArchive,
        debugCapture,
    });

    const server = app.listen(config.port, '127.0.0.1', () => {
        logger.info('Router listening', { port: config.port, host: '127.0.0.1' });
        console.log(`MCSChat D2E Router listening on http://127.0.0.1:${config.port}`);
        console.log(`  Admin console:      http://127.0.0.1:${config.port}/admin`);
        console.log(`  Verification page:  http://127.0.0.1:${config.port}/prototype`);
        adminCredential.status().then(state => {
            if (!state.protected) {
                console.log('  Admin console has NO password set — open it and set one under Security.');
            }
        }).catch(() => undefined);
    });
    server.on('error', error => {
        console.error(`Router failed to bind port ${config.port}: ${error.code || 'LISTEN_FAILED'}`);
        process.exit(1);
    });
    lifecycle.attach(server).installSignalHandlers();
    return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startServer().catch(error => {
        console.error(`Router startup failed: ${error.message}`);
        process.exitCode = 1;
    });
}
