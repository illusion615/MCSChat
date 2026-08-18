#!/usr/bin/env node

/**
 * Generate cryptographic secrets for the D2E Local Router.
 * 
 * Generates three secrets:
 * 1. MSAL cache encryption key (AES-256-GCM)
 * 2. Prototype API key
 * 3. Admin session signing key
 */

import crypto from 'node:crypto';

function generateSecret(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

console.log('🔐 Generating D2E Local Router Secrets\n');

const msalCacheKey = generateSecret(32);     // 32 bytes = 256-bit AES key
const prototypeApiKey = generateSecret(16);  // 16 bytes = 128-bit API key
const adminSigningKey = generateSecret(32);  // 32 bytes = 256-bit signing key

console.log('✅ LOCAL_MSAL_CACHE_ENCRYPTION_KEY:');
console.log(`   ${msalCacheKey}\n`);

console.log('✅ LOCAL_PROTOTYPE_API_KEY:');
console.log(`   ${prototypeApiKey}\n`);

console.log('✅ LOCAL_ADMIN_SESSION_SIGNING_KEY:');
console.log(`   ${adminSigningKey}\n`);

console.log('📝 Add these to your .env.local file, then run:');
console.log('   chmod 600 .env.local');
console.log('   npm run start:local');
