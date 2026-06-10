import { describe, it, expect } from 'vitest';
import { composeImage, type CompositionSpec } from '@/lib/tools/implementations/banner-maker';

const spec: CompositionSpec = {
  width: 100,
  height: 50,
  background: '#112233',
  layers: [
    {
      kind: 'text',
      id: 't1',
      text: 'Hello',
      x: 10,
      y: 10,
      fontSize: 24,
      fontFamily: 'sans-serif',
      color: '#ffffff',
      bold: true,
    },
  ],
};

describe('composeImage', () => {
  it('renders the spec to PNG bytes', async () => {
    const bytes = await composeImage(spec, 'image/png');
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('respects the requested mime', async () => {
    const jpeg = await composeImage(spec, 'image/jpeg', 0.9);
    expect(Array.from(jpeg.slice(0, 3))).toEqual([0xff, 0xd8, 0xff]);
    const webp = await composeImage(spec, 'image/webp', 0.9);
    expect(Array.from(webp.slice(8, 12))).toEqual([0x57, 0x45, 0x42, 0x50]);
  });
});
