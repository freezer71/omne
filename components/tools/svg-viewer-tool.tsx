'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { inspectSvg, tokenizeSvg } from '@/lib/tools/implementations/svg-viewer';
import { formatBytes } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  pasteLabel: string;
  dropLabel: string;
  empty: string;
  sourceLabel: string;
  infoLabel: string;
  widthLabel: string;
  heightLabel: string;
  viewBoxLabel: string;
  elementsLabel: string;
  sizeLabel: string;
  previewLabel: string;
  copyButton: string;
  copied: string;
  error: string;
};

function buildSrcDoc(markup: string): string {
  return `<!doctype html><html><head><style>html,body{margin:0;height:100%;background:transparent}body{display:flex;align-items:center;justify-content:center;padding:8px}svg{max-width:100%;max-height:100%;height:auto;width:auto}</style></head><body>${markup}</body></html>`;
}

export function SvgViewerTool(messages: Messages) {
  const [markup, setMarkup] = useState('');
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const info = useMemo(() => inspectSvg(markup), [markup]);
  const tokens = useMemo(() => (markup ? tokenizeSvg(markup) : []), [markup]);
  const srcDoc = useMemo(() => (markup ? buildSrcDoc(markup) : ''), [markup]);
  const hasMarkup = markup.trim().length > 0;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    const first = Array.from(incoming ?? []).find(
      (f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'),
    );
    if (!first) return;
    void first.text().then((text) => setMarkup(text));
  };

  const copySource = () => {
    if (!markup) return;
    void navigator.clipboard.writeText(markup);
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(false), 1400);
  };

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          'p-6 border-2 border-dashed transition-colors',
          dragging ? 'border-accent bg-surface-hover' : 'border-border',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPickFiles(e.dataTransfer.files);
        }}
      >
        <label className="flex flex-col gap-2 text-xs text-text-muted">
          {messages.pasteLabel}
          <textarea
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            placeholder={messages.empty}
            spellCheck={false}
            className="min-h-32 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary"
          />
          <span className="text-text-faint">{messages.dropLabel}</span>
        </label>
      </Card>

      {hasMarkup ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-text-muted">{messages.previewLabel}</span>
            <iframe
              key={srcDoc.length}
              srcDoc={srcDoc}
              sandbox=""
              title={messages.previewLabel}
              className="h-72 w-full rounded-md border border-border bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:16px_16px]"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">{messages.sourceLabel}</span>
              <Button variant="subtle" size="sm" type="button" onClick={copySource}>
                {copied ? messages.copied : messages.copyButton}
              </Button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-text-primary">
              {tokens.map((t, i) => (
                <span
                  key={i}
                  className={cn(
                    t.type === 'tag' && 'text-accent',
                    t.type === 'attr' && 'text-text-muted',
                    t.type === 'string' && 'text-success',
                    t.type === 'comment' && 'text-text-faint italic',
                  )}
                >
                  {t.value}
                </span>
              ))}
            </pre>
          </div>
          <aside className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
            <span className="text-xs text-text-muted">{messages.infoLabel}</span>
            <InfoRow label={messages.widthLabel} value={info.width !== null ? `${info.width}` : '—'} />
            <InfoRow label={messages.heightLabel} value={info.height !== null ? `${info.height}` : '—'} />
            <InfoRow label={messages.viewBoxLabel} value={info.viewBox ?? '—'} mono />
            <InfoRow label={messages.elementsLabel} value={`${info.elementCount}`} />
            <InfoRow label={messages.sizeLabel} value={formatBytes(info.bytes)} mono />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-text-faint">{label}</span>
      <span className={cn('truncate text-xs text-text-primary', mono && 'font-mono')}>{value}</span>
    </div>
  );
}
