import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';

vi.mock('@/components/ui/pdf-thumbnail', () => ({
  PdfThumbnail: ({ pageIndex }: { pageIndex?: number }) => (
    <div data-testid={`thumb-${pageIndex ?? 1}`} />
  ),
}));

import { PdfPagesGrid } from '@/components/ui/pdf-pages-grid';

async function makePdfFile(pages: number): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([100, 100]);
  const bytes = await doc.save();
  return new File([bytes as BlobPart], 'doc.pdf', { type: 'application/pdf' });
}

const baseProps = {
  loadingLabel: 'L',
  errorLabel: 'E',
  pageLabel: (n: number) => `Page ${n}`,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PdfPagesGrid', () => {
  it('renders N thumbnails after page count loads', async () => {
    const file = await makePdfFile(4);
    render(<PdfPagesGrid file={file} {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('thumb-1')).toBeInTheDocument());
    expect(screen.getByTestId('thumb-2')).toBeInTheDocument();
    expect(screen.getByTestId('thumb-3')).toBeInTheDocument();
    expect(screen.getByTestId('thumb-4')).toBeInTheDocument();
  });

  it('exposes ARIA labels via pageLabel for each page wrapper', async () => {
    const file = await makePdfFile(3);
    render(<PdfPagesGrid file={file} {...baseProps} />);
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toBeInTheDocument());
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
  });

  it('renders a per-page overlay when renderPageOverlay is provided', async () => {
    const file = await makePdfFile(2);
    render(
      <PdfPagesGrid
        file={file}
        {...baseProps}
        renderPageOverlay={(n) => <span data-testid={`overlay-${n}`}>↻</span>}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('overlay-1')).toBeInTheDocument());
    expect(screen.getByTestId('overlay-2')).toBeInTheDocument();
  });

  it('toggles selection on click when selectable=true', async () => {
    const file = await makePdfFile(3);
    const onSelectionChange = vi.fn();
    render(
      <PdfPagesGrid
        file={file}
        {...baseProps}
        selectable
        selected={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText('Page 2')).toBeInTheDocument());
    await user.click(screen.getByLabelText('Page 2'));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([2]));
  });

  it('shift-click extends the selection to a range from the last clicked page', async () => {
    const file = await makePdfFile(5);
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <PdfPagesGrid
        file={file}
        {...baseProps}
        selectable
        selected={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText('Page 2')).toBeInTheDocument());
    await user.click(screen.getByLabelText('Page 2'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set([2]));
    rerender(
      <PdfPagesGrid
        file={file}
        {...baseProps}
        selectable
        selected={new Set([2])}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.keyboard('{Shift>}');
    await user.click(screen.getByLabelText('Page 4'));
    await user.keyboard('{/Shift}');
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set([2, 3, 4]));
  });

  it('reflects current selection state with aria-pressed on each page', async () => {
    const file = await makePdfFile(3);
    render(
      <PdfPagesGrid
        file={file}
        {...baseProps}
        selectable
        selected={new Set([2])}
        onSelectionChange={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText('Page 1')).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByLabelText('Page 2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Page 3')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows an error message if the file is not a valid PDF', async () => {
    const bad = new File([new Uint8Array([0x00])], 'bad.pdf', { type: 'application/pdf' });
    render(<PdfPagesGrid file={bad} {...baseProps} errorLabel="Bad PDF" />);
    await waitFor(() => expect(screen.getByText('Bad PDF')).toBeInTheDocument());
  });
});
