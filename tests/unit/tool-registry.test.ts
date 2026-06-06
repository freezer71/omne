import { describe, it, expect } from 'vitest';
import { TOOLS, getTool, relatedTools, toolsByCategory, toolsForMime } from '@/lib/tools/registry';

describe('TOOLS registry', () => {
  it('contains all current tools', () => {
    expect(TOOLS).toHaveLength(88);
  });

  it('exposes the 6 audio tools', () => {
    const audio = TOOLS.filter((t) => t.category === 'audio').map((t) => t.id).sort();
    expect(audio).toEqual(['convert', 'extract', 'merge', 'tags', 'trim', 'volume']);
  });

  it('exposes the 6 SVG tools', () => {
    const svg = TOOLS.filter((t) => t.category === 'svg').map((t) => t.id).sort();
    expect(svg).toEqual(['editor', 'favicon', 'optimize', 'to-data-url', 'to-png', 'viewer']);
  });

  it('exposes the 11 Text tools', () => {
    const text = TOOLS.filter((t) => t.category === 'text').map((t) => t.id).sort();
    expect(text).toEqual([
      'case', 'count', 'diff', 'escape', 'find-replace', 'lorem',
      'markdown', 'regex', 'slugify', 'sort-lines', 'whitespace',
    ]);
  });

  it('exposes the 7 Encode tools', () => {
    const encode = TOOLS.filter((t) => t.category === 'encode').map((t) => t.id).sort();
    expect(encode).toEqual(['base64', 'binary', 'hex', 'html-entities', 'jwt', 'morse', 'url']);
  });

  it('exposes the 7 Color tools', () => {
    const color = TOOLS.filter((t) => t.category === 'color').map((t) => t.id).sort();
    expect(color).toEqual(['blender', 'blindness', 'contrast', 'convert', 'gradient', 'palette', 'shades']);
  });

  it('exposes the 4 QR tools', () => {
    const qr = TOOLS.filter((t) => t.category === 'qr').map((t) => t.id).sort();
    expect(qr).toEqual(['barcode-generate', 'barcode-scan', 'generate', 'scan']);
  });

  it('exposes the 7 JSON tools', () => {
    const json = TOOLS.filter((t) => t.category === 'json').map((t) => t.id).sort();
    expect(json).toEqual(['csv', 'diff', 'format', 'query', 'schema', 'table', 'tree']);
  });

  it('has unique (category, id) combinations', () => {
    const ids = TOOLS.map((t) => `${t.category}/${t.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes the 8 PDF tools', () => {
    const pdf = TOOLS.filter((t) => t.category === 'pdf').map((t) => t.id).sort();
    expect(pdf).toEqual(['extract-images', 'from-images', 'merge', 'resize', 'rotate', 'split', 'to-images', 'watermark']);
  });

  it('exposes the 13 video tools', () => {
    const video = TOOLS.filter((t) => t.category === 'video').map((t) => t.id).sort();
    expect(video).toEqual([
      'compress', 'convert', 'crop', 'frames', 'merge', 'mute',
      'resize', 'rotate', 'short-studio', 'speed', 'split', 'trim', 'watermark',
    ]);
  });

  it('exposes the 7 image tools', () => {
    const image = TOOLS.filter((t) => t.category === 'image').map((t) => t.id).sort();
    expect(image).toEqual([
      'compress', 'convert', 'crop', 'from-clipboard', 'remove-bg', 'resize', 'rotate-flip',
    ]);
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
    const TEXT_ONLY_CATEGORIES = new Set(['password', 'text', 'reading', 'encode', 'dev']);
    // Some categories are mixed: a tool may operate on text input only
    // (e.g. `color/convert`, `color/contrast`, `qr/generate`) while another
    // in the same category accepts files (e.g. `color/palette`, `qr/scan`).
    const MIXED_CATEGORIES = new Set(['color', 'qr']);
    // Tools that take input from somewhere other than a file/drop (e.g. clipboard).
    const NON_FILE_TOOLS = new Set(['image:from-clipboard']);
    for (const t of TOOLS) {
      if (TEXT_ONLY_CATEGORIES.has(t.category)) {
        expect(t.acceptedMime).toEqual([]);
      } else if (MIXED_CATEGORIES.has(t.category) || NON_FILE_TOOLS.has(`${t.category}:${t.id}`)) {
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
    expect(grouped.pdf?.length).toBe(8);
    expect(grouped.video?.length).toBe(13);
    expect(grouped.image?.length).toBe(7);
  });
});

describe('relatedTools', () => {
  it('returns the tools right after the given one in registry order', () => {
    const video = toolsByCategory().video!;
    const first = video[0]!;
    const related = relatedTools('video', first.id);
    expect(related.map((t) => t.id)).toEqual(video.slice(1, 5).map((t) => t.id));
  });

  it('wraps around at the end of the category', () => {
    const video = toolsByCategory().video!;
    const last = video[video.length - 1]!;
    const related = relatedTools('video', last.id);
    expect(related.map((t) => t.id)).toEqual(video.slice(0, 4).map((t) => t.id));
  });

  it('never includes the tool itself and never repeats an id', () => {
    for (const tool of TOOLS) {
      const related = relatedTools(tool.category, tool.id);
      const ids = related.map((t) => t.id);
      expect(ids).not.toContain(tool.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('spreads incoming links evenly across a category', () => {
    const video = toolsByCategory().video!;
    const incoming = new Map<string, number>();
    for (const tool of video) {
      for (const r of relatedTools('video', tool.id)) {
        incoming.set(r.id, (incoming.get(r.id) ?? 0) + 1);
      }
    }
    // With a rotating window every tool receives exactly `count` links.
    for (const tool of video) {
      expect(incoming.get(tool.id)).toBe(4);
    }
  });

  it('returns all the others when the category has few tools', () => {
    const reading = toolsByCategory().reading ?? [];
    if (reading.length > 0 && reading.length <= 5) {
      const related = relatedTools('reading', reading[0]!.id);
      expect(related.length).toBe(reading.length - 1);
    }
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
