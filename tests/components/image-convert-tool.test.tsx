import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const convertImageMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/image-convert', () => ({
  convertImage: (...args: unknown[]) => convertImageMock(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { ImageConvertTool } from '@/components/tools/image-convert-tool';

const messages = {
  selectButton: 'Select an image',
  empty: 'Drop a PNG or JPG here.',
  convertButton: 'Convert',
  format: 'Output format',
  formatPng: 'PNG',
  formatJpeg: 'JPG',
  formatWebp: 'WebP',
  busy: 'Converting…',
  error: 'Conversion failed.',
  removeFile: 'Remove',
};

function pngFile(name = 'pic.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BlobPart], name, {
    type: 'image/png',
  });
}

beforeEach(() => {
  convertImageMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('ImageConvertTool', () => {
  it('renders empty state and disables Convert', () => {
    render(<ImageConvertTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.convertButton })).toBeDisabled();
  });

  it('enables Convert once an image is selected', async () => {
    const user = userEvent.setup();
    render(<ImageConvertTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    expect(screen.getByText('pic.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.convertButton })).toBeEnabled();
  });

  it('calls convertImage with the selected format and downloads', async () => {
    const user = userEvent.setup();
    convertImageMock.mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
    render(<ImageConvertTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('photo.png'));
    await user.selectOptions(screen.getByLabelText(messages.format), 'webp');
    await user.click(screen.getByRole('button', { name: messages.convertButton }));
    expect(convertImageMock).toHaveBeenCalledOnce();
    expect(convertImageMock.mock.calls[0]![1]).toBe('webp');
    expect(downloadBlobMock).toHaveBeenCalledOnce();
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('converted-photo.webp');
  });

  it('uses .jpg extension for jpeg target', async () => {
    const user = userEvent.setup();
    convertImageMock.mockResolvedValue(new Uint8Array([0xff, 0xd8]));
    render(<ImageConvertTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('photo.png'));
    await user.click(screen.getByRole('button', { name: messages.convertButton }));
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('converted-photo.jpg');
  });

  it('shows alert on conversion failure', async () => {
    const user = userEvent.setup();
    convertImageMock.mockRejectedValue(new Error('boom'));
    render(<ImageConvertTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.convertButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });

  it('removes the selected file', async () => {
    const user = userEvent.setup();
    render(<ImageConvertTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.removeFile }));
    expect(screen.queryByText('pic.png')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.convertButton })).toBeDisabled();
  });
});
