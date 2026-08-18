import { randomUUID } from 'node:crypto';
import {
    ConfidentialClientApplication,
    CryptoProvider,
    InteractionRequiredAuthError,
} from '@azure/msal-node';

import {
    decodeEncryptionKey,
    decryptCache,
    encryptCache,
} from '../crypto/cacheEnvelope.js';
import { GatewayError, StateConflictError } from '../errors.js';
import { SECRET_NAMES } from '../secrets/secretProvider.js';
import { EncryptedMsalCachePlugin } from './encryptedMsalCachePlugin.js';

const ACCOUNT_PATH = 'identity/account.json';
const AUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const AUTH_STATE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiresInteraction(error) {
    return error instanceof InteractionRequiredAuthError
        || ['interaction_required', 'consent_required', 'login_required'].includes(error?.errorCode);
}

export class DelegatedIdentity {
    constructor({ config, secretProvider, stateStore, logger = console }) {
        this.config = config;
        this.secretProvider = secretProvider;
        this.stateStore = stateStore;
        this.logger = logger;
        this.client = null;
        this.cryptoProvider = new CryptoProvider();
        this.encryptionKey = null;
        this.operationTail = Promise.resolve();
    }

    async initialize() {
        const [clientSecret, encodedCacheKey] = await Promise.all([
            this.secretProvider.get(SECRET_NAMES.entraClientSecret),
            this.secretProvider.get(SECRET_NAMES.cacheEncryptionKey),
        ]);
        this.encryptionKey = decodeEncryptionKey(encodedCacheKey);
        const cachePlugin = new EncryptedMsalCachePlugin(this.stateStore, this.encryptionKey);
        this.client = new ConfidentialClientApplication({
            auth: {
                clientId: this.config.clientId,
                authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
                clientSecret,
            },
            cache: { cachePlugin },
        });
    }

    async beginAuthorization() {
        this.#assertInitialized();
        const state = randomUUID();
        const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
        const transaction = {
            verifier,
            expiresAt: Date.now() + AUTH_TRANSACTION_TTL_MS,
        };
        await this.stateStore.write(
            this.#transactionPath(state),
            encryptCache(JSON.stringify(transaction), this.encryptionKey, `mcschat-auth:${state}`)
        );
        const url = await this.client.getAuthCodeUrl({
            scopes: [this.config.scope],
            redirectUri: this.config.redirectUri,
            state,
            codeChallenge: challenge,
            codeChallengeMethod: 'S256',
            prompt: 'select_account',
        });
        return { state, url };
    }

    async completeAuthorization({ code, state }) {
        this.#assertInitialized();
        if (!AUTH_STATE_PATTERN.test(state)) {
            throw new GatewayError('AUTH_STATE_INVALID', 'Authorization state is invalid or expired', {
                status: 400,
            });
        }
        const transactionEntry = await this.stateStore.read(this.#transactionPath(state));
        if (!transactionEntry) {
            throw new GatewayError('AUTH_STATE_INVALID', 'Authorization state is invalid or expired', {
                status: 400,
            });
        }
        await this.stateStore.remove(this.#transactionPath(state), { etag: transactionEntry.etag });
        let transaction;
        try {
            transaction = JSON.parse(
                decryptCache(
                    transactionEntry.data,
                    this.encryptionKey,
                    `mcschat-auth:${state}`
                ).toString('utf8')
            );
        } catch {
            throw new GatewayError('AUTH_STATE_INVALID', 'Authorization state is invalid or expired', {
                status: 400,
            });
        }
        if (transaction.expiresAt < Date.now()) {
            throw new GatewayError('AUTH_STATE_INVALID', 'Authorization state is invalid or expired', {
                status: 400,
            });
        }

        return this.#serialize(async () => {
            const result = await this.client.acquireTokenByCode({
                code,
                scopes: [this.config.scope],
                redirectUri: this.config.redirectUri,
                codeVerifier: transaction.verifier,
            });
            const oid = String(result?.account?.idTokenClaims?.oid || '').toLowerCase();
            const tid = String(result?.account?.idTokenClaims?.tid || '').toLowerCase();
            if (oid !== this.config.allowedUpstreamUserOid || tid !== this.config.tenantId) {
                await this.client.getTokenCache().clear();
                throw new GatewayError('UPSTREAM_IDENTITY_NOT_ALLOWED', 'Signed-in user is not allowed', {
                    status: 403,
                });
            }
            await this.#writeAccountState({
                homeAccountId: result.account.homeAccountId,
                tenantId: tid,
                objectId: oid,
                state: 'ready',
                updatedAt: new Date().toISOString(),
            });
            return { state: 'ready' };
        });
    }

    async acquireToken() {
        this.#assertInitialized();
        return this.#serialize(async () => {
            const metadata = await this.stateStore.readJson(ACCOUNT_PATH);
            if (!metadata || metadata.value.state !== 'ready') {
                throw new GatewayError(
                    'UPSTREAM_IDENTITY_REAUTH_REQUIRED',
                    'Upstream identity requires administrator authorization',
                    { status: 503 }
                );
            }
            const account = await this.client.getTokenCache().getAccountByHomeId(
                metadata.value.homeAccountId
            );
            if (!account) {
                await this.#setReauthRequired(metadata);
                throw new GatewayError(
                    'UPSTREAM_IDENTITY_REAUTH_REQUIRED',
                    'Upstream account is not available in the token cache',
                    { status: 503 }
                );
            }
            try {
                const result = await this.client.acquireTokenSilent({
                    account,
                    scopes: [this.config.scope],
                });
                return result.accessToken;
            } catch (error) {
                if (requiresInteraction(error)) {
                    await this.#setReauthRequired(metadata);
                    throw new GatewayError(
                        'UPSTREAM_IDENTITY_REAUTH_REQUIRED',
                        'Upstream identity requires administrator reauthentication',
                        { status: 503, cause: error }
                    );
                }
                throw error;
            }
        });
    }

    async status() {
        const metadata = await this.stateStore.readJson(ACCOUNT_PATH);
        return {
            state: metadata?.value?.state || 'disabled',
            updatedAt: metadata?.value?.updatedAt,
        };
    }

    async readiness() {
        try {
            await this.acquireToken();
            const status = await this.status();
            return { ...status, state: 'ready' };
        } catch (error) {
            if (error instanceof GatewayError
                && error.code === 'UPSTREAM_IDENTITY_REAUTH_REQUIRED') {
                return { state: 'reauthRequired' };
            }
            this.logger.error('Upstream identity readiness failed', {
                code: error.code || 'IDENTITY_READINESS_FAILED',
            });
            return { state: 'error' };
        }
    }

    #serialize(operation) {
        const next = this.operationTail.then(operation, operation);
        this.operationTail = next.catch(() => undefined);
        return next;
    }

    async #setReauthRequired(entry) {
        await this.#writeAccountState({
            ...entry.value,
            state: 'reauthRequired',
            updatedAt: new Date().toISOString(),
        }, entry.etag);
    }

    async #writeAccountState(value, etag) {
        try {
            await this.stateStore.writeJson(ACCOUNT_PATH, value, { etag });
        } catch (error) {
            if (!(error instanceof StateConflictError)) throw error;
            const latest = await this.stateStore.readJson(ACCOUNT_PATH);
            await this.stateStore.writeJson(ACCOUNT_PATH, value, { etag: latest?.etag });
        }
    }

    #assertInitialized() {
        if (!this.client) throw new Error('DelegatedIdentity is not initialized');
    }

    #transactionPath(state) {
        return `identity/auth-transactions/${state}.bin`;
    }
}
