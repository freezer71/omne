import { describe, it, expect } from 'vitest';
import { routeDroppedFiles } from '@/lib/tools/mime-router';

const pdf = (name = 'a.pdf') => new File(['x'], name, { type: 'application/pdf' });
const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' });
const jpg = (name = 'a.jpg') => new File(['x'], name, { type: 'image/jpeg' });
const mp4 = (name = 'a.mp4') => new File(['x'], name, { type: 'video/mp4' });
const txt = (name = 'a.txt') => new File(['x'], name, { type: 'text/plain' });

describe('routeDroppedFiles', () => {
  it('routes a single PDF to the list of compatible PDF tools (modal)', () => {
    const result = routeDroppedFiles([pdf()]);
    expect(result.kind).toBe('choose');
    if (result.kind !== 'choose') return;
    expect(result.tools.length).toBeGreaterThan(1);
    expect(result.tools.every((t) => t.category === 'pdf')).toBe(true);
  });

  it('routes multiple PDFs directly to pdf-merge', () => {
    const result = routeDroppedFiles([pdf('a.pdf'), pdf('b.pdf')]);
    expect(result.kind).toBe('direct');
    if (result.kind !== 'direct') return;
    expect(result.tool.id).toBe('merge');
    expect(result.tool.category).toBe('pdf');
  });

  it('routes multiple images directly to images-to-pdf', () => {
    const result = routeDroppedFiles([png('a.png'), jpg('b.jpg')]);
    expect(result.kind).toBe('direct');
    if (result.kind !== 'direct') return;
    expect(result.tool.id).toBe('from-images');
    expect(result.tool.category).toBe('pdf');
  });

  it('routes a single video to the list of compatible video tools (modal)', () => {
    const result = routeDroppedFiles([mp4()]);
    expect(result.kind).toBe('choose');
    if (result.kind !== 'choose') return;
    expect(result.tools.every((t) => t.category === 'video')).toBe(true);
  });

  it('returns unsupported for files with no compatible tool', () => {
    const result = routeDroppedFiles([txt()]);
    expect(result.kind).toBe('unsupported');
  });

  it('returns unsupported for mixed incompatible files', () => {
    const result = routeDroppedFiles([pdf(), mp4()]);
    expect(result.kind).toBe('unsupported');
  });

  it('returns unsupported for empty file list', () => {
    expect(routeDroppedFiles([]).kind).toBe('unsupported');
  });

  it('routes a single image to from-images (or modal if more tools added later)', () => {
    const result = routeDroppedFiles([png()]);
    expect(['direct', 'choose']).toContain(result.kind);
    if (result.kind === 'direct') {
      expect(result.tool.id).toBe('from-images');
    } else if (result.kind === 'choose') {
      expect(result.tools.some((t) => t.id === 'from-images')).toBe(true);
    }
  });
});
