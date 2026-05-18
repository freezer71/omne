export type Range = readonly [start: number, endExclusive: number];

function normalizeChar(ch: string): string {
  return ch.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function buildNormalized(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === undefined) continue;
    const stripped = normalizeChar(ch);
    for (let j = 0; j < stripped.length; j++) {
      const s = stripped[j];
      if (s === undefined) continue;
      norm += s;
      map.push(i);
    }
  }
  return { norm, map };
}

function normalizeQuery(q: string): string {
  return q.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function getMatchRanges(text: string, query: string): Range[] {
  const q = normalizeQuery(query.trim());
  if (!q || !text) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const { norm, map } = buildNormalized(text);
  const found: Range[] = [];

  for (const term of terms) {
    if (term.length === 0) continue;
    let from = 0;
    while (from <= norm.length - term.length) {
      const at = norm.indexOf(term, from);
      if (at === -1) break;
      const start = map[at];
      const lastNormIdx = at + term.length - 1;
      const lastOrigIdx = map[lastNormIdx];
      if (start === undefined || lastOrigIdx === undefined) {
        from = at + term.length;
        continue;
      }
      found.push([start, lastOrigIdx + 1]);
      from = at + term.length;
    }
  }

  return mergeRanges(found);
}

export function mergeRanges(ranges: readonly Range[]): Range[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const first = sorted[0];
  if (!first) return [];
  const out: Range[] = [];
  let [curStart, curEnd] = first;
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (!next) continue;
    const [s, e] = next;
    if (s <= curEnd) {
      if (e > curEnd) curEnd = e;
    } else {
      out.push([curStart, curEnd]);
      curStart = s;
      curEnd = e;
    }
  }
  out.push([curStart, curEnd]);
  return out;
}
