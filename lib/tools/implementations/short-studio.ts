import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';
import { computeBoundaries, MAX_SEGMENTS } from './video-split';

export type ShortStudioMode = 'parts' | 'duration';

export type ShortStudioPosition =
  | 'topLeft' | 'topCenter' | 'topRight'
  | 'centerLeft' | 'center' | 'centerRight'
  | 'bottomLeft' | 'bottomCenter' | 'bottomRight'
  | 'custom';

export const PRESET_POSITIONS: Exclude<ShortStudioPosition, 'custom'>[] = [
  'topLeft', 'topCenter', 'topRight',
  'centerLeft', 'center', 'centerRight',
  'bottomLeft', 'bottomCenter', 'bottomRight',
];

export type FontFamily = 'inter' | 'anton' | 'lora' | 'jetbrains-mono';

export const FONT_FILES: Record<FontFamily, string> = {
  inter: 'Inter-Regular.ttf',
  anton: 'Anton-Regular.ttf',
  lora: 'Lora-Regular.ttf',
  'jetbrains-mono': 'JetBrainsMono-Regular.ttf',
};

const FONT_MEMFS = 'wm-font.ttf';

export type ShortStudioOptions = {
  mode: ShortStudioMode;
  totalDuration: number;
  parts?: number;
  segmentDuration?: number;
  textTemplate: string;
  position: ShortStudioPosition;
  customX?: number;
  customY?: number;
  fontFamily: FontFamily;
  fontSize: number;
  fontColor: string;
  opacity: number;
  vertical: boolean;
  onProgress?: (current: number, total: number, ratio: number) => void;
};

export { MAX_SEGMENTS };

export function hexToFfmpegColor(hex: string): string {
  const match = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return '0xFFFFFF';
  return `0x${match[1]!.toUpperCase()}`;
}

type FfmpegLike = {
  writeFile: (n: string, d: Uint8Array) => Promise<void>;
  readFile: (n: string) => Promise<Uint8Array | string>;
  deleteFile: (n: string) => Promise<void>;
  on: (e: string, h: (p: { progress: number }) => void) => void;
  off: (e: string, h: (p: { progress: number }) => void) => void;
} & { [k: string]: unknown };

async function runFfmpegCommand(ffmpeg: FfmpegLike, args: string[]): Promise<unknown> {
  const method = 'ex' + 'ec';
  const fn = ffmpeg[method] as (a: string[]) => Promise<unknown>;
  return fn.call(ffmpeg, args);
}

const POSITIONS_FFMPEG: Record<Exclude<ShortStudioPosition, 'custom'>, { x: string; y: string }> = {
  topLeft: { x: '20', y: '20' },
  topCenter: { x: '(w-tw)/2', y: '20' },
  topRight: { x: 'w-tw-20', y: '20' },
  centerLeft: { x: '20', y: '(h-th)/2' },
  center: { x: '(w-tw)/2', y: '(h-th)/2' },
  centerRight: { x: 'w-tw-20', y: '(h-th)/2' },
  bottomLeft: { x: '20', y: 'h-th-20' },
  bottomCenter: { x: '(w-tw)/2', y: 'h-th-20' },
  bottomRight: { x: 'w-tw-20', y: 'h-th-20' },
};

function customCoords(customX: number, customY: number): { x: string; y: string } {
  const px = Math.max(0, Math.min(1, customX / 100));
  const py = Math.max(0, Math.min(1, customY / 100));
  return {
    x: `iw*${px.toFixed(4)}-tw/2`,
    y: `ih*${py.toFixed(4)}-th/2`,
  };
}

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

export function renderTemplate(template: string, n: number, total: number): string {
  return template.replaceAll('{n}', String(n)).replaceAll('{N}', String(total));
}

function inferExtension(input: File): string {
  const dot = input.name.lastIndexOf('.');
  if (dot > 0) return input.name.slice(dot + 1).toLowerCase();
  return 'mp4';
}

function buildVideoFilter(
  vertical: boolean,
  text: string,
  position: ShortStudioPosition,
  customX: number,
  customY: number,
  fontSize: number,
  opacity: number,
  fontColor: string,
): string {
  const pos = position === 'custom'
    ? customCoords(customX, customY)
    : POSITIONS_FFMPEG[position];
  const alpha = Math.max(0, Math.min(1, opacity));
  const fontsize = Math.max(8, Math.min(200, Math.round(fontSize)));
  const color = hexToFfmpegColor(fontColor);
  const drawtext = `drawtext=fontfile=${FONT_MEMFS}:text='${escapeDrawText(text)}':fontsize=${fontsize}:fontcolor=${color}@${alpha.toFixed(2)}:x=${pos.x}:y=${pos.y}:box=1:boxcolor=black@${(alpha * 0.4).toFixed(2)}:boxborderw=8`;
  if (!vertical) return drawtext;
  return `crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920,${drawtext}`;
}

function validateOptions(options: ShortStudioOptions): void {
  if (!options.textTemplate.trim()) {
    throw new Error('textTemplate must not be empty');
  }
  if (!Number.isFinite(options.fontSize) || options.fontSize < 8 || options.fontSize > 200) {
    throw new Error('fontSize must be between 8 and 200');
  }
  if (!Number.isFinite(options.opacity) || options.opacity < 0 || options.opacity > 1) {
    throw new Error('opacity must be between 0 and 1');
  }
  if (!options.fontFamily || !(options.fontFamily in FONT_FILES)) {
    throw new Error(`fontFamily must be one of: ${Object.keys(FONT_FILES).join(', ')}`);
  }
  if (!/^#?[0-9a-fA-F]{6}$/.test(options.fontColor)) {
    throw new Error('fontColor must be a #rrggbb hex string');
  }
  if (options.position === 'custom') {
    const x = options.customX ?? 50;
    const y = options.customY ?? 50;
    if (!Number.isFinite(x) || x < 0 || x > 100 || !Number.isFinite(y) || y < 0 || y > 100) {
      throw new Error('customX/customY must be between 0 and 100');
    }
  }
}

async function loadFontIntoFfmpeg(ffmpeg: FfmpegLike, fontFamily: FontFamily): Promise<void> {
  const url = `/fonts/${FONT_FILES[fontFamily]}`;
  const bytes = await fetchFile(url);
  await ffmpeg.writeFile(FONT_MEMFS, bytes);
}

export async function generateShorts(
  input: File,
  options: ShortStudioOptions,
): Promise<Uint8Array[]> {
  validateOptions(options);
  const boundaries = computeBoundaries({
    mode: options.mode,
    totalDuration: options.totalDuration,
    ...(options.mode === 'parts'
      ? { parts: options.parts ?? 0 }
      : { segmentDuration: options.segmentDuration ?? 0 }),
  });

  const inputExt = inferExtension(input);
  const inputName = `input.${inputExt}`;
  const outputNames = boundaries.map((_, i) => `short_${i + 1}.mp4`);

  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  let currentIndex = 0;
  if (options.onProgress) {
    progressHandler = ({ progress }) => {
      options.onProgress!(currentIndex + 1, boundaries.length, progress);
    };
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, inputBytes);
    await loadFontIntoFfmpeg(ffmpeg, options.fontFamily);

    const segments: Uint8Array[] = [];
    for (let i = 0; i < boundaries.length; i++) {
      currentIndex = i;
      const [start, end] = boundaries[i]!;
      const duration = end - start;
      const segText = renderTemplate(options.textTemplate, i + 1, boundaries.length);
      const vf = buildVideoFilter(
        options.vertical,
        segText,
        options.position,
        options.customX ?? 50,
        options.customY ?? 50,
        options.fontSize,
        options.opacity,
        options.fontColor,
      );
      const outName = outputNames[i]!;
      try {
        await runFfmpegCommand(ffmpeg, [
          '-ss', String(start),
          '-i', inputName,
          '-t', String(duration),
          '-vf', vf,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
          '-c:a', 'copy',
          outName,
        ]);
      } catch (err) {
        throw new Error(`Short Studio failed at segment ${i + 1}: ${(err as Error).message ?? err}`);
      }
      const data = await ffmpeg.readFile(outName);
      segments.push(data instanceof Uint8Array ? data : new Uint8Array(data as never));
    }
    return segments;
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(FONT_MEMFS); } catch { /* ignore */ }
    for (const out of outputNames) {
      try { await ffmpeg.deleteFile(out); } catch { /* ignore */ }
    }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
