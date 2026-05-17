import { describe, it, expect } from 'vitest';
import { inferSchema } from '@/lib/json/schema-infer';

describe('inferSchema', () => {
  it('infers types for primitives', () => {
    expect(inferSchema(42).type).toBe('integer');
    expect(inferSchema(3.14).type).toBe('number');
    expect(inferSchema(true).type).toBe('boolean');
    expect(inferSchema('hi').type).toBe('string');
    expect(inferSchema(null).type).toBe('null');
  });

  it('infers object shape with required keys', () => {
    const s = inferSchema({ name: 'Alice', age: 30 });
    expect(s.type).toBe('object');
    expect(s.properties?.['name']?.type).toBe('string');
    expect(s.properties?.['age']?.type).toBe('integer');
    expect(s.required).toEqual(['name', 'age']);
  });

  it('infers array of objects with union shape', () => {
    const s = inferSchema([
      { name: 'A', age: 1 },
      { name: 'B', age: 2, email: 'b@x.com' },
    ]);
    expect(s.type).toBe('array');
    expect(s.items?.type).toBe('object');
    const props = s.items?.properties ?? {};
    expect(props['name']?.type).toBe('string');
    expect(props['age']?.type).toBe('integer');
    expect(props['email']?.type).toBe('string');
    expect(s.items?.required).toContain('name');
    expect(s.items?.required).toContain('age');
    expect(s.items?.required).not.toContain('email');
  });

  it('detects email format', () => {
    const s = inferSchema({ email: 'me@example.com' });
    expect(s.properties?.['email']?.format).toBe('email');
  });

  it('detects date and date-time formats', () => {
    expect(inferSchema('2025-01-12').format).toBe('date');
    expect(inferSchema('2025-01-12T10:00:00Z').format).toBe('date-time');
  });

  it('includes a $schema URI for the chosen draft', () => {
    const a = inferSchema(1, { draft: 'draft-07' });
    expect(a.$schema).toMatch(/draft-07/);
    const b = inferSchema(1, { draft: '2020-12' });
    expect(b.$schema).toMatch(/2020-12/);
  });
});
