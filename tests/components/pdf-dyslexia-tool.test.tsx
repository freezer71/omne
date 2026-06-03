import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const downloadBlobMock = vi.fn();
const openPdfDocMock = vi.fn(async (..._a: unknown[]) => ({
  numPages: 2,
  getPage: async () => ({}),
  destroy: async () => {},
}));
const extractAllItemsMock = vi.fn(async (..._a: unknown[]) => [
  [{ str: 'Hi', x: 1, y: 1, width: 10, height: 10, angle: 0 }],
  [],
]);
const renderPreviewMock = vi.fn(async (..._a: unknown[]) => {});
const makeFontSwapPdfMock = vi.fn(async (..._a: unknown[]) => new Uint8Array([0x25, 0x50, 0x44, 0x46]));

vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...a: unknown[]) => downloadBlobMock(...a) };
});
vi.mock('@/lib/tools/reading-assets', () => ({
  openPdfDoc: (...a: unknown[]) => openPdfDocMock(...a),
  extractAllItems: (...a: unknown[]) => extractAllItemsMock(...a),
  renderFontSwapPreview: (...a: unknown[]) => renderPreviewMock(...a),
  makeFontSwapPdf: (...a: unknown[]) => makeFontSwapPdfMock(...a),
}));

import en from '../../messages/en.json';
import { PdfFontSwapTool } from '@/components/tools/pdf-dyslexia-tool';

const ui = en.tools.reading['pdf-dyslexia'].ui;

function pdfFile() {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46]) as BlobPart], 'doc.pdf', {
    type: 'application/pdf',
  });
}

beforeEach(() => {
  downloadBlobMock.mockReset();
  makeFontSwapPdfMock.mockClear();
  openPdfDocMock.mockClear();
  extractAllItemsMock.mockClear();
});

describe('PdfFontSwapTool', () => {
  it('shows the empty state, loads a PDF and exports the layout-preserving PDF', async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfFontSwapTool {...ui} />);

    expect(screen.getByText(ui.empty)).toBeInTheDocument();
    expect(screen.getByText(ui.note)).toBeInTheDocument();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, pdfFile());

    await waitFor(() => expect(openPdfDocMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(extractAllItemsMock).toHaveBeenCalledTimes(1));

    const downloadButton = screen.getByRole('button', { name: ui.downloadPdf });
    await waitFor(() => expect(downloadButton).toBeEnabled());
    await user.click(downloadButton);
    await waitFor(() => expect(makeFontSwapPdfMock).toHaveBeenCalledTimes(1));
    // Output filename derives from the input ('doc.pdf'), not a fixed name.
    expect(downloadBlobMock).toHaveBeenCalledWith(expect.any(Blob), 'dyslexia-doc.pdf');
    // Default export mode is the smooth flattened-image one.
    expect(makeFontSwapPdfMock.mock.calls[0]?.[4]).toBe('raster');
  });

  it('warns when the PDF text layer has corrupted ligatures, not on clean text', async () => {
    const user = userEvent.setup();
    // Real corruption pattern from a Pages/Quartz export ("ti" → "(", ",", "@").
    extractAllItemsMock.mockResolvedValueOnce([
      [
        {
          str: 'Descrip(on des ac,vités qui cons@tue l’ar@cle et la conserva@on',
          x: 1,
          y: 1,
          width: 10,
          height: 10,
          angle: 0,
        },
      ],
    ]);
    const { container } = render(<PdfFontSwapTool {...ui} />);
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, pdfFile());

    expect(await screen.findByText(ui.corruptWarning)).toBeInTheDocument();
  });

  it('does not warn on a clean text layer', async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfFontSwapTool {...ui} />);
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, pdfFile());
    await waitFor(() => expect(extractAllItemsMock).toHaveBeenCalledTimes(1));

    expect(screen.queryByText(ui.corruptWarning)).not.toBeInTheDocument();
  });

  it('exports selectable vector text when that mode is chosen', async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfFontSwapTool {...ui} />);
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, pdfFile());
    await waitFor(() => expect(extractAllItemsMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText(ui.exportModeVector));
    const downloadButton = screen.getByRole('button', { name: ui.downloadPdf });
    await waitFor(() => expect(downloadButton).toBeEnabled());
    await user.click(downloadButton);

    await waitFor(() => expect(makeFontSwapPdfMock).toHaveBeenCalledTimes(1));
    expect(makeFontSwapPdfMock.mock.calls[0]?.[4]).toBe('vector');
  });
});
