import { describe, it, expect } from 'vitest';
import { TOOLS, getTool, toolsByCategory, toolsForMime } from '@/lib/tools/registry';

describe('TOOLS registry', () => {
  it('contains the 7 MVP tools', () => {
    expect(TOOLS).toHaveLength(7);
  });

  it('has unique (category, id) combinations', () => {
    const ids = TOOLS.map((t) => `${t.category}/${t.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes the 5 PDF tools', () => {
    const pdf = TOOLS.filter((t) => t.category === 'pdf').map((t) => t.id).sort();
    expect(pdf).toEqual(['from-images', 'merge', 'rotate', 'split', 'to-images']);
  });

  it('exposes the 2 video tools', () => {
    const video = TOOLS.filter((t) => t.category === 'video').map((t) => t.id).sort();
    expect(video).toEqual(['convert', 'trim']);
  });

  it('every tool href matches /<category>/<id>', () => {
    for (const t of TOOLS) {
      expect(t.href).toBe(`/${t.category}/${t.id}`);
    }
  });

  it('every tool has a non-empty i18nKey, keywords, acceptedMime, status', () => {
    for (const t of TOOLS) {
      expect(t.i18nKey).toMatch(/^tools\.\w+\.[\w-]+$/);
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(t.acceptedMime.length).toBeGreaterThan(0);
      expect(['stable', 'beta', 'soon']).toContain(t.status);
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
    expect(grouped.pdf?.length).toBe(5);
    expect(grouped.video?.length).toBe(2);
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
