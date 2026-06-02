import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  bionicSplit,
  bionicParagraphHtml,
  buildReadingHtml,
  buildReadingPdf,
  DEFAULT_READING_OPTIONS,
  linesToParagraphs,
  plainHtmlBody,
  splitParagraphs,
  splitSentences,
} from '@/lib/tools/implementations/reading';

describe('bionicSplit', () => {
  it('bolds a larger head at higher intensity', () => {
    expect(bionicSplit('readability', 'low').head.length).toBeLessThan(
      bionicSplit('readability', 'high').head.length,
    );
  });

  it('always keeps head + tail equal to the word and bolds at least one char', () => {
    const { head, tail } = bionicSplit('hello', 'medium');
    expect(head + tail).toBe('hello');
    expect(head.length).toBeGreaterThanOrEqual(1);
  });

  it('handles single chars and empties', () => {
    expect(bionicSplit('a', 'medium')).toEqual({ head: 'a', tail: '' });
    expect(bionicSplit('', 'low')).toEqual({ head: '', tail: '' });
  });
});

describe('splitParagraphs', () => {
  it('splits on blank lines and collapses inner whitespace', () => {
    expect(splitParagraphs('a\nb\n\n  c   d ')).toEqual(['a b', 'c d']);
  });

  it('drops empty paragraphs', () => {
    expect(splitParagraphs('\n\n   \n')).toEqual([]);
  });
});

describe('splitSentences', () => {
  it('splits on sentence punctuation and newlines', () => {
    expect(splitSentences('Hi there. How are you?\nFine!')).toEqual([
      'Hi there.',
      'How are you?',
      'Fine!',
    ]);
  });
});

describe('linesToParagraphs', () => {
  it('merges consecutive lines and breaks on blank lines', () => {
    expect(linesToParagraphs(['one', 'two', '', 'three'])).toEqual(['one two', 'three']);
  });
});

describe('bionicParagraphHtml', () => {
  it('wraps word heads in <b> and escapes raw HTML', () => {
    const html = bionicParagraphHtml('hi <tag>', 'high');
    expect(html).toContain('<b>');
    expect(html).toContain('&lt;');
    expect(html).not.toContain('<tag>');
  });
});

describe('buildReadingHtml', () => {
  it('produces a full self-contained document reflecting the options', () => {
    const html = buildReadingHtml({
      title: 'Doc',
      bodyHtml: plainHtmlBody(['Hello world']),
      options: { ...DEFAULT_READING_OPTIONS, fontSizePt: 22 },
      langTag: 'fr',
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('lang="fr"');
    expect(html).toContain('font-size: 22px');
    expect(html).toContain('Hello world');
  });
});

describe('buildReadingPdf', () => {
  it('embeds the font and returns a valid, paginated PDF', async () => {
    const regular = new Uint8Array(
      readFileSync(join(process.cwd(), 'public/fonts/OpenDyslexic-Regular.ttf')),
    );
    const bold = new Uint8Array(
      readFileSync(join(process.cwd(), 'public/fonts/OpenDyslexic-Bold.ttf')),
    );
    const long = 'Reading should feel easy, not exhausting. '.repeat(60);
    const bytes = await buildReadingPdf({
      paragraphs: [long, 'Second paragraph.'],
      options: DEFAULT_READING_OPTIONS,
      regularFontBytes: regular,
      boldFontBytes: bold,
      bionic: 'medium',
    });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
