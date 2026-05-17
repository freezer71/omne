import type { JsonValue } from './types';

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

export type ValidateOptions = {
  draft?: 'draft-07' | '2020-12';
};

type AjvErrorObject = {
  instancePath?: string;
  schemaPath?: string;
  message?: string;
};

type AjvValidateFn = ((value: unknown) => boolean) & {
  errors?: AjvErrorObject[] | null;
};

type AjvType = {
  compile: (schema: unknown) => AjvValidateFn;
};

let cachedDefault: AjvType | null = null;
let cached2020: AjvType | null = null;

async function getAjv(draft: 'draft-07' | '2020-12'): Promise<AjvType> {
  if (draft === '2020-12') {
    if (cached2020) return cached2020;
    const mod = (await import('ajv/dist/2020.js')) as unknown as {
      default: new (opts?: unknown) => AjvType;
    };
    const Ctor = mod.default;
    const inst = new Ctor({ allErrors: true, strict: false }) as AjvType;
    try {
      const formats = (await import('ajv-formats')) as unknown as {
        default: (a: AjvType) => AjvType;
      };
      formats.default(inst);
    } catch {
      // formats optional
    }
    cached2020 = inst;
    return inst;
  }

  if (cachedDefault) return cachedDefault;
  const mod = (await import('ajv')) as unknown as {
    default: new (opts?: unknown) => AjvType;
  };
  const Ctor = mod.default;
  const inst = new Ctor({ allErrors: true, strict: false }) as AjvType;
  try {
    const formats = (await import('ajv-formats')) as unknown as {
      default: (a: AjvType) => AjvType;
    };
    formats.default(inst);
  } catch {
    // formats optional
  }
  cachedDefault = inst;
  return inst;
}

export async function validate(
  data: JsonValue,
  schema: JsonValue,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const draft = options.draft ?? '2020-12';
  let ajv: AjvType;
  try {
    ajv = await getAjv(draft);
  } catch (err) {
    return {
      ok: false,
      errors: [{ path: '$', message: err instanceof Error ? err.message : 'Ajv unavailable' }],
    };
  }

  let validateFn: AjvValidateFn;
  try {
    validateFn = ajv.compile(schema);
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          path: '$schema',
          message: err instanceof Error ? err.message : 'Invalid schema',
        },
      ],
    };
  }

  const valid = validateFn(data);
  if (valid) return { ok: true };
  const errs = validateFn.errors ?? [];
  return {
    ok: false,
    errors: errs.map((e) => ({
      path: `$${e.instancePath ?? ''}`,
      message: e.message ?? 'Invalid',
    })),
  };
}
