import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  analyzeTextLayer,
  bionicSplit,
  bionicParagraphHtml,
  buildReadingHtml,
  buildReadingPdf,
  DEFAULT_READING_OPTIONS,
  linesToParagraphs,
  looksCorruptedTextLayer,
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

describe('analyzeTextLayer', () => {
  // Real fragments extracted from a Pages/Quartz PDF whose Calibri ToUnicode
  // maps the "ti" ligature to "(", "," or "@" and the "tt" ligature to "b".
  const corrupted =
    'Descrip(on des traitements de données — Registre des ac,vités de traitement ' +
    'prévu par l’ar@cle 30. Il cons@tue la base de la lube an@-abus et décrit la ' +
    'durée de conserva@on de chaque catégorie, son exploita@on et sa finalité.';

  it('flags the real Pages/Calibri ligature corruption', () => {
    const report = analyzeTextLayer(corrupted, 1);
    expect(report.corrupt).toBe(true);
    expect(report.gluedHits).toBeGreaterThanOrEqual(5);
    expect(looksCorruptedTextLayer(corrupted)).toBe(true);
  });

  it('accepts clean prose with normal punctuation', () => {
    const clean =
      'Le registre (article 30 du RGPD) est tenu à jour, révisé chaque année. ' +
      'Il décrit, pour chaque traitement : sa finalité, sa base légale et ses durées.';
    expect(analyzeTextLayer(clean, 1).corrupt).toBe(false);
    expect(looksCorruptedTextLayer(clean)).toBe(false);
  });

  it('does not trip on emails, C++ or glued slashes', () => {
    const text =
      'Contact: user@example.com — projets C++ et R&D, ratio 3.14, and/or e-mail. ' +
      'Une seule occurrence collée ne suffit pas à déclarer le calque corrompu.';
    expect(analyzeTextLayer(text, 1).corrupt).toBe(false);
  });

  it('requires both an absolute floor and a density floor', () => {
    // 3 glued hits buried in a long clean document → density too low.
    const longClean = `f(x) g(y) h(z) ${'Texte parfaitement sain qui continue longuement. '.repeat(80)}`;
    expect(analyzeTextLayer(longClean, 1).corrupt).toBe(false);
  });

  it('detects scanned PDFs as near-empty', () => {
    expect(analyzeTextLayer('', 5).nearEmpty).toBe(true);
    expect(analyzeTextLayer('Page 3', 4).nearEmpty).toBe(true);
    expect(looksCorruptedTextLayer('', 5)).toBe(true);
    const fullPage = 'Du texte normal sur une page entière. '.repeat(30);
    expect(analyzeTextLayer(fullPage, 1).nearEmpty).toBe(false);
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
