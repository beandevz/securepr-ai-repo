import crypto from 'crypto';

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
