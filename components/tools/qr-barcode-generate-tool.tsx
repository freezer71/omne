'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { buildBarcodeSvg, DEFAULT_BARCODE_OPTIONS, type BarcodeFormat } from '@/lib/tools/implementations/qr-barcode-generate';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  format: string;
  formatCode128: string;
  formatEan13: string;
  formatEan8: string;
  valueLabel: string;
  valuePlaceholder: string;
  invalid: string;
  preview: string;
  heightLabel: string;
  moduleWidthLabel: string;
  showText: string;
  downloadSvg: string;
  copySvg: string;
  copied: string;
};

export function QrBarcodeGenerateTool(messages: Messages) {
  const [format, setFormat] = useState<BarcodeFormat>('code128');
  const [value, setValue] = useState('OMNE-2026');
  const [height, setHeight] = useState(80);
  const [moduleWidth, setModuleWidth] = useState(2);
  const [showText, setShowText] = useState(true);

  const result = useMemo(() => {
    return buildBarcodeSvg(format, value, { ...DEFAULT_BARCODE_OPTIONS, height, moduleWidth, showText });
  }, [format, value, height, moduleWidth, showText]);

  const onDownload = () => {
    if (!result.svg) return;
    downloadBlob(new Blob([result.svg], { type: 'image/svg+xml' }), `barcode-${format}.svg`);
  };

  const labelFor: Record<BarcodeFormat, string> = {
    code128: messages.formatCode128,
    ean13: messages.formatEan13,
    ean8: messages.formatEan8,
  };

  const placeholder = format === 'code128' ? messages.valuePlaceholder : format === 'ean13' ? '12 digits…' : '7 digits…';

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.format}</legend>
        {(['code128', 'ean13', 'ean8'] as const).map((v) => (
          <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${format === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
            <input type="radio" name="format" value={v} checked={format === v} onChange={() => setFormat(v)} className="sr-only" />
            {labelFor[v]}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1.5 text-xs text-text-muted">
        {messages.valueLabel}
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
          className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint" />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.heightLabel}
          <input type="number" min="40" max="200" value={height} onChange={(e) => setHeight(Math.max(40, Math.min(200, parseInt(e.target.value || '80', 10))))} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.moduleWidthLabel}
          <input type="number" min="1" max="6" value={moduleWidth} onChange={(e) => setModuleWidth(Math.max(1, Math.min(6, parseInt(e.target.value || '2', 10))))} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
          {messages.showText}
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.preview}</label>
        {result.valid && result.svg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Card className="flex items-center justify-center p-6">
            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(result.svg)}`} alt={messages.preview} className="max-w-full" />
          </Card>
        ) : (
          <Card className="flex items-center justify-center p-6 text-sm text-danger">{messages.invalid}</Card>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={result.svg} copyLabel={messages.copySvg} copiedLabel={messages.copied} disabled={!result.valid} />
        <Button size="sm" onClick={onDownload} disabled={!result.valid} type="button">{messages.downloadSvg}</Button>
      </div>
    </div>
  );
}
