'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob, formatBytes } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import type { ToolOutput } from '@/lib/hooks/use-tool-result';
import { compareSizes } from '@/lib/tools/size-delta';
import { tpl } from '@/lib/tpl';

export type ToolResultMessages = {
  heading: string;
  download: string;
  retry: string;
  originalLabel: string;
  outputLabel: string;
  smaller: string;
  larger: string;
  same: string;
  ready: string;
};

type Props = {
  result: ToolOutput;
  kind: 'video' | 'audio' | 'image';
  // Omit when there is no single source file to compare against (merges, or a
  // generated file with no input); the panel then shows the output size alone.
  sourceBytes?: number | undefined;
  messages: ToolResultMessages;
  onRetry: () => void;
};

// The panel a heavy tool shows once its pipeline finishes, in place of firing a
// download the user never asked for.
//
// It exists because an ffmpeg run costs minutes: dropping the file straight into
// ~/Downloads leaves the user with no way to judge the output without leaving
// the browser, and no way to try another preset without redoing everything.
// Playing the result, stating the size change, and keeping the source file
// loaded behind "retry" turns that dead end into a loop.
export function ToolResult({ result, kind, sourceBytes, messages, onRetry }: Props) {
  const url = useBlobUrl(result.blob);
  const comparison = sourceBytes === undefined ? null : compareSizes(sourceBytes, result.blob.size);

  const deltaText =
    comparison === null
      ? null
      : comparison.direction === 'same'
        ? messages.same
        : tpl(comparison.direction === 'smaller' ? messages.smaller : messages.larger, {
            percent: comparison.percent,
          });

  return (
    <Card className="flex flex-col gap-3 p-4" role="status" aria-live="polite">
      <span className="sr-only">{messages.ready}</span>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-text-primary">{messages.heading}</h2>
        <p className="truncate font-mono text-xs text-text-faint">{result.filename}</p>
      </div>

      {url && <ResultPreview kind={kind} url={url} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs">
          {sourceBytes !== undefined && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-text-faint">{messages.originalLabel}</dt>
              <dd className="text-text-muted line-through">{formatBytes(sourceBytes)}</dd>
            </div>
          )}
          <div className="flex items-baseline gap-1.5">
            <dt className="text-text-faint">{messages.outputLabel}</dt>
            <dd className="text-text-primary">{formatBytes(result.blob.size)}</dd>
          </div>
          {deltaText && (
            <span
              className={
                comparison?.direction === 'smaller'
                  ? 'rounded px-1.5 py-0.5 text-[11px] text-accent'
                  : 'rounded px-1.5 py-0.5 text-[11px] text-text-muted'
              }
            >
              {deltaText}
            </span>
          )}
        </dl>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {messages.retry}
          </Button>
          <Button size="sm" onClick={() => downloadBlob(result.blob, result.filename)}>
            {messages.download}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ResultPreview({ kind, url }: { kind: Props['kind']; url: string }) {
  if (kind === 'audio') {
    return <audio src={url} controls preload="metadata" className="w-full" />;
  }
  if (kind === 'image') {
    return (
      // Plain <img>: the source is an object URL for a blob produced in-page,
      // which next/image cannot optimise anyway.
      <img
        src={url}
        alt=""
        className="max-h-72 w-full rounded-md border border-border object-contain"
      />
    );
  }
  return (
    <video src={url} controls className="max-h-72 w-full rounded-md border border-border bg-black" />
  );
}
