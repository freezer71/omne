import { describe, it, expect } from 'vitest';
import { jsonToCsv, csvToJson, detectDelimiter } from '@/lib/json/csv';

describe('jsonToCsv', () => {
  it('returns an empty string for empty rows', () => {
    expect(jsonToCsv([])).toBe('');
  });

  it('emits headers + rows with default options', () => {
    const out = jsonToCsv([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    expect(out).toBe('name,age\nAlice,30\nBob,25');
  });

  it('escapes values containing the delimiter', () => {
    const out = jsonToCsv([{ a: 'one,two' }]);
    expect(out).toBe('a\n"one,two"');
  });

  it('escapes embedded quotes by doubling them', () => {
    const out = jsonToCsv([{ a: 'he said "hi"' }]);
    expect(out).toBe('a\n"he said ""hi"""');
  });

  it('preserves newlines inside quoted values', () => {
    const out = jsonToCsv([{ a: 'line1\nline2' }]);
    expect(out).toBe('a\n"line1\nline2"');
  });

  it('supports a custom delimiter (semicolon)', () => {
    const out = jsonToCsv([{ a: 1, b: 2 }], { delimiter: ';' });
    expect(out).toBe('a;b\n1;2');
  });

  it('builds a union of columns across rows', () => {
    const out = jsonToCsv([{ a: 1 }, { b: 2 }, { a: 3, c: 4 }]);
    expect(out.split('\n')[0]).toBe('a,b,c');
  });

  it('skips headers when headers is false', () => {
    const out = jsonToCsv([{ a: 1, b: 2 }], { headers: false });
    expect(out).toBe('1,2');
  });
});

describe('csvToJson', () => {
  it('parses simple comma-delimited rows with headers', () => {
    const out = csvToJson('name,age\nAlice,30\nBob,25');
    expect(out).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('parses quoted fields containing delimiters', () => {
    const out = csvToJson('a\n"one,two"');
    expect(out).toEqual([{ a: 'one,two' }]);
  });

  it('parses doubled quotes as a single quote', () => {
    const out = csvToJson('a\n"he said ""hi"""');
    expect(out).toEqual([{ a: 'he said "hi"' }]);
  });

  it('parses CRLF endings', () => {
    const out = csvToJson('a,b\r\n1,2\r\n3,4');
    expect(out).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('strips a leading BOM', () => {
    const out = csvToJson('﻿a,b\n1,2');
    expect(out).toEqual([{ a: '1', b: '2' }]);
  });

  it('handles a custom delimiter (tab)', () => {
    const out = csvToJson('a\tb\n1\t2', { delimiter: '\t' });
    expect(out).toEqual([{ a: '1', b: '2' }]);
  });

  it('synthesizes column names when headers is false', () => {
    const out = csvToJson('1,2,3', { headers: false });
    expect(out).toEqual([{ col1: '1', col2: '2', col3: '3' }]);
  });

  it('returns empty array for empty input', () => {
    expect(csvToJson('')).toEqual([]);
  });
});

describe('detectDelimiter', () => {
  it('detects comma-delimited CSV', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });
  it('detects semicolon-delimited CSV', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });
  it('detects tab-delimited CSV', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
  });
  it('ignores delimiters inside quotes when counting', () => {
    expect(detectDelimiter('"a;b";c;d')).toBe(';');
  });
});
