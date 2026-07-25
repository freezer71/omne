// Compares an input file's size against the size a tool produced, so the result
// panel can state the outcome ("32% smaller") instead of leaving the user to
// compare two byte counts in their head.
//
// Pure and DOM-free on purpose: it is unit-tested in Node alongside the other
// tool logic, while the rendering lives in components/ui/tool-result.tsx.

export type SizeComparison =
  | { direction: 'smaller'; percent: number }
  | { direction: 'larger'; percent: number }
  | { direction: 'same' };

// Returns null when there is nothing meaningful to compare — an unknown source
// size, a zero-byte source (no ratio exists), or a non-finite input. Callers
// render the output size alone in that case.
export function compareSizes(before: number, after: number): SizeComparison | null {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  if (before <= 0 || after < 0) return null;

  const ratio = (after - before) / before;
  const percent = Math.round(Math.abs(ratio) * 100);

  // A sub-0.5% difference rounds to 0 and reads as noise, not as a result.
  if (percent === 0) return { direction: 'same' };

  return ratio < 0 ? { direction: 'smaller', percent } : { direction: 'larger', percent };
}
