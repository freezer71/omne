'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SvgSourceInput } from '@/components/tools/svg-source-input';
import { optimizeSvg } from '@/lib/tools/implementations/svg-optimize';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';

type Messages = {
  pasteLabel: string;
  selectButton: string;
  dropLabel: string;
  empty: string;
  precisionLabel: string;
  cleanupIdsLabel: string;
  removeViewBoxLabel: string;
  multipassLabel: string;
  beforeLabel: string;
  afterLabel: string;
  savingsLabel: string;
  downloadButton: string;
  copyButton: string;
  copied: string;
  busy: string;
  error: string;
};

function buildSrcDoc(markup: string): string {
  return `<!doctype html><html><head><style>html,body{margin:0;height:100%;background:transparent}body{display:flex;align-items:center;justify-content:center;padding:8px}svg{max-width:100%;max-height:100%;height:auto;width:auto}</style></head><body>${markup}</body></html>`;
}

export function SvgOptimizeTool(messages: Messages) {
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [markup, setMarkup] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [precision, setPrecision] = useState(3);
  const [cleanupIds, setCleanupIds] = useState(true);
  const [removeViewBox, setRemoveViewBox] = useState(false);
  const [multipass, setMultipass] = useState(false);
  const [optimized, setOptimized] = useState('');
  const [before, setBefore] = useState(0);
  const [after, setAfter] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasMarkup = markup.trim().length > 0;
  const savings = before > 0 ? Math.round((1 - after / before) * 100) : 0;

  const optionsKey = `${precision}|${cleanupIds}|${removeViewBox}|${multipass}`;

  // Reset the optimized output + sizes synchronously when markup is emptied
  // or when the user changes options/markup (so the user never sees stale
  // output while the debounced rerun is pending). Replaces the inline
  // setState-in-effect path. The sentinel initial value (`__init__`) makes
  // the first render with markup also flip `busy` on, mirroring the original
  // effect's setBusy(true) on every run.
  const runKey = `${markup}|${optionsKey}`;
  const [trackedRunKey, setTrackedRunKey] = useState<string>('__init__');
  if (trackedRunKey !== runKey) {
    setTrackedRunKey(runKey);
    if (!hasMarkup) {
      setOptimized('');
      setBefore(0);
      setAfter(0);
    } else {
      setBusy(true);
    }
  }

  useEffect(() => {
    if (!hasMarkup) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void optimizeSvg(markup, { precision, cleanupIds, removeViewBox, multipass })
        .then((r) => {
          if (cancelled) return;
          setOptimized(r.data);
          setBefore(r.before);
          setAfter(r.after);
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setError(messages.error);
          setOptimized('');
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup, optionsKey, hasMarkup]);

  const beforeSrcDoc = useMemo(() => (hasMarkup ? buildSrcDoc(markup) : ''), [markup, hasMarkup]);
  const afterSrcDoc = useMemo(() => (optimized ? buildSrcDoc(optimized) : ''), [optimized]);

  const onPickFiles = (incoming: FileList | File[] | null) => {
    const first = Array.from(incoming ?? []).find(
      (f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'),
    );
    if (!first) return;
    setFileName(first.name);
    setError(null);
    void first.text().then((text) => setMarkup(text));
  };

  const onCopy = () => {
    if (!optimized) return;
    void navigator.clipboard.writeText(optimized);
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(false), 1400);
  };

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const onDownload = () => {
    if (!optimized) return;
    const blob = new Blob([optimized], { type: 'image/svg+xml' });
    const name = outputName('optimized', [fileName ?? 'svg.svg'], 'svg');
    downloadBlob(blob, name);
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
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex flex-col gap-1.5 text-xs text-text-muted">
              {messages.precisionLabel}
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={precision}
                onChange={(e) => setPrecision(parseInt(e.target.value, 10))}
                className="w-32"
              />
              <span className="font-mono text-[11px] text-text-faint">{precision}</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={cleanupIds}
                onChange={(e) => setCleanupIds(e.target.checked)}
              />
              {messages.cleanupIdsLabel}
            </label>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={removeViewBox}
                onChange={(e) => setRemoveViewBox(e.target.checked)}
              />
              {messages.removeViewBoxLabel}
            </label>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={multipass}
                onChange={(e) => setMultipass(e.target.checked)}
              />
              {messages.multipassLabel}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{messages.beforeLabel}</span>
                <span className="font-mono text-[11px] text-text-faint">{formatBytes(before)}</span>
              </div>
              <iframe
                key={beforeSrcDoc.length}
                srcDoc={beforeSrcDoc}
                sandbox=""
                title={messages.beforeLabel}
                className="h-56 w-full rounded-md border border-border bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:16px_16px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{messages.afterLabel}</span>
                <span className="font-mono text-[11px] text-text-faint">
                  {formatBytes(after)} · {messages.savingsLabel} {savings}%
                </span>
              </div>
              <iframe
                key={afterSrcDoc.length || 'empty'}
                srcDoc={afterSrcDoc}
                sandbox=""
                title={messages.afterLabel}
                className="h-56 w-full rounded-md border border-border bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:16px_16px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {busy ? <span className="text-xs text-text-muted">{messages.busy}</span> : null}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button variant="subtle" size="sm" type="button" onClick={onCopy} disabled={!optimized}>
              {copied ? messages.copied : messages.copyButton}
            </Button>
            <Button onClick={onDownload} disabled={!optimized}>
              {messages.downloadButton}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
