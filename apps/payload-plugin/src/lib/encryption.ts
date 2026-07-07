import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Field-level encryption for the Sirv client secret at rest.
 *
 * The key is derived from the host's Payload secret (`req.payload.secret`, i.e.
 * `PAYLOAD_SECRET`), so the ciphertext is only useful alongside the running app. We use
 * AES-256-GCM (authenticated) with a random 96-bit IV per value. The stored string is
 * self-describing so `decryptSecret` can no-op on values that were never encrypted (e.g. a
 * secret written before the plugin, or a re-save where the hook sees an already-encrypted
 * value).
 */
const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'sirv-enc:v1:';

function deriveKey(secret: string): Buffer {
  // 32 bytes for AES-256. sha256 of the Payload secret is deterministic and app-scoped.
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** True if the value was produced by {@link encryptSecret}. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Encrypts a plaintext secret. Empty/undefined values and already-encrypted values pass through. */
export function encryptSecret(plain: string, secret: string): string {
  if (!plain || isEncrypted(plain)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.')
  );
}

/** Decrypts a value produced by {@link encryptSecret}. Non-encrypted values pass through unchanged. */
export function decryptSecret(stored: string, secret: string): string {
  if (!stored || !isEncrypted(stored)) return stored;
  const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split('.');
  if (!ivB64 || !tagB64 || !ctB64) return stored;
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
  return plain.toString('utf8');
}
