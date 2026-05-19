import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js'];

export async function copyFfmpegAssets(srcRoot, destDir) {
  const umd = join(srcRoot, 'umd');
  if (!existsSync(umd)) return [];
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const name of FILES) {
    const src = join(umd, name);
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
  const srcRoot = join(repoRoot, 'node_modules', '@ffmpeg', 'core-mt', 'dist');
  const destDir = join(repoRoot, 'public', 'ffmpeg');
  copyFfmpegAssets(srcRoot, destDir).then((copied) => {
    if (copied.length === 0) {
      console.warn('[copy-ffmpeg] @ffmpeg/core-mt not installed yet — skipping');
    } else {
      console.log(`[copy-ffmpeg] copied ${copied.length} file(s) to public/ffmpeg/`);
    }
  });
}
