'use client';

import { tpl } from '@/lib/tpl';
import { PdfThumbnail } from '@/components/ui/pdf-thumbnail';
import { usePdfPageCount } from '@/lib/hooks/use-pdf-page-count';

type CommonOverlay = {
  opacity: number;
  angle: number;
};

type TextOverlay = CommonOverlay & {
  kind: 'text';
  text: string;
  fontSize: number;
};

type ImageOverlay = CommonOverlay & {
  kind: 'image';
  imageUrl: string | null;
  scale: number;
};

type Props = {
  file: File;
  thumbnailWidth?: number;
  overlay: TextOverlay | ImageOverlay;
  loadingLabel: string;
  errorLabel: string;
  pageLabelTemplate: string;
};

const ASSUMED_PAGE_PT_WIDTH = 612;

export function PdfWatermarkPreview({
  file,
  thumbnailWidth = 220,
  overlay,
  loadingLabel,
  errorLabel,
  pageLabelTemplate,
}: Props) {
  const { pageCount, loading, error } = usePdfPageCount(file);

  if (loading) {
    return (
      <p className="text-xs font-mono uppercase tracking-wider text-text-faint">{loadingLabel}</p>
    );
  }
  if (error || pageCount === null) {
    return <p className="text-sm text-danger">{errorLabel}</p>;
  }

  const ratio = thumbnailWidth / ASSUMED_PAGE_PT_WIDTH;
  const overlayStyle: React.CSSProperties = {
    transform: `rotate(${overlay.angle}deg)`,
    opacity: overlay.opacity,
  };

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {Array.from({ length: pageCount }, (_, i) => {
        const pageNum = i + 1;
        return (
          <div
            key={pageNum}
            aria-label={tpl(pageLabelTemplate, { n: pageNum })}
            className="relative flex flex-col items-center gap-1 p-1.5 rounded border border-transparent"
          >
            <div className="relative">
              <PdfThumbnail
                file={file}
                pageIndex={pageNum}
                maxWidth={thumbnailWidth}
                loadingLabel={loadingLabel}
                errorLabel={errorLabel}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                {overlay.kind === 'text' ? (
                  <span
                    style={{
                      ...overlayStyle,
                      color: 'rgb(64,64,64)',
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      fontSize: `${Math.max(6, overlay.fontSize * ratio)}px`,
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}
                  >
                    {overlay.text}
                  </span>
                ) : overlay.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={overlay.imageUrl}
                    alt=""
                    style={{
                      ...overlayStyle,
                      width: `${overlay.scale * 100}%`,
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                ) : null}
              </div>
            </div>
            <span className="font-mono text-[10px] text-text-faint">{pageNum}</span>
          </div>
        );
      })}
    </div>
  );
}
