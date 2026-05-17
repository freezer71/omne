import { safeParse } from '@/lib/json/parse';
import { query, type QueryResult } from '@/lib/json/path';
import type { ParseResult } from '@/lib/json/types';

export type JsonQueryAnalysis = {
  parse: ParseResult;
  result: QueryResult | null;
};

export function runQuery(input: string, path: string): JsonQueryAnalysis {
  const parse = safeParse(input);
  if (!parse.ok) return { parse, result: null };
  return { parse, result: query(parse.value, path) };
}
