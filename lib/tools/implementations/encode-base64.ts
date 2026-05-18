/**
 * Base64 encoder / decoder.
 *
 * Pure-logic helpers, no DOM beyond the obvious string APIs. Designed so the
 * client component can encode files (via FileReader -> ArrayBuffer) and the
 * unit tests can run in Node without DOM.
 *
 * Standard alphabet:  A–Z a–z 0–9 + /   with `=` padding (RFC 4648 §4)
 * URL-safe alphabet:  A–Z a–z 0–9 - _   no padding             (RFC 4648 §5)
 */

export type Base64Mode = 'encode' | 'decode';

export type Base64Options = {
  urlSafe?: boolean;
  wrap?: boolean; // wrap output at 76 chars (MIME)
};

/* ---------- bytes <-> base64 ----------------------------------------- */

// Chunked walk over Uint8Array to avoid `String.fromCharCode(...big array)`
// which blows the call stack on >~100 KB inputs.
function bytesToBinaryString(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    out += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return out;
}

function binaryStringToBytes(bin: string): Uint8Array {
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

/* ---------- alphabet helpers ----------------------------------------- */

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromUrlSafe(s: string): string {
  let out = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = out.length % 4;
  if (pad === 2) out += '==';
  else if (pad === 3) out += '=';
  else if (pad === 1) throw new Error('invalid base64 length');
  return out;
}

function wrapLines(s: string, n = 76): string {
  if (!s) return s;
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += n) parts.push(s.slice(i, i + n));
  return parts.join('\n');
}

function stripWhitespace(s: string): string {
  return s.replace(/\s+/g, '');
}

/* ---------- public API ----------------------------------------------- */

export function encodeBytesToBase64(bytes: Uint8Array, opts: Base64Options = {}): string {
  if (bytes.length === 0) return '';
  const bin = bytesToBinaryString(bytes);
  // `btoa` is available in browsers AND Node 16+ (we target modern environments).
  let out = (typeof btoa === 'function'
    ? btoa(bin)
    : Buffer.from(bin, 'binary').toString('base64'));
  if (opts.urlSafe) out = toUrlSafe(out);
  if (opts.wrap) out = wrapLines(out, 76);
  return out;
}

export function encodeTextToBase64(text: string, opts: Base64Options = {}): string {
  if (!text) return '';
  // TextEncoder handles UTF-8 correctly (multi-byte chars).
  const bytes = new TextEncoder().encode(text);
  return encodeBytesToBase64(bytes, opts);
}

export function decodeBase64ToBytes(input: string): Uint8Array {
  if (!input) return new Uint8Array(0);
  const cleaned = stripWhitespace(input);
  if (cleaned.length === 0) return new Uint8Array(0);
  // Heuristic: if it contains `-` or `_`, treat as URL-safe.
  const isUrlSafe = cleaned.includes('-') || cleaned.includes('_');
  const normalized = isUrlSafe ? fromUrlSafe(cleaned) : cleaned;

  let bin: string;
  try {
    bin = typeof atob === 'function'
      ? atob(normalized)
      : Buffer.from(normalized, 'base64').toString('binary');
  } catch {
    throw new Error('invalid base64 input');
  }
  return binaryStringToBytes(bin);
}

export function decodeBase64ToText(input: string): string {
  const bytes = decodeBase64ToBytes(input);
  // `fatal: false` so we don't throw on non-UTF-8 bytes — replace instead.
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/* ---------- data URI helpers ----------------------------------------- */

export function toDataUri(base64: string, mime: string): string {
  const safeMime = mime || 'application/octet-stream';
  // Data URIs do not allow newlines in their payload section.
  const payload = base64.replace(/\s+/g, '');
  return `data:${safeMime};base64,${payload}`;
}

const DATA_URI_RE = /^data:([^;,]+)?(?:;[^,]*)?;?base64,(.*)$/i;

export function parseDataUri(input: string): { mime: string; base64: string } | null {
  const trimmed = input.trim();
  const match = trimmed.match(DATA_URI_RE);
  if (!match) return null;
  return { mime: match[1] ?? 'application/octet-stream', base64: match[2] ?? '' };
}

/* ---------- filename / mime sniffing for decode-to-file --------------- */

const MAGIC: Array<{ mime: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  { mime: 'image/png',   ext: 'png',  test: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/jpeg',  ext: 'jpg',  test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif',   ext: 'gif',  test: (b) => b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { mime: 'image/webp',  ext: 'webp', test: (b) => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: 'application/zip', ext: 'zip', test: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) },
];

export function sniffMimeAndExt(bytes: Uint8Array): { mime: string; ext: string } {
  for (const m of MAGIC) {
    if (m.test(bytes)) return { mime: m.mime, ext: m.ext };
  }
  return { mime: 'application/octet-stream', ext: 'bin' };
}
