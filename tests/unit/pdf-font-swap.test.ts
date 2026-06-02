import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildFontSwapPdf,
  fitSize,
  hexToRgb01,
  itemsFromTextContent,
  type FontSwapItem,
} from '@/lib/tools/implementations/pdf-font-swap';

describe('fitSize', () => {
  it('shrinks so the run fits the original width', () => {
    expect(fitSize(200, 14, 100)).toBeCloseTo(7, 5);
  });
  it('caps growth at 1.15× the original height', () => {
    expect(fitSize(50, 14, 100)).toBeCloseTo(14 * 1.15, 5);
  });
  it('falls back to the height when measurement is unusable', () => {
    expect(fitSize(0, 14, 100)).toBe(14);
  });
});

describe('itemsFromTextContent', () => {
  it('keeps positioned runs and drops whitespace / zero-width runs', () => {
    const items = itemsFromTextContent({
      items: [
        { str: 'Hi', transform: [14, 0, 0, 14, 50, 700], width: 20, height: 14 },
        { str: '   ', transform: [14, 0, 0, 14, 70, 700], width: 6, height: 14 },
        { str: 'zero', transform: [14, 0, 0, 14, 90, 700], width: 0, height: 14 },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ str: 'Hi', x: 50, y: 700, width: 20, height: 14, angle: 0 });
  });
});

describe('hexToRgb01', () => {
  it('parses 6- and 3-digit hex', () => {
    expect(hexToRgb01('#ffffff')).toEqual([1, 1, 1]);
    expect(hexToRgb01('#000')).toEqual([0, 0, 0]);
  });
});

describe('buildFontSwapPdf', () => {
  it('overlays the font onto an existing PDF and returns a valid PDF', async () => {
    const source = new Uint8Array(
      readFileSync(join(process.cwd(), 'tests/fixtures/reading/sample.pdf')),
    );
    const fontBytes = new Uint8Array(
      readFileSync(join(process.cwd(), 'public/fonts/OpenDyslexic-Regular.ttf')),
    );
    const pages: FontSwapItem[][] = [
      [
        { str: 'Reading should feel easy', x: 56, y: 760, width: 220, height: 18, angle: 0 },
        { str: 'second line here', x: 56, y: 730, width: 150, height: 18, angle: 0 },
      ],
    ];
    const out = await buildFontSwapPdf(source, pages, {
      fontBytes,
      textColor: '#1a1a1a',
      bgColor: '#ffffff',
    });
    expect(String.fromCharCode(...out.slice(0, 5))).toBe('%PDF-');
    expect(out.length).toBeGreaterThan(source.length);
  });

  it('supports rendering a single picked page (preview path)', async () => {
    const source = new Uint8Array(
      readFileSync(join(process.cwd(), 'tests/fixtures/reading/sample.pdf')),
    );
    const fontBytes = new Uint8Array(
      readFileSync(join(process.cwd(), 'public/fonts/OpenDyslexic-Regular.ttf')),
    );
    const pages: FontSwapItem[][] = [[{ str: 'Hello', x: 56, y: 760, width: 60, height: 18, angle: 0 }]];
    const out = await buildFontSwapPdf(source, pages, { fontBytes, textColor: '#000000', bgColor: '#ffffff' }, [0]);
    expect(String.fromCharCode(...out.slice(0, 5))).toBe('%PDF-');
  });
});
