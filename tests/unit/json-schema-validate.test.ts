import { describe, it, expect } from 'vitest';
import { validate } from '@/lib/json/schema-validate';

describe('validate', () => {
  it('accepts a valid object against an object schema', async () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
      required: ['name'],
    };
    const r = await validate({ name: 'Alice', age: 30 }, schema);
    expect(r.ok).toBe(true);
  });

  it('reports errors for missing required keys', async () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    const r = await validate({}, schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it('reports errors with the offending path', async () => {
    const schema = {
      type: 'object',
      properties: { age: { type: 'integer' } },
    };
    const r = await validate({ age: 'oops' }, schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]?.path).toMatch(/age/);
    }
  });

  it('returns a schema error for an invalid schema', async () => {
    const r = await validate(42, { type: 'not-a-real-type' });
    expect(r.ok).toBe(false);
  });

  it('validates draft 2020-12 by default', async () => {
    const schema = { type: 'integer' };
    const r = await validate(42, schema, { draft: '2020-12' });
    expect(r.ok).toBe(true);
  });
});
