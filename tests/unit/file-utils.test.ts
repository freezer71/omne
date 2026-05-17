import { describe, it, expect } from 'vitest';
import { outputName, formatBytes, stripExtension } from '@/lib/file-utils';

describe('stripExtension', () => {
  it('removes a single extension', () => {
    expect(stripExtension('report.pdf')).toBe('report');
    expect(stripExtension('video.mp4')).toBe('video');
  });

  it('handles names without extension', () => {
    expect(stripExtension('noext')).toBe('noext');
  });

  it('handles dotfiles (leading dot, no extension)', () => {
    expect(stripExtension('.dotfile')).toBe('.dotfile');
  });

  it('handles double extensions by removing only the last', () => {
    expect(stripExtension('archive.tar.gz')).toBe('archive.tar');
  });
});

describe('outputName', () => {
  it('builds an action-prefixed name from the first file', () => {
    expect(outputName('merged', ['report.pdf', 'appendix.pdf'], 'pdf')).toBe('merged-report.pdf');
  });

  it('uses a different extension when specified', () => {
    expect(outputName('converted', ['movie.mp4'], 'webm')).toBe('converted-movie.webm');
  });

  it('supports an optional infix (e.g. page number for split)', () => {
    expect(outputName('split', ['doc.pdf'], 'pdf', 'page-3')).toBe('split-doc-page-3.pdf');
  });

  it('falls back to a generic name when given empty file list', () => {
    expect(outputName('merged', [], 'pdf')).toBe('merged.pdf');
  });
});

describe('formatBytes', () => {
  it('formats sizes from B to GB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });

  it('handles undefined and negative gracefully', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(undefined as unknown as number)).toBe('0 B');
  });
});
