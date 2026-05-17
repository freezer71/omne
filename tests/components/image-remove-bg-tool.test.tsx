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
  downloadButton: 'Download PNG',
  resetButton: 'Process again',
  resultLabel: 'Result',
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

  it('calls removeBackground and shows result preview + Download button', async () => {
    const user = userEvent.setup();
    removeBackgroundMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageRemoveBgTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('subject.jpg'));
    await user.click(screen.getByRole('button', { name: messages.removeButton }));
    expect(removeBackgroundMock).toHaveBeenCalledOnce();
    // After processing, result preview shows and Download appears
    expect(await screen.findByRole('img', { name: messages.resultLabel })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.downloadButton })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.resetButton })).toBeInTheDocument();
    // Original Remove button is gone while result is shown
    expect(screen.queryByRole('button', { name: messages.removeButton })).not.toBeInTheDocument();
    // Download was NOT triggered automatically
    expect(downloadBlobMock).not.toHaveBeenCalled();
  });

  it('downloads with no-bg-<name>.png when user clicks Download', async () => {
    const user = userEvent.setup();
    removeBackgroundMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageRemoveBgTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile('subject.jpg'));
    await user.click(screen.getByRole('button', { name: messages.removeButton }));
    await user.click(await screen.findByRole('button', { name: messages.downloadButton }));
    expect(downloadBlobMock).toHaveBeenCalledOnce();
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('no-bg-subject.png');
  });

  it('clears result and re-enables Remove background on Process-again', async () => {
    const user = userEvent.setup();
    removeBackgroundMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<ImageRemoveBgTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), pngFile());
    await user.click(screen.getByRole('button', { name: messages.removeButton }));
    await user.click(await screen.findByRole('button', { name: messages.resetButton }));
    expect(screen.queryByRole('img', { name: messages.resultLabel })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.removeButton })).toBeEnabled();
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
