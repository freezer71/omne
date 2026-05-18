import { describe, it, expect } from 'vitest';
import {
  computeStats,
  countLines,
  countParagraphs,
  countSentences,
  countWords,
  formatDuration,
  READING_WPM,
  SPEAKING_WPM,
} from '@/lib/tools/implementations/text-count';

describe('countWords', () => {
  it('returns 0 for empty input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('counts simple ascii words', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('handles multiple spaces, tabs, and newlines', () => {
    expect(countWords('hello \t  world\nbye')).toBe(3);
  });

  it('counts accented and Unicode words', () => {
    expect(countWords('café déjà vu')).toBe(3);
  });

  it('counts apostrophes within a word as a single word', () => {
    expect(countWords("don't can't won't")).toBe(3);
  });
});

describe('countSentences', () => {
  it('returns 0 for empty input', () => {
    expect(countSentences('')).toBe(0);
  });

  it('counts sentences ending in . ! ?', () => {
    expect(countSentences('Hello. World! Right?')).toBe(3);
  });

  it('treats consecutive punctuation as one separator', () => {
    expect(countSentences('Wait... Really?!')).toBe(2);
  });
});

describe('countParagraphs', () => {
  it('returns 0 for blank input', () => {
    expect(countParagraphs('')).toBe(0);
    expect(countParagraphs('   \n   ')).toBe(0);
  });

  it('counts single paragraph', () => {
    expect(countParagraphs('Hello world.')).toBe(1);
  });

  it('counts paragraphs separated by blank lines', () => {
    expect(countParagraphs('Hello.\n\nWorld.\n\nBye.')).toBe(3);
  });
});

describe('countLines', () => {
  it('returns 0 for empty input', () => {
    expect(countLines('')).toBe(0);
  });

  it('counts a single line', () => {
    expect(countLines('hello')).toBe(1);
  });

  it('counts trailing newline as 2 lines', () => {
    expect(countLines('hello\n')).toBe(2);
  });

  it('counts multiple lines', () => {
    expect(countLines('a\nb\nc')).toBe(3);
  });
});

describe('computeStats', () => {
  it('returns zeros for empty input', () => {
    const s = computeStats('');
    expect(s.characters).toBe(0);
    expect(s.charactersNoSpaces).toBe(0);
    expect(s.words).toBe(0);
    expect(s.lines).toBe(0);
    expect(s.paragraphs).toBe(0);
    expect(s.sentences).toBe(0);
    expect(s.readingTimeMinutes).toBe(0);
    expect(s.speakingTimeMinutes).toBe(0);
  });

  it('counts characters with and without whitespace', () => {
    const s = computeStats('a b c');
    expect(s.characters).toBe(5);
    expect(s.charactersNoSpaces).toBe(3);
  });

  it('derives reading and speaking times from word count', () => {
    const text = 'word '.repeat(450).trim();
    const s = computeStats(text);
    expect(s.words).toBe(450);
    expect(s.readingTimeMinutes).toBeCloseTo(450 / READING_WPM, 5);
    expect(s.speakingTimeMinutes).toBeCloseTo(450 / SPEAKING_WPM, 5);
  });
});

describe('formatDuration', () => {
  it('formats sub-minute durations in seconds', () => {
    expect(formatDuration(0.5)).toBe('30s');
  });

  it('formats whole minutes', () => {
    expect(formatDuration(2)).toBe('2m');
  });

  it('formats mixed minutes and seconds', () => {
    expect(formatDuration(1.5)).toBe('1m 30s');
  });

  it('clamps negative values to 0s', () => {
    expect(formatDuration(-1)).toBe('0s');
  });
});
