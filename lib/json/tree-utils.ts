import type { JsonValue } from './types';

export type WalkVisitor = (path: string, value: JsonValue) => void;

export function walk(value: JsonValue, visitor: WalkVisitor, rootPath = '$'): void {
  visitor(rootPath, value);
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i] as JsonValue, visitor, `${rootPath}[${i}]`);
    }
  } else {
    const obj = value as { [key: string]: JsonValue };
    for (const k of Object.keys(obj)) {
      walk(obj[k] as JsonValue, visitor, `${rootPath}.${k}`);
    }
  }
}

export type JsonStats = {
  depth: number;
  nodes: number;
  keys: number;
  arrays: number;
  objects: number;
};

export function computeStats(value: JsonValue): JsonStats {
  let depth = 0;
  let nodes = 0;
  let keys = 0;
  let arrays = 0;
  let objects = 0;

  function visit(v: JsonValue, level: number) {
    nodes++;
    if (level > depth) depth = level;
    if (v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      arrays++;
      for (const item of v) visit(item as JsonValue, level + 1);
    } else {
      objects++;
      const obj = v as { [key: string]: JsonValue };
      for (const k of Object.keys(obj)) {
        keys++;
        visit(obj[k] as JsonValue, level + 1);
      }
    }
  }
  visit(value, 0);
  return { depth, nodes, keys, arrays, objects };
}

export type TableShape = {
  columns: string[];
  rows: Array<Record<string, JsonValue>>;
};

export function flattenForTable(value: JsonValue): TableShape | null {
  if (!Array.isArray(value)) return null;
  const rows: Array<Record<string, JsonValue>> = [];
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const item of value) {
    const itemVal = item as JsonValue;
    if (itemVal === null || typeof itemVal !== 'object' || Array.isArray(itemVal)) {
      rows.push({ value: itemVal });
      if (!seen.has('value')) {
        seen.add('value');
        columns.push('value');
      }
      continue;
    }
    const obj = itemVal as { [key: string]: JsonValue };
    const row: Record<string, JsonValue> = {};
    for (const k of Object.keys(obj)) {
      if (!seen.has(k)) {
        seen.add(k);
        columns.push(k);
      }
      row[k] = obj[k] as JsonValue;
    }
    rows.push(row);
  }
  return { columns, rows };
}
