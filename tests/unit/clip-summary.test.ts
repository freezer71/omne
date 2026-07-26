import { describe, it, expect } from 'vitest';
import { formatDuration, totalDuration, hasMixedDimensions } from '@/lib/tools/clip-summary';

describe('formatDuration', () => {
  it('pads seconds and drops the hours group until it is needed', () => {
    expect(formatDuration(4)).toBe('0:04');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(4.4)).toBe('0:04');
    expect(formatDuration(4.6)).toBe('0:05');
    expect(formatDuration(59.6)).toBe('1:00');
  });

  it('falls back to zero rather than printing NaN at the user', () => {
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
    expect(formatDuration(-5)).toBe('0:00');
  });
});

describe('totalDuration', () => {
  it('adds up the clips', () => {
    expect(totalDuration([{ durationSec: 10 }, { durationSec: 5.5 }])).toBe(15.5);
  });

  it('withholds a total while any clip is still unmeasured', () => {
    expect(totalDuration([{ durationSec: 10 }, null])).toBeNull();
    expect(totalDuration([{ durationSec: 10 }, { durationSec: Number.NaN }])).toBeNull();
  });

  it('has no total for an empty list', () => {
    expect(totalDuration([])).toBeNull();
  });
});

describe('hasMixedDimensions', () => {
  it('is quiet when every clip shares a size', () => {
    expect(
      hasMixedDimensions([
        { durationSec: 1, width: 1920, height: 1080 },
        { durationSec: 1, width: 1920, height: 1080 },
      ]),
    ).toBe(false);
  });

  it('flags a portrait clip mixed in with landscape ones', () => {
    expect(
      hasMixedDimensions([
        { durationSec: 1, width: 1920, height: 1080 },
        { durationSec: 1, width: 1080, height: 1920 },
      ]),
    ).toBe(true);
  });

  it('flags same-aspect clips of different resolutions', () => {
    expect(
      hasMixedDimensions([
        { durationSec: 1, width: 1920, height: 1080 },
        { durationSec: 1, width: 1280, height: 720 },
      ]),
    ).toBe(true);
  });

  it('does not treat an unmeasured clip as a mismatch', () => {
    expect(
      hasMixedDimensions([{ durationSec: 1, width: 1920, height: 1080 }, null]),
    ).toBe(false);
    expect(
      hasMixedDimensions([
        { durationSec: 1, width: 1920, height: 1080 },
        { durationSec: 1 },
      ]),
    ).toBe(false);
  });

  it('is quiet for a single clip', () => {
    expect(hasMixedDimensions([{ durationSec: 1, width: 640, height: 480 }])).toBe(false);
  });
});
