'use client';

import { useRef, type MouseEvent } from 'react';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';
import { usePdfPageCount } from '@/lib/hooks/use-pdf-page-count';
import { PdfThumbnail } from '@/components/ui/pdf-thumbnail';

type Props = {
  file: File;
  thumbnailWidth?: number;
  selectable?: boolean;
  selected?: Set<number>;
  onSelectionChange?: (s: Set<number>) => void;
  renderPageOverlay?: (pageIndex: number) => React.ReactNode;
  pageTransform?: (pageIndex: number) => string | undefined;
  loadingLabel: string;
  errorLabel: string;
  pageLabelTemplate: string;
  className?: string;
};

export function PdfPagesGrid({
  file,
  thumbnailWidth = 96,
  selectable = false,
  selected,
  onSelectionChange,
  renderPageOverlay,
  pageTransform,
  loadingLabel,
  errorLabel,
  pageLabelTemplate,
  className,
}: Props) {
  const { pageCount, loading, error } = usePdfPageCount(file);
  const anchorRef = useRef<number | null>(null);

  if (loading) {
    return (
      <p className="text-xs font-mono uppercase tracking-wider text-text-faint">{loadingLabel}</p>
    );
  }
  if (error || pageCount === null) {
    return <p className="text-sm text-danger">{errorLabel}</p>;
  }

  const togglePage = (page: number, shiftKey: boolean) => {
    if (!selectable || !onSelectionChange) return;
    const current = new Set(selected ?? []);
    if (shiftKey && anchorRef.current !== null) {
      const [from, to] = anchorRef.current <= page
        ? [anchorRef.current, page]
        : [page, anchorRef.current];
      for (let i = from; i <= to; i++) current.add(i);
    } else {
      if (current.has(page)) current.delete(page);
      else current.add(page);
      anchorRef.current = page;
    }
    onSelectionChange(current);
  };

  return (
    <div
      className={cn(
        'grid gap-3',
        'grid-cols-[repeat(auto-fill,minmax(var(--min,96px),1fr))]',
        className,
      )}
      style={{ ['--min' as never]: `${thumbnailWidth}px` }}
    >
      {Array.from({ length: pageCount }, (_, i) => {
        const pageNum = i + 1;
        const isSelected = selected?.has(pageNum) ?? false;
        const transform = pageTransform?.(pageNum);
        const onClick = (e: MouseEvent<HTMLButtonElement>) => togglePage(pageNum, e.shiftKey);
        return (
          <button
            key={pageNum}
            type="button"
            aria-label={tpl(pageLabelTemplate, { n: pageNum })}
            aria-pressed={selectable ? isSelected : undefined}
            onClick={onClick}
            className={cn(
              'relative group flex flex-col items-center gap-1 p-1.5 rounded border transition-colors',
              isSelected
                ? 'border-accent bg-accent/10'
                : 'border-transparent hover:border-border',
              !selectable && 'cursor-default',
            )}
          >
            <div
              className="transition-transform duration-200"
              style={{ transform }}
            >
              <PdfThumbnail
                file={file}
                pageIndex={pageNum}
                maxWidth={thumbnailWidth}
                loadingLabel={loadingLabel}
                errorLabel={errorLabel}
              />
            </div>
            {renderPageOverlay && (
              <div className="absolute top-2 right-2 z-10 pointer-events-auto">
                {renderPageOverlay(pageNum)}
              </div>
            )}
            <span className="font-mono text-[10px] text-text-faint">{pageNum}</span>
          </button>
        );
      })}
    </div>
  );
}
