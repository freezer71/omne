import type { JsonValue } from './types';

export type DiffKind = 'same' | 'add' | 'del' | 'change';

export type DiffNode = {
  path: string;
  kind: DiffKind;
  before?: JsonValue | undefined;
  after?: JsonValue | undefined;
};

export type DiffSummary = {
  added: number;
  removed: number;
  changed: number;
  same: number;
};

export function diffJson(a: JsonValue, b: JsonValue, rootPath = '$'): DiffNode[] {
  const out: DiffNode[] = [];
  walkDiff(a, b, rootPath, out);
  return out;
}

function walkDiff(a: JsonValue, b: JsonValue, path: string, out: DiffNode[]): void {
  if (isObject(a) && isObject(b)) {
    const allKeys = unionKeys(a, b);
    for (const key of allKeys) {
      const sub = `${path}.${key}`;
      const hasA = key in a;
      const hasB = key in b;
      if (!hasA && hasB) {
        out.push({ path: sub, kind: 'add', after: b[key] });
      } else if (hasA && !hasB) {
        out.push({ path: sub, kind: 'del', before: a[key] });
      } else {
        walkDiff(a[key] as JsonValue, b[key] as JsonValue, sub, out);
      }
    }
    return;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      const sub = `${path}[${i}]`;
      if (i >= a.length) out.push({ path: sub, kind: 'add', after: b[i] });
      else if (i >= b.length) out.push({ path: sub, kind: 'del', before: a[i] });
      else walkDiff(a[i] as JsonValue, b[i] as JsonValue, sub, out);
    }
    return;
  }

  if (deepEqual(a, b)) {
    out.push({ path, kind: 'same', before: a, after: b });
  } else {
    out.push({ path, kind: 'change', before: a, after: b });
  }
}

export function summarize(diff: DiffNode[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0, same: 0 };
  for (const node of diff) {
    if (node.kind === 'add') summary.added++;
    else if (node.kind === 'del') summary.removed++;
    else if (node.kind === 'change') summary.changed++;
    else summary.same++;
  }
  return summary;
}

export function buildPathIndex(diff: DiffNode[]): Map<string, DiffKind> {
  const map = new Map<string, DiffKind>();
  for (const node of diff) {
    if (node.kind === 'same') continue;
    map.set(node.path, node.kind);
    propagate(node.path, node.kind, map);
  }
  return map;
}

function propagate(path: string, kind: DiffKind, map: Map<string, DiffKind>): void {
  let current = path;
  while (true) {
    const lastDot = current.lastIndexOf('.');
    const lastBr = current.lastIndexOf('[');
    const cut = Math.max(lastDot, lastBr);
    if (cut <= 0) break;
    current = current.slice(0, cut);
    const existing = map.get(current);
    if (!existing) map.set(current, 'change');
    else if (existing !== 'change' && existing !== kind) map.set(current, 'change');
  }
}

function isObject(v: unknown): v is Record<string, JsonValue> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function unionKeys(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of Object.keys(a)) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  for (const k of Object.keys(b)) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => deepEqual(aObj[k], bObj[k]));
}
