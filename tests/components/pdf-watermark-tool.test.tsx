import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';

const watermarkPdf = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/pdf-watermark', () => ({
  watermarkPdf: (...args: unknown[]) => watermarkPdf(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});
vi.mock('@/components/tools/pdf-watermark-preview', () => ({
  PdfWatermarkPreview: () => null,
}));

import { PdfWatermarkTool } from '@/components/tools/pdf-watermark-tool';

const messages = {
  selectButton: 'Select a PDF',
  empty: 'Drop a PDF here.',
  applyButton: 'Add watermark',
  pageLabelTemplate: 'Page {n}',
  modeLabel: 'Watermark type',
  modeText: 'Text',
  modeImage: 'Image',
  textLabel: 'Text',
  textPlaceholder: 'CONFIDENTIAL',
  fontSizeLabel: 'Size',
  imageLabel: 'Image',
  imageSelectButton: 'Select image (PNG or JPG)',
  imageRemove: 'Remove image',
  scaleLabel: 'Scale',
  opacityLabel: 'Opacity',
  angleLabel: 'Angle',
  busy: 'Adding watermark…',
  error: 'Could not watermark that PDF.',
  errorUnsupportedChar: 'Unsupported character',
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

function makeImageFile(name = 'logo.png'): File {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  return new File([png as BlobPart], name, { type: 'image/png' });
}

beforeEach(() => {
  watermarkPdf.mockReset();
  downloadBlob.mockReset();
});

describe('PdfWatermarkTool', () => {
  it('renders empty state with the drop prompt and no Apply button', () => {
    render(<PdfWatermarkTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.selectButton })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: messages.applyButton })).toBeNull();
  });

  it('enables Apply once a PDF is uploaded (default text mode)', async () => {
    const user = userEvent.setup();
    render(<PdfWatermarkTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
  });

  it('disables Apply when the text field is empty', async () => {
    const user = userEvent.setup();
    render(<PdfWatermarkTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1));
    const input = await screen.findByLabelText(messages.textLabel);
    await user.clear(input);
    expect(screen.getByRole('button', { name: messages.applyButton })).toBeDisabled();
  });

  it('calls watermarkPdf with text options and downloads on Apply', async () => {
    const user = userEvent.setup();
    watermarkPdf.mockResolvedValue(new Uint8Array([0x25, 0x50]));
    render(<PdfWatermarkTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1, 'invoice.pdf'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    expect(watermarkPdf).toHaveBeenCalledOnce();
    const opts = watermarkPdf.mock.calls[0]![1] as { kind: string; text: string };
    expect(opts.kind).toBe('text');
    expect(opts.text).toBe('CONFIDENTIAL');
    expect(downloadBlob.mock.calls[0]![1]).toBe('watermarked-invoice.pdf');
  });

  it('switches to image mode and disables Apply until an image is picked', async () => {
    const user = userEvent.setup();
    render(<PdfWatermarkTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.modeImage, pressed: false }));
    expect(screen.getByRole('button', { name: messages.applyButton })).toBeDisabled();
    await user.upload(screen.getByLabelText(messages.imageSelectButton), makeImageFile());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
  });

  it('calls watermarkPdf with image options when in image mode', async () => {
    const user = userEvent.setup();
    watermarkPdf.mockResolvedValue(new Uint8Array([0x25, 0x50]));
    render(<PdfWatermarkTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1, 'invoice.pdf'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.modeImage, pressed: false }));
    await user.upload(screen.getByLabelText(messages.imageSelectButton), makeImageFile('logo.png'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    expect(watermarkPdf).toHaveBeenCalledOnce();
    const opts = watermarkPdf.mock.calls[0]![1] as { kind: string };
    expect(opts.kind).toBe('image');
    expect(downloadBlob.mock.calls[0]![1]).toBe('watermarked-invoice.pdf');
  });

  it('shows the localized error on watermark failure', async () => {
    const user = userEvent.setup();
    watermarkPdf.mockRejectedValue(new Error('boom'));
    render(<PdfWatermarkTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });

  it('shows the unsupported-character error when pdf-lib throws that specific error', async () => {
    const user = userEvent.setup();
    watermarkPdf.mockRejectedValue(new Error('Unsupported character — Helvetica supports Latin alphabets only.'));
    render(<PdfWatermarkTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.errorUnsupportedChar);
  });
});
