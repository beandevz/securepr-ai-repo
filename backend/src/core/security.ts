import crypto from 'crypto';
import { settings } from './settings.js';

/**
 * Compute HMAC-SHA256 hex digest.
 */
export function computeHmacSha256(secret: string, rawBody: Buffer): string {
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
}

/**
 * Verify HMAC-SHA256 signature.
 * Expects signature in format: sha256=<hex>
 */
export function verifyHmacSha256(
  secret: string,
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  const theirs = signature.split('sha256=')[1]?.trim() || '';
  const ours = computeHmacSha256(secret, rawBody);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(ours, 'hex'),
      Buffer.from(theirs, 'hex')
    );
  } catch {
    return false;
  }
}

function deriveTokenKey(): Buffer {
  return crypto.scryptSync(settings.tokenEncryptionKey, 'securepr-repo-salt', 32);
}

/**
 * Encrypt a secret (e.g. a GitHub PAT) for at-rest storage using AES-256-GCM.
 * Returns "iv:authTag:ciphertext" (all hex), so the plaintext never touches disk.
 */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveTokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt a secret previously produced by encryptSecret.
 */
export function decryptSecret(encoded: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveTokenKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}
