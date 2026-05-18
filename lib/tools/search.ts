import type { ToolStatus } from './types';
import { matchesAcceptedMime } from './mime-aliases';
import { getMatchRanges, type Range } from './highlight';

export type SearchableTool = {
  id: string;
  category: string;
  href: string;
  name: string;
  description: string;
  keywords: readonly string[];
  status: ToolStatus;
  acceptedMime?: readonly string[];
};

export type RankedResult<T extends SearchableTool = SearchableTool> = {
  tool: T;
  score: number;
  nameRanges: Range[];
  descriptionRanges: Range[];
};

export function normalizeForSearch(input: string): string {
  return input.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function editDistanceLE1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diffs = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) {
        diffs++;
        if (diffs > 1) return false;
      }
    }
    return diffs <= 1;
  }
  const [shorter, longer] = la < lb ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else {
      if (skipped) return false;
      skipped = true;
      j++;
    }
  }
  return true;
}

function fuzzyHit(haystackWords: readonly string[], term: string): boolean {
  if (term.length < 3) return false;
  return haystackWords.some((w) => w.length >= 3 && editDistanceLE1(w, term));
}

function tokenize(text: string): string[] {
  return text.split(/[^a-z0-9]+/).filter(Boolean);
}

export function matchesQuery(tool: SearchableTool, query: string): boolean {
  return score(tool, query) > 0;
}

function score(tool: SearchableTool, rawQuery: string): number {
  const q = normalizeForSearch(rawQuery.trim());
  if (!q) return 1;
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;

  const name = normalizeForSearch(tool.name);
  const description = normalizeForSearch(tool.description);
  const kws = tool.keywords.map(normalizeForSearch);
  const nameWords = tokenize(name);
  const descWords = tokenize(description);
  const kwWords = kws.flatMap(tokenize);

  let total = 0;
  let allTermsInName = true;

  for (const term of terms) {
    let termScore = 0;
    if (name === term) termScore = 120;
    else if (name.startsWith(term)) termScore = 100;
    else if (name.includes(term)) termScore = 60;
    else if (kws.some((k) => k === term)) termScore = 40;
    else if (kws.some((k) => k.startsWith(term))) termScore = 25;
    else if (kws.some((k) => k.includes(term))) termScore = 18;
    else if (description.includes(term)) termScore = 12;
    else if (tool.acceptedMime && matchesAcceptedMime(tool.acceptedMime, term)) termScore = 35;
    else if (fuzzyHit(nameWords, term)) termScore = 22;
    else if (fuzzyHit(kwWords, term)) termScore = 14;
    else if (fuzzyHit(descWords, term)) termScore = 6;
    else return 0;

    if (!name.includes(term)) allTermsInName = false;
    total += termScore;
  }

  if (terms.length > 1 && allTermsInName) total += 20;

  if (tool.status === 'soon') total = Math.max(1, Math.floor(total * 0.4));
  else if (tool.status === 'beta') total = Math.floor(total * 0.9);

  return total;
}

export function searchTools<T extends SearchableTool>(
  tools: readonly T[],
  query: string,
): RankedResult<T>[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return tools.map((tool) => ({
      tool,
      score: 1,
      nameRanges: [],
      descriptionRanges: [],
    }));
  }

  const out: RankedResult<T>[] = [];
  for (const tool of tools) {
    const s = score(tool, trimmed);
    if (s <= 0) continue;
    out.push({
      tool,
      score: s,
      nameRanges: getMatchRanges(tool.name, trimmed),
      descriptionRanges: getMatchRanges(tool.description, trimmed),
    });
  }

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.tool.name.localeCompare(b.tool.name);
  });
  return out;
}

export function filterTools<T extends SearchableTool>(
  tools: readonly T[],
  query: string,
): T[] {
  return searchTools(tools, query).map((r) => r.tool);
}
