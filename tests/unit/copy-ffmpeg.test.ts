import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyFfmpegAssets } from '@/scripts/copy-ffmpeg.mjs';

describe('copyFfmpegAssets', () => {
  let srcRoot: string;
  let destDir: string;

  beforeEach(() => {
    srcRoot = mkdtempSync(join(tmpdir(), 'omne-src-'));
    destDir = mkdtempSync(join(tmpdir(), 'omne-dest-'));
    const umdDir = join(srcRoot, 'umd');
    require('node:fs').mkdirSync(umdDir, { recursive: true });
    writeFileSync(join(umdDir, 'ffmpeg-core.js'), 'JS_CORE');
    writeFileSync(join(umdDir, 'ffmpeg-core.wasm'), Buffer.from([0x00, 0x61, 0x73, 0x6d]));
  });

  afterEach(() => {
    rmSync(srcRoot, { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
  });

  it('copies ffmpeg-core.js and ffmpeg-core.wasm into the destination directory', async () => {
    const copied = await copyFfmpegAssets(srcRoot, destDir);
    expect(copied).toEqual(expect.arrayContaining(['ffmpeg-core.js', 'ffmpeg-core.wasm']));
    expect(existsSync(join(destDir, 'ffmpeg-core.js'))).toBe(true);
    expect(existsSync(join(destDir, 'ffmpeg-core.wasm'))).toBe(true);
  });

  it('preserves file contents byte-for-byte', async () => {
    await copyFfmpegAssets(srcRoot, destDir);
    expect(readFileSync(join(destDir, 'ffmpeg-core.js'), 'utf8')).toBe('JS_CORE');
    const wasm = readFileSync(join(destDir, 'ffmpeg-core.wasm'));
    expect(wasm[0]).toBe(0x00);
    expect(wasm[1]).toBe(0x61);
    expect(wasm[2]).toBe(0x73);
    expect(wasm[3]).toBe(0x6d);
  });

  it('creates the destination directory if it does not exist', async () => {
    const nested = join(destDir, 'nested', 'ffmpeg');
    await copyFfmpegAssets(srcRoot, nested);
    expect(existsSync(join(nested, 'ffmpeg-core.js'))).toBe(true);
  });

  it('returns early without throwing when source umd dir is missing', async () => {
    rmSync(join(srcRoot, 'umd'), { recursive: true });
    const copied = await copyFfmpegAssets(srcRoot, destDir);
    expect(copied).toEqual([]);
  });
});
