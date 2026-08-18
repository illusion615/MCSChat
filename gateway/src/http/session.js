import { createHmac } from 'node:crypto';

import { constantTimeEqual } from '../crypto/cacheEnvelope.js';

export function parseCookies(request) {
    return Object.fromEntries(String(request.get('cookie') || '')
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => {
            const separator = part.indexOf('=');
            return separator < 0
                ? [part, '']
                : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
        }));
}

export function signSession(payload, signingKey) {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', signingKey).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
}

/** Returns the verified payload, or null when the token is absent, tampered with, or expired. */
export function verifySession(token, signingKey, { scope } = {}) {
    const [encoded, signature] = String(token || '').split('.');
    if (!encoded || !signature) return null;
    const expected = createHmac('sha256', signingKey).update(encoded).digest('base64url');
    if (!constantTimeEqual(signature, expected)) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        if (scope && payload.scope !== scope) return null;
        if (!(Number(payload.expiresAt) > Date.now())) return null;
        return payload;
    } catch {
        return null;
    }
}

export function sessionCookie(name, value, { maxAgeSeconds, path = '/' }) {
    return [
        `${name}=${encodeURIComponent(value)}`,
        'HttpOnly',
        'SameSite=Strict',
        `Path=${path}`,
        `Max-Age=${maxAgeSeconds}`,
    ].join('; ');
}

export function clearedCookie(name, path = '/') {
    return `${name}=; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=0`;
}
