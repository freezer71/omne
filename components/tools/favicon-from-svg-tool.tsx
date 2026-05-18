'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SvgSourceInput } from '@/components/tools/svg-source-input';
import { rasterizeSvgToCanvas } from '@/lib/tools/implementations/svg-to-png';
import { generateFaviconZip } from '@/lib/tools/implementations/favicon-from-svg';
import { downloadBlob, outputName } from '@/lib/file-utils';

type Messages = {
  pasteLabel: string;
  selectButton: string;
  dropLabel: string;
  empty: string;
  appNameLabel: string;
  previewLabel: string;
  previewLargeLabel: string;
  previewSmallLabel: string;
  downloadButton: string;
  includesLabel: string;
  busy: string;
  error: string;
};

const PREVIEW_LARGE = 64;
const PREVIEW_SMALL = 16;

export function FaviconFromSvgTool(messages: Messages) {
  const largeCanvasRef = useRef<HTMLCanvasElement>(null);
  const smallCanvasRef = useRef<HTMLCanvasElement>(null);

  const [markup, setMarkup] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [appName, setAppName] = useState('My App');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMarkup = markup.trim().length > 0;

  useEffect(() => {
    if (!hasMarkup) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      const renderAt = async (size: number, ref: React.RefObject<HTMLCanvasElement | null>) => {
        try {
          const offscreen = await rasterizeSvgToCanvas(markup, {
            width: size,
            height: size,
            background: null,
          });
          if (cancelled) return;
          const canvas = ref.current;
          if (!canvas) return;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(offscreen, 0, 0);
          }
        } catch {
          /* invalid markup while typing — silent */
        }
      };
      void renderAt(PREVIEW_LARGE, largeCanvasRef);
      void renderAt(PREVIEW_SMALL, smallCanvasRef);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [markup, hasMarkup]);

  const onPickFiles = (incoming: FileList | File[] | null) => {
    const first = Array.from(incoming ?? []).find(
      (f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'),
    );
    if (!first) return;
    setFileName(first.name);
    setError(null);
    void first.text().then((text) => setMarkup(text));
  };

  const onDownload = async () => {
    if (!hasMarkup || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await generateFaviconZip(markup, { appName });
      const name = outputName('favicon', [fileName ?? 'icon.svg'], 'zip');
      downloadBlob(blob, name);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SvgSourceInput
        markup={markup}
        onMarkupChange={setMarkup}
        onPickFiles={onPickFiles}
        messages={{
          pasteLabel: messages.pasteLabel,
          selectButton: messages.selectButton,
          dropLabel: messages.dropLabel,
          empty: messages.empty,
        }}
      />

      {hasMarkup ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[auto_auto_1fr]">
            <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-3">
              <span className="text-xs text-text-muted">{messages.previewLargeLabel}</span>
              <canvas
                ref={largeCanvasRef}
                width={PREVIEW_LARGE}
                height={PREVIEW_LARGE}
                className="rounded border border-border bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:8px_8px]"
              />
              <span className="font-mono text-[10px] text-text-faint">{PREVIEW_LARGE}px</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-3">
              <span className="text-xs text-text-muted">{messages.previewSmallLabel}</span>
              <canvas
                ref={smallCanvasRef}
                width={PREVIEW_SMALL}
                height={PREVIEW_SMALL}
                style={{ width: PREVIEW_SMALL, height: PREVIEW_SMALL, imageRendering: 'pixelated' }}
                className="rounded border border-border bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:4px_4px]"
              />
              <span className="font-mono text-[10px] text-text-faint">{PREVIEW_SMALL}px</span>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-1">
              <label className="flex flex-col gap-1.5 text-xs text-text-muted">
                {messages.appNameLabel}
                <input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
                />
              </label>
              <p className="text-xs text-text-faint">{messages.includesLabel}</p>
              <p className="font-mono text-[11px] text-text-faint">
                favicon.ico · favicon-16/32/48.png · apple-touch-icon.png · android-chrome-192/512.png · site.webmanifest
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button onClick={onDownload} disabled={busy || !hasMarkup}>
              {busy ? messages.busy : messages.downloadButton}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
