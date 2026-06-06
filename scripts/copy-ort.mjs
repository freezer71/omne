import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every wasm runtime variant onnxruntime-web may request at runtime (plain,
// asyncify, jsep/webgpu, jspi) plus its loader .mjs. Self-hosted under
// /public/ort/ so the browser never reaches for cdn.jsdelivr.net — the CSP
// blocks it and the privacy promise forbids third-party CDNs anyway. Only the
// variant matching the browser's capabilities is actually fetched by clients.
export const ORT_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jspi.wasm',
  'ort-wasm-simd-threaded.jspi.mjs',
];

export async function copyOrtAssets(srcRoot, destDir) {
  const dist = join(srcRoot, 'dist');
  if (!existsSync(dist)) return [];
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const name of ORT_FILES) {
    const src = join(dist, name);
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
  const srcRoot = join(repoRoot, 'node_modules', 'onnxruntime-web');
  const destDir = join(repoRoot, 'public', 'ort');
  copyOrtAssets(srcRoot, destDir).then((copied) => {
    if (copied.length === 0) {
      console.warn('[copy-ort] onnxruntime-web not installed yet — skipping');
    } else {
      console.log(`[copy-ort] copied ${copied.length} file(s) to public/ort/`);
    }
  });
}
