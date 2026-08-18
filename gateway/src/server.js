import { loadConfig } from './config.js';
import { D2EClient } from './d2e/d2eClient.js';
import { createApp } from './http/createApp.js';
import { DelegatedIdentity } from './identity/delegatedIdentity.js';
import { createSecretProvider } from './secrets/secretProvider.js';
import { ConversationStore } from './storage/conversationStore.js';
import { LocalFileStateStore } from './storage/localFileStateStore.js';

export async function startServer(env = process.env) {
    const config = loadConfig(env);
    const secretProvider = createSecretProvider(env);
    const stateStore = new LocalFileStateStore(config.localStateDirectory);
    await stateStore.initialize();
    const identity = new DelegatedIdentity({ config, secretProvider, stateStore });
    await identity.initialize();
    const conversationStore = new ConversationStore(stateStore, {
        ttlMinutes: config.conversationTtlMinutes,
        lockDurationMs: config.upstreamTimeoutMs + 30_000,
    });
    const d2eClient = new D2EClient({ config, identity });
    const app = createApp({
        config,
        secretProvider,
        identity,
        conversationStore,
        d2eClient,
    });
    return app.listen(config.port, '127.0.0.1', () => {
        console.log(`MCSChat D2E Gateway listening on port ${config.port}`);
    });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    startServer().catch(error => {
        console.error('Gateway startup failed', { code: error.code || 'STARTUP_FAILED' });
        process.exitCode = 1;
    });
}
