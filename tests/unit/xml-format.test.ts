import { describe, it, expect } from 'vitest';
import { validateXml, formatXml } from '@/lib/tools/implementations/xml-format';

describe('validateXml', () => {
  it('accepts well-formed XML', () => {
    expect(validateXml('<a><b>1</b></a>')).toEqual({ ok: true });
  });

  it('reports a line and column for a mismatched closing tag', () => {
    const result = validateXml('<a><b>1</a>');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBeGreaterThanOrEqual(1);
      expect(result.col).toBeGreaterThanOrEqual(1);
      expect(result.message).toMatch(/closing tag/i);
    }
  });

  it('rejects an unclosed tag', () => {
    expect(validateXml('<a><b></a>').ok).toBe(false);
  });
});

describe('formatXml — pretty', () => {
  it('indents nested elements onto their own lines', () => {
    const result = formatXml('<a><b>1</b><c>2</c></a>', { mode: 'pretty', indent: '2' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toBe('<a>\n  <b>1</b>\n  <c>2</c>\n</a>');
    }
  });

  it('preserves attributes and comments', () => {
    const result = formatXml('<a x="1"><!-- note --><b>hi</b></a>', { mode: 'pretty', indent: '2' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toContain('x="1"');
      expect(result.output).toContain('<!-- note -->');
    }
  });

  it('preserves the XML declaration', () => {
    const result = formatXml('<?xml version="1.0"?><a><b>1</b></a>', {
      mode: 'pretty',
      indent: '2',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toMatch(/^<\?xml version="1\.0"\?>/);
  });

  it('honours tab indentation', () => {
    const result = formatXml('<a><b>1</b></a>', { mode: 'pretty', indent: 'tab' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toBe('<a>\n\t<b>1</b>\n</a>');
  });

  it('returns an error for malformed XML', () => {
    const result = formatXml('<a><b>1</a>', { mode: 'pretty', indent: '2' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.line).toBeGreaterThanOrEqual(1);
      expect(result.error.message).toBeTruthy();
    }
  });
});

describe('formatXml — minify', () => {
  it('strips whitespace between tags onto a single line', () => {
    const result = formatXml('<a>\n  <b>1</b>\n  <c>2</c>\n</a>', { mode: 'minify', indent: '2' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toBe('<a><b>1</b><c>2</c></a>');
  });
});

describe('formatXml — XML → JSON', () => {
  it('converts elements and attributes to a JSON object', () => {
    const result = formatXml('<root x="1"><item>a</item><item>b</item></root>', {
      mode: 'to-json',
      indent: '2',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const obj = JSON.parse(result.output);
      expect(obj.root['@_x']).toBe('1');
      expect(obj.root.item).toEqual(['a', 'b']);
    }
  });

  it('returns an error for malformed XML', () => {
    expect(formatXml('<a><b></a>', { mode: 'to-json', indent: '2' }).ok).toBe(false);
  });
});

describe('formatXml — JSON → XML', () => {
  it('converts a JSON object to indented XML', () => {
    const result = formatXml('{"note":{"to":"A","body":"hi"}}', {
      mode: 'from-json',
      indent: '2',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toContain('<note>');
      expect(result.output).toContain('<to>A</to>');
      expect(result.output).toContain('<body>hi</body>');
    }
  });

  it('reports a line and column for malformed JSON', () => {
    const result = formatXml('{not json', { mode: 'from-json', indent: '2' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.line).toBeGreaterThanOrEqual(1);
      expect(result.error.col).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('formatXml — empty input', () => {
  it('returns an empty output without error in every mode', () => {
    for (const mode of ['pretty', 'minify', 'to-json', 'from-json'] as const) {
      const result = formatXml('   ', { mode, indent: '2' });
      expect(result).toEqual({ ok: true, output: '' });
    }
  });
});
