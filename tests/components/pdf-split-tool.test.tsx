import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';

const splitPdf = vi.fn();
const extractPages = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/pdf-split', () => ({
  splitPdf: (...args: unknown[]) => splitPdf(...args),
  extractPages: (...args: unknown[]) => extractPages(...args),
  parseRanges: vi.fn(),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { PdfSplitTool } from '@/components/tools/pdf-split-tool';

const messages = {
  selectButton: 'Select a PDF',
  empty: 'Drop a PDF here.',
  pageLabel: (n: number) => `Page ${n}`,
  selectedCount: (n: number) => `${n} pages selected`,
  downloadSeparate: 'Download separate',
  extractSelection: 'Extract as single PDF',
  downloadAll: 'Download all',
  busy: 'Splitting…',
  error: 'Could not split.',
  removeFile: 'Remove',
  previewLoading: 'Loading',
  previewError: 'Failed',
};

async function makePdfFile(pages: number, name = 'doc.pdf'): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([100, 100]);
  const bytes = await doc.save();
  return new File([bytes as BlobPart], name, { type: 'application/pdf' });
}

beforeEach(() => {
  splitPdf.mockReset();
  extractPages.mockReset();
  downloadBlob.mockReset();
});

describe('PdfSplitTool (multi-select grid)', () => {
  it('renders empty state with all action buttons disabled', () => {
    render(<PdfSplitTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.downloadAll })).toBeDisabled();
    expect(screen.getByRole('button', { name: messages.downloadSeparate })).toBeDisabled();
    expect(screen.getByRole('button', { name: messages.extractSelection })).toBeDisabled();
  });

  it('enables Download all when a file is picked, others stay disabled without selection', async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(3));
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: messages.downloadAll })).toBeEnabled();
    expect(screen.getByRole('button', { name: messages.downloadSeparate })).toBeDisabled();
    expect(screen.getByRole('button', { name: messages.extractSelection })).toBeDisabled();
  });

  it('enables selection-dependent buttons after clicking a page', async () => {
    const user = userEvent.setup();
    render(<PdfSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(3));
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toBeInTheDocument());
    await user.click(screen.getByLabelText('Page 2'));
    expect(screen.getByRole('button', { name: messages.downloadSeparate })).toBeEnabled();
    expect(screen.getByRole('button', { name: messages.extractSelection })).toBeEnabled();
    expect(screen.getByText('1 pages selected')).toBeInTheDocument();
  });

  it('Download all calls splitPdf with type:pages and downloads every part', async () => {
    const user = userEvent.setup();
    splitPdf.mockResolvedValue([
      { name: 'page-1', bytes: new Uint8Array([0x25, 0x50]) },
      { name: 'page-2', bytes: new Uint8Array([0x25, 0x50]) },
    ]);
    render(<PdfSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(2, 'doc.pdf'));
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: messages.downloadAll }));
    expect(splitPdf.mock.calls[0][1]).toEqual({ type: 'pages' });
    expect(downloadBlob).toHaveBeenCalledTimes(2);
    expect(downloadBlob.mock.calls[0][1]).toBe('split-doc-page-1.pdf');
  });

  it('Download separate calls splitPdf for each selected page individually', async () => {
    const user = userEvent.setup();
    splitPdf.mockResolvedValue([
      { name: 'page-1', bytes: new Uint8Array([0x25, 0x50]) },
      { name: 'page-3', bytes: new Uint8Array([0x25, 0x50]) },
    ]);
    render(<PdfSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(3, 'doc.pdf'));
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toBeInTheDocument());
    await user.click(screen.getByLabelText('Page 1'));
    await user.click(screen.getByLabelText('Page 3'));
    await user.click(screen.getByRole('button', { name: messages.downloadSeparate }));
    expect(splitPdf.mock.calls[0][1]).toEqual({ type: 'ranges', ranges: [[1, 1], [3, 3]] });
    expect(downloadBlob).toHaveBeenCalledTimes(2);
  });

  it('Extract as single PDF calls extractPages and downloads one file', async () => {
    const user = userEvent.setup();
    extractPages.mockResolvedValue(new Uint8Array([0x25, 0x50]));
    render(<PdfSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(5, 'doc.pdf'));
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toBeInTheDocument());
    await user.click(screen.getByLabelText('Page 2'));
    await user.click(screen.getByLabelText('Page 4'));
    await user.click(screen.getByRole('button', { name: messages.extractSelection }));
    expect(extractPages).toHaveBeenCalledOnce();
    expect(extractPages.mock.calls[0][1]).toEqual([2, 4]);
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0][1]).toBe('extract-doc.pdf');
  });

  it('shows error if any action fails', async () => {
    const user = userEvent.setup();
    splitPdf.mockRejectedValue(new Error('boom'));
    render(<PdfSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(2));
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: messages.downloadAll }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
