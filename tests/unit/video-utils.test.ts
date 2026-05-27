import { describe, it, expect } from 'vitest';
import { computeBoundaries, MAX_SEGMENTS } from '@/lib/tools/implementations/video-split';
import { buildScaleFilter } from '@/lib/tools/implementations/video-resize';

/* ------------------------------------------------------------------ */
/*  computeBoundaries                                                 */
/* ------------------------------------------------------------------ */

describe('computeBoundaries', () => {
  describe('parts mode', () => {
    it('splits 10s into 2 equal parts', () => {
      const bounds = computeBoundaries({ mode: 'parts', parts: 2, totalDuration: 10 });
      expect(bounds).toEqual([
        [0, 5],
        [5, 10],
      ]);
    });

    it('splits 10s into 3 parts', () => {
      const bounds = computeBoundaries({ mode: 'parts', parts: 3, totalDuration: 10 });
      expect(bounds).toHaveLength(3);
      expect(bounds[0]![0]).toBe(0);
      expect(bounds[2]![1]).toBe(10);
      // segments are roughly equal
      const seg = 10 / 3;
      expect(bounds[0]).toEqual([0, seg]);
      expect(bounds[1]).toEqual([seg, 2 * seg]);
      expect(bounds[2]).toEqual([2 * seg, 10]);
    });

    it('splits 10s into 5 parts', () => {
      const bounds = computeBoundaries({ mode: 'parts', parts: 5, totalDuration: 10 });
      expect(bounds).toHaveLength(5);
      expect(bounds[0]).toEqual([0, 2]);
      expect(bounds[4]).toEqual([8, 10]);
    });

    it('last segment always ends at totalDuration', () => {
      const bounds = computeBoundaries({ mode: 'parts', parts: 7, totalDuration: 10 });
      expect(bounds[bounds.length - 1]![1]).toBe(10);
    });
  });

  describe('duration mode', () => {
    it('splits 10s into 3s segments', () => {
      const bounds = computeBoundaries({ mode: 'duration', segmentDuration: 3, totalDuration: 10 });
      // ceil(10/3) = 4 segments
      expect(bounds).toHaveLength(4);
      expect(bounds[0]).toEqual([0, 3]);
      expect(bounds[1]).toEqual([3, 6]);
      expect(bounds[2]).toEqual([6, 9]);
      expect(bounds[3]).toEqual([9, 10]);
    });

    it('last segment ends at totalDuration', () => {
      const bounds = computeBoundaries({ mode: 'duration', segmentDuration: 4, totalDuration: 10 });
      expect(bounds[bounds.length - 1]![1]).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('throws on non-finite totalDuration (NaN)', () => {
      expect(() => computeBoundaries({ mode: 'parts', parts: 2, totalDuration: NaN })).toThrow(
        'totalDuration must be a positive number',
      );
    });

    it('throws on non-finite totalDuration (Infinity)', () => {
      expect(() =>
        computeBoundaries({ mode: 'parts', parts: 2, totalDuration: Infinity }),
      ).toThrow('totalDuration must be a positive number');
    });

    it('throws on zero totalDuration', () => {
      expect(() => computeBoundaries({ mode: 'parts', parts: 2, totalDuration: 0 })).toThrow(
        'totalDuration must be a positive number',
      );
    });

    it('throws on negative totalDuration', () => {
      expect(() => computeBoundaries({ mode: 'parts', parts: 2, totalDuration: -5 })).toThrow(
        'totalDuration must be a positive number',
      );
    });

    it('throws when parts < 2', () => {
      expect(() => computeBoundaries({ mode: 'parts', parts: 1, totalDuration: 10 })).toThrow(
        'parts must be an integer',
      );
    });

    it('throws when parts is 0', () => {
      expect(() => computeBoundaries({ mode: 'parts', parts: 0, totalDuration: 10 })).toThrow(
        'parts must be an integer',
      );
    });

    it('throws when parts is undefined (defaults to 0)', () => {
      expect(() => computeBoundaries({ mode: 'parts', totalDuration: 10 })).toThrow(
        'parts must be an integer',
      );
    });

    it('throws when parts > MAX_SEGMENTS', () => {
      expect(() =>
        computeBoundaries({ mode: 'parts', parts: MAX_SEGMENTS + 1, totalDuration: 10 }),
      ).toThrow(`parts cannot exceed ${MAX_SEGMENTS}`);
    });

    it('allows parts === MAX_SEGMENTS', () => {
      const bounds = computeBoundaries({ mode: 'parts', parts: MAX_SEGMENTS, totalDuration: 10 });
      expect(bounds).toHaveLength(MAX_SEGMENTS);
      expect(bounds[bounds.length - 1]![1]).toBe(10);
    });

    it('throws when segmentDuration would produce too many segments', () => {
      // 10s / 0.5s = 20 segments, exceeding MAX_SEGMENTS (10)
      expect(() =>
        computeBoundaries({ mode: 'duration', segmentDuration: 0.5, totalDuration: 10 }),
      ).toThrow(/max is/);
    });

    it('throws when segmentDuration is larger than totalDuration (produces < 2 segments)', () => {
      expect(() =>
        computeBoundaries({ mode: 'duration', segmentDuration: 20, totalDuration: 10 }),
      ).toThrow('segmentDuration produces fewer than 2 segments');
    });

    it('throws when segmentDuration is 0', () => {
      expect(() =>
        computeBoundaries({ mode: 'duration', segmentDuration: 0, totalDuration: 10 }),
      ).toThrow('segmentDuration must be > 0');
    });

    it('throws when segmentDuration is negative', () => {
      expect(() =>
        computeBoundaries({ mode: 'duration', segmentDuration: -1, totalDuration: 10 }),
      ).toThrow('segmentDuration must be > 0');
    });
  });
});

/* ------------------------------------------------------------------ */
/*  buildScaleFilter                                                  */
/* ------------------------------------------------------------------ */

describe('buildScaleFilter', () => {
  describe('presets without keepAspect', () => {
    it('480p returns scale=854:480', () => {
      const f = buildScaleFilter({ preset: '480p', keepAspect: false });
      expect(f).toBe('scale=854:480');
    });

    it('720p returns scale=1280:720', () => {
      const f = buildScaleFilter({ preset: '720p', keepAspect: false });
      expect(f).toBe('scale=1280:720');
    });

    it('1080p returns scale=1920:1080', () => {
      const f = buildScaleFilter({ preset: '1080p', keepAspect: false });
      expect(f).toBe('scale=1920:1080');
    });
  });

  describe('presets with keepAspect', () => {
    it('480p includes force_original_aspect_ratio and pad', () => {
      const f = buildScaleFilter({ preset: '480p', keepAspect: true });
      expect(f).toBe(
        'scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2',
      );
    });

    it('720p includes force_original_aspect_ratio and pad', () => {
      const f = buildScaleFilter({ preset: '720p', keepAspect: true });
      expect(f).toBe(
        'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
      );
    });

    it('1080p includes force_original_aspect_ratio and pad', () => {
      const f = buildScaleFilter({ preset: '1080p', keepAspect: true });
      expect(f).toBe(
        'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
      );
    });
  });

  describe('custom with keepAspect', () => {
    it('both width and height produces aspect-preserving filter with pad', () => {
      const f = buildScaleFilter({ preset: 'custom', width: 640, height: 360, keepAspect: true });
      expect(f).toBe(
        'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
      );
    });

    it('only width uses -2 for height', () => {
      const f = buildScaleFilter({ preset: 'custom', width: 640, keepAspect: true });
      expect(f).toBe('scale=640:-2');
    });

    it('only height uses -2 for width', () => {
      const f = buildScaleFilter({ preset: 'custom', height: 360, keepAspect: true });
      expect(f).toBe('scale=-2:360');
    });

    it('neither width nor height falls through to scale=-2:-2', () => {
      const f = buildScaleFilter({ preset: 'custom', keepAspect: true });
      expect(f).toBe('scale=-2:-2');
    });
  });

  describe('custom without keepAspect', () => {
    it('both width and height produces a plain scale', () => {
      const f = buildScaleFilter({ preset: 'custom', width: 640, height: 360, keepAspect: false });
      expect(f).toBe('scale=640:360');
    });

    it('only width replaces height with -2', () => {
      const f = buildScaleFilter({ preset: 'custom', width: 640, keepAspect: false });
      expect(f).toBe('scale=640:-2');
    });

    it('only height replaces width with -2', () => {
      const f = buildScaleFilter({ preset: 'custom', height: 360, keepAspect: false });
      expect(f).toBe('scale=-2:360');
    });

    it('neither width nor height returns scale=-2:-2', () => {
      const f = buildScaleFilter({ preset: 'custom', keepAspect: false });
      expect(f).toBe('scale=-2:-2');
    });

    it('treats width=0 as missing', () => {
      const f = buildScaleFilter({ preset: 'custom', width: 0, height: 480, keepAspect: false });
      expect(f).toBe('scale=-2:480');
    });

    it('treats negative width as missing', () => {
      const f = buildScaleFilter({ preset: 'custom', width: -1, height: 480, keepAspect: false });
      expect(f).toBe('scale=-2:480');
    });
  });
});
