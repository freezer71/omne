import type { JsonValue } from './types';

export type IndentMode = '2' | '4' | 'tab' | 'minify';

export type FormatOptions = {
  indent: IndentMode;
  sortKeys?: boolean;
};

export function format(value: JsonValue, options: FormatOptions): string {
  const { indent, sortKeys = false } = options;
  const replacer = sortKeys ? sortReplacer : undefined;

  if (indent === 'minify') {
    return JSON.stringify(value, replacer);
  }

  const indentArg: number | string = indent === 'tab' ? '\t' : Number(indent);
  return JSON.stringify(value, replacer, indentArg);
}

function sortReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      sorted[k] = obj[k];
    }
    return sorted;
  }
  return value;
}
