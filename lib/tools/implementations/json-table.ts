import { safeParse } from '@/lib/json/parse';
import { flattenForTable, type TableShape } from '@/lib/json/tree-utils';
import type { ParseResult } from '@/lib/json/types';

export type TableAnalysis = {
  parse: ParseResult;
  shape: TableShape | null;
};

export function analyzeTable(input: string): TableAnalysis {
  const parse = safeParse(input);
  if (!parse.ok) return { parse, shape: null };
  return { parse, shape: flattenForTable(parse.value) };
}
