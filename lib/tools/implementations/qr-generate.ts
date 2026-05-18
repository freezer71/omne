/**
 * QR Generate — pure logic helpers.
 *
 * The actual QR rendering (PNG / SVG) is done in the component via the
 * `qrcode` package on the client; here we only build the *payload string*
 * that the QR encodes. Payload generation is the part that has structure
 * worth testing (WIFI / vCard escaping, URL normalization).
 */

export type QrPayloadMode = 'text' | 'url' | 'wifi' | 'vcard';

export const QR_PAYLOAD_MODES: readonly QrPayloadMode[] = [
  'text',
  'url',
  'wifi',
  'vcard',
] as const;

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export const QR_ERROR_CORRECTIONS: readonly QrErrorCorrection[] = [
  'L',
  'M',
  'Q',
  'H',
] as const;

/* ----- text / url ----------------------------------------------------- */

export function buildTextPayload(text: string): string {
  return text;
}

/**
 * Normalize a URL string into a valid http(s) URL when possible.
 * - Empty input → empty payload.
 * - No scheme → prepend `https://`.
 * - Invalid (still cannot be parsed) → return as-is so the QR is still
 *   generated (some apps tolerate non-standard payloads).
 */
export function buildUrlPayload(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  return hasScheme ? trimmed : `https://${trimmed}`;
}

/* ----- wifi ----------------------------------------------------------- */

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export type WifiPayloadInput = {
  ssid: string;
  password?: string;
  encryption?: WifiEncryption;
  hidden?: boolean;
};

/**
 * Escape special characters used in the `WIFI:` payload format.
 * Per the de-facto standard the following characters MUST be escaped
 * with a leading backslash: `\`, `;`, `,`, `:`, `"`.
 */
export function escapeWifiField(value: string): string {
  let out = '';
  for (const ch of value) {
    if (ch === '\\' || ch === ';' || ch === ',' || ch === ':' || ch === '"') {
      out += '\\';
    }
    out += ch;
  }
  return out;
}

export function buildWifiPayload(input: WifiPayloadInput): string {
  const ssid = input.ssid ?? '';
  const password = input.password ?? '';
  const encryption: WifiEncryption = input.encryption ?? 'WPA';
  const hidden = input.hidden === true;

  // For "nopass" we still include T:nopass so scanners know the network is open.
  const parts: string[] = [`T:${encryption}`];
  parts.push(`S:${escapeWifiField(ssid)}`);
  if (encryption !== 'nopass') {
    parts.push(`P:${escapeWifiField(password)}`);
  }
  if (hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

/* ----- vcard ---------------------------------------------------------- */

export type VCardPayloadInput = {
  firstName?: string;
  lastName?: string;
  organization?: string;
  title?: string;
  email?: string;
  phone?: string;
  url?: string;
};

/**
 * Escape special characters in a vCard 3.0 value.
 * Per RFC 2426: `;`, `,`, `\` and newlines must be escaped.
 */
export function escapeVCardField(value: string): string {
  let out = '';
  for (const ch of value) {
    if (ch === '\\' || ch === ';' || ch === ',') {
      out += '\\';
      out += ch;
    } else if (ch === '\n') {
      out += '\\n';
    } else if (ch === '\r') {
      // skip stray CRs — newlines are normalized to \n.
    } else {
      out += ch;
    }
  }
  return out;
}

export function buildVCardPayload(input: VCardPayloadInput): string {
  const first = (input.firstName ?? '').trim();
  const last = (input.lastName ?? '').trim();
  const org = (input.organization ?? '').trim();
  const title = (input.title ?? '').trim();
  const email = (input.email ?? '').trim();
  const phone = (input.phone ?? '').trim();
  const url = (input.url ?? '').trim();

  const fullName = [first, last].filter(Boolean).join(' ');

  const lines: string[] = [];
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');
  // N: structured name. Order = Family;Given;Additional;Prefix;Suffix
  lines.push(`N:${escapeVCardField(last)};${escapeVCardField(first)};;;`);
  if (fullName) lines.push(`FN:${escapeVCardField(fullName)}`);
  else lines.push('FN:');
  if (org) lines.push(`ORG:${escapeVCardField(org)}`);
  if (title) lines.push(`TITLE:${escapeVCardField(title)}`);
  if (phone) lines.push(`TEL:${escapeVCardField(phone)}`);
  if (email) lines.push(`EMAIL:${escapeVCardField(email)}`);
  if (url) lines.push(`URL:${escapeVCardField(url)}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

/* ----- top-level dispatch -------------------------------------------- */

export type QrPayloadInput =
  | { mode: 'text'; text: string }
  | { mode: 'url'; url: string }
  | { mode: 'wifi'; wifi: WifiPayloadInput }
  | { mode: 'vcard'; vcard: VCardPayloadInput };

export function buildQrPayload(input: QrPayloadInput): string {
  switch (input.mode) {
    case 'text':
      return buildTextPayload(input.text);
    case 'url':
      return buildUrlPayload(input.url);
    case 'wifi':
      return buildWifiPayload(input.wifi);
    case 'vcard':
      return buildVCardPayload(input.vcard);
  }
}
