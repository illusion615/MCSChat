/**
 * Secure storage service using encrypted localStorage
 * All sensitive data is encrypted using AES-256-GCM before storage
 */

import { EncryptionUtils } from './encryption.js';

export const SecureStorage = {
    /**
     * Get or create an encryption key for the application
     * @returns {Promise<CryptoKey>} Encryption key
     */
    async getOrCreateKey() {
        let keyData = localStorage.getItem('encryptionKey');
        if (!keyData) {
            const key = await EncryptionUtils.generateKey();
            keyData = Array.from(new Uint8Array(await EncryptionUtils.exportKey(key)));
            localStorage.setItem('encryptionKey', JSON.stringify(keyData));
            return key;
        }

        const keyArray = new Uint8Array(JSON.parse(keyData));
        return await EncryptionUtils.importKey(keyArray);
    },

    /**
     * Store encrypted data in localStorage
     * @param {string} key - Storage key
     * @param {string} value - Value to encrypt and store
     * @returns {Promise<boolean>} Success status
     */
    async store(key, value) {
        try {
            const encryptionKey = await this.getOrCreateKey();
            const encrypted = await EncryptionUtils.encrypt(value, encryptionKey);

            const storedData = {
                encrypted: Array.from(encrypted.encrypted),
                iv: Array.from(encrypted.iv)
            };

            localStorage.setItem(`secure_${key}`, JSON.stringify(storedData));
            return true;
        } catch (error) {
            console.error('Error storing encrypted data:', error);
            return false;
        }
    },

    /**
     * Retrieve and decrypt data from localStorage
     * @param {string} key - Storage key
     * @returns {Promise<string|null>} Decrypted value or null if not found
     */
    async retrieve(key) {
        try {
            const storedData = localStorage.getItem(`secure_${key}`);
            if (!storedData) return null;

            // Validate that storedData is a valid JSON string before parsing
            if (typeof storedData !== 'string') {
                console.error('Retrieved data is not a string:', typeof storedData);
                return null;
            }

            let parsed;
            try {
                parsed = JSON.parse(storedData);
            } catch (jsonError) {
                console.error('Invalid JSON in localStorage for key:', key, jsonError);
                // Clear corrupted data
                localStorage.removeItem(`secure_${key}`);
                return null;
            }

            const encryptedArray = new Uint8Array(parsed.encrypted);
            const ivArray = new Uint8Array(parsed.iv);

            const encryptionKey = await this.getOrCreateKey();
            return await EncryptionUtils.decrypt(encryptedArray, ivArray, encryptionKey);
        } catch (error) {
            console.error('Error retrieving encrypted data:', error);
            return null;
        }
    },

    /**
     * Remove encrypted data from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    remove(key) {
        try {
            localStorage.removeItem(`secure_${key}`);
            return true;
        } catch (error) {
            console.error('Error removing encrypted data:', error);
            return false;
        }
    }
};
