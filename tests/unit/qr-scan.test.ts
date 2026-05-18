import { describe, it, expect } from 'vitest';
import {
  detectKind,
  parseQrPayload,
  parseVCardPayload,
  parseWifiPayload,
} from '@/lib/tools/implementations/qr-scan';

describe('detectKind', () => {
  it('classifies URLs', () => {
    expect(detectKind('https://omne.app')).toBe('url');
    expect(detectKind('HTTP://OMNE.APP')).toBe('url');
  });

  it('classifies WIFI payloads', () => {
    expect(detectKind('WIFI:T:WPA;S:X;P:y;;')).toBe('wifi');
    expect(detectKind('wifi:T:WPA;S:X;P:y;;')).toBe('wifi');
  });

  it('classifies vCards', () => {
    expect(detectKind('BEGIN:VCARD\nVERSION:3.0\nEND:VCARD')).toBe('vcard');
  });

  it('falls back to text', () => {
    expect(detectKind('hello world')).toBe('text');
    expect(detectKind('')).toBe('text');
  });
});

describe('parseWifiPayload', () => {
  it('parses a standard WPA payload', () => {
    const r = parseWifiPayload('WIFI:T:WPA;S:MyNet;P:pa55;;');
    expect(r).not.toBeNull();
    expect(r?.ssid).toBe('MyNet');
    expect(r?.password).toBe('pa55');
    expect(r?.encryption).toBe('WPA');
    expect(r?.hidden).toBe(false);
  });

  it('parses hidden=true', () => {
    const r = parseWifiPayload('WIFI:T:WPA;S:X;P:y;H:true;;');
    expect(r?.hidden).toBe(true);
  });

  it('parses open networks (T:nopass)', () => {
    const r = parseWifiPayload('WIFI:T:nopass;S:OpenNet;;');
    expect(r?.encryption).toBe('nopass');
    expect(r?.password).toBe('');
  });

  it('treats WPA2 as WPA', () => {
    const r = parseWifiPayload('WIFI:T:WPA2;S:X;P:y;;');
    expect(r?.encryption).toBe('WPA');
  });

  it('honors backslash escapes for ; , : "', () => {
    const r = parseWifiPayload('WIFI:T:WPA;S:My\\;Net;P:a\\:b\\,c\\";;');
    expect(r?.ssid).toBe('My;Net');
    expect(r?.password).toBe('a:b,c"');
  });

  it('returns null for non-wifi input', () => {
    expect(parseWifiPayload('hello')).toBeNull();
  });
});

describe('parseVCardPayload', () => {
  const sample = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Lovelace;Ada;;;',
    'FN:Ada Lovelace',
    'ORG:Analytical Engines',
    'TITLE:Mathematician',
    'TEL:+44 1234',
    'EMAIL:ada@example.com',
    'URL:https://example.com',
    'END:VCARD',
  ].join('\n');

  it('parses every supported field', () => {
    const r = parseVCardPayload(sample);
    expect(r).not.toBeNull();
    expect(r?.firstName).toBe('Ada');
    expect(r?.lastName).toBe('Lovelace');
    expect(r?.fullName).toBe('Ada Lovelace');
    expect(r?.organization).toBe('Analytical Engines');
    expect(r?.title).toBe('Mathematician');
    expect(r?.email).toBe('ada@example.com');
    expect(r?.phone).toBe('+44 1234');
    expect(r?.url).toBe('https://example.com');
  });

  it('strips parameters from property names (EMAIL;TYPE=INTERNET → EMAIL)', () => {
    const v = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Test',
      'EMAIL;TYPE=INTERNET:test@example.com',
      'TEL;TYPE=CELL:+1 555',
      'END:VCARD',
    ].join('\n');
    const r = parseVCardPayload(v);
    expect(r?.email).toBe('test@example.com');
    expect(r?.phone).toBe('+1 555');
  });

  it('unescapes \\n / \\, / \\;', () => {
    const v = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Hello\\nWorld',
      'ORG:Acme\\, Inc.',
      'END:VCARD',
    ].join('\n');
    const r = parseVCardPayload(v);
    expect(r?.fullName).toBe('Hello\nWorld');
    // ORG strips at unescaped `;` only — our impl splits on raw `;`,
    // so `Acme\, Inc.` stays as a single field.
    expect(r?.organization).toBe('Acme, Inc.');
  });

  it('derives fullName from N when FN missing', () => {
    const v = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Lovelace;Ada;;;',
      'END:VCARD',
    ].join('\n');
    const r = parseVCardPayload(v);
    expect(r?.fullName).toBe('Ada Lovelace');
  });

  it('returns null for non-vcard input', () => {
    expect(parseVCardPayload('hello')).toBeNull();
  });
});

describe('parseQrPayload', () => {
  it('parses URLs', () => {
    const r = parseQrPayload('https://omne.app');
    expect(r.kind).toBe('url');
    if (r.kind === 'url') expect(r.url).toBe('https://omne.app');
  });

  it('parses WIFI payloads', () => {
    const r = parseQrPayload('WIFI:T:WPA;S:X;P:y;;');
    expect(r.kind).toBe('wifi');
  });

  it('parses vCards', () => {
    const r = parseQrPayload('BEGIN:VCARD\nVERSION:3.0\nFN:Test\nEND:VCARD');
    expect(r.kind).toBe('vcard');
  });

  it('falls back to text', () => {
    const r = parseQrPayload('just some plain content');
    expect(r.kind).toBe('text');
    if (r.kind === 'text') expect(r.text).toBe('just some plain content');
  });
});
