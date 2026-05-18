/**
 * QR Scan — pure logic.
 *
 * The DOM / camera / image decoding lives in the component (uses the
 * `qr-scanner` package on the client). This module is the testable part:
 * it takes a decoded payload string and classifies / parses it so the
 * UI can render the right shortcuts (open URL, copy wifi password,
 * download .vcf, etc.).
 */

export type QrPayloadKind = 'url' | 'wifi' | 'vcard' | 'text';

export type ParsedUrl = {
  kind: 'url';
  raw: string;
  url: string;
};

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export type ParsedWifi = {
  kind: 'wifi';
  raw: string;
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
};

export type ParsedVCard = {
  kind: 'vcard';
  raw: string;
  fullName: string;
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  email: string;
  phone: string;
  url: string;
};

export type ParsedText = {
  kind: 'text';
  raw: string;
  text: string;
};

export type ParsedQrPayload = ParsedUrl | ParsedWifi | ParsedVCard | ParsedText;

/* ---------- detection ------------------------------------------------- */

export function detectKind(payload: string): QrPayloadKind {
  if (!payload) return 'text';
  if (/^https?:\/\//i.test(payload)) return 'url';
  if (/^WIFI:/i.test(payload)) return 'wifi';
  if (/^BEGIN:VCARD/i.test(payload)) return 'vcard';
  return 'text';
}

/* ---------- wifi parsing --------------------------------------------- */

/**
 * Split a `WIFI:...` payload into raw fields, honoring backslash escapes
 * (`\;`, `\,`, `\\`, `\:`, `\"`).
 */
function splitWifiFields(body: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '\\' && i + 1 < body.length) {
      cur += body[i + 1];
      i += 2;
      continue;
    }
    if (ch === ';') {
      out.push(cur);
      cur = '';
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

export function parseWifiPayload(payload: string): ParsedWifi | null {
  const m = payload.match(/^WIFI:(.*)$/i);
  if (!m) return null;
  // Strip a trailing `;;` if present.
  let body = m[1] ?? '';
  body = body.replace(/;;\s*$/, '');
  const fields = splitWifiFields(body);

  let ssid = '';
  let password = '';
  let encryption: WifiEncryption = 'nopass';
  let hidden = false;

  for (const field of fields) {
    const colon = field.indexOf(':');
    if (colon === -1) continue;
    const key = field.slice(0, colon).toUpperCase();
    const value = field.slice(colon + 1);
    if (key === 'S') ssid = value;
    else if (key === 'P') password = value;
    else if (key === 'T') {
      const v = value.toUpperCase();
      if (v === 'WPA' || v === 'WPA2') encryption = 'WPA';
      else if (v === 'WEP') encryption = 'WEP';
      else encryption = 'nopass';
    } else if (key === 'H') {
      hidden = value.toLowerCase() === 'true';
    }
  }

  return {
    kind: 'wifi',
    raw: payload,
    ssid,
    password,
    encryption,
    hidden,
  };
}

/* ---------- vcard parsing -------------------------------------------- */

function unescapeVCardValue(value: string): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const ch = value[i];
    if (ch === '\\' && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === 'n' || next === 'N') {
        out += '\n';
      } else {
        out += next;
      }
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * Strip vCard property parameters: `EMAIL;TYPE=INTERNET` → `EMAIL`.
 */
function stripParams(key: string): string {
  const semi = key.indexOf(';');
  return semi === -1 ? key : key.slice(0, semi);
}

export function parseVCardPayload(payload: string): ParsedVCard | null {
  if (!/^BEGIN:VCARD/i.test(payload)) return null;

  let firstName = '';
  let lastName = '';
  let fullName = '';
  let organization = '';
  let title = '';
  let email = '';
  let phone = '';
  let url = '';

  // Normalize CRLF / line continuations (a leading space continues the prior line).
  const normalized = payload.replace(/\r\n|\r/g, '\n');
  const rawLines = normalized.split('\n');
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }

  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const keyPart = stripParams(line.slice(0, colon)).toUpperCase();
    const value = unescapeVCardValue(line.slice(colon + 1));
    if (keyPart === 'N') {
      const parts = value.split(';');
      lastName = parts[0] ?? '';
      firstName = parts[1] ?? '';
    } else if (keyPart === 'FN') {
      fullName = value;
    } else if (keyPart === 'ORG') {
      // ORG may be `Acme;Engineering` — keep the first component as primary.
      organization = value.split(';')[0] ?? value;
    } else if (keyPart === 'TITLE') {
      title = value;
    } else if (keyPart === 'EMAIL') {
      if (!email) email = value;
    } else if (keyPart === 'TEL') {
      if (!phone) phone = value;
    } else if (keyPart === 'URL') {
      if (!url) url = value;
    }
  }

  if (!fullName) {
    fullName = [firstName, lastName].filter(Boolean).join(' ');
  }

  return {
    kind: 'vcard',
    raw: payload,
    fullName,
    firstName,
    lastName,
    organization,
    title,
    email,
    phone,
    url,
  };
}

/* ---------- top-level parse ------------------------------------------ */

export function parseQrPayload(payload: string): ParsedQrPayload {
  const kind = detectKind(payload);
  if (kind === 'url') {
    return { kind: 'url', raw: payload, url: payload };
  }
  if (kind === 'wifi') {
    const parsed = parseWifiPayload(payload);
    if (parsed) return parsed;
  }
  if (kind === 'vcard') {
    const parsed = parseVCardPayload(payload);
    if (parsed) return parsed;
  }
  return { kind: 'text', raw: payload, text: payload };
}
