import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const downloadBlobMock = vi.fn();
const makeReadingPdfMock = vi.fn(async (..._args: unknown[]) => new Uint8Array([0x25, 0x50, 0x44, 0x46]));
const makeReadingHtmlMock = vi.fn(async (..._args: unknown[]) => '<html></html>');

vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});
vi.mock('@/lib/tools/reading-assets', () => ({
  makeReadingPdf: (...args: unknown[]) => makeReadingPdfMock(...args),
  makeReadingHtml: (...args: unknown[]) => makeReadingHtmlMock(...args),
  paragraphsFromFile: vi.fn(async () => ['from file']),
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
});

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
