import type { JsonValue } from './types';

export type SchemaDraft = 'draft-07' | '2020-12';

export type InferOptions = {
  draft?: SchemaDraft;
  detectFormats?: boolean;
};

type Schema = {
  $schema?: string;
  type?: string | string[];
  format?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  oneOf?: Schema[];
};

const DRAFT_URLS: Record<SchemaDraft, string> = {
  'draft-07': 'http://json-schema.org/draft-07/schema#',
  '2020-12': 'https://json-schema.org/draft/2020-12/schema',
};

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_DATETIME = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_URI = /^https?:\/\/\S+/i;
const RE_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function inferSchema(sample: JsonValue, options: InferOptions = {}): Schema {
  const draft = options.draft ?? '2020-12';
  const detect = options.detectFormats ?? true;
  const out = inferNode(sample, detect);
  return { $schema: DRAFT_URLS[draft], ...out };
}

function inferNode(value: JsonValue, detect: boolean): Schema {
  if (value === null) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  }
  if (typeof value === 'string') {
    const s: Schema = { type: 'string' };
    if (detect) {
      const fmt = detectFormat(value);
      if (fmt) s.format = fmt;
    }
    return s;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array' };
    const itemSchemas = value.map((v) => inferNode(v as JsonValue, detect));
    const merged = mergeSchemas(itemSchemas);
    return { type: 'array', items: merged };
  }
  // Object
  const obj = value as Record<string, JsonValue>;
  const properties: Record<string, Schema> = {};
  const required: string[] = [];
  for (const k of Object.keys(obj)) {
    properties[k] = inferNode(obj[k] as JsonValue, detect);
    required.push(k);
  }
  const schema: Schema = { type: 'object' };
  if (Object.keys(properties).length > 0) schema.properties = properties;
  if (required.length > 0) schema.required = required;
  return schema;
}

function detectFormat(value: string): string | undefined {
  if (RE_DATETIME.test(value)) return 'date-time';
  if (RE_DATE.test(value)) return 'date';
  if (RE_EMAIL.test(value)) return 'email';
  if (RE_UUID.test(value)) return 'uuid';
  if (RE_URI.test(value)) return 'uri';
  return undefined;
}

function mergeSchemas(schemas: Schema[]): Schema {
  if (schemas.length === 0) return {};
  if (schemas.length === 1) return schemas[0]!;
  const types = new Set<string>();
  let hasObject = false;
  for (const s of schemas) {
    if (typeof s.type === 'string') types.add(s.type);
    if (s.type === 'object') hasObject = true;
  }
  if (types.size === 1) {
    if (hasObject) {
      const allProps: Record<string, Schema[]> = {};
      const required = new Set<string>(Object.keys(schemas[0]?.properties ?? {}));
      for (const s of schemas) {
        const props = s.properties ?? {};
        for (const k of Object.keys(props)) {
          (allProps[k] ??= []).push(props[k]!);
        }
        const req = new Set(s.required ?? []);
        for (const r of required) if (!req.has(r)) required.delete(r);
      }
      const mergedProps: Record<string, Schema> = {};
      for (const k of Object.keys(allProps)) {
        mergedProps[k] = mergeSchemas(allProps[k]!);
      }
      const out: Schema = { type: 'object' };
      if (Object.keys(mergedProps).length > 0) out.properties = mergedProps;
      if (required.size > 0) out.required = Array.from(required);
      return out;
    }
    return schemas[0]!;
  }
  return { oneOf: schemas };
}
