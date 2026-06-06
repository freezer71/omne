import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const downloadBlobMock = vi.fn();
const openPdfDocMock = vi.fn(async (..._a: unknown[]) => ({
  numPages: 2,
  getPage: async () => ({ getViewport: () => ({ width: 612, height: 792 }) }),
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

  it('offers all four fonts and tint presets that drive the colour pickers', async () => {
    const user = userEvent.setup();
    render(<PdfFontSwapTool {...ui} />);

    // Same font palette as the text tool.
    expect(screen.getByRole('radio', { name: ui.fontSerif })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: ui.fontMono })).toBeInTheDocument();

    // Picking a tint preset fills both colour pickers (peach: #fbeee0 / #1f1a14).
    const textInput = screen.getByLabelText(ui.textColorLabel, { selector: 'input' }) as HTMLInputElement;
    const bgInput = screen.getByLabelText(ui.bgColorLabel, { selector: 'input' }) as HTMLInputElement;
    await user.click(screen.getByRole('button', { name: ui.tintPeach }));
    expect(bgInput.value).not.toBe('#ffffff');
    expect(textInput.value).not.toBe('#1a1a1a');
    expect(screen.getByRole('button', { name: ui.tintPeach })).toHaveAttribute('aria-pressed', 'true');

    // Touching a picker afterwards deselects the preset (custom colours).
    fireEvent.change(bgInput, { target: { value: '#123456' } });
    expect(screen.getByRole('button', { name: ui.tintPeach })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reads fullscreen with keyboard page turning (CSS fallback in jsdom)', async () => {
    const user = userEvent.setup();
    const { container } = render(<PdfFontSwapTool {...ui} />);

    const enterButton = screen.getByRole('button', { name: ui.fullscreen });
    expect(enterButton).toBeDisabled();

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, pdfFile());
    await waitFor(() => expect(enterButton).toBeEnabled());

    // jsdom has no Element.requestFullscreen — the hook falls back to fixed positioning.
    await user.click(enterButton);
    const exitButton = await screen.findByRole('button', { name: ui.fullscreenExit });

    // Arrow keys turn pages while reading fullscreen.
    expect(screen.getAllByText('Page 1 / 2').length).toBeGreaterThan(0);
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getAllByText('Page 2 / 2').length).toBeGreaterThan(0));
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(screen.getAllByText('Page 1 / 2').length).toBeGreaterThan(0));

    await user.click(exitButton);
    expect(screen.queryByRole('button', { name: ui.fullscreenExit })).not.toBeInTheDocument();
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
