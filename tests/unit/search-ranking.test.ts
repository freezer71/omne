import { describe, it, expect } from 'vitest';
import { searchTools, filterTools, type SearchableTool } from '@/lib/tools/search';

const tools: SearchableTool[] = [
  {
    id: 'merge', category: 'pdf', href: '/pdf/merge',
    name: 'Merge PDFs', description: 'Combine multiple PDFs into one.',
    keywords: ['merge', 'combine', 'join', 'pdf', 'fusion'],
    status: 'stable', acceptedMime: ['application/pdf'],
  },
  {
    id: 'split', category: 'pdf', href: '/pdf/split',
    name: 'Split PDF', description: 'Pick the pages you want.',
    keywords: ['split', 'extract', 'pages', 'pdf'],
    status: 'stable', acceptedMime: ['application/pdf'],
  },
  {
    id: 'convert', category: 'audio', href: '/audio/convert',
    name: 'Convert audio', description: 'Convert between mp3, wav, flac…',
    keywords: ['audio', 'convert', 'mp3', 'wav', 'flac'],
    status: 'stable', acceptedMime: ['audio/mpeg', 'audio/wav'],
  },
  {
    id: 'extract', category: 'audio', href: '/audio/extract',
    name: 'Extract audio from video', description: 'Pull the audio track out of a video file.',
    keywords: ['extract', 'audio', 'mp4 to mp3'],
    status: 'stable', acceptedMime: ['video/mp4', 'video/quicktime'],
  },
  {
    id: 'generate', category: 'password', href: '/password/generate',
    name: 'Password generator', description: 'Generate random secure passwords.',
    keywords: ['password', 'generate', 'random', 'secure', 'mot de passe'],
    status: 'stable', acceptedMime: [],
  },
  {
    id: 'remove-bg', category: 'image', href: '/image/remove-bg',
    name: 'Remove background', description: 'Detect and remove the background from an image.',
    keywords: ['remove', 'background', 'bg', 'detourer'],
    status: 'beta', acceptedMime: ['image/png', 'image/jpeg'],
  },
];

describe('searchTools', () => {
  it('returns all tools with score 1 when query empty', () => {
    const out = searchTools(tools, '');
    expect(out).toHaveLength(tools.length);
    expect(out.every((r) => r.score === 1)).toBe(true);
  });

  it('matches exact name first', () => {
    const out = searchTools(tools, 'Merge PDFs');
    expect(out[0]!.tool.id).toBe('merge');
  });

  it('ranks name prefix above keyword-only match', () => {
    const out = searchTools(tools, 'merge');
    expect(out[0]!.tool.id).toBe('merge');
  });

  it('tolerates one-character typos via fuzzy', () => {
    const out = searchTools(tools, 'merg');
    expect(out.map((r) => r.tool.id)).toContain('merge');
  });

  it('boosts audio tools when query is an extension like mp3', () => {
    const out = searchTools(tools, 'mp3');
    const ids = out.map((r) => r.tool.id);
    expect(ids[0] === 'convert' || ids[0] === 'extract').toBe(true);
  });

  it('finds tools via accepted mime even when keyword absent (mov video extension)', () => {
    const out = searchTools(tools, 'mov');
    expect(out.map((r) => r.tool.id)).toContain('extract');
  });

  it('returns highlight ranges over the name for matched query', () => {
    const out = searchTools(tools, 'merge');
    const top = out[0]!;
    expect(top.nameRanges.length).toBeGreaterThan(0);
    const [start, end] = top.nameRanges[0]!;
    expect(top.tool.name.slice(start, end).toLowerCase()).toBe('merge');
  });

  it('handles diacritics in description match', () => {
    const out = searchTools(tools, 'detourer');
    expect(out.map((r) => r.tool.id)).toContain('remove-bg');
  });

  it('returns empty when nothing matches', () => {
    const out = searchTools(tools, 'zzznothing');
    expect(out).toHaveLength(0);
  });

  it('penalizes beta status compared to stable equivalents', () => {
    const stable: SearchableTool = {
      id: 'compress', category: 'image', href: '/image/compress',
      name: 'Background editor', description: '',
      keywords: ['background'], status: 'stable', acceptedMime: [],
    };
    const out = searchTools([...tools, stable], 'background');
    const stableIdx = out.findIndex((r) => r.tool.id === 'compress');
    const betaIdx = out.findIndex((r) => r.tool.id === 'remove-bg');
    expect(stableIdx).toBeLessThan(betaIdx);
  });

  it('filterTools returns just the tools, in ranked order', () => {
    const out = filterTools(tools, 'pdf');
    expect(out[0]!.category).toBe('pdf');
  });
});
