import { safeParse } from '@/lib/json/parse';
import { format, type FormatOptions, type IndentMode } from '@/lib/json/format';
import type { ParseResult } from '@/lib/json/types';

export type { IndentMode, FormatOptions, ParseResult };

export type JsonFormatResult = {
  parse: ParseResult;
  output: string;
};

export function formatJson(input: string, options: FormatOptions): JsonFormatResult {
  const parse = safeParse(input);
  if (!parse.ok) return { parse, output: '' };
  return { parse, output: format(parse.value, options) };
}
