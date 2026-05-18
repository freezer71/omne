export type CountStats = {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
  sentences: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
};

export const READING_WPM = 225;
export const SPEAKING_WPM = 150;

/**
 * Count Unicode code points (so emojis & accented chars count as one).
 */
function codePointCount(input: string): number {
  let count = 0;
  // for...of on a string iterates code points.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of input) count++;
  return count;
}

/**
 * Word boundary: any run of letters/digits/apostrophe is a word.
 * Uses Unicode-aware regex.
 */
export function countWords(input: string): number {
  if (!input) return 0;
  const matches = input.match(/[\p{L}\p{N}'’]+/gu);
  return matches ? matches.length : 0;
}

export function countSentences(input: string): number {
  if (!input) return 0;
  // Split on terminal punctuation, keep non-empty trimmed chunks.
  const parts = input
    .split(/[.!?]+(?=\s|$)/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length;
}

export function countParagraphs(input: string): number {
  if (!input.trim()) return 0;
  return input
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;
}

export function countLines(input: string): number {
  if (!input) return 0;
  // Number of "lines" = newlines + 1 if there's any content.
  return input.split('\n').length;
}

export function computeStats(input: string): CountStats {
  const characters = codePointCount(input);
  const charactersNoSpaces = codePointCount(input.replace(/\s/gu, ''));
  const words = countWords(input);
  const lines = input.length === 0 ? 0 : countLines(input);
  const paragraphs = countParagraphs(input);
  const sentences = countSentences(input);
  const readingTimeMinutes = words / READING_WPM;
  const speakingTimeMinutes = words / SPEAKING_WPM;
  return {
    characters,
    charactersNoSpaces,
    words,
    lines,
    paragraphs,
    sentences,
    readingTimeMinutes,
    speakingTimeMinutes,
  };
}

/**
 * Format a fractional minute count as "Xm Ys" (or "Ys" if < 1m).
 */
export function formatDuration(minutes: number): string {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
