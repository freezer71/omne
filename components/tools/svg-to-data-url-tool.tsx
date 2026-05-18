'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SvgSourceInput } from '@/components/tools/svg-source-input';
import { svgToDataUrl } from '@/lib/tools/implementations/svg-to-data-url';
import { formatBytes } from '@/lib/file-utils';

type Messages = {
  pasteLabel: string;
  selectButton: string;
  dropLabel: string;
  empty: string;
  base64Label: string;
  urlEncodedLabel: string;
  copyButton: string;
  copied: string;
  previewLabel: string;
  bytesLabel: string;
};

export function SvgToDataUrlTool(messages: Messages) {
  const [markup, setMarkup] = useState('');
  const [copied, setCopied] = useState<'b64' | 'url' | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const result = useMemo(() => svgToDataUrl(markup), [markup]);
  const hasMarkup = markup.trim().length > 0;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    const first = Array.from(incoming ?? []).find(
      (f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'),
    );
    if (!first) return;
    void first.text().then((text) => setMarkup(text));
  };

  const copy = (text: string, which: 'b64' | 'url') => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(which);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(null), 1400);
  };

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

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
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="flex flex-col gap-4">
            <ResultBlock
              label={messages.base64Label}
              value={result.base64}
              bytes={result.base64Bytes}
              bytesLabel={messages.bytesLabel}
              copyButton={messages.copyButton}
              copiedLabel={messages.copied}
              isCopied={copied === 'b64'}
              onCopy={() => copy(result.base64, 'b64')}
            />
            <ResultBlock
              label={messages.urlEncodedLabel}
              value={result.urlEncoded}
              bytes={result.urlEncodedBytes}
              bytesLabel={messages.bytesLabel}
              copyButton={messages.copyButton}
              copiedLabel={messages.copied}
              isCopied={copied === 'url'}
              onCopy={() => copy(result.urlEncoded, 'url')}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted">{messages.previewLabel}</span>
            {/* Using <img> for SVG data URL preview is intentional — Next/Image rejects data: URIs */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.base64}
              alt=""
              className="h-40 w-40 rounded-md border border-border bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:16px_16px] object-contain p-2"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultBlock({
  label,
  value,
  bytes,
  bytesLabel,
  copyButton,
  copiedLabel,
  isCopied,
  onCopy,
}: {
  label: string;
  value: string;
  bytes: number;
  bytesLabel: string;
  copyButton: string;
  copiedLabel: string;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="font-mono text-[11px] text-text-faint">
          {bytesLabel} {formatBytes(bytes)}
        </span>
      </div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 break-all rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-text-primary">
          {value}
        </code>
        <Button variant="subtle" size="sm" type="button" onClick={onCopy}>
          {isCopied ? copiedLabel : copyButton}
        </Button>
      </div>
    </div>
  );
}
