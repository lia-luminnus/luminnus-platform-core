/**
 * Twilio Encryption Helper
 * AES-256-GCM para encriptar auth tokens das subcontas
 *
 * A chave de encriptação vem de TWILIO_ENCRYPTION_KEY (env var).
 * Se não estiver definida, usa fallback (NÃO seguro para produção).
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING: BufferEncoding = 'base64';

/**
 * Obtém a chave de encriptação do ambiente.
 * Em produção, TWILIO_ENCRYPTION_KEY DEVE estar definida.
 */
function getKey(): Buffer {
    const envKey = process.env.TWILIO_ENCRYPTION_KEY;

    if (envKey) {
        // Se a chave tem 64 chars (hex), converter para 32 bytes
        if (envKey.length === 64) {
            return Buffer.from(envKey, 'hex');
        }
        // Se tem 32 chars (raw), usar diretamente
        if (envKey.length === 32) {
            return Buffer.from(envKey, 'utf-8');
        }
        // Se tem outro tamanho, derivar com SHA-256
        return crypto.createHash('sha256').update(envKey).digest();
    }

    // Fallback (dev only) — derivar da SUPABASE_SERVICE_ROLE_KEY ou gerar
    const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY || 'twilio-dev-key-not-for-production';
    console.warn('⚠️ [TwilioEncryption] TWILIO_ENCRYPTION_KEY não definida. Usando fallback (NÃO SEGURO para produção)');
    return crypto.createHash('sha256').update(fallback).digest();
}

/**
 * Encriptar um valor (auth token).
 * Formato: base64(iv + ciphertext + authTag)
 */
export function encryptToken(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Concatenar: IV (16) + ciphertext (N) + authTag (16)
    const combined = Buffer.concat([iv, encrypted, authTag]);
    return combined.toString(ENCODING);
}

/**
 * Desencriptar um valor (auth token).
 */
export function decryptToken(encryptedData: string): string {
    const key = getKey();
    const combined = Buffer.from(encryptedData, ENCODING);

    // Extrair IV, ciphertext, e authTag
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

/**
 * Verificar se a encriptação está funcional (self-test).
 */
export function testEncryption(): boolean {
    try {
        const testValue = 'twilio-test-' + Date.now();
        const encrypted = encryptToken(testValue);
        const decrypted = decryptToken(encrypted);
        return decrypted === testValue;
    } catch (err) {
        console.error('❌ [TwilioEncryption] Self-test falhou:', err);
        return false;
    }
}
