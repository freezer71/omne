import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyOrtAssets, ORT_FILES } from '@/scripts/copy-ort.mjs';

describe('copyOrtAssets', () => {
  let srcRoot: string;
  let destDir: string;

  beforeEach(() => {
    srcRoot = mkdtempSync(join(tmpdir(), 'omne-ort-src-'));
    destDir = mkdtempSync(join(tmpdir(), 'omne-ort-dest-'));
    const distDir = join(srcRoot, 'dist');
    mkdirSync(distDir, { recursive: true });
    for (const name of ORT_FILES) {
      writeFileSync(join(distDir, name), `CONTENT:${name}`);
    }
    writeFileSync(join(distDir, 'ort.all.min.mjs'), 'BUNDLE');
  });

  afterEach(() => {
    rmSync(srcRoot, { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
  });

  it('copies every wasm runtime variant (wasm + loader mjs) into the destination', async () => {
    const copied = await copyOrtAssets(srcRoot, destDir);
    expect(copied.sort()).toEqual([...ORT_FILES].sort());
    for (const name of ORT_FILES) {
      expect(existsSync(join(destDir, name))).toBe(true);
      expect(readFileSync(join(destDir, name), 'utf8')).toBe(`CONTENT:${name}`);
    }
  });

  it('covers the asyncify variant requested by the wasm backend', () => {
    expect(ORT_FILES).toContain('ort-wasm-simd-threaded.asyncify.wasm');
    expect(ORT_FILES).toContain('ort-wasm-simd-threaded.asyncify.mjs');
  });

  it('does not copy the JS bundles, only the runtime assets', async () => {
    await copyOrtAssets(srcRoot, destDir);
    expect(existsSync(join(destDir, 'ort.all.min.mjs'))).toBe(false);
  });

  it('creates the destination directory if missing', async () => {
    const nested = join(destDir, 'nested', 'ort');
    await copyOrtAssets(srcRoot, nested);
    expect(existsSync(join(nested, 'ort-wasm-simd-threaded.wasm'))).toBe(true);
  });

  it('returns an empty array when dist dir is missing', async () => {
    rmSync(join(srcRoot, 'dist'), { recursive: true });
    expect(await copyOrtAssets(srcRoot, destDir)).toEqual([]);
  });
});
