'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PdfPagesGrid } from '@/components/ui/pdf-pages-grid';
import { usePdfPageCount } from '@/lib/hooks/use-pdf-page-count';
import { rotatePdf, type RotationAngle } from '@/lib/tools/implementations/pdf-rotate';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  rotateButton: string;
  pageLabelTemplate: string;
  rotatePageLabelTemplate: string;
  rotateAll90: string;
  rotateAll180: string;
  rotateAll270: string;
  resetAll: string;
  busy: string;
  error: string;
  removeFile: string;
  previewLoading: string;
  previewError: string;
};

type Angle = 0 | 90 | 180 | 270;
const NEXT: Record<Angle, Angle> = {
  0: 90,
  90: 180,
  180: 270,
  270: 0,
};

export function PdfRotateTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [angles, setAngles] = useState<Record<number, RotationAngle>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const { pageCount } = usePdfPageCount(file);

  const hasAnyRotation = Object.keys(angles).length > 0;

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (!arr[0]) return;
    setFile(arr[0]);
    setAngles({});
    setError(null);
  };

  const cyclePage = (page: number) => {
    setAngles((prev) => {
      const current = (prev[page] ?? 0) as Angle;
      const next = NEXT[current];
      const updated = { ...prev };
      if (next === 0) delete updated[page];
      else updated[page] = next;
      return updated;
    });
  };

  const setAllPagesTo = (angle: Angle) => {
    if (!pageCount) return;
    if (angle === 0) {
      setAngles({});
      return;
    }
    const next: Record<number, RotationAngle> = {};
    for (let i = 1; i <= pageCount; i++) next[i] = angle;
    setAngles(next);
  };

  const onRotate = async () => {
    if (!file || !hasAnyRotation || busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await rotatePdf(file, { perPage: angles });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      downloadBlob(blob, outputName('rotated', [file.name], 'pdf'));
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  const angleFor = (page: number): Angle => (angles[page] ?? 0) as Angle;

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn('p-6 border-2 border-dashed transition-colors', dragging ? 'border-accent bg-surface-hover' : 'border-border')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input ref={inputRef} id={inputId} type="file" accept="application/pdf" aria-label={messages.selectButton} className="sr-only" onChange={(e) => onPick(e.target.files)} />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectButton}</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input ref={inputRef} id={inputId} type="file" accept="application/pdf" aria-label={messages.selectButton} className="sr-only" onChange={(e) => onPick(e.target.files)} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => { setFile(null); setAngles({}); }} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </div>
            <PdfPagesGrid
              file={file}
              loadingLabel={messages.previewLoading}
              errorLabel={messages.previewError}
              pageLabelTemplate={messages.pageLabelTemplate}
              pageTransform={(p) => {
                const angle = angleFor(p);
                return angle === 0 ? undefined : `rotate(${angle}deg)`;
              }}
              renderPageOverlay={(p) => (
                <button
                  type="button"
                  aria-label={tpl(messages.rotatePageLabelTemplate, { n: p })}
                  onClick={(e) => { e.stopPropagation(); cyclePage(p); }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 border border-border text-text-primary text-xs hover:bg-accent hover:text-accent-fg hover:border-accent transition-colors"
                >
                  ↻
                </button>
              )}
            />
          </div>
        )}
      </Card>

      {file && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-faint mr-1">↻</span>
          <Button variant="subtle" size="sm" onClick={() => setAllPagesTo(90)}>{messages.rotateAll90}</Button>
          <Button variant="subtle" size="sm" onClick={() => setAllPagesTo(180)}>{messages.rotateAll180}</Button>
          <Button variant="subtle" size="sm" onClick={() => setAllPagesTo(270)}>{messages.rotateAll270}</Button>
          <Button variant="ghost" size="sm" onClick={() => setAllPagesTo(0)}>{messages.resetAll}</Button>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button onClick={onRotate} disabled={!file || !hasAnyRotation || busy}>
          {busy ? messages.busy : messages.rotateButton}
        </Button>
      </div>
    </div>
  );
}
