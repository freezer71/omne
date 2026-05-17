import { describe, expect, it } from 'vitest';
import {
  bcryptHash,
  bcryptVerify,
  BCRYPT_HASH_PATTERN,
} from '@/lib/tools/implementations/password-bcrypt';

describe('bcryptHash', () => {
  it('produces a $2a/b/y prefixed hash with the requested rounds', async () => {
    const hash = await bcryptHash('hunter2', 4);
    expect(hash).toMatch(BCRYPT_HASH_PATTERN);
    expect(hash.startsWith('$2a$04$') || hash.startsWith('$2b$04$')).toBe(true);
  });

  it('clamps rounds below 4 to 4', async () => {
    const hash = await bcryptHash('p', 1);
    expect(hash).toMatch(/^\$2[ab]\$04\$/);
  });
});

describe('bcryptVerify', () => {
  it('returns true when the password matches the hash', async () => {
    const hash = await bcryptHash('correct horse battery staple', 4);
    await expect(bcryptVerify('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('returns false when the password does not match', async () => {
    const hash = await bcryptHash('one', 4);
    await expect(bcryptVerify('two', hash)).resolves.toBe(false);
  });

  it('throws on a malformed hash', async () => {
    await expect(bcryptVerify('whatever', 'not-a-hash')).rejects.toThrow();
  });
});
