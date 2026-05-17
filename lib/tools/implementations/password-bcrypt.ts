import bcrypt from 'bcryptjs';

export const BCRYPT_HASH_PATTERN = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;

export async function bcryptHash(password: string, rounds: number): Promise<string> {
  const cost = clampRounds(rounds);
  return bcrypt.hash(password, cost);
}

export async function bcryptVerify(password: string, hash: string): Promise<boolean> {
  if (!BCRYPT_HASH_PATTERN.test(hash)) throw new Error('INVALID_HASH');
  return bcrypt.compare(password, hash);
}

function clampRounds(n: number): number {
  const v = Math.floor(n);
  if (v < 4) return 4;
  if (v > 14) return 14;
  return v;
}
