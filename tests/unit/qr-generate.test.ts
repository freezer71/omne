import { describe, it, expect } from 'vitest';
import {
  buildQrPayload,
  buildTextPayload,
  buildUrlPayload,
  buildVCardPayload,
  buildWifiPayload,
  escapeVCardField,
  escapeWifiField,
} from '@/lib/tools/implementations/qr-generate';

describe('buildTextPayload', () => {
  it('passes text through verbatim', () => {
    expect(buildTextPayload('hello world')).toBe('hello world');
  });

  it('preserves unicode', () => {
    expect(buildTextPayload('café 你好')).toBe('café 你好');
  });
});

describe('buildUrlPayload', () => {
  it('returns empty for empty input', () => {
    expect(buildUrlPayload('')).toBe('');
    expect(buildUrlPayload('   ')).toBe('');
  });

  it('keeps a full http(s) URL as-is', () => {
    expect(buildUrlPayload('https://omne.app')).toBe('https://omne.app');
    expect(buildUrlPayload('http://example.com/path?q=1')).toBe('http://example.com/path?q=1');
  });

  it('prepends https:// when no scheme', () => {
    expect(buildUrlPayload('omne.app')).toBe('https://omne.app');
    expect(buildUrlPayload('example.com/path')).toBe('https://example.com/path');
  });

  it('keeps non-http schemes intact', () => {
    expect(buildUrlPayload('mailto:hello@omne.app')).toBe('mailto:hello@omne.app');
    expect(buildUrlPayload('ftp://files.example.com')).toBe('ftp://files.example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(buildUrlPayload('  https://omne.app  ')).toBe('https://omne.app');
  });
});

describe('escapeWifiField', () => {
  it('escapes reserved chars', () => {
    expect(escapeWifiField('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f');
  });

  it('leaves other chars untouched', () => {
    expect(escapeWifiField('Café 2024')).toBe('Café 2024');
  });
});

describe('buildWifiPayload', () => {
  it('builds a standard WPA payload', () => {
    expect(
      buildWifiPayload({ ssid: 'MyNet', password: 'pa55', encryption: 'WPA' }),
    ).toBe('WIFI:T:WPA;S:MyNet;P:pa55;;');
  });

  it('defaults to WPA when encryption omitted', () => {
    expect(buildWifiPayload({ ssid: 'X', password: 'y' })).toBe('WIFI:T:WPA;S:X;P:y;;');
  });

  it('emits H:true when hidden', () => {
    expect(
      buildWifiPayload({ ssid: 'X', password: 'y', encryption: 'WPA', hidden: true }),
    ).toBe('WIFI:T:WPA;S:X;P:y;H:true;;');
  });

  it('omits the password field for open networks', () => {
    expect(
      buildWifiPayload({ ssid: 'OpenNet', password: 'ignored', encryption: 'nopass' }),
    ).toBe('WIFI:T:nopass;S:OpenNet;;');
  });

  it('escapes reserved chars in SSID and password', () => {
    expect(
      buildWifiPayload({ ssid: 'My;Net', password: 'a:b,c', encryption: 'WPA' }),
    ).toBe('WIFI:T:WPA;S:My\\;Net;P:a\\:b\\,c;;');
  });
});

describe('escapeVCardField', () => {
  it('escapes the four reserved chars and newlines', () => {
    expect(escapeVCardField('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });
});

describe('buildVCardPayload', () => {
  it('produces a minimal valid vCard 3.0', () => {
    const out = buildVCardPayload({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(out.startsWith('BEGIN:VCARD\nVERSION:3.0\n')).toBe(true);
    expect(out.endsWith('\nEND:VCARD')).toBe(true);
    expect(out).toContain('N:Lovelace;Ada;;;');
    expect(out).toContain('FN:Ada Lovelace');
  });

  it('includes all optional fields when supplied', () => {
    const out = buildVCardPayload({
      firstName: 'Ada',
      lastName: 'Lovelace',
      organization: 'Analytical Engines',
      title: 'Mathematician',
      email: 'ada@example.com',
      phone: '+44 1234',
      url: 'https://example.com',
    });
    expect(out).toContain('ORG:Analytical Engines');
    expect(out).toContain('TITLE:Mathematician');
    expect(out).toContain('EMAIL:ada@example.com');
    expect(out).toContain('TEL:+44 1234');
    expect(out).toContain('URL:https://example.com');
  });

  it('omits optional fields when blank', () => {
    const out = buildVCardPayload({ firstName: 'Ada' });
    expect(out).not.toContain('ORG:');
    expect(out).not.toContain('EMAIL:');
    expect(out).not.toContain('TEL:');
    expect(out).not.toContain('URL:');
  });

  it('escapes reserved chars in field values', () => {
    const out = buildVCardPayload({ firstName: 'A;B', lastName: 'C,D' });
    expect(out).toContain('N:C\\,D;A\\;B;;;');
  });
});

describe('buildQrPayload dispatch', () => {
  it('routes to the right builder based on mode', () => {
    expect(buildQrPayload({ mode: 'text', text: 'hi' })).toBe('hi');
    expect(buildQrPayload({ mode: 'url', url: 'omne.app' })).toBe('https://omne.app');
    expect(
      buildQrPayload({
        mode: 'wifi',
        wifi: { ssid: 'X', password: 'y', encryption: 'WPA' },
      }),
    ).toBe('WIFI:T:WPA;S:X;P:y;;');
    const vcard = buildQrPayload({ mode: 'vcard', vcard: { firstName: 'Ada' } });
    expect(vcard).toContain('BEGIN:VCARD');
  });
});
