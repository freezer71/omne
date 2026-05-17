import type { JsonValue } from './types';

export type CsvDelimiter = ',' | ';' | '\t' | '|';
export type CsvQuote = '"' | "'";

export type CsvOptions = {
  delimiter?: CsvDelimiter;
  quote?: CsvQuote;
  headers?: boolean;
};

export function jsonToCsv(
  rows: Array<Record<string, JsonValue>>,
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ',';
  const quote = options.quote ?? '"';
  const headers = options.headers ?? true;

  if (rows.length === 0) return '';

  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        columns.push(k);
      }
    }
  }

  const quoteRe = new RegExp(escapeRegex(quote), 'g');
  const escape = (value: unknown): string => {
    let str: string;
    if (value === null || value === undefined) str = '';
    else if (typeof value === 'string') str = value;
    else str = JSON.stringify(value);
    const needsQuote =
      str.includes(delimiter) ||
      str.includes(quote) ||
      str.includes('\n') ||
      str.includes('\r');
    if (needsQuote) return `${quote}${str.replace(quoteRe, quote + quote)}${quote}`;
    return str;
  };

  const lines: string[] = [];
  if (headers) lines.push(columns.map(escape).join(delimiter));
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(delimiter));
  }
  return lines.join('\n');
}

export function csvToJson(
  text: string,
  options: CsvOptions = {},
): Array<Record<string, string>> {
  const delimiter = options.delimiter ?? ',';
  const quote = options.quote ?? '"';
  const headers = options.headers ?? true;

  let body = text;
  if (body.charCodeAt(0) === 0xfeff) body = body.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;
  let i = 0;

  while (i < body.length) {
    const c = body[i];
    if (inQuote) {
      if (c === quote) {
        if (body[i + 1] === quote) {
          cell += quote;
          i += 2;
        } else {
          inQuote = false;
          i++;
        }
      } else {
        cell += c;
        i++;
      }
    } else if (c === quote) {
      inQuote = true;
      i++;
    } else if (c === delimiter) {
      row.push(cell);
      cell = '';
      i++;
    } else if (c === '\r') {
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
      if (body[i + 1] === '\n') i += 2;
      else i++;
    } else if (c === '\n') {
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
      i++;
    } else {
      cell += c;
      i++;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  let cols: string[];
  let dataStart: number;
  if (headers) {
    cols = rows[0] ?? [];
    dataStart = 1;
  } else {
    cols = (rows[0] ?? []).map((_, idx) => `col${idx + 1}`);
    dataStart = 0;
  }

  const out: Array<Record<string, string>> = [];
  for (let r = dataStart; r < rows.length; r++) {
    const dataRow = rows[r] ?? [];
    const obj: Record<string, string> = {};
    for (let c = 0; c < cols.length; c++) {
      obj[cols[c] ?? `col${c + 1}`] = dataRow[c] ?? '';
    }
    out.push(obj);
  }
  return out;
}

export function detectDelimiter(text: string): CsvDelimiter {
  const firstLine = (text.split(/\r?\n/, 1)[0] ?? '').slice(0, 5000);
  const candidates: Array<[CsvDelimiter, number]> = [
    [',', countOutsideQuotes(firstLine, ',')],
    [';', countOutsideQuotes(firstLine, ';')],
    ['\t', countOutsideQuotes(firstLine, '\t')],
    ['|', countOutsideQuotes(firstLine, '|')],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0]?.[0] ?? ',';
}

function countOutsideQuotes(text: string, char: string): number {
  let count = 0;
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuote = !inQuote;
    else if (!inQuote && c === char) count++;
  }
  return count;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
