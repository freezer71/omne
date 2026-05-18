import { describe, it, expect } from 'vitest';
import { convertCase, splitWords, CASE_MODES } from '@/lib/tools/implementations/text-case';

describe('splitWords', () => {
  it('returns an empty array for an empty string', () => {
    expect(splitWords('')).toEqual([]);
  });

  it('splits on whitespace', () => {
    expect(splitWords('hello world')).toEqual(['hello', 'world']);
  });

  it('splits camelCase into lowercase words', () => {
    expect(splitWords('helloWorld')).toEqual(['hello', 'world']);
  });

  it('splits PascalCase into lowercase words', () => {
    expect(splitWords('HelloWorld')).toEqual(['hello', 'world']);
  });

  it('splits snake_case, kebab-case, and dot.case', () => {
    expect(splitWords('hello_world')).toEqual(['hello', 'world']);
    expect(splitWords('hello-world')).toEqual(['hello', 'world']);
    expect(splitWords('hello.world')).toEqual(['hello', 'world']);
  });

  it('handles consecutive uppercase letters (acronyms)', () => {
    expect(splitWords('XMLHttpRequest')).toEqual(['xml', 'http', 'request']);
  });

  it('separates letters from digits', () => {
    expect(splitWords('version2')).toEqual(['version', '2']);
    expect(splitWords('foo42bar')).toEqual(['foo', '42', 'bar']);
  });
});

describe('convertCase', () => {
  const sample = 'the quick brown fox';

  it('exports every documented case mode', () => {
    expect(CASE_MODES.length).toBe(10);
  });

  it('returns empty string for empty input', () => {
    for (const mode of CASE_MODES) {
      expect(convertCase('', mode)).toBe('');
    }
  });

  it('upper-cases every letter', () => {
    expect(convertCase(sample, 'upper')).toBe('THE QUICK BROWN FOX');
  });

  it('lower-cases every letter', () => {
    expect(convertCase('THE QUICK BROWN FOX', 'lower')).toBe('the quick brown fox');
  });

  it('title-cases each word but preserves whitespace', () => {
    expect(convertCase(sample, 'title')).toBe('The Quick Brown Fox');
  });

  it('sentence-cases by capitalizing after .!?', () => {
    expect(convertCase('hello world. this is a test! ok?', 'sentence')).toBe(
      'Hello world. This is a test! Ok?',
    );
  });

  it('produces camelCase', () => {
    expect(convertCase(sample, 'camel')).toBe('theQuickBrownFox');
    expect(convertCase('hello_world', 'camel')).toBe('helloWorld');
  });

  it('produces PascalCase', () => {
    expect(convertCase(sample, 'pascal')).toBe('TheQuickBrownFox');
  });

  it('produces snake_case', () => {
    expect(convertCase(sample, 'snake')).toBe('the_quick_brown_fox');
    expect(convertCase('HelloWorld', 'snake')).toBe('hello_world');
  });

  it('produces kebab-case', () => {
    expect(convertCase(sample, 'kebab')).toBe('the-quick-brown-fox');
  });

  it('produces CONSTANT_CASE', () => {
    expect(convertCase(sample, 'constant')).toBe('THE_QUICK_BROWN_FOX');
  });

  it('produces dot.case', () => {
    expect(convertCase(sample, 'dot')).toBe('the.quick.brown.fox');
  });
});
