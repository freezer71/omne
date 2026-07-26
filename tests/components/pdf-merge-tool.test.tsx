import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mergePdfs = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/pdf-merge', () => ({
  mergePdfs: (...args: unknown[]) => mergePdfs(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { PdfMergeTool } from '@/components/tools/pdf-merge-tool';

vi.mock('@/components/ui/pdf-thumbnail', () => ({
  PdfThumbnail: () => <div data-testid="thumb" />,
}));
vi.mock('@/components/ui/pdf-pages-grid', () => ({
  PdfPagesGrid: () => <div data-testid="pages-grid" />,
}));

const messages = {
  selectButton: 'Select PDFs',
  empty: 'Drop PDFs here.',
  mergeButton: 'Merge PDFs',
  removeFile: 'Remove',
  moveUp: 'Move up',
  moveDown: 'Move down',
  dragHandle: 'Drag to reorder',
  busy: 'Merging…',
  error: 'Something went wrong.',
  previewLoading: 'Loading',
  previewError: 'Failed',
  pageLabelTemplate: 'Page {n}',
  filesCountSingular: '{n} file',
  filesCountPlural: '{n} files',
};

// jsdom has no DataTransfer; the component only needs setData/effectAllowed.
function makeDataTransfer() {
  return { setData: () => {}, getData: () => '', effectAllowed: '' };
}

function pdfFile(name: string): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: 'application/pdf' });
}

beforeEach(() => {
  mergePdfs.mockReset();
  downloadBlob.mockReset();
});

describe('PdfMergeTool', () => {
  it('renders the empty state initially', () => {
    render(<PdfMergeTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.mergeButton })).toBeDisabled();
  });

  it('disables Merge with a single file (needs at least 2)', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, pdfFile('a.pdf'));
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.mergeButton })).toBeDisabled();
  });

  it('enables Merge once 2 files are selected', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    expect(screen.getByRole('button', { name: messages.mergeButton })).toBeEnabled();
  });

  it('calls mergePdfs and downloads the result with the correct name', async () => {
    const user = userEvent.setup();
    mergePdfs.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('report.pdf'), pdfFile('appendix.pdf')]);
    await user.click(screen.getByRole('button', { name: messages.mergeButton }));
    expect(mergePdfs).toHaveBeenCalledOnce();
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('merged-report.pdf');
  });

  it('allows removing a file from the list', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    const removeButtons = screen.getAllByRole('button', { name: messages.removeFile });
    await user.click(removeButtons[0]!);
    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  it('renders the localized file count (singular and plural)', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, pdfFile('a.pdf'));
    expect(screen.getByText('1 file')).toBeInTheDocument();
    await user.upload(input, pdfFile('b.pdf'));
    expect(screen.getByText('2 files')).toBeInTheDocument();
  });

  it('reorders files via move up / move down', async () => {
    const user = userEvent.setup();
    mergePdfs.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('a.pdf'), pdfFile('b.pdf'), pdfFile('c.pdf')]);

    // First row's "move up" is disabled, last row's "move down" is disabled.
    const moveUpButtons = screen.getAllByRole('button', { name: messages.moveUp });
    const moveDownButtons = screen.getAllByRole('button', { name: messages.moveDown });
    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled();

    // Move "c.pdf" up twice → order becomes c, a, b.
    await user.click(moveUpButtons[2]!);
    await user.click(screen.getAllByRole('button', { name: messages.moveUp })[1]!);
    await user.click(screen.getByRole('button', { name: messages.mergeButton }));
    const passed = mergePdfs.mock.calls[0]![0] as File[];
    expect(passed.map((f) => f.name)).toEqual(['c.pdf', 'a.pdf', 'b.pdf']);
  });

  it('reorders files by dragging a row onto another', async () => {
    const user = userEvent.setup();
    mergePdfs.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    render(<PdfMergeTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), [
      pdfFile('a.pdf'),
      pdfFile('b.pdf'),
      pdfFile('c.pdf'),
    ]);

    const rows = screen.getAllByRole('listitem');
    const handles = rows.map((row) => {
      const handle = row.querySelector('[draggable="true"]');
      if (!handle) throw new Error('row has no drag handle');
      return handle;
    });

    // Drag the last file onto the first row.
    fireEvent.dragStart(handles[2]!, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(rows[0]!, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(rows[0]!, { dataTransfer: makeDataTransfer() });

    await user.click(screen.getByRole('button', { name: messages.mergeButton }));
    const passed = mergePdfs.mock.calls[0]![0] as File[];
    expect(passed.map((f) => f.name)).toEqual(['c.pdf', 'a.pdf', 'b.pdf']);
  });

  it('ignores a drop that did not start from a row, so a stray file drop cannot shuffle the list', async () => {
    const user = userEvent.setup();
    mergePdfs.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    render(<PdfMergeTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), [
      pdfFile('a.pdf'),
      pdfFile('b.pdf'),
    ]);

    const rows = screen.getAllByRole('listitem');
    fireEvent.drop(rows[0]!, { dataTransfer: makeDataTransfer() });

    await user.click(screen.getByRole('button', { name: messages.mergeButton }));
    const passed = mergePdfs.mock.calls[0]![0] as File[];
    expect(passed.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('keeps the buttons as the keyboard path, since native drag is pointer-only', async () => {
    const user = userEvent.setup();
    render(<PdfMergeTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), [
      pdfFile('a.pdf'),
      pdfFile('b.pdf'),
    ]);
    expect(screen.getAllByRole('button', { name: messages.moveUp })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: messages.moveDown })).toHaveLength(2);
    // The handle is decorative: it must not add a second, unusable tab stop.
    expect(document.querySelector('[draggable="true"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows an error if merge fails', async () => {
    const user = userEvent.setup();
    mergePdfs.mockRejectedValue(new Error('boom'));
    render(<PdfMergeTool {...messages} />);
    const input = screen.getByLabelText(messages.selectButton);
    await user.upload(input, [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    await user.click(screen.getByRole('button', { name: messages.mergeButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
