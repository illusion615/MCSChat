import { decryptCache, encryptCache } from '../crypto/cacheEnvelope.js';

const CACHE_PATH = 'identity/msal-cache.bin';

export class EncryptedMsalCachePlugin {
    constructor(stateStore, encryptionKey) {
        this.stateStore = stateStore;
        this.encryptionKey = encryptionKey;
        this.etag = undefined;
    }

    async beforeCacheAccess(cacheContext) {
        const entry = await this.stateStore.read(CACHE_PATH);
        this.etag = entry?.etag;
        if (!entry?.data?.length) return;
        const serialized = decryptCache(entry.data, this.encryptionKey).toString('utf8');
        cacheContext.tokenCache.deserialize(serialized);
    }

    async afterCacheAccess(cacheContext) {
        if (!cacheContext.cacheHasChanged) return;
        const serialized = cacheContext.tokenCache.serialize();
        const envelope = encryptCache(serialized, this.encryptionKey);
        const result = await this.stateStore.write(CACHE_PATH, envelope, { etag: this.etag });
        this.etag = result.etag;
    }
}
