import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';

const pdfToImages = vi.fn();
const downloadBlob = vi.fn();
const zipGenerateAsync = vi.fn();
const zipFile = vi.fn();

vi.mock('@/lib/tools/implementations/pdf-to-images', () => ({
  pdfToImages: (...args: unknown[]) => pdfToImages(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});
vi.mock('jszip', () => ({
  default: class {
    file = zipFile;
    generateAsync = zipGenerateAsync;
  },
}));

import { PdfToImagesTool } from '@/components/tools/pdf-to-images-tool';

const messages = {
  selectButton: 'Select a PDF',
  empty: 'Drop a PDF here.',
  format: 'Format',
  formatPng: 'PNG',
  formatJpg: 'JPG',
  pageLabelTemplate: 'Page {n}',
  downloadPageLabelTemplate: 'Download page {n}',
  downloadAllZip: 'Download all as ZIP',
  busy: 'Working…',
  error: 'Could not export.',
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
  pdfToImages.mockReset();
  downloadBlob.mockReset();
  zipGenerateAsync.mockReset();
  zipFile.mockReset();
});

describe('PdfToImagesTool', () => {
  it('renders empty state with disabled actions', () => {
    render(<PdfToImagesTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.downloadAllZip })).toBeDisabled();
  });

  it('shows a download button for each page after file loads', async () => {
    const user = userEvent.setup();
    render(<PdfToImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(3));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download page 1' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Download page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download page 3' })).toBeInTheDocument();
  });

  it('clicking a per-page download calls pdfToImages with the current format and downloads that page', async () => {
    const user = userEvent.setup();
    pdfToImages.mockResolvedValue([
      { name: 'page-1.png', bytes: new Uint8Array([0x89, 0x50]), pageIndex: 1 },
      { name: 'page-2.png', bytes: new Uint8Array([0x89, 0x50]), pageIndex: 2 },
    ]);
    render(<PdfToImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(2, 'doc.pdf'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download page 1' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Download page 2' }));
    expect(pdfToImages.mock.calls[0]![1]).toEqual({ format: 'png' });
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('doc-page-2.png');
  });

  it('switching format to JPG passes format:jpeg', async () => {
    const user = userEvent.setup();
    pdfToImages.mockResolvedValue([
      { name: 'page-1.jpg', bytes: new Uint8Array([0xff, 0xd8]), pageIndex: 1 },
    ]);
    render(<PdfToImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download page 1' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText(messages.format), 'jpeg');
    await user.click(screen.getByRole('button', { name: 'Download page 1' }));
    expect(pdfToImages.mock.calls[0]![1]).toEqual({ format: 'jpeg' });
  });

  it('Download all as ZIP packs each page via jszip and downloads a .zip', async () => {
    const user = userEvent.setup();
    pdfToImages.mockResolvedValue([
      { name: 'page-1.png', bytes: new Uint8Array([0x89]), pageIndex: 1 },
      { name: 'page-2.png', bytes: new Uint8Array([0x89]), pageIndex: 2 },
    ]);
    zipGenerateAsync.mockResolvedValue(new Blob([new Uint8Array([0x50, 0x4b])], { type: 'application/zip' }));
    render(<PdfToImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(2, 'doc.pdf'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download page 1' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: messages.downloadAllZip }));
    expect(zipFile).toHaveBeenCalledTimes(2);
    expect(zipFile.mock.calls[0]![0]).toBe('page-1.png');
    expect(zipFile.mock.calls[1]![0]).toBe('page-2.png');
    expect(downloadBlob.mock.calls[0]![1]).toBe('images-from-doc.zip');
  });

  it('shows error on export failure', async () => {
    const user = userEvent.setup();
    pdfToImages.mockRejectedValue(new Error('boom'));
    render(<PdfToImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download page 1' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Download page 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
