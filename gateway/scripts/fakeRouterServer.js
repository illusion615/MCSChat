import { once } from 'node:events';

import { createApp } from '../src/http/createApp.js';
import { StateConflictError } from '../src/errors.js';
import { ConversationStore } from '../src/storage/conversationStore.js';

class MemoryStateStore {
    constructor() {
        this.entries = new Map();
        this.version = 0;
    }

    async readJson(path) {
        const entry = this.entries.get(path);
        return entry ? { value: structuredClone(entry.value), etag: entry.etag } : null;
    }

    async writeJson(path, value, { etag } = {}) {
        const current = this.entries.get(path);
        if ((current && current.etag !== etag) || (!current && etag)) throw new StateConflictError();
        const next = { value: structuredClone(value), etag: `etag-${++this.version}` };
        this.entries.set(path, next);
        return { etag: next.etag };
    }

    async remove(path) {
        this.entries.delete(path);
    }
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const d2eClient = {
    async createConversation() {
        await wait(80);
        return 'fake-upstream-conversation';
    },
    async openTurn({ text }) {
        return { body: true, finalOnly: /final-only/i.test(text) };
    },
    async consumeActivities(response, onActivity) {
        const activities = response.finalOnly ? [
            { type: 'message', text: 'This response arrived as a final-only message.', channelData: { streamType: 'final' } },
        ] : [
            { type: 'typing', text: '', entities: [{ type: 'thought', text: 'hidden reasoning' }] },
            { type: 'typing', text: 'Loading skill...', channelData: { streamType: 'informative', streamSequence: 1 } },
            { type: 'typing', text: '', entities: [{ type: 'toolCall', tool_call_id: 'fake-tool', status: 'started' }] },
            { type: 'typing', text: 'To enter BIOS mode, restart your PC', channelData: { streamType: 'streaming', streamSequence: 2 } },
            { type: 'typing', text: 'To enter BIOS mode, restart your PC and press F2 during startup.', channelData: { streamType: 'streaming', streamSequence: 3 } },
            { type: 'typing', text: '', entities: [{ type: 'toolCall', tool_call_id: 'fake-tool', status: 'completed', duration_ms: 640 }] },
            { type: 'message', text: 'To enter BIOS mode, restart your PC and press F2 during startup.', channelData: { streamType: 'final' } },
        ];
        for (const activity of activities) {
            await wait(90);
            await onActivity(activity);
        }
        return activities.length;
    },
};

const config = {
    allowedOrigins: ['http://127.0.0.1:8090', 'http://localhost:8090'],
    prototypePagePath: new URL('../../examples/d2e-router-streaming-test.html', import.meta.url).pathname,
};
const stateStore = new MemoryStateStore();
const app = createApp({
    config,
    secretProvider: { get: async () => 'router-test-key' },
    identity: {
        status: async () => ({ state: 'ready', updatedAt: new Date().toISOString() }),
        readiness: async () => ({ state: 'ready', updatedAt: new Date().toISOString() }),
        beginAuthorization: async () => ({ url: 'https://login.example.test' }),
        completeAuthorization: async () => ({ state: 'ready' }),
    },
    conversationStore: new ConversationStore(stateStore),
    d2eClient,
    logger: console,
});

const server = app.listen(8090);
await once(server, 'listening');
console.log('Fake Router listening at http://127.0.0.1:8090/prototype');
