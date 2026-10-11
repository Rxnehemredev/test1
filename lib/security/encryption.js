import crypto from 'crypto';
import { requiredEncryptionKey } from '@/lib/envGuard';

const AUTH_TAG_BYTES = 16;
const IV_BYTES = 12; // NIST SP 800-38D standard 96-bit nonce for AES-GCM

function getKeyBuffer() {
    const hexKey = requiredEncryptionKey();
    return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM and ENCRYPTION_KEY.
 * Returns formatted string: `${ivHex}:${authTagHex}:${cipherHex}`.
 * @param {string} plaintext
 * @returns {string}
 */
export function encryptData(plaintext) {
    if (typeof plaintext !== 'string') {
        throw new TypeError('Plaintext must be a string');
    }
    const key = getKeyBuffer();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_BYTES });
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string formatted as `${ivHex}:${authTagHex}:${cipherHex}`.
 * @param {string} encryptedString
 * @returns {string} Decrypted plaintext string
 */
export function decryptData(encryptedString) {
    if (!encryptedString || typeof encryptedString !== 'string') {
        throw new TypeError('Encrypted string is required');
    }
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }
    const [ivHex, authTagHex, cipherHex] = parts;

    // Hex biçimi ve uzunluk doğrulaması
    if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(authTagHex) || (cipherHex && !/^[0-9a-fA-F]+$/.test(cipherHex))) {
        throw new Error('Invalid hex encoding in encrypted data');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // IV 12 byte (standart) veya 16 byte (legacy) olmalıdır
    if (iv.length !== 12 && iv.length !== 16) {
        throw new Error('Invalid IV length for AES-GCM');
    }
    if (authTag.length !== AUTH_TAG_BYTES) {
        throw new Error('Invalid auth tag length for AES-GCM');
    }

    const key = getKeyBuffer();

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_BYTES });
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        throw new Error('Decryption failed: corrupted ciphertext, bad key, or authentication tag mismatch');
    }
}
