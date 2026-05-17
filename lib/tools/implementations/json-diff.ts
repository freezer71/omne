import { safeParse } from '@/lib/json/parse';
import {
  buildPathIndex,
  diffJson,
  summarize,
  type DiffKind,
  type DiffNode,
  type DiffSummary,
} from '@/lib/json/diff';
import type { JsonValue, ParseResult } from '@/lib/json/types';

export type DiffAnalysis = {
  parseA: ParseResult;
  parseB: ParseResult;
  diff: DiffNode[] | null;
  summary: DiffSummary | null;
  index: Map<string, DiffKind> | null;
};

export function analyzeDiff(a: string, b: string): DiffAnalysis {
  const parseA = safeParse(a);
  const parseB = safeParse(b);
  if (!parseA.ok || !parseB.ok) {
    return { parseA, parseB, diff: null, summary: null, index: null };
  }
  const diff = diffJson(parseA.value as JsonValue, parseB.value as JsonValue);
  return {
    parseA,
    parseB,
    diff,
    summary: summarize(diff),
    index: buildPathIndex(diff),
  };
}
