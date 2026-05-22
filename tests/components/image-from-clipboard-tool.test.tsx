import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

import { ImageFromClipboardTool } from '@/components/tools/image-from-clipboard-tool';

const messages = {
  pasteButton: 'Paste from clipboard',
  empty: 'Press Cmd/Ctrl + V or click the button to paste an image.',
  downloadButton: 'Download',
  format: 'Output format',
  formatPng: 'PNG',
  formatJpeg: 'JPG',
  formatWebp: 'WebP',
  previewLabel: 'Preview',
  previewSummary: '{format} · {size}',
  busy: 'Reading clipboard…',
  errorEmpty: "Your clipboard doesn't contain an image.",
  errorPermission: 'Clipboard access was denied.',
  errorGeneric: 'Could not read that image.',
  replace: 'Replace',
};

function pngFile(name = 'paste.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' });
}

function fakeDataTransfer(files: File[]): DataTransfer {
  const items = files.map((f) => ({
    kind: 'file' as const,
    type: f.type,
    getAsFile: () => f,
  }));
  return { items, files } as unknown as DataTransfer;
}

beforeEach(() => {
  convertImageMock.mockReset();
  downloadBlobMock.mockReset();
  convertImageMock.mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
});

describe('ImageFromClipboardTool', () => {
  it('renders empty state with paste button and disabled download', () => {
    render(<ImageFromClipboardTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.downloadButton })).toBeDisabled();
  });

  it('accepts a pasted image via window paste event and enables download', async () => {
    render(<ImageFromClipboardTool {...messages} />);
    const dt = fakeDataTransfer([pngFile()]);
    fireEvent.paste(window, { clipboardData: dt });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: messages.downloadButton })).toBeEnabled();
    });
    expect(convertImageMock).toHaveBeenCalled();
  });

  it('downloads with the selected format extension', async () => {
    const user = userEvent.setup();
    render(<ImageFromClipboardTool {...messages} />);
    const dt = fakeDataTransfer([pngFile()]);
    fireEvent.paste(window, { clipboardData: dt });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.downloadButton })).toBeEnabled(),
    );
    await user.selectOptions(screen.getByLabelText(messages.format), 'webp');
    await waitFor(() => expect(convertImageMock).toHaveBeenLastCalledWith(expect.anything(), 'webp'));
    await user.click(screen.getByRole('button', { name: messages.downloadButton }));
    expect(downloadBlobMock).toHaveBeenCalledOnce();
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('clipboard-image.webp');
  });

  it('clears the source on Replace', async () => {
    const user = userEvent.setup();
    render(<ImageFromClipboardTool {...messages} />);
    const dt = fakeDataTransfer([pngFile()]);
    fireEvent.paste(window, { clipboardData: dt });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.replace })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: messages.replace }));
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.downloadButton })).toBeDisabled();
  });

  it('shows the empty-clipboard error when the paste button finds no image', async () => {
    const user = userEvent.setup();
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { read: vi.fn(async () => [{ types: ['text/plain'], getType: vi.fn() }]) },
    });
    try {
      render(<ImageFromClipboardTool {...messages} />);
      await user.click(screen.getByRole('button', { name: messages.pasteButton }));
      expect(await screen.findByRole('alert')).toHaveTextContent(messages.errorEmpty);
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    }
  });
});
