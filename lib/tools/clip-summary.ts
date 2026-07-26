// Small helpers for the merge tools, which line up several clips and have to
// tell the user what the result will be before spending minutes producing it.
//
// Pure and DOM-free so they can be unit-tested in Node; the probing that feeds
// them lives in lib/hooks/use-clip-metadata.ts.

export type ClipInfo = {
  durationSec: number;
  width?: number | undefined;
  height?: number | undefined;
};

// Clock format, dropping the hours group until it is needed: 0:04, 3:07, 1:02:03.
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.round(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Returns null while any clip is still unmeasured, so the UI shows nothing
// rather than a running total that keeps jumping as probes land.
export function totalDuration(clips: Array<ClipInfo | null>): number | null {
  if (clips.length === 0) return null;
  let sum = 0;
  for (const clip of clips) {
    if (!clip || !Number.isFinite(clip.durationSec)) return null;
    sum += clip.durationSec;
  }
  return sum;
}

// Concatenating clips of different sizes produces a broken montage, and the
// user only finds out after the encode. Flags it while there is still time to
// fix the input. Clips that have not been measured yet are ignored rather than
// counted as different.
export function hasMixedDimensions(clips: Array<ClipInfo | null>): boolean {
  const seen = new Set<string>();
  for (const clip of clips) {
    if (!clip?.width || !clip?.height) continue;
    seen.add(`${clip.width}x${clip.height}`);
    if (seen.size > 1) return true;
  }
  return false;
}
