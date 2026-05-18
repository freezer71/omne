/**
 * JWT decoder.
 *
 * This module ONLY decodes header + payload and exposes the raw signature.
 * It DOES NOT verify the signature — no Web Crypto SubtleCrypto, no `jose`
 * dependency, no public-key parsing. The component MUST display a clear
 * "not verified" warning. The privacy stance also matters: a verify feature
 * would tempt users to paste their secret somewhere — better not to ship
 * one at all.
 */

export type JwtClaimStatus = 'valid' | 'expired' | 'notYetValid' | 'unknown';

export type JwtParts = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string; // raw base64url string, NOT verified
  status: JwtClaimStatus;
  // Numeric timestamp claims that we recognized, for UI rendering.
  iat?: number;
  exp?: number;
  nbf?: number;
};

function base64UrlToBase64(s: string): string {
  let out = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = out.length % 4;
  if (pad === 2) out += '==';
  else if (pad === 3) out += '=';
  else if (pad === 1) throw new Error('invalid base64url segment');
  return out;
}

function decodeBase64UrlToString(s: string): string {
  if (!s) return '';
  const b64 = base64UrlToBase64(s);
  let bin: string;
  try {
    bin = typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
  } catch {
    throw new Error('invalid base64url segment');
  }
  // Re-interpret the binary string as UTF-8.
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function parseJsonObject(json: string, what: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`${what} is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${what} is not a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function pickNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * Decode a JWT string. Throws with a friendly message if malformed.
 * `nowSeconds` is injected for tests; defaults to `Date.now() / 1000`.
 */
export function decodeJwt(token: string, nowSeconds?: number): JwtParts {
  if (!token || typeof token !== 'string') {
    throw new Error('empty token');
  }
  const trimmed = token.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    throw new Error('JWT must have 3 dot-separated segments');
  }
  const [h, p, s] = parts;
  if (!h || !p) throw new Error('JWT header or payload is empty');

  const headerJson = decodeBase64UrlToString(h);
  const payloadJson = decodeBase64UrlToString(p);

  const header = parseJsonObject(headerJson, 'Header');
  const payload = parseJsonObject(payloadJson, 'Payload');

  const iat = pickNumber(payload, 'iat');
  const exp = pickNumber(payload, 'exp');
  const nbf = pickNumber(payload, 'nbf');

  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  let status: JwtClaimStatus = 'unknown';
  if (exp !== undefined && now >= exp) status = 'expired';
  else if (nbf !== undefined && now < nbf) status = 'notYetValid';
  else if (exp !== undefined || nbf !== undefined) status = 'valid';

  // Build the object incrementally so optional fields stay truly optional
  // under `exactOptionalPropertyTypes`.
  const out: JwtParts = { header, payload, signature: s ?? '', status };
  if (iat !== undefined) out.iat = iat;
  if (exp !== undefined) out.exp = exp;
  if (nbf !== undefined) out.nbf = nbf;
  return out;
}

/* ---------- pretty timestamp helpers --------------------------------- */

export function formatUnixSeconds(t: number): string {
  if (!Number.isFinite(t)) return String(t);
  const d = new Date(t * 1000);
  if (Number.isNaN(d.getTime())) return String(t);
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

/**
 * Sample JWT. Header `{"alg":"HS256","typ":"JWT"}`, payload
 * `{"sub":"123","name":"Jane","iat":1700000000,"exp":2700000000}`,
 * fake signature. Public sample, not a real secret.
 */
export const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.' +
  'eyJzdWIiOiIxMjMiLCJuYW1lIjoiSmFuZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyNzAwMDAwMDAwfQ' +
  '.' +
  'L8i6g4tFCXJpvA8YjQNVPFhO4xMzlqgyVZxXJZmU3xQ';
