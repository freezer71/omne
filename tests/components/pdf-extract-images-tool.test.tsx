import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';
import type { ExtractedImage } from '@/lib/tools/implementations/pdf-extract-images';

const extractPdfImages = vi.fn();
const downloadBlob = vi.fn();
const zipGenerateAsync = vi.fn();
const zipFile = vi.fn();

vi.mock('@/lib/tools/implementations/pdf-extract-images', () => ({
  extractPdfImages: (...args: unknown[]) => extractPdfImages(...args),
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

import { PdfExtractImagesTool } from '@/components/tools/pdf-extract-images-tool';

const messages = {
  selectButton: 'Select a PDF',
  empty: 'Drop a PDF here.',
  extracting: 'Extracting images…',
  noImages: 'No embedded images found in this PDF.',
  imageLabelTemplate: 'Image {n} · page {p}',
  downloadImageLabelTemplate: 'Download image {n}',
  downloadAllZip: 'Download all as ZIP',
  busy: 'Working…',
  error: 'Could not extract images.',
  removeFile: 'Remove',
  countTemplate: '{n} image found',
  countTemplatePlural: '{n} images found',
};

async function makePdfFile(name = 'doc.pdf'): Promise<File> {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  const bytes = await doc.save();
  return new File([bytes as BlobPart], name, { type: 'application/pdf' });
}

function fakeImage(pageIndex: number, imageIndex: number): ExtractedImage {
  return {
    pageIndex,
    imageIndex,
    name: `page-${pageIndex}-img-${imageIndex}.png`,
    format: 'png',
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    width: 32,
    height: 32,
  };
}

beforeEach(() => {
  extractPdfImages.mockReset();
  downloadBlob.mockReset();
  zipGenerateAsync.mockReset();
  zipFile.mockReset();
});

describe('PdfExtractImagesTool', () => {
  it('renders empty state with disabled ZIP button', () => {
    render(<PdfExtractImagesTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.downloadAllZip })).toBeDisabled();
  });

  it('streams thumbnails via the onImage callback and enables the ZIP button when done', async () => {
    const user = userEvent.setup();
    extractPdfImages.mockImplementation(async (_input: unknown, opts: { onImage?: (i: ExtractedImage) => void }) => {
      opts.onImage?.(fakeImage(1, 1));
      opts.onImage?.(fakeImage(2, 1));
      return [fakeImage(1, 1), fakeImage(2, 1)];
    });
    render(<PdfExtractImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.downloadAllZip })).toBeEnabled(),
    );
    expect(screen.getByAltText('Image 1 · page 1')).toBeInTheDocument();
    expect(screen.getByAltText('Image 1 · page 2')).toBeInTheDocument();
    expect(screen.getByText(/2 images found/)).toBeInTheDocument();
  });

  it('shows the empty-result message when no embedded images are found', async () => {
    const user = userEvent.setup();
    extractPdfImages.mockResolvedValue([]);
    render(<PdfExtractImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile());
    await waitFor(() => expect(screen.getByText(messages.noImages)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: messages.downloadAllZip })).toBeDisabled();
  });

  it('clicking a per-image download writes a uniquely named file', async () => {
    const user = userEvent.setup();
    extractPdfImages.mockImplementation(async (_input: unknown, opts: { onImage?: (i: ExtractedImage) => void }) => {
      opts.onImage?.(fakeImage(2, 1));
      return [fakeImage(2, 1)];
    });
    render(<PdfExtractImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile('report.pdf'));
    const btn = await screen.findByRole('button', { name: 'Download image 2-1' });
    await user.click(btn);
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('report-page-2-img-1.png');
  });

  it('Download all as ZIP packs every image and downloads a .zip', async () => {
    const user = userEvent.setup();
    extractPdfImages.mockImplementation(async (_input: unknown, opts: { onImage?: (i: ExtractedImage) => void }) => {
      opts.onImage?.(fakeImage(1, 1));
      opts.onImage?.(fakeImage(1, 2));
      return [fakeImage(1, 1), fakeImage(1, 2)];
    });
    zipGenerateAsync.mockResolvedValue(new Blob([new Uint8Array([0x50, 0x4b])], { type: 'application/zip' }));
    render(<PdfExtractImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile('doc.pdf'));
    const zipBtn = await screen.findByRole('button', { name: messages.downloadAllZip });
    await waitFor(() => expect(zipBtn).toBeEnabled());
    await user.click(zipBtn);
    await waitFor(() => expect(zipFile).toHaveBeenCalledTimes(2));
    expect(zipFile.mock.calls[0]![0]).toBe('page-1-img-1.png');
    expect(zipFile.mock.calls[1]![0]).toBe('page-1-img-2.png');
    expect(downloadBlob.mock.calls[0]![1]).toBe('images-from-doc.zip');
  });

  it('shows an error if extraction throws', async () => {
    const user = userEvent.setup();
    extractPdfImages.mockRejectedValue(new Error('boom'));
    render(<PdfExtractImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile());
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });

  it('removing the file resets the grid', async () => {
    const user = userEvent.setup();
    extractPdfImages.mockImplementation(async (_input: unknown, opts: { onImage?: (i: ExtractedImage) => void }) => {
      opts.onImage?.(fakeImage(1, 1));
      return [fakeImage(1, 1)];
    });
    render(<PdfExtractImagesTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile());
    await screen.findByAltText('Image 1 · page 1');
    await user.click(screen.getByRole('button', { name: messages.removeFile }));
    expect(screen.queryByAltText('Image 1 · page 1')).not.toBeInTheDocument();
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
  });
});
