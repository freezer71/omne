import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Self-hosted tesseract.js assets (privacy promise: zero CDN traffic).
// - worker.min.js: the OCR Worker entry point (spawned directly, not via blob).
// - core/*.wasm.js: single-file Emscripten builds; the worker picks ONE variant
//   at runtime (relaxedsimd/simd/baseline × lstm) so every variant must exist.
// - lang/*.traineddata.gz: LSTM language models (4.0.0 = integer/fast variant).
const LANGS = ['eng', 'fra'];

export async function copyOcrAssets(modulesRoot, destDir) {
  const workerSrc = join(modulesRoot, 'tesseract.js', 'dist', 'worker.min.js');
  const coreDir = join(modulesRoot, 'tesseract.js-core');
  if (!existsSync(workerSrc) || !existsSync(coreDir)) return [];

  mkdirSync(join(destDir, 'core'), { recursive: true });
  mkdirSync(join(destDir, 'lang'), { recursive: true });
  const copied = [];

  copyFileSync(workerSrc, join(destDir, 'worker.min.js'));
  copied.push('worker.min.js');

  for (const name of readdirSync(coreDir)) {
    if (!name.startsWith('tesseract-core') || !name.endsWith('.wasm.js')) continue;
    copyFileSync(join(coreDir, name), join(destDir, 'core', name));
    copied.push(`core/${name}`);
  }

  for (const lang of LANGS) {
    const src = join(modulesRoot, '@tesseract.js-data', lang, '4.0.0', `${lang}.traineddata.gz`);
    if (existsSync(src)) {
      copyFileSync(src, join(destDir, 'lang', `${lang}.traineddata.gz`));
      copied.push(`lang/${lang}.traineddata.gz`);
    }
  }
  return copied;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const modulesRoot = join(repoRoot, 'node_modules');
  const destDir = join(repoRoot, 'public', 'ocr');
  copyOcrAssets(modulesRoot, destDir).then((copied) => {
    if (copied.length === 0) {
      console.warn('[copy-ocr] tesseract.js not installed yet — skipping');
    } else {
      console.log(`[copy-ocr] copied ${copied.length} file(s) to public/ocr/`);
    }
  });
}
