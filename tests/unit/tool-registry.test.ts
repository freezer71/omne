import { describe, it, expect } from 'vitest';
import { TOOLS, getTool, toolsByCategory, toolsForMime } from '@/lib/tools/registry';

describe('TOOLS registry', () => {
  it('contains all current tools', () => {
    expect(TOOLS).toHaveLength(37);
  });

  it('exposes the 3 Text tools', () => {
    const text = TOOLS.filter((t) => t.category === 'text').map((t) => t.id).sort();
    expect(text).toEqual(['case', 'count', 'lorem']);
  });

  it('exposes the 3 Encode tools', () => {
    const encode = TOOLS.filter((t) => t.category === 'encode').map((t) => t.id).sort();
    expect(encode).toEqual(['base64', 'jwt', 'url']);
  });

  it('exposes the 3 Color tools', () => {
    const color = TOOLS.filter((t) => t.category === 'color').map((t) => t.id).sort();
    expect(color).toEqual(['contrast', 'convert', 'palette']);
  });

  it('exposes the 2 QR tools', () => {
    const qr = TOOLS.filter((t) => t.category === 'qr').map((t) => t.id).sort();
    expect(qr).toEqual(['generate', 'scan']);
  });

  it('exposes the 7 JSON tools', () => {
    const json = TOOLS.filter((t) => t.category === 'json').map((t) => t.id).sort();
    expect(json).toEqual(['csv', 'diff', 'format', 'query', 'schema', 'table', 'tree']);
  });

  it('has unique (category, id) combinations', () => {
    const ids = TOOLS.map((t) => `${t.category}/${t.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes the 6 PDF tools', () => {
    const pdf = TOOLS.filter((t) => t.category === 'pdf').map((t) => t.id).sort();
    expect(pdf).toEqual(['extract-images', 'from-images', 'merge', 'rotate', 'split', 'to-images']);
  });

  it('exposes the 2 video tools', () => {
    const video = TOOLS.filter((t) => t.category === 'video').map((t) => t.id).sort();
    expect(video).toEqual(['convert', 'trim']);
  });

  it('exposes the 6 image tools', () => {
    const image = TOOLS.filter((t) => t.category === 'image').map((t) => t.id).sort();
    expect(image).toEqual(['compress', 'convert', 'crop', 'remove-bg', 'resize', 'rotate-flip']);
  });

  it('every tool href matches /<category>/<id>', () => {
    for (const t of TOOLS) {
      expect(t.href).toBe(`/${t.category}/${t.id}`);
    }
  });

  it('every tool has a non-empty i18nKey, keywords, status', () => {
    for (const t of TOOLS) {
      expect(t.i18nKey).toMatch(/^tools\.\w+\.[\w-]+$/);
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(['stable', 'beta', 'soon']).toContain(t.status);
    }
  });

  it('file-driven tools declare at least one accepted MIME; pure-text tools declare none', () => {
    const TEXT_ONLY_CATEGORIES = new Set(['password', 'text', 'encode']);
    // Some categories are mixed: a tool may operate on text input only
    // (e.g. `color/convert`, `color/contrast`, `qr/generate`) while another
    // in the same category accepts files (e.g. `color/palette`, `qr/scan`).
    const MIXED_CATEGORIES = new Set(['color', 'qr']);
    for (const t of TOOLS) {
      if (TEXT_ONLY_CATEGORIES.has(t.category)) {
        expect(t.acceptedMime).toEqual([]);
      } else if (MIXED_CATEGORIES.has(t.category)) {
        // No constraint — depends on the individual tool.
        expect(Array.isArray(t.acceptedMime)).toBe(true);
      } else {
        expect(t.acceptedMime.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getTool', () => {
  it('returns the matching tool when found', () => {
    const t = getTool('pdf', 'merge');
    expect(t).toBeDefined();
    expect(t?.id).toBe('merge');
    expect(t?.category).toBe('pdf');
  });

  it('returns undefined when not found', () => {
    expect(getTool('pdf', 'inexistant')).toBeUndefined();
    expect(getTool('unknown', 'merge')).toBeUndefined();
  });
});

describe('toolsByCategory', () => {
  it('groups tools by category', () => {
    const grouped = toolsByCategory();
    expect(grouped.pdf?.length).toBe(6);
    expect(grouped.video?.length).toBe(2);
    expect(grouped.image?.length).toBe(6);
  });
});

describe('toolsForMime', () => {
  it('returns PDF tools for application/pdf', () => {
    const tools = toolsForMime('application/pdf');
    const ids = tools.map((t) => t.id).sort();
    expect(ids).toContain('merge');
    expect(ids).toContain('split');
    expect(ids).toContain('rotate');
    expect(ids).toContain('to-images');
  });

  it('returns video tools for video/mp4', () => {
    const tools = toolsForMime('video/mp4');
    const ids = tools.map((t) => t.id).sort();
    expect(ids).toContain('convert');
    expect(ids).toContain('trim');
  });

  it('returns image-to-pdf for image/png', () => {
    const tools = toolsForMime('image/png');
    expect(tools.some((t) => t.id === 'from-images')).toBe(true);
  });

  it('returns empty array for unsupported mime', () => {
    expect(toolsForMime('application/octet-stream')).toEqual([]);
  });
});
