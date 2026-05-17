import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mergePdfs = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/pdf-merge', () => ({
  mergePdfs: (...args: unknown[]) => mergePdfs(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { PdfMergeTool } from '@/components/tools/pdf-merge-tool';

vi.mock('@/components/ui/pdf-thumbnail', () => ({
  PdfThumbnail: () => <div data-testid="thumb" />,
}));
vi.mock('@/components/ui/pdf-pages-grid', () => ({
  PdfPagesGrid: () => <div data-testid="pages-grid" />,
}));

const messages = {
  selectButton: 'Select PDFs',
  empty: 'Drop PDFs here.',
  mergeButton: 'Merge PDFs',
  removeFile: 'Remove',
  moveUp: 'Move up',
  moveDown: 'Move down',
  busy: 'Merging…',
  error: 'Something went wrong.',
  previewLoading: 'Loading',
  previewError: 'Failed',
  pageLabelTemplate: 'Page {n}',
};

function pdfFile(name: string): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: 'application/pdf' });
}

beforeEach(() => {
  mergePdfs.mockReset();
  downloadBlob.mockReset();
});

describe('PdfMergeTool', () => {
  it('renders the empty state initially', () => {
    render(<PdfMergeTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.mergeButton })).toBeDisabled();
  });

  it('disables Merge with a single file (needs at least 2)', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, pdfFile('a.pdf'));
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.mergeButton })).toBeDisabled();
  });

  it('enables Merge once 2 files are selected', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    expect(screen.getByRole('button', { name: messages.mergeButton })).toBeEnabled();
  });

  it('calls mergePdfs and downloads the result with the correct name', async () => {
    const user = userEvent.setup();
    mergePdfs.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('report.pdf'), pdfFile('appendix.pdf')]);
    await user.click(screen.getByRole('button', { name: messages.mergeButton }));
    expect(mergePdfs).toHaveBeenCalledOnce();
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('merged-report.pdf');
  });

  it('allows removing a file from the list', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    const removeButtons = screen.getAllByRole('button', { name: messages.removeFile });
    await user.click(removeButtons[0]!);
    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  it('shows an error if merge fails', async () => {
    const user = userEvent.setup();
    mergePdfs.mockRejectedValue(new Error('boom'));
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    await user.click(screen.getByRole('button', { name: messages.mergeButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
