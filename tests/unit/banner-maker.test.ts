import { describe, it, expect } from 'vitest';
import {
  PRESET_DIMS,
  TEXT_LINE_HEIGHT,
  MIN_VISIBLE,
  fontString,
  textLayerBounds,
  imageLayerBounds,
  hitTest,
  clampLayerPosition,
  moveLayer,
  scaledImageDims,
  lockedDims,
  computeLayerBounds,
  drawComposition,
  drawSelectionOverlay,
  type CompositionSpec,
  type ImageLayer,
  type TextLayer,
} from '@/lib/tools/implementations/banner-maker';

function textLayer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    kind: 'text',
    id: 't1',
    text: 'Hello',
    x: 100,
    y: 100,
    fontSize: 40,
    fontFamily: 'sans-serif',
    color: '#ffffff',
    bold: false,
    ...overrides,
  };
}

function imageLayer(overrides: Partial<ImageLayer> = {}): ImageLayer {
  return {
    kind: 'image',
    id: 'i1',
    name: 'pic.png',
    source: {} as ImageBitmap,
    naturalWidth: 200,
    naturalHeight: 100,
    x: 50,
    y: 60,
    width: 200,
    height: 100,
    ...overrides,
  };
}

type Call = { op: string; args: unknown[]; fillStyle?: string; font?: string };

function recordingCtx(canvasWidth = 1000, canvasHeight = 800) {
  const calls: Call[] = [];
  const ctx = {
    canvas: { width: canvasWidth, height: canvasHeight },
    fillStyle: '',
    font: '',
    textBaseline: '',
    textAlign: '',
    strokeStyle: '',
    lineWidth: 0,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: '',
    fillRect(...args: unknown[]) {
      calls.push({ op: 'fillRect', args, fillStyle: this.fillStyle });
    },
    fillText(...args: unknown[]) {
      calls.push({ op: 'fillText', args, fillStyle: this.fillStyle, font: this.font });
    },
    drawImage(...args: unknown[]) {
      calls.push({ op: 'drawImage', args });
    },
    strokeRect(...args: unknown[]) {
      calls.push({ op: 'strokeRect', args });
    },
    setLineDash(...args: unknown[]) {
      calls.push({ op: 'setLineDash', args });
    },
    save() {
      calls.push({ op: 'save', args: [] });
    },
    restore() {
      calls.push({ op: 'restore', args: [] });
    },
    measureText(text: string) {
      return { width: text.length * 10 };
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('PRESET_DIMS', () => {
  it('defines the 6 social presets', () => {
    expect(PRESET_DIMS).toEqual({
      square: { w: 1080, h: 1080 },
      landscape: { w: 1920, h: 1080 },
      story: { w: 1080, h: 1920 },
      hd: { w: 1280, h: 720 },
      og: { w: 1200, h: 630 },
      xBanner: { w: 1500, h: 500 },
    });
  });
});

describe('fontString', () => {
  it('builds a canvas font string', () => {
    expect(fontString({ bold: true, fontSize: 64, fontFamily: 'sans-serif' })).toBe(
      'bold 64px sans-serif',
    );
    expect(fontString({ bold: false, fontSize: 32, fontFamily: 'serif' })).toBe('32px serif');
  });
});

describe('layer bounds', () => {
  it('derives text bounds from the measured width and line height', () => {
    const b = textLayerBounds(textLayer(), 123);
    expect(b).toEqual({ id: 't1', x: 100, y: 100, w: 123, h: 40 * TEXT_LINE_HEIGHT });
  });

  it('uses the drawn size for image bounds', () => {
    expect(imageLayerBounds(imageLayer())).toEqual({ id: 'i1', x: 50, y: 60, w: 200, h: 100 });
  });
});

describe('hitTest', () => {
  const bounds = [
    { id: 'bottom', x: 0, y: 0, w: 100, h: 100 },
    { id: 'top', x: 50, y: 50, w: 100, h: 100 },
  ];

  it('returns the topmost (last) layer on overlap', () => {
    expect(hitTest(bounds, 75, 75)).toBe('top');
  });

  it('falls through to lower layers outside the top one', () => {
    expect(hitTest(bounds, 10, 10)).toBe('bottom');
  });

  it('includes edges and misses outside', () => {
    expect(hitTest(bounds, 150, 150)).toBe('top');
    expect(hitTest(bounds, 151, 150)).toBeNull();
  });
});

describe('clampLayerPosition', () => {
  it('keeps at least MIN_VISIBLE px inside on every edge', () => {
    const b = { id: 'a', x: 0, y: 0, w: 100, h: 50 };
    expect(clampLayerPosition({ ...b, x: -999, y: 0 }, 500, 400).x).toBe(MIN_VISIBLE - 100);
    expect(clampLayerPosition({ ...b, x: 999, y: 0 }, 500, 400).x).toBe(500 - MIN_VISIBLE);
    expect(clampLayerPosition({ ...b, x: 0, y: -999 }, 500, 400).y).toBe(MIN_VISIBLE - 50);
    expect(clampLayerPosition({ ...b, x: 0, y: 999 }, 500, 400).y).toBe(400 - MIN_VISIBLE);
  });

  it('is a no-op when the layer is fully inside', () => {
    const b = { id: 'a', x: 10, y: 20, w: 100, h: 50 };
    expect(clampLayerPosition(b, 500, 400)).toEqual({ x: 10, y: 20 });
  });

  it('never requires more visibility than the layer size', () => {
    const tiny = { id: 'a', x: -5, y: -5, w: 10, h: 10 };
    expect(clampLayerPosition(tiny, 500, 400)).toEqual({ x: 0, y: 0 });
  });
});

describe('moveLayer', () => {
  it('swaps neighbours and returns a new array', () => {
    const input = ['a', 'b', 'c'];
    const up = moveLayer(input, 0, 1);
    expect(up).toEqual(['b', 'a', 'c']);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op at the ends', () => {
    expect(moveLayer(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveLayer(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});

describe('scaledImageDims', () => {
  it('keeps the natural ratio and rounds to at least 1px', () => {
    expect(scaledImageDims(200, 100, 0.5)).toEqual({ width: 100, height: 50 });
    expect(scaledImageDims(200, 100, 0.001)).toEqual({ width: 1, height: 1 });
  });
});

describe('lockedDims', () => {
  it('derives the other side from the locked ratio', () => {
    expect(lockedDims('w', 1920, 16 / 9)).toEqual({ w: 1920, h: 1080 });
    expect(lockedDims('h', 1080, 16 / 9)).toEqual({ w: 1920, h: 1080 });
  });

  it('never returns dimensions below 1px', () => {
    expect(lockedDims('w', 0, 2)).toEqual({ w: 1, h: 1 });
  });
});

describe('computeLayerBounds', () => {
  it('measures text with the layer font and passes image dims through', () => {
    const { ctx } = recordingCtx();
    const bounds = computeLayerBounds(ctx, [textLayer(), imageLayer()]);
    expect(bounds[0]).toEqual({ id: 't1', x: 100, y: 100, w: 50, h: 48 });
    expect(bounds[1]).toEqual({ id: 'i1', x: 50, y: 60, w: 200, h: 100 });
  });
});

describe('drawComposition', () => {
  const spec: CompositionSpec = {
    width: 1000,
    height: 800,
    background: '#112233',
    layers: [textLayer(), imageLayer()],
  };

  it('fills the background first, then draws layers in order', () => {
    const { ctx, calls } = recordingCtx();
    drawComposition(ctx, spec);
    expect(calls[0]).toMatchObject({ op: 'fillRect', args: [0, 0, 1000, 800], fillStyle: '#112233' });
    const ops = calls.map((c) => c.op);
    expect(ops.indexOf('fillText')).toBeGreaterThan(ops.indexOf('fillRect'));
    expect(ops.indexOf('drawImage')).toBeGreaterThan(ops.indexOf('fillText'));
  });

  it('sets the font and color before drawing text', () => {
    const { ctx, calls } = recordingCtx();
    drawComposition(ctx, spec);
    const text = calls.find((c) => c.op === 'fillText');
    expect(text).toMatchObject({ args: ['Hello', 100, 100], font: '40px sans-serif', fillStyle: '#ffffff' });
  });

  it('never draws selection chrome', () => {
    const { ctx, calls } = recordingCtx();
    drawComposition(ctx, spec);
    expect(calls.some((c) => c.op === 'strokeRect' || c.op === 'setLineDash')).toBe(false);
  });
});

describe('drawSelectionOverlay', () => {
  it('strokes a dashed rect padded around the bounds, preview-only', () => {
    const { ctx, calls } = recordingCtx(1080, 1080);
    drawSelectionOverlay(ctx, { id: 'a', x: 100, y: 100, w: 50, h: 48 }, 1080);
    const stroke = calls.find((c) => c.op === 'strokeRect');
    expect(stroke?.args).toEqual([96, 96, 58, 56]);
    expect(calls.some((c) => c.op === 'setLineDash')).toBe(true);
    expect(calls.map((c) => c.op)).toContain('restore');
  });
});
