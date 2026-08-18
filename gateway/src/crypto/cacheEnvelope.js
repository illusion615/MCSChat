import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    timingSafeEqual,
} from 'node:crypto';

const VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function decodeEncryptionKey(encodedKey) {
    const key = Buffer.from(String(encodedKey || ''), 'base64');
    if (key.length !== 32) {
        throw new Error('MSAL cache encryption key must be 32 bytes encoded as base64');
    }
    return key;
}

export function encryptCache(plaintext, key, associatedData = 'mcschat-msal-cache') {
    const source = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(String(plaintext), 'utf8');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    cipher.setAAD(Buffer.from(associatedData, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(source), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.from(JSON.stringify({
        version: VERSION,
        algorithm: 'A256GCM',
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
    }), 'utf8');
}

export function decryptCache(envelope, key, associatedData = 'mcschat-msal-cache') {
    let parsed;
    try {
        parsed = JSON.parse(Buffer.from(envelope).toString('utf8'));
    } catch {
        throw new Error('Encrypted cache envelope is not valid JSON');
    }
    if (parsed.version !== VERSION || parsed.algorithm !== 'A256GCM') {
        throw new Error('Unsupported encrypted cache envelope');
    }

    const iv = Buffer.from(parsed.iv || '', 'base64');
    const tag = Buffer.from(parsed.tag || '', 'base64');
    const ciphertext = Buffer.from(parsed.ciphertext || '', 'base64');
    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
        throw new Error('Encrypted cache envelope has invalid metadata');
    }

    try {
        const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
        decipher.setAAD(Buffer.from(associatedData, 'utf8'));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
        throw new Error('Encrypted cache authentication failed');
    }
}

export function constantTimeEqual(left, right) {
    const leftBuffer = Buffer.from(String(left || ''), 'utf8');
    const rightBuffer = Buffer.from(String(right || ''), 'utf8');
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
}
