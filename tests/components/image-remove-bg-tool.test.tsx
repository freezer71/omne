import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const removeBackgroundMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/image-remove-bg', () => ({
  removeBackground: (...args: unknown[]) => removeBackgroundMock(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { ImageRemoveBgTool } from '@/components/tools/image-remove-bg-tool';

const messages = {
  selectButton: 'Select an image',
  empty: 'Drop a PNG or JPG here.',
  removeButton: 'Remove background',
  modelNotice: 'First use downloads ~44 MB.',
  modelLoading: 'Loading model',
  busy: 'Processing…',
  error: 'Failed.',
  removeFile: 'Remove',
};

function pngFile(name = 'pic.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BlobPart], name, {
    type: 'image/png',
  });
}

beforeEach(() => {
  removeBackgroundMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('ImageRemoveBgTool', () => {
  it('renders the model-download notice', () => {
    render(<ImageRemoveBgTool {...messages} />);
    expect(screen.getByText(messages.modelNotice)).toBeInTheDocument();
  });

  it('disables Remove background until a file is selected', async () => {
    const user = userEvent.setup();
    render(<ImageRemoveBgTool {...messages} />);
    expect(screen.getByRole('button', { name: messages.removeButton })).toBeDisabled();
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    expect(screen.getByRole('button', { name: messages.removeButton })).toBeEnabled();
  });

  it('calls removeBackground and downloads a PNG with no-bg- prefix', async () => {
    const user = userEvent.setup();
    removeBackgroundMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageRemoveBgTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('subject.jpg'));
    await user.click(screen.getByRole('button', { name: messages.removeButton }));
    expect(removeBackgroundMock).toHaveBeenCalledOnce();
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('no-bg-subject.png');
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    removeBackgroundMock.mockRejectedValue(new Error('boom'));
    render(<ImageRemoveBgTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.removeButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
