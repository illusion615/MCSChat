#!/usr/bin/env node

/**
 * Generate cryptographic secrets for the D2E Local Router.
 * The MSAL cache key is base64 because decodeEncryptionKey() decodes base64;
 * the remaining keys are opaque strings compared in constant time.
 */

import { randomBytes } from 'node:crypto';

const SECRETS = [
    {
        name: 'LOCAL_MSAL_CACHE_ENCRYPTION_KEY',
        value: randomBytes(32).toString('base64'),
        note: 'AES-256-GCM key for the encrypted MSAL cache (base64, 32 bytes)',
    },
    {
        name: 'LOCAL_PROTOTYPE_API_KEY',
        value: randomBytes(16).toString('hex'),
        note: 'Caller credential for the /v1 Router API',
    },
    {
        name: 'LOCAL_ADMIN_API_KEY',
        value: randomBytes(24).toString('hex'),
        note: 'OPTIONAL. Leave this line out to run the console without a password and set one in its UI',
    },
    {
        name: 'LOCAL_ADMIN_SESSION_SIGNING_KEY',
        value: randomBytes(32).toString('hex'),
        note: 'HMAC key used only to sign browser session cookies',
    },
];

console.log('D2E Local Router - generated secrets\n');
for (const secret of SECRETS) {
    console.log(`# ${secret.note}`);
    console.log(`${secret.name}=${secret.value}\n`);
}
console.log('Copy the lines above into .env.local, then run:');
console.log('  chmod 600 .env.local');
console.log('  npm run start:local');
