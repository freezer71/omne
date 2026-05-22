'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isBarcodeDetectorAvailable, scanBarcodeFromFile, type BarcodeScanResult } from '@/lib/tools/implementations/qr-barcode-scan';
import { CopyButton } from '@/components/tools/json/copy-button';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  unavailable: string;
  noResults: string;
  resultsLabel: string;
  formatLabel: string;
  valueLabel: string;
  copy: string;
  copied: string;
  removeFile: string;
  scanning: string;
  scanError: string;
};

export function QrBarcodeScanTool(messages: Messages) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<BarcodeScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available] = useState<boolean>(() => isBarcodeDetectorAvailable());
  const [dragging, setDragging] = useState(false);

  // Reset scan state synchronously when the input file changes, so the
  // subsequent effect can run its async work without a setState-in-effect.
  const [trackedFile, setTrackedFile] = useState<File | null>(file);
  if (trackedFile !== file) {
    setTrackedFile(file);
    setResults([]);
    setError(null);
    setScanning(file !== null);
  }

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    scanBarcodeFromFile(file)
      .then((r) => { if (!cancelled) { setResults(r); if (r.length === 0) setError(messages.noResults); } })
      .catch(() => { if (!cancelled) setError(messages.scanError); })
      .finally(() => { if (!cancelled) setScanning(false); });
    return () => { cancelled = true; };
  }, [file, messages.noResults, messages.scanError]);

  if (!available) {
    return (
      <Card className="p-6 text-center text-sm text-text-muted">
        {messages.unavailable}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn('p-8 border-2 border-dashed transition-colors', dragging ? 'border-accent bg-surface-hover' : 'border-border')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectButton}</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            { }
            <img src={URL.createObjectURL(file)} alt={file.name} className="max-h-64 w-full rounded-md border border-border object-contain" />
            <div className="flex items-center justify-between">
              <p className="truncate text-sm text-text-muted">{file.name}</p>
              <Button variant="subtle" size="sm" type="button" onClick={() => { setFile(null); setResults([]); }}>{messages.removeFile}</Button>
            </div>
          </div>
        )}
      </Card>

      {scanning && <p className="text-sm text-text-muted">{messages.scanning}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">{messages.resultsLabel}</p>
          {results.map((r, i) => (
            <Card key={i} className="flex items-center gap-3 px-3 py-2">
              <span className="rounded bg-accent/20 px-2 py-0.5 font-mono text-xs text-accent">{r.format}</span>
              <span className="flex-1 break-all font-mono text-sm text-text-primary">{r.value}</span>
              <CopyButton text={r.value} copyLabel={messages.copy} copiedLabel={messages.copied} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
