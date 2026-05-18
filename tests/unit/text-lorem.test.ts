import { describe, it, expect } from 'vitest';
import { generateLorem, LOREM_WORDS } from '@/lib/tools/implementations/text-lorem';

const SEED = 42;

describe('generateLorem', () => {
  it('returns empty string for count 0', () => {
    expect(
      generateLorem({ unit: 'words', count: 0, startWithLoremIpsum: false, htmlWrap: false }, SEED),
    ).toBe('');
  });

  it('clamps count to a max of 100', () => {
    const text = generateLorem(
      { unit: 'words', count: 9999, startWithLoremIpsum: false, htmlWrap: false },
      SEED,
    );
    expect(text.split(/\s+/).length).toBe(100);
  });

  it('starts with "Lorem ipsum dolor sit amet" when flag is set (words)', () => {
    const text = generateLorem(
      { unit: 'words', count: 10, startWithLoremIpsum: true, htmlWrap: false },
      SEED,
    );
    expect(text.startsWith('Lorem ipsum dolor sit amet')).toBe(true);
  });

  it('starts with "Lorem ipsum dolor sit amet" when flag is set (sentences)', () => {
    const text = generateLorem(
      { unit: 'sentences', count: 2, startWithLoremIpsum: true, htmlWrap: false },
      SEED,
    );
    expect(text.startsWith('Lorem ipsum dolor sit amet')).toBe(true);
  });

  it('starts with "Lorem ipsum dolor sit amet" when flag is set (paragraphs)', () => {
    const text = generateLorem(
      { unit: 'paragraphs', count: 1, startWithLoremIpsum: true, htmlWrap: false },
      SEED,
    );
    expect(text.startsWith('Lorem ipsum dolor sit amet')).toBe(true);
  });

  it('produces exactly N words for unit=words', () => {
    const text = generateLorem(
      { unit: 'words', count: 17, startWithLoremIpsum: true, htmlWrap: false },
      SEED,
    );
    expect(text.split(/\s+/).filter(Boolean).length).toBe(17);
  });

  it('produces exactly N sentences for unit=sentences', () => {
    const text = generateLorem(
      { unit: 'sentences', count: 4, startWithLoremIpsum: false, htmlWrap: false },
      SEED,
    );
    const sentences = text.split(/\.\s*/).filter(Boolean);
    expect(sentences.length).toBe(4);
  });

  it('produces exactly N paragraphs separated by blank lines', () => {
    const text = generateLorem(
      { unit: 'paragraphs', count: 3, startWithLoremIpsum: false, htmlWrap: false },
      SEED,
    );
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    expect(paragraphs.length).toBe(3);
  });

  it('wraps paragraphs in <p>...</p> when htmlWrap is true', () => {
    const text = generateLorem(
      { unit: 'paragraphs', count: 2, startWithLoremIpsum: false, htmlWrap: true },
      SEED,
    );
    const matches = text.match(/<p>[^]+?<\/p>/g);
    expect(matches?.length).toBe(2);
  });

  it('uses only words from the lorem word bank (lowercased)', () => {
    const text = generateLorem(
      { unit: 'words', count: 50, startWithLoremIpsum: false, htmlWrap: false },
      SEED,
    );
    const bank = new Set(LOREM_WORDS);
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    for (const w of words) {
      expect(bank.has(w)).toBe(true);
    }
  });

  it('is stable for the same seed', () => {
    const opts = { unit: 'sentences' as const, count: 3, startWithLoremIpsum: false, htmlWrap: false };
    expect(generateLorem(opts, 7)).toBe(generateLorem(opts, 7));
  });
});
