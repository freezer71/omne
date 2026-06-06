import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const downloadBlobMock = vi.fn();
const makeReadingPdfMock = vi.fn(async (..._args: unknown[]) => new Uint8Array([0x25, 0x50, 0x44, 0x46]));
const makeReadingHtmlMock = vi.fn(async (..._args: unknown[]) => '<html></html>');
const paragraphsFromFileExMock = vi.fn(
  async (..._args: unknown[]): Promise<{ paragraphs: string[]; source: string; corrupted: boolean }> => ({
    paragraphs: ['from file'],
    source: 'text',
    corrupted: false,
  }),
);

vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});
vi.mock('@/lib/tools/reading-assets', () => ({
  makeReadingPdf: (...args: unknown[]) => makeReadingPdfMock(...args),
  makeReadingHtml: (...args: unknown[]) => makeReadingHtmlMock(...args),
  paragraphsFromFile: vi.fn(async () => ['from file']),
  paragraphsFromFileEx: (...args: unknown[]) => paragraphsFromFileExMock(...args),
}));

import en from '../../messages/en.json';
import { ReadingDyslexiaTool } from '@/components/tools/reading-dyslexia-tool';
import { ReadingFocusTool } from '@/components/tools/reading-focus-tool';
import { ImmersiveReaderTool } from '@/components/tools/reading-immersive-tool';
import { ReadAloudTool } from '@/components/tools/reading-read-aloud-tool';

const reading = en.tools.reading;

beforeEach(() => {
  downloadBlobMock.mockReset();
  makeReadingPdfMock.mockClear();
  makeReadingHtmlMock.mockClear();
  paragraphsFromFileExMock.mockClear();
  paragraphsFromFileExMock.mockResolvedValue({
    paragraphs: ['from file'],
    source: 'text',
    corrupted: false,
  });
});

function pdfFile() {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46]) as BlobPart], 'doc.pdf', {
    type: 'application/pdf',
  });
}

describe('ReadingDyslexiaTool', () => {
  it('shows the empty state, previews the sample and exports a PDF', async () => {
    const user = userEvent.setup();
    render(<ReadingDyslexiaTool {...reading['dyslexia-font'].ui} />);

    expect(screen.getByText(reading['dyslexia-font'].ui.empty)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: reading['dyslexia-font'].ui.sampleButton }));
    expect(await screen.findByText(/Reading should feel easy/)).toBeInTheDocument();

    const pdfButton = screen.getByRole('button', { name: reading['dyslexia-font'].ui.downloadPdf });
    await waitFor(() => expect(pdfButton).toBeEnabled());
    await user.click(pdfButton);
    await waitFor(() => expect(makeReadingPdfMock).toHaveBeenCalledTimes(1));
    expect(downloadBlobMock).toHaveBeenCalled();
  });

  it('enters and leaves the fullscreen reading mode (CSS fallback in jsdom)', async () => {
    const ui = reading['dyslexia-font'].ui;
    const user = userEvent.setup();
    render(<ReadingDyslexiaTool {...ui} />);

    const enterButton = screen.getByRole('button', { name: ui.fullscreen });
    expect(enterButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: ui.sampleButton }));
    await waitFor(() => expect(enterButton).toBeEnabled());

    // jsdom has no Element.requestFullscreen — the hook falls back to fixed positioning.
    await user.click(enterButton);
    const exitButton = await screen.findByRole('button', { name: ui.fullscreenExit });
    const preview = screen.getByLabelText(ui.previewLabel);
    expect(preview.className).toContain('fixed inset-0');

    // A+ / A− adjust the type size without leaving the reading mode (default 19px).
    const textColumn = within(preview).getByText(/Reading should feel easy/).parentElement as HTMLElement;
    expect(textColumn.style.fontSize).toBe('19px');
    await user.click(screen.getByRole('button', { name: ui.fontLarger }));
    expect(textColumn.style.fontSize).toBe('21px');
    await user.click(screen.getByRole('button', { name: ui.fontSmaller }));
    expect(textColumn.style.fontSize).toBe('19px');

    await user.click(exitButton);
    expect(screen.queryByRole('button', { name: ui.fullscreenExit })).not.toBeInTheDocument();

    // Esc also leaves the fallback mode.
    await user.click(enterButton);
    await screen.findByRole('button', { name: ui.fullscreenExit });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: ui.fullscreenExit })).not.toBeInTheDocument();
  });
});

describe('ReadingFocusTool', () => {
  it('renders bold word-heads in the preview after loading the sample', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReadingFocusTool {...reading.focus.ui} />);

    await user.click(screen.getByRole('button', { name: reading.focus.ui.sampleButton }));
    await waitFor(() => expect(container.querySelectorAll('b').length).toBeGreaterThan(0));
  });
});

describe('ImmersiveReaderTool', () => {
  it('advances sentence by sentence', async () => {
    const user = userEvent.setup();
    render(<ImmersiveReaderTool {...reading.immersive.ui} />);

    await user.click(screen.getByRole('button', { name: reading.immersive.ui.sampleButton }));
    expect(await screen.findByText(/1 \/ \d+/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: reading.immersive.ui.next }));
    expect(await screen.findByText(/2 \/ \d+/)).toBeInTheDocument();
  });
});

describe('ReadAloudTool', () => {
  it('shows the unsupported message when speech synthesis is unavailable', async () => {
    render(<ReadAloudTool {...reading['read-aloud'].ui} />);
    expect(await screen.findByText(reading['read-aloud'].ui.unsupported)).toBeInTheDocument();
  });
});

describe('OCR fallback (corrupted PDF text layers)', () => {
  const ui = reading['dyslexia-font'].ui;

  it('shows the recovered-by-OCR notice and the OCR text', async () => {
    const user = userEvent.setup();
    paragraphsFromFileExMock.mockResolvedValue({
      paragraphs: ['Description des activités'],
      source: 'ocr',
      corrupted: true,
    });
    const { container } = render(<ReadingDyslexiaTool {...ui} />);

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, pdfFile());

    expect(await screen.findByText(ui.ocrDoneNotice)).toBeInTheDocument();
    expect(await screen.findByText('Description des activités')).toBeInTheDocument();
  });

  it('warns when the text layer is corrupt but OCR failed', async () => {
    const user = userEvent.setup();
    paragraphsFromFileExMock.mockResolvedValue({
      paragraphs: ['Descrip(on des ac,vités'],
      source: 'text',
      corrupted: true,
    });
    const { container } = render(<ReadingDyslexiaTool {...ui} />);

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, pdfFile());

    expect(await screen.findByText(ui.ocrFailedNotice)).toBeInTheDocument();
  });

  it('offers a manual re-read with OCR for imported PDFs', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReadingDyslexiaTool {...ui} />);

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, pdfFile());
    const forceButton = await screen.findByRole('button', { name: ui.forceOcrLabel });

    paragraphsFromFileExMock.mockClear();
    await user.click(forceButton);
    await waitFor(() => expect(paragraphsFromFileExMock).toHaveBeenCalledTimes(1));
    expect(paragraphsFromFileExMock.mock.calls[0]?.[1]).toMatchObject({ forceOcr: true });
  });
});
