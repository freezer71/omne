import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const compressImageMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/image-compress', () => ({
  compressImage: (...args: unknown[]) => compressImageMock(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { ImageCompressTool } from '@/components/tools/image-compress-tool';

const messages = {
  selectButton: 'Select an image',
  empty: 'Drop a PNG or JPG here.',
  compressButton: 'Compress',
  qualityLabel: 'Quality',
  format: 'Output format',
  formatJpeg: 'JPG',
  formatWebp: 'WebP',
  busy: 'Compressing…',
  error: 'Compression failed.',
  removeFile: 'Remove',
};

function pngFile(name = 'pic.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BlobPart], name, {
    type: 'image/png',
  });
}

beforeEach(() => {
  compressImageMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('ImageCompressTool', () => {
  it('renders empty state and disables Compress', () => {
    render(<ImageCompressTool {...messages} />);
    expect(screen.getByRole('button', { name: messages.compressButton })).toBeDisabled();
  });

  it('compresses with default JPEG quality 0.8', async () => {
    const user = userEvent.setup();
    compressImageMock.mockResolvedValue(new Uint8Array([0xff, 0xd8]));
    render(<ImageCompressTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('photo.png'));
    await user.click(screen.getByRole('button', { name: messages.compressButton }));
    expect(compressImageMock).toHaveBeenCalledOnce();
    const opts = compressImageMock.mock.calls[0]![1] as { quality: number; format: string };
    expect(opts.format).toBe('jpeg');
    expect(opts.quality).toBeCloseTo(0.8);
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('compressed-photo.jpg');
  });

  it('switches output to .webp when WebP is selected', async () => {
    const user = userEvent.setup();
    compressImageMock.mockResolvedValue(new Uint8Array([0x52, 0x49, 0x46, 0x46]));
    render(<ImageCompressTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('photo.png'));
    await user.selectOptions(screen.getByLabelText(messages.format), 'webp');
    await user.click(screen.getByRole('button', { name: messages.compressButton }));
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('compressed-photo.webp');
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    compressImageMock.mockRejectedValue(new Error('boom'));
    render(<ImageCompressTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.compressButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
