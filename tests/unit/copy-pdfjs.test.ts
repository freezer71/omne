import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyPdfjsAssets } from '@/scripts/copy-pdfjs.mjs';

describe('copyPdfjsAssets', () => {
  let srcRoot: string;
  let destDir: string;

  beforeEach(() => {
    srcRoot = mkdtempSync(join(tmpdir(), 'omne-pdfjs-src-'));
    destDir = mkdtempSync(join(tmpdir(), 'omne-pdfjs-dest-'));
    const buildDir = join(srcRoot, 'build');
    mkdirSync(buildDir, { recursive: true });
    writeFileSync(join(buildDir, 'pdf.worker.min.mjs'), 'WORKER_MIN');
    writeFileSync(join(buildDir, 'pdf.worker.mjs'), 'WORKER');
  });

  afterEach(() => {
    rmSync(srcRoot, { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
  });

  it('copies the minified worker into the destination directory', async () => {
    const copied = await copyPdfjsAssets(srcRoot, destDir);
    expect(copied).toContain('pdf.worker.min.mjs');
    expect(existsSync(join(destDir, 'pdf.worker.min.mjs'))).toBe(true);
    expect(readFileSync(join(destDir, 'pdf.worker.min.mjs'), 'utf8')).toBe('WORKER_MIN');
  });

  it('creates the destination directory if missing', async () => {
    const nested = join(destDir, 'nested', 'pdfjs');
    await copyPdfjsAssets(srcRoot, nested);
    expect(existsSync(join(nested, 'pdf.worker.min.mjs'))).toBe(true);
  });

  it('returns an empty array when build dir is missing', async () => {
    rmSync(join(srcRoot, 'build'), { recursive: true });
    expect(await copyPdfjsAssets(srcRoot, destDir)).toEqual([]);
  });
});
