import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { PDFDocument } from 'pdf-lib';
import { usePdfPageCount } from '@/lib/hooks/use-pdf-page-count';

async function makePdfFile(pages: number, name = 'a.pdf'): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([100, 100]);
  const bytes = await doc.save();
  return new File([bytes as BlobPart], name, { type: 'application/pdf' });
}

describe('usePdfPageCount', () => {
  it('starts in loading state when a file is provided', async () => {
    const file = await makePdfFile(3);
    const { result } = renderHook(() => usePdfPageCount(file));
    expect(result.current.loading).toBe(true);
    expect(result.current.pageCount).toBeNull();
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('resolves to the actual page count', async () => {
    const file = await makePdfFile(7);
    const { result } = renderHook(() => usePdfPageCount(file));
    await waitFor(() => expect(result.current.pageCount).toBe(7));
    expect(result.current.error).toBe(false);
  });

  it('returns null page count and not-loading when no file is given', () => {
    const { result } = renderHook(() => usePdfPageCount(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.pageCount).toBeNull();
  });

  it('flags error when the input is not a valid PDF', async () => {
    const bad = new File([new Uint8Array([0x00, 0x01])], 'bad.pdf', { type: 'application/pdf' });
    const { result } = renderHook(() => usePdfPageCount(bad));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.pageCount).toBeNull();
  });
});
