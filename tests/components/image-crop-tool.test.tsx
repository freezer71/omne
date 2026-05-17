import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const cropImageMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/image-crop', () => ({
  cropImage: (...args: unknown[]) => cropImageMock(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { ImageCropTool } from '@/components/tools/image-crop-tool';

const messages = {
  selectButton: 'Select an image',
  empty: 'Drop a PNG or JPG here.',
  cropButton: 'Crop',
  xLabel: 'X',
  yLabel: 'Y',
  widthLabel: 'Width',
  heightLabel: 'Height',
  hint: 'Drag on the image to select a region.',
  busy: 'Cropping…',
  error: 'Crop failed.',
  removeFile: 'Remove',
};

function pngFile(name = 'pic.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BlobPart], name, {
    type: 'image/png',
  });
}

beforeEach(() => {
  cropImageMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('ImageCropTool', () => {
  it('renders empty state and disables Crop', () => {
    render(<ImageCropTool {...messages} />);
    expect(screen.getByRole('button', { name: messages.cropButton })).toBeDisabled();
  });

  it('crops with the rect set via number inputs', async () => {
    const user = userEvent.setup();
    cropImageMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageCropTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('photo.png'));
    fireEvent.change(screen.getByLabelText(messages.xLabel), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(messages.yLabel), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(messages.widthLabel), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(messages.heightLabel), { target: { value: '50' } });
    await user.click(screen.getByRole('button', { name: messages.cropButton }));
    expect(cropImageMock).toHaveBeenCalledOnce();
    const rect = cropImageMock.mock.calls[0]![1] as { x: number; y: number; w: number; h: number };
    expect(rect).toEqual({ x: 10, y: 20, w: 100, h: 50 });
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('cropped-photo-100x50.png');
  });

  it('keeps the button disabled when w or h is zero', async () => {
    const user = userEvent.setup();
    render(<ImageCropTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    fireEvent.change(screen.getByLabelText(messages.widthLabel), { target: { value: '100' } });
    expect(screen.getByRole('button', { name: messages.cropButton })).toBeDisabled();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    cropImageMock.mockRejectedValue(new Error('boom'));
    render(<ImageCropTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    fireEvent.change(screen.getByLabelText(messages.widthLabel), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(messages.heightLabel), { target: { value: '10' } });
    await user.click(screen.getByRole('button', { name: messages.cropButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
