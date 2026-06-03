import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyOcrAssets } from '@/scripts/copy-ocr.mjs';

describe('copyOcrAssets', () => {
  let modulesRoot: string;
  let destDir: string;

  beforeEach(() => {
    modulesRoot = mkdtempSync(join(tmpdir(), 'omne-ocr-src-'));
    destDir = mkdtempSync(join(tmpdir(), 'omne-ocr-dest-'));
    mkdirSync(join(modulesRoot, 'tesseract.js', 'dist'), { recursive: true });
    writeFileSync(join(modulesRoot, 'tesseract.js', 'dist', 'worker.min.js'), 'WORKER');
    const coreDir = join(modulesRoot, 'tesseract.js-core');
    mkdirSync(coreDir, { recursive: true });
    writeFileSync(join(coreDir, 'tesseract-core-simd-lstm.wasm.js'), 'CORE_SIMD_LSTM');
    writeFileSync(join(coreDir, 'tesseract-core-lstm.wasm.js'), 'CORE_LSTM');
    // Files the browser worker never requests — must NOT be copied.
    writeFileSync(join(coreDir, 'tesseract-core-lstm.wasm'), 'RAW_WASM');
    writeFileSync(join(coreDir, 'tesseract-core-lstm.js'), 'GLUE_JS');
    writeFileSync(join(coreDir, 'index.js'), 'INDEX');
    for (const lang of ['eng', 'fra']) {
      mkdirSync(join(modulesRoot, '@tesseract.js-data', lang, '4.0.0'), { recursive: true });
      writeFileSync(
        join(modulesRoot, '@tesseract.js-data', lang, '4.0.0', `${lang}.traineddata.gz`),
        `DATA_${lang}`,
      );
    }
  });

  afterEach(() => {
    rmSync(modulesRoot, { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
  });

  it('copies the worker, every .wasm.js core variant and both traineddata files', async () => {
    const copied = await copyOcrAssets(modulesRoot, destDir);
    expect(copied).toEqual(
      expect.arrayContaining([
        'worker.min.js',
        'core/tesseract-core-simd-lstm.wasm.js',
        'core/tesseract-core-lstm.wasm.js',
        'lang/eng.traineddata.gz',
        'lang/fra.traineddata.gz',
      ]),
    );
    expect(existsSync(join(destDir, 'worker.min.js'))).toBe(true);
    expect(existsSync(join(destDir, 'core', 'tesseract-core-simd-lstm.wasm.js'))).toBe(true);
    expect(existsSync(join(destDir, 'lang', 'fra.traineddata.gz'))).toBe(true);
  });

  it('does not copy raw .wasm, glue .js or unrelated files', async () => {
    await copyOcrAssets(modulesRoot, destDir);
    expect(existsSync(join(destDir, 'core', 'tesseract-core-lstm.wasm'))).toBe(false);
    expect(existsSync(join(destDir, 'core', 'tesseract-core-lstm.js'))).toBe(false);
    expect(existsSync(join(destDir, 'core', 'index.js'))).toBe(false);
  });

  it('preserves file contents byte-for-byte', async () => {
    await copyOcrAssets(modulesRoot, destDir);
    expect(readFileSync(join(destDir, 'worker.min.js'), 'utf8')).toBe('WORKER');
    expect(readFileSync(join(destDir, 'lang', 'eng.traineddata.gz'), 'utf8')).toBe('DATA_eng');
  });

  it('creates nested destination directories', async () => {
    const nested = join(destDir, 'nested', 'ocr');
    await copyOcrAssets(modulesRoot, nested);
    expect(existsSync(join(nested, 'core', 'tesseract-core-lstm.wasm.js'))).toBe(true);
  });

  it('returns early without throwing when tesseract.js is missing', async () => {
    rmSync(join(modulesRoot, 'tesseract.js'), { recursive: true });
    const copied = await copyOcrAssets(modulesRoot, destDir);
    expect(copied).toEqual([]);
  });
});
