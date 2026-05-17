import { safeParse } from '@/lib/json/parse';
import { inferSchema, type SchemaDraft } from '@/lib/json/schema-infer';
import { validate, type ValidationResult } from '@/lib/json/schema-validate';
import type { JsonValue, ParseResult } from '@/lib/json/types';

export type GenerateAnalysis =
  | { ok: true; parse: ParseResult; schema: string }
  | { ok: false; reason: 'parse'; parse: ParseResult };

export function generateSchemaFromSample(input: string, draft: SchemaDraft): GenerateAnalysis {
  const parse = safeParse(input);
  if (!parse.ok) return { ok: false, reason: 'parse', parse };
  const schema = inferSchema(parse.value as JsonValue, { draft });
  return { ok: true, parse, schema: JSON.stringify(schema, null, 2) };
}

export type ValidateAnalysis =
  | { ok: true; result: ValidationResult }
  | { ok: false; reason: 'parse-data' | 'parse-schema'; parse: ParseResult };

export async function validateAgainstSchema(
  dataText: string,
  schemaText: string,
  draft: SchemaDraft,
): Promise<ValidateAnalysis> {
  const dataParse = safeParse(dataText);
  if (!dataParse.ok) return { ok: false, reason: 'parse-data', parse: dataParse };
  const schemaParse = safeParse(schemaText);
  if (!schemaParse.ok) return { ok: false, reason: 'parse-schema', parse: schemaParse };
  const result = await validate(dataParse.value as JsonValue, schemaParse.value as JsonValue, {
    draft,
  });
  return { ok: true, result };
}

export type { SchemaDraft };
