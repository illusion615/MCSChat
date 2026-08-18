/**
 * Administrator credential for the Router console.
 *
 * The console is usable with no password at all — on a loopback runtime that is
 * a deliberate choice, and `status()` reports it so the UI can offer to set one.
 * Once a password exists it is required. Only a salted scrypt hash is stored;
 * the plaintext never touches disk.
 *
 * A `LOCAL_ADMIN_API_KEY` in the environment still works and takes precedence,
 * so scripted access keeps functioning; it cannot be changed from the console.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { constantTimeEqual } from '../crypto/cacheEnvelope.js';
import { GatewayError } from '../errors.js';
import { SECRET_NAMES } from '../secrets/secretProvider.js';

const CREDENTIAL_PATH = 'admin/credential.json';
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

const deriveKey = promisify(scrypt);

async function hashPassword(password, salt) {
    return deriveKey(String(password), salt, KEY_LENGTH);
}

export class AdminCredential {
    constructor({ stateStore, secretProvider, logger = console }) {
        this.stateStore = stateStore;
        this.secretProvider = secretProvider;
        this.logger = logger;
    }

    async #environmentKey() {
        const value = await this.secretProvider.tryGet?.(SECRET_NAMES.adminApiKey);
        return value || null;
    }

    async #stored() {
        const entry = await this.stateStore.readJson(CREDENTIAL_PATH).catch(() => null);
        return entry?.value?.hash ? entry : null;
    }

    /** `source` is what currently governs access: env key, stored password, or nothing. */
    async status() {
        if (await this.#environmentKey()) {
            return { protected: true, source: 'environment', changeable: false };
        }
        const stored = await this.#stored();
        if (stored) {
            return {
                protected: true,
                source: 'password',
                changeable: true,
                updatedAt: stored.value.updatedAt,
            };
        }
        return { protected: false, source: 'none', changeable: true };
    }

    async verify(candidate) {
        const provided = String(candidate || '');
        if (!provided) return false;

        const environmentKey = await this.#environmentKey();
        if (environmentKey) return constantTimeEqual(provided, environmentKey);

        const stored = await this.#stored();
        if (!stored) return false;
        const salt = Buffer.from(stored.value.salt, 'base64');
        const expected = Buffer.from(stored.value.hash, 'base64');
        const actual = await hashPassword(provided, salt);
        return actual.length === expected.length && timingSafeEqual(actual, expected);
    }

    async set(password) {
        const value = String(password || '');
        if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
            throw new GatewayError(
                'PASSWORD_INVALID',
                `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
                { status: 400 }
            );
        }
        if (await this.#environmentKey()) {
            throw new GatewayError(
                'PASSWORD_MANAGED_EXTERNALLY',
                'LOCAL_ADMIN_API_KEY governs access; remove it from .env.local to manage the password here',
                { status: 409 }
            );
        }
        const salt = randomBytes(SALT_LENGTH);
        const hash = await hashPassword(value, salt);
        const existing = await this.#stored();
        await this.stateStore.writeJson(CREDENTIAL_PATH, {
            version: 1,
            algorithm: 'scrypt',
            salt: salt.toString('base64'),
            hash: hash.toString('base64'),
            updatedAt: new Date().toISOString(),
        }, { etag: existing?.etag });
        this.logger.warn?.('Administrator password set', { code: 'ADMIN_PASSWORD_SET' });
        return this.status();
    }

    async clear() {
        if (await this.#environmentKey()) {
            throw new GatewayError(
                'PASSWORD_MANAGED_EXTERNALLY',
                'LOCAL_ADMIN_API_KEY governs access; remove it from .env.local instead',
                { status: 409 }
            );
        }
        await this.stateStore.remove(CREDENTIAL_PATH).catch(() => undefined);
        this.logger.warn?.('Administrator password removed', { code: 'ADMIN_PASSWORD_CLEARED' });
        return this.status();
    }
}
