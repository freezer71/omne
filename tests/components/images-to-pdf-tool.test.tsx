import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const imagesToPdf = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/images-to-pdf', () => ({
  imagesToPdf: (...args: unknown[]) => imagesToPdf(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { ImagesToPdfTool } from '@/components/tools/images-to-pdf-tool';

const messages = {
  selectButton: 'Select images',
  empty: 'Drop images here.',
  combineButton: 'Combine into PDF',
  removeFile: 'Remove',
  busy: 'Combining…',
  error: 'Could not combine.',
};

const png = (n = 'a.png') => new File([new Uint8Array([0x89, 0x50])], n, { type: 'image/png' });

beforeEach(() => {
  imagesToPdf.mockReset();
  downloadBlob.mockReset();
});

describe('ImagesToPdfTool', () => {
  it('renders empty state with disabled Combine', () => {
    render(<ImagesToPdfTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.combineButton })).toBeDisabled();
  });

  it('enables Combine after picking 1+ images', async () => {
    const user = userEvent.setup();
    render(<ImagesToPdfTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), png());
    expect(screen.getByRole('button', { name: messages.combineButton })).toBeEnabled();
  });

  it('calls imagesToPdf with all picked images and downloads result', async () => {
    const user = userEvent.setup();
    imagesToPdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    render(<ImagesToPdfTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), [png('a.png'), png('b.png')]);
    await user.click(screen.getByRole('button', { name: messages.combineButton }));
    expect(imagesToPdf).toHaveBeenCalledOnce();
    expect((imagesToPdf.mock.calls[0]![0] as File[]).length).toBe(2);
    expect(downloadBlob.mock.calls[0]![1]).toBe('pdf-from-a.pdf');
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    imagesToPdf.mockRejectedValue(new Error('boom'));
    render(<ImagesToPdfTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), png());
    await user.click(screen.getByRole('button', { name: messages.combineButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
