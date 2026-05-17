import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resizeImageMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/image-resize', () => ({
  resizeImage: (...args: unknown[]) => resizeImageMock(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { ImageResizeTool } from '@/components/tools/image-resize-tool';

const messages = {
  selectButton: 'Select an image',
  empty: 'Drop a PNG or JPG here.',
  resizeButton: 'Resize',
  widthLabel: 'Width',
  heightLabel: 'Height',
  lockAspect: 'Lock aspect ratio',
  busy: 'Resizing…',
  error: 'Resize failed.',
  removeFile: 'Remove',
};

function pngFile(name = 'pic.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BlobPart], name, {
    type: 'image/png',
  });
}

beforeEach(() => {
  resizeImageMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('ImageResizeTool', () => {
  it('renders empty state and disables Resize', () => {
    render(<ImageResizeTool {...messages} />);
    expect(screen.getByRole('button', { name: messages.resizeButton })).toBeDisabled();
  });

  it('enables Resize once a file is selected', async () => {
    const user = userEvent.setup();
    render(<ImageResizeTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    expect(screen.getByRole('button', { name: messages.resizeButton })).toBeEnabled();
  });

  it('calls resizeImage with the chosen dimensions', async () => {
    const user = userEvent.setup();
    resizeImageMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageResizeTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('photo.png'));
    const w = screen.getByLabelText(messages.widthLabel) as HTMLInputElement;
    const h = screen.getByLabelText(messages.heightLabel) as HTMLInputElement;
    const lock = screen.getByLabelText(messages.lockAspect);
    await user.click(lock); // unlock to set independent dims
    fireEvent.change(w, { target: { value: '320' } });
    fireEvent.change(h, { target: { value: '240' } });
    await user.click(screen.getByRole('button', { name: messages.resizeButton }));
    expect(resizeImageMock).toHaveBeenCalledOnce();
    const opts = resizeImageMock.mock.calls[0]![1] as { width: number; height: number };
    expect(opts.width).toBe(320);
    expect(opts.height).toBe(240);
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('resized-photo-320x240.png');
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    resizeImageMock.mockRejectedValue(new Error('boom'));
    render(<ImageResizeTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.resizeButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
