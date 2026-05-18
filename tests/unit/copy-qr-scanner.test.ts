import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyQrScannerAssets } from '@/scripts/copy-qr-scanner.mjs';

describe('copyQrScannerAssets', () => {
  let srcRoot: string;
  let destDir: string;

  beforeEach(() => {
    srcRoot = mkdtempSync(join(tmpdir(), 'omne-qr-src-'));
    destDir = mkdtempSync(join(tmpdir(), 'omne-qr-dest-'));
    writeFileSync(join(srcRoot, 'qr-scanner-worker.min.js'), 'WORKER_JS');
  });

  afterEach(() => {
    rmSync(srcRoot, { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
  });

  it('copies the qr-scanner worker into the destination directory', async () => {
    const copied = await copyQrScannerAssets(srcRoot, destDir);
    expect(copied).toEqual(['qr-scanner-worker.min.js']);
    expect(existsSync(join(destDir, 'qr-scanner-worker.min.js'))).toBe(true);
  });

  it('preserves file contents byte-for-byte', async () => {
    await copyQrScannerAssets(srcRoot, destDir);
    expect(readFileSync(join(destDir, 'qr-scanner-worker.min.js'), 'utf8')).toBe('WORKER_JS');
  });

  it('creates the destination directory if it does not exist', async () => {
    const nested = join(destDir, 'nested', 'qr');
    await copyQrScannerAssets(srcRoot, nested);
    expect(existsSync(join(nested, 'qr-scanner-worker.min.js'))).toBe(true);
  });

  it('returns early without throwing when source dir is missing', async () => {
    rmSync(srcRoot, { recursive: true });
    mkdirSync(srcRoot, { recursive: true });
    rmSync(srcRoot, { recursive: true });
    const copied = await copyQrScannerAssets(srcRoot, destDir);
    expect(copied).toEqual([]);
  });
});
