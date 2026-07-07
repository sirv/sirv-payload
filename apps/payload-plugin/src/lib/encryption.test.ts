import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, isEncrypted } from './encryption.js';

const KEY = 'test-payload-secret-value';

describe('encryption', () => {
  it('round-trips a secret', () => {
    const enc = encryptSecret('super-secret-value', KEY);
    expect(enc).not.toContain('super-secret-value');
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptSecret(enc, KEY)).toBe('super-secret-value');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same', KEY)).not.toBe(encryptSecret('same', KEY));
  });

  it('does not re-encrypt an already-encrypted value', () => {
    const enc = encryptSecret('abc', KEY);
    expect(encryptSecret(enc, KEY)).toBe(enc);
  });

  it('passes through empty and plaintext values on decrypt', () => {
    expect(encryptSecret('', KEY)).toBe('');
    expect(decryptSecret('', KEY)).toBe('');
    expect(decryptSecret('plaintext-never-encrypted', KEY)).toBe('plaintext-never-encrypted');
  });

  it('fails to decrypt with the wrong key (authenticated)', () => {
    const enc = encryptSecret('abc', KEY);
    expect(() => decryptSecret(enc, 'wrong-key')).toThrow();
  });
});
