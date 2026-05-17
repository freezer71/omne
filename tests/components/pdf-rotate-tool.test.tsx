import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';

const rotatePdf = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/pdf-rotate', () => ({
  rotatePdf: (...args: unknown[]) => rotatePdf(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { PdfRotateTool } from '@/components/tools/pdf-rotate-tool';

const messages = {
  selectButton: 'Select a PDF',
  empty: 'Drop a PDF here.',
  rotateButton: 'Rotate',
  pageLabelTemplate: 'Page {n}',
  rotatePageLabelTemplate: 'Rotate page {n}',
  rotateAll90: 'All 90°',
  rotateAll180: 'All 180°',
  rotateAll270: 'All 270°',
  resetAll: 'Reset',
  busy: 'Rotating…',
  error: 'Could not rotate.',
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
  rotatePdf.mockReset();
  downloadBlob.mockReset();
});

describe('PdfRotateTool (per-page)', () => {
  it('renders empty state with disabled Rotate button', () => {
    render(<PdfRotateTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.rotateButton })).toBeDisabled();
  });

  it('shows a rotate-overlay button for each page once file loads', async () => {
    const user = userEvent.setup();
    render(<PdfRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(3));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rotate page 1' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Rotate page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotate page 3' })).toBeInTheDocument();
  });

  it('Rotate button calls rotatePdf with perPage state and downloads', async () => {
    const user = userEvent.setup();
    rotatePdf.mockResolvedValue(new Uint8Array([0x25, 0x50]));
    render(<PdfRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(3, 'invoice.pdf'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rotate page 2' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Rotate page 2' }));
    await user.click(screen.getByRole('button', { name: messages.rotateButton }));
    expect(rotatePdf).toHaveBeenCalledOnce();
    expect(rotatePdf.mock.calls[0][1]).toEqual({ perPage: { 2: 90 } });
    expect(downloadBlob.mock.calls[0][1]).toBe('rotated-invoice.pdf');
  });

  it('clicking rotate-overlay twice cycles 0→90→180', async () => {
    const user = userEvent.setup();
    rotatePdf.mockResolvedValue(new Uint8Array([0x25, 0x50]));
    render(<PdfRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rotate page 1' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Rotate page 1' }));
    await user.click(screen.getByRole('button', { name: 'Rotate page 1' }));
    await user.click(screen.getByRole('button', { name: messages.rotateButton }));
    expect(rotatePdf.mock.calls[0][1]).toEqual({ perPage: { 1: 180 } });
  });

  it('All 90° sets every page to 90', async () => {
    const user = userEvent.setup();
    rotatePdf.mockResolvedValue(new Uint8Array([0x25, 0x50]));
    render(<PdfRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(3));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rotate page 1' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: messages.rotateAll90 }));
    await user.click(screen.getByRole('button', { name: messages.rotateButton }));
    expect(rotatePdf.mock.calls[0][1]).toEqual({ perPage: { 1: 90, 2: 90, 3: 90 } });
  });

  it('Reset clears all rotations', async () => {
    const user = userEvent.setup();
    rotatePdf.mockResolvedValue(new Uint8Array([0x25, 0x50]));
    render(<PdfRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rotate page 1' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: messages.rotateAll180 }));
    await user.click(screen.getByRole('button', { name: messages.resetAll }));
    expect(screen.getByRole('button', { name: messages.rotateButton })).toBeDisabled();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    rotatePdf.mockRejectedValue(new Error('boom'));
    render(<PdfRotateTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), await makePdfFile(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rotate page 1' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Rotate page 1' }));
    await user.click(screen.getByRole('button', { name: messages.rotateButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
