import { safeParse } from '@/lib/json/parse';
import {
  csvToJson,
  detectDelimiter,
  jsonToCsv,
  type CsvDelimiter,
  type CsvOptions,
  type CsvQuote,
} from '@/lib/json/csv';
import type { JsonValue, ParseResult } from '@/lib/json/types';

export type JsonToCsvResult =
  | { ok: true; csv: string; rowCount: number; columnCount: number }
  | { ok: false; reason: 'parse'; parse: ParseResult }
  | { ok: false; reason: 'not-array' };

export function convertJsonToCsv(input: string, options: CsvOptions): JsonToCsvResult {
  const parse = safeParse(input);
  if (!parse.ok) return { ok: false, reason: 'parse', parse };
  if (!Array.isArray(parse.value)) return { ok: false, reason: 'not-array' };
  const rows = (parse.value as JsonValue[]).map((row) =>
    row && typeof row === 'object' && !Array.isArray(row)
      ? (row as Record<string, JsonValue>)
      : { value: row as JsonValue },
  );
  const csv = jsonToCsv(rows, options);
  const columnCount = csv.split('\n')[0]?.split(options.delimiter ?? ',').length ?? 0;
  return { ok: true, csv, rowCount: rows.length, columnCount };
}

export function convertCsvToJson(
  input: string,
  options: CsvOptions,
): { json: Array<Record<string, string>>; text: string } {
  const json = csvToJson(input, options);
  const text = JSON.stringify(json, null, 2);
  return { json, text };
}

export { detectDelimiter };
export type { CsvDelimiter, CsvQuote, CsvOptions };
