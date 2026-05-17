import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const rotateImageMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/image-rotate', () => ({
  rotateImage: (...args: unknown[]) => rotateImageMock(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { ImageRotateTool } from '@/components/tools/image-rotate-tool';

const messages = {
  selectButton: 'Select an image',
  empty: 'Drop a PNG or JPG here.',
  applyButton: 'Apply',
  rotate90: '90°',
  rotate180: '180°',
  rotate270: '270°',
  flipH: 'Flip horizontal',
  flipV: 'Flip vertical',
  reset: 'Reset',
  busy: 'Rotating…',
  error: 'Failed.',
  removeFile: 'Remove',
};

function pngFile(name = 'pic.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BlobPart], name, {
    type: 'image/png',
  });
}

beforeEach(() => {
  rotateImageMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('ImageRotateTool', () => {
  it('disables Apply when no transform is set', async () => {
    const user = userEvent.setup();
    render(<ImageRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    expect(screen.getByRole('button', { name: messages.applyButton })).toBeDisabled();
  });

  it('enables Apply once an angle is chosen', async () => {
    const user = userEvent.setup();
    render(<ImageRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.rotate90 }));
    expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled();
  });

  it('passes the cumulative angle to rotateImage', async () => {
    const user = userEvent.setup();
    rotateImageMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('photo.png'));
    await user.click(screen.getByRole('button', { name: messages.rotate90 }));
    await user.click(screen.getByRole('button', { name: messages.rotate90 })); // 90 + 90 = 180
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    const opts = rotateImageMock.mock.calls[0]![1] as { angle: number };
    expect(opts.angle).toBe(180);
  });

  it('toggles flipH', async () => {
    const user = userEvent.setup();
    rotateImageMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.flipH }));
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    const opts = rotateImageMock.mock.calls[0]![1] as { flipH: boolean; flipV: boolean };
    expect(opts.flipH).toBe(true);
    expect(opts.flipV).toBe(false);
  });

  it('resets all transforms', async () => {
    const user = userEvent.setup();
    render(<ImageRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.rotate90 }));
    await user.click(screen.getByRole('button', { name: messages.flipH }));
    await user.click(screen.getByRole('button', { name: messages.reset }));
    expect(screen.getByRole('button', { name: messages.applyButton })).toBeDisabled();
  });
});
