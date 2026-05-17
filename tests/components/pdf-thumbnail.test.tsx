import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { renderMock, getPageMock, getDocumentMock } = vi.hoisted(() => {
  const renderMock = vi.fn(() => ({ promise: Promise.resolve() }));
  const getPageMock = vi.fn(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 200 * scale, height: 300 * scale }),
    render: renderMock,
  }));
  const getDocumentMock = vi.fn(() => ({
    promise: Promise.resolve({ getPage: getPageMock, numPages: 3 }),
  }));
  return { renderMock, getPageMock, getDocumentMock };
});

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
}));

import { PdfThumbnail } from '@/components/ui/pdf-thumbnail';

beforeEach(() => {
  renderMock.mockClear();
  getPageMock.mockClear();
  getDocumentMock.mockClear();
});

function pdfFile(name = 'a.pdf'): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: 'application/pdf' });
}

describe('PdfThumbnail', () => {
  it('renders a loading placeholder before the PDF resolves', () => {
    render(<PdfThumbnail file={pdfFile()} loadingLabel="Loading…" errorLabel="Failed" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('calls getDocument with the PDF bytes', async () => {
    render(<PdfThumbnail file={pdfFile()} loadingLabel="L" errorLabel="E" />);
    await waitFor(() => expect(getDocumentMock).toHaveBeenCalledOnce());
    const arg = (getDocumentMock.mock.calls[0] as unknown[])[0];
    expect(arg).toHaveProperty('data');
  });

  it('renders the requested page (1-based)', async () => {
    render(<PdfThumbnail file={pdfFile()} pageIndex={2} loadingLabel="L" errorLabel="E" />);
    await waitFor(() => expect(getPageMock).toHaveBeenCalledWith(2));
  });

  it('defaults to page 1 when no pageIndex given', async () => {
    render(<PdfThumbnail file={pdfFile()} loadingLabel="L" errorLabel="E" />);
    await waitFor(() => expect(getPageMock).toHaveBeenCalledWith(1));
  });

  it('renders the page to its canvas after load', async () => {
    render(<PdfThumbnail file={pdfFile()} loadingLabel="L" errorLabel="E" />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledOnce());
  });

  it('shows the error label if pdfjs throws', async () => {
    getDocumentMock.mockImplementationOnce(() => ({
      promise: Promise.reject(new Error('bad pdf')),
    }));
    render(<PdfThumbnail file={pdfFile()} loadingLabel="L" errorLabel="Failed to render" />);
    await waitFor(() => expect(screen.getByText('Failed to render')).toBeInTheDocument());
  });
});
