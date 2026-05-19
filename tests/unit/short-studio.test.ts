import { describe, it, expect, vi, beforeEach } from 'vitest';

const { execMock, writeMock, readMock, deleteMock } = vi.hoisted(() => ({
  execMock: vi.fn(),
  writeMock: vi.fn(),
  readMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/lib/ffmpeg-loader', () => ({
  getFfmpeg: vi.fn(async () => ({
    writeFile: writeMock,
    readFile: readMock,
    deleteFile: deleteMock,
    exec: execMock,
    on: () => {},
    off: () => {},
  })),
}));

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async (input: unknown) => {
    if (input instanceof Uint8Array) return input;
    if (input instanceof File) return new Uint8Array(await input.arrayBuffer());
    return input as Uint8Array;
  }),
}));

import {
  generateShorts,
  renderTemplate,
  hexToFfmpegColor,
} from '@/lib/tools/implementations/short-studio';

beforeEach(() => {
  execMock.mockReset();
  execMock.mockResolvedValue(0);
  writeMock.mockReset();
  writeMock.mockResolvedValue(undefined);
  readMock.mockReset();
  readMock.mockResolvedValue(new Uint8Array([0x00, 0x01]));
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

const defaults = {
  textTemplate: '{n}/{N}',
  position: 'bottomRight' as const,
  fontFamily: 'inter' as const,
  fontSize: 48,
  fontColor: '#ffffff',
  opacity: 0.85,
  vertical: false,
};

describe('hexToFfmpegColor', () => {
  it('accepts #rrggbb', () => {
    expect(hexToFfmpegColor('#ff0033')).toBe('0xFF0033');
  });

  it('accepts rrggbb without leading #', () => {
    expect(hexToFfmpegColor('0a0b0c')).toBe('0x0A0B0C');
  });

  it('falls back to white for invalid input', () => {
    expect(hexToFfmpegColor('not-a-color')).toBe('0xFFFFFF');
    expect(hexToFfmpegColor('#abc')).toBe('0xFFFFFF');
  });
});

describe('renderTemplate', () => {
  it('replaces {n} with the current number', () => {
    expect(renderTemplate('{n}', 2, 5)).toBe('2');
  });

  it('replaces {N} with the total', () => {
    expect(renderTemplate('{N}', 2, 5)).toBe('5');
  });

  it('replaces both placeholders together', () => {
    expect(renderTemplate('{n}/{N}', 3, 7)).toBe('3/7');
  });

  it('keeps surrounding text intact', () => {
    expect(renderTemplate('Episode {n} of {N}', 1, 9)).toBe('Episode 1 of 9');
  });

  it('replaces every occurrence', () => {
    expect(renderTemplate('{n}-{n}-{N}', 4, 10)).toBe('4-4-10');
  });

  it('leaves the template untouched when no placeholder is present', () => {
    expect(renderTemplate('Brand', 1, 3)).toBe('Brand');
  });
});

describe('generateShorts', () => {
  it('writes the input + font once, runs FFmpeg N times and reads N outputs', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    const result = await generateShorts(file, { mode: 'parts', parts: 3, totalDuration: 30, ...defaults });
    expect(writeMock).toHaveBeenCalledTimes(2);
    expect(writeMock.mock.calls.map((c) => c[0]).sort()).toEqual(['input.mp4', 'wm-font.ttf']);
    expect(execMock).toHaveBeenCalledTimes(3);
    expect(readMock).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeInstanceOf(Uint8Array);
  });

  it('emits -ss / -t and a -vf drawtext filter with the rendered counter', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults });
    const first = execMock.mock.calls[0]![0] as string[];
    const second = execMock.mock.calls[1]![0] as string[];
    expect(first[first.indexOf('-ss') + 1]).toBe('0');
    expect(first[first.indexOf('-t') + 1]).toBe('5');
    expect(second[second.indexOf('-ss') + 1]).toBe('5');
    expect(second[second.indexOf('-t') + 1]).toBe('5');
    const vfFirst = first[first.indexOf('-vf') + 1]!;
    const vfSecond = second[second.indexOf('-vf') + 1]!;
    expect(vfFirst).toContain('drawtext=');
    expect(vfFirst).toContain("text='1/2'");
    expect(vfSecond).toContain("text='2/2'");
  });

  it('writes a font ttf into MEMFS and references it via fontfile in drawtext', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, fontFamily: 'anton' });
    const fontWrite = writeMock.mock.calls.find((c) => c[0] === 'wm-font.ttf');
    expect(fontWrite).toBeDefined();
    const args = execMock.mock.calls[0]![0] as string[];
    const vf = args[args.indexOf('-vf') + 1]!;
    expect(vf).toContain('fontfile=wm-font.ttf');
  });

  it('passes the chosen fontColor as 0xRRGGBB to drawtext', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, fontColor: '#ff3b30' });
    const args = execMock.mock.calls[0]![0] as string[];
    const vf = args[args.indexOf('-vf') + 1]!;
    expect(vf).toContain('fontcolor=0xFF3B30@');
  });

  it('cleans up the font file from MEMFS in finally', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults });
    expect(deleteMock.mock.calls.some((c) => c[0] === 'wm-font.ttf')).toBe(true);
  });

  it('throws when fontColor is not a valid #rrggbb hex', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, fontColor: 'red' }),
    ).rejects.toThrow(/fontColor/i);
  });

  it('supports the 8 additional preset positions', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    const presets = [
      ['topCenter', '(w-tw)/2', '20'],
      ['centerLeft', '20', '(h-th)/2'],
      ['centerRight', 'w-tw-20', '(h-th)/2'],
      ['bottomCenter', '(w-tw)/2', 'h-th-20'],
    ] as const;
    for (const [pos, expX, expY] of presets) {
      execMock.mockClear();
      await generateShorts(file, {
        mode: 'parts', parts: 2, totalDuration: 10, ...defaults, position: pos,
      });
      const args = execMock.mock.calls[0]![0] as string[];
      const vf = args[args.indexOf('-vf') + 1]!;
      expect(vf).toContain(`:x=${expX}:`);
      expect(vf).toContain(`:y=${expY}:`);
    }
  });

  it('supports position="custom" with proportional iw/ih coordinates', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, {
      mode: 'parts', parts: 2, totalDuration: 10, ...defaults,
      position: 'custom', customX: 25, customY: 75,
    });
    const args = execMock.mock.calls[0]![0] as string[];
    const vf = args[args.indexOf('-vf') + 1]!;
    expect(vf).toContain(':x=iw*0.2500-tw/2:');
    expect(vf).toContain(':y=ih*0.7500-th/2:');
  });

  it('throws when customX is out of [0, 100]', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      generateShorts(file, {
        mode: 'parts', parts: 2, totalDuration: 10, ...defaults,
        position: 'custom', customX: 150, customY: 50,
      }),
    ).rejects.toThrow(/custom/i);
  });

  it('throws when fontFamily is unknown', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      generateShorts(file, {
        mode: 'parts',
        parts: 2,
        totalDuration: 10,
        ...defaults,
        // @ts-expect-error invalid font family for negative test
        fontFamily: 'comic-sans',
      }),
    ).rejects.toThrow(/fontFamily/i);
  });

  it('prepends crop+scale to the filter chain when vertical is enabled', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, vertical: true });
    const args = execMock.mock.calls[0]![0] as string[];
    const vf = args[args.indexOf('-vf') + 1]!;
    expect(vf.startsWith('crop=ih*9/16:ih')).toBe(true);
    expect(vf).toContain('scale=1080:1920');
    expect(vf).toContain('drawtext=');
  });

  it('re-encodes video and copies audio (mpeg4 + audio copy)', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('-c:v');
    expect(args[args.indexOf('-c:v') + 1]).toBe('mpeg4');
    expect(args).toContain('-c:a');
    expect(args[args.indexOf('-c:a') + 1]).toBe('copy');
  });

  it('always outputs .mp4 files', async () => {
    const file = new File([new Uint8Array([0])], 'movie.webm', { type: 'video/webm' });
    await generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults });
    const a0 = execMock.mock.calls[0]![0] as string[];
    const a1 = execMock.mock.calls[1]![0] as string[];
    expect(a0[a0.length - 1]).toMatch(/\.mp4$/);
    expect(a1[a1.length - 1]).toMatch(/\.mp4$/);
  });

  it('cleans up the input, font and every output in MEMFS', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, { mode: 'parts', parts: 3, totalDuration: 30, ...defaults });
    expect(deleteMock).toHaveBeenCalledTimes(5);
  });

  it('throws when textTemplate is blank', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, textTemplate: '   ' }),
    ).rejects.toThrow(/textTemplate/i);
  });

  it('throws when fontSize is out of range', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, fontSize: 1 }),
    ).rejects.toThrow(/fontSize/i);
    await expect(
      generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, fontSize: 500 }),
    ).rejects.toThrow(/fontSize/i);
  });

  it('throws when opacity is out of [0, 1]', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, opacity: 1.5 }),
    ).rejects.toThrow(/opacity/i);
    await expect(
      generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults, opacity: -0.1 }),
    ).rejects.toThrow(/opacity/i);
  });

  it('surfaces a clear error when an ffmpeg call fails', async () => {
    execMock.mockRejectedValue(new Error('boom'));
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      generateShorts(file, { mode: 'parts', parts: 2, totalDuration: 10, ...defaults }),
    ).rejects.toThrow(/short studio|boom/i);
  });

  it('escapes special characters inside drawtext (quote and percent)', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await generateShorts(file, {
      mode: 'parts',
      parts: 2,
      totalDuration: 10,
      ...defaults,
      textTemplate: "100% 'safe'",
    });
    const args = execMock.mock.calls[0]![0] as string[];
    const vf = args[args.indexOf('-vf') + 1]!;
    expect(vf).toContain("100\\%");
    expect(vf).toContain("\\'safe\\'");
  });
});
