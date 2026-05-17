import { JSONPath } from 'jsonpath-plus';
import type { JsonValue } from './types';

export type QuerySuccess = {
  ok: true;
  results: JsonValue[];
  paths: string[];
};

export type QueryFailure = {
  ok: false;
  message: string;
};

export type QueryResult = QuerySuccess | QueryFailure;

export function query(value: JsonValue, path: string): QueryResult {
  if (!path.trim()) {
    return { ok: true, results: [], paths: [] };
  }
  try {
    const results = JSONPath({
      path,
      json: value as object,
    }) as JsonValue[];
    const paths = JSONPath({
      path,
      json: value as object,
      resultType: 'path',
    }) as string[];
    return { ok: true, results, paths };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSONPath expression';
    return { ok: false, message };
  }
}
