export type BinaryOptions = {
  separator: '' | ' ' | '-';
  bitsPerByte: 8;
};

export function textToBinary(input: string, opts: BinaryOptions = { separator: ' ', bitsPerByte: 8 }): string {
  if (!input) return '';
  const bytes = new TextEncoder().encode(input);
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    parts.push((bytes[i] ?? 0).toString(2).padStart(8, '0'));
  }
  return parts.join(opts.separator);
}

export function binaryToText(input: string): string {
  if (!input) return '';
  const cleaned = input.replace(/[^01]/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length % 8 !== 0) throw new Error('binary length must be a multiple of 8');
  const bytes = new Uint8Array(cleaned.length / 8);
  for (let i = 0; i < cleaned.length; i += 8) {
    const byte = parseInt(cleaned.slice(i, i + 8), 2);
    if (Number.isNaN(byte)) throw new Error('invalid binary digit');
    bytes[i / 8] = byte;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
