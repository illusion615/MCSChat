/**
 * Encryption utilities for secure data storage
 * Provides AES-256-GCM encryption for sensitive application data
 */

export const EncryptionUtils = {
    /**
     * Generate a new AES-256 encryption key
     * @returns {Promise<CryptoKey>} Generated encryption key
     */
    async generateKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Export a key to raw bytes
     * @param {CryptoKey} key - The key to export
     * @returns {Promise<ArrayBuffer>} Raw key data
     */
    async exportKey(key) {
        return await window.crypto.subtle.exportKey('raw', key);
    },

    /**
     * Import a key from raw bytes
     * @param {Uint8Array} keyData - Raw key data
     * @returns {Promise<CryptoKey>} Imported key
     */
    async importKey(keyData) {
        return await window.crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt text data
     * @param {string} text - Text to encrypt
     * @param {CryptoKey} key - Encryption key
     * @returns {Promise<{encrypted: Uint8Array, iv: Uint8Array}>} Encrypted data and IV
     */
    async encrypt(text, key) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );

        return {
            encrypted: new Uint8Array(encrypted),
            iv: iv
        };
    },

    /**
     * Decrypt encrypted data
     * @param {Uint8Array} encryptedData - Encrypted data
     * @param {Uint8Array} iv - Initialization vector
     * @param {CryptoKey} key - Decryption key
     * @returns {Promise<string>} Decrypted text
     */
    async decrypt(encryptedData, iv, key) {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
};
