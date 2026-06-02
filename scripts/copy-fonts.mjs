import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = [
  { pkg: '@expo-google-fonts/inter', file: '400Regular/Inter_400Regular.ttf', dest: 'Inter-Regular.ttf' },
  { pkg: '@expo-google-fonts/inter', file: '700Bold/Inter_700Bold.ttf', dest: 'Inter-Bold.ttf' },
  { pkg: '@expo-google-fonts/anton', file: '400Regular/Anton_400Regular.ttf', dest: 'Anton-Regular.ttf' },
  { pkg: '@expo-google-fonts/lora', file: '400Regular/Lora_400Regular.ttf', dest: 'Lora-Regular.ttf' },
  { pkg: '@expo-google-fonts/jetbrains-mono', file: '400Regular/JetBrainsMono_400Regular.ttf', dest: 'JetBrainsMono-Regular.ttf' },
  { pkg: 'open-dyslexic', file: 'ttf/OpenDyslexic-Regular.ttf', dest: 'OpenDyslexic-Regular.ttf' },
  { pkg: 'open-dyslexic', file: 'ttf/OpenDyslexic-Bold.ttf', dest: 'OpenDyslexic-Bold.ttf' },
];

export async function copyFontAssets(modulesRoot, destDir) {
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const { pkg, file, dest } of FONTS) {
    const src = join(modulesRoot, pkg, file);
    if (existsSync(src)) {
      copyFileSync(src, join(destDir, dest));
      copied.push(dest);
    }
  }
  return copied;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const modulesRoot = join(repoRoot, 'node_modules');
  const destDir = join(repoRoot, 'public', 'fonts');
  copyFontAssets(modulesRoot, destDir).then((copied) => {
    if (copied.length === 0) {
      console.warn('[copy-fonts] @expo-google-fonts/* not installed yet — skipping');
    } else {
      console.log(`[copy-fonts] copied ${copied.length} font(s) to public/fonts/`);
    }
  });
}
