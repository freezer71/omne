import { safeParse } from '@/lib/json/parse';
import { computeStats, type JsonStats } from '@/lib/json/tree-utils';
import type { JsonValue, ParseResult } from '@/lib/json/types';

export type TreeAnalysis = {
  parse: ParseResult;
  stats: JsonStats | null;
};

export function analyzeJson(input: string): TreeAnalysis {
  const parse = safeParse(input);
  if (!parse.ok) return { parse, stats: null };
  return { parse, stats: computeStats(parse.value as JsonValue) };
}

export type { JsonStats };
