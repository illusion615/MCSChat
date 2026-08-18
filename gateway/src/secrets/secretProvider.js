export const SECRET_NAMES = Object.freeze({
    entraClientSecret: 'entra-client-secret',
    cacheEncryptionKey: 'msal-cache-encryption-key',
    prototypeApiKey: 'prototype-api-key',
    adminSessionSigningKey: 'admin-session-signing-key',
});

export class EnvironmentSecretProvider {
    constructor(env = process.env) {
        this.env = env;
        this.mapping = Object.freeze({
            [SECRET_NAMES.entraClientSecret]: 'LOCAL_ENTRA_CLIENT_SECRET',
            [SECRET_NAMES.cacheEncryptionKey]: 'LOCAL_MSAL_CACHE_ENCRYPTION_KEY',
            [SECRET_NAMES.prototypeApiKey]: 'LOCAL_PROTOTYPE_API_KEY',
            [SECRET_NAMES.adminSessionSigningKey]: 'LOCAL_ADMIN_SESSION_SIGNING_KEY',
        });
    }

    async get(name) {
        const envName = this.mapping[name];
        const value = envName ? String(this.env[envName] || '').trim() : '';
        if (!value) throw new Error(`Missing local secret configuration: ${envName || name}`);
        return value;
    }
}

export function createSecretProvider(env = process.env) {
    return new EnvironmentSecretProvider(env);
}
