import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES = ['pdf.worker.min.mjs'];

export async function copyPdfjsAssets(srcRoot, destDir) {
  const build = join(srcRoot, 'build');
  if (!existsSync(build)) return [];
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const name of FILES) {
    const src = join(build, name);
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
  const srcRoot = join(repoRoot, 'node_modules', 'pdfjs-dist');
  const destDir = join(repoRoot, 'public', 'pdfjs');
  copyPdfjsAssets(srcRoot, destDir).then((copied) => {
    if (copied.length === 0) {
      console.warn('[copy-pdfjs] pdfjs-dist not installed yet — skipping');
    } else {
      console.log(`[copy-pdfjs] copied ${copied.length} file(s) to public/pdfjs/`);
    }
  });
}
