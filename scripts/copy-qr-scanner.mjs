import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES = ['qr-scanner-worker.min.js'];

export async function copyQrScannerAssets(srcRoot, destDir) {
  if (!existsSync(srcRoot)) return [];
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const name of FILES) {
    const src = join(srcRoot, name);
    if (existsSync(src)) {
      copyFileSync(src, join(destDir, name));
      copied.push(name);
    }
  }
  return copied;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const srcRoot = join(repoRoot, 'node_modules', 'qr-scanner');
  const destDir = join(repoRoot, 'public', 'qr-scanner');
  copyQrScannerAssets(srcRoot, destDir).then((copied) => {
    if (copied.length === 0) {
      console.warn('[copy-qr-scanner] qr-scanner not installed yet — skipping');
    } else {
      console.log(`[copy-qr-scanner] copied ${copied.length} file(s) to public/qr-scanner/`);
    }
  });
}
