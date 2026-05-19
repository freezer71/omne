export type HexOptions = {
  separator: '' | ' ' | '-' | ':';
  uppercase: boolean;
};

export function textToHex(input: string, opts: HexOptions = { separator: '', uppercase: false }): string {
  if (!input) return '';
  const bytes = new TextEncoder().encode(input);
  return bytesToHex(bytes, opts);
}

export function bytesToHex(bytes: Uint8Array, opts: HexOptions = { separator: '', uppercase: false }): string {
  const parts: string[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const hex = (bytes[i] ?? 0).toString(16).padStart(2, '0');
    parts[i] = opts.uppercase ? hex.toUpperCase() : hex;
  }
  return parts.join(opts.separator);
}

export function hexToBytes(input: string): Uint8Array {
  if (!input) return new Uint8Array(0);
  const cleaned = input.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length === 0) return new Uint8Array(0);
  if (cleaned.length % 2 !== 0) throw new Error('odd-length hex string');
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    const byte = parseInt(cleaned.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) throw new Error('invalid hex character');
    out[i / 2] = byte;
  }
  return out;
}

export function hexToText(input: string): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(hexToBytes(input));
}
