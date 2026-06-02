'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

export type SourceLabels = {
  inputLabel: string;
  inputPlaceholder: string;
  dropHint: string;
  selectButton: string;
  clearButton: string;
  sampleButton?: string;
  charsTemplate: string;
};

export function SourceInput({
  text,
  onText,
  onFile,
  accept,
  labels,
  busy = false,
  error = null,
  onSample,
}: {
  text: string;
  onText: (value: string) => void;
  onFile: (file: File) => void;
  accept: string;
  labels: SourceLabels;
  busy?: boolean;
  error?: string | null;
  onSample?: () => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-xs text-text-muted">
          {labels.inputLabel}
        </label>
        <span className="font-mono text-xs text-text-faint">
          {tpl(labels.charsTemplate, { n: [...text].length })}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-md border transition-colors',
          dragging ? 'border-accent bg-surface-hover' : 'border-border',
        )}
      >
        <textarea
          id={inputId}
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder={labels.inputPlaceholder}
          rows={8}
          className="min-h-[12rem] w-full resize-y rounded-md bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={labels.selectButton}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="subtle"
          size="sm"
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {labels.selectButton}
        </Button>
        {onSample && labels.sampleButton && (
          <Button variant="ghost" size="sm" type="button" onClick={onSample}>
            {labels.sampleButton}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          disabled={!text}
          onClick={() => onText('')}
        >
          {labels.clearButton}
        </Button>
        <span className="text-xs text-text-faint">{labels.dropHint}</span>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
