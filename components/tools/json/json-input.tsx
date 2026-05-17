'use client';

import { useCallback, useId, useState } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  ariaLabel?: string;
  invalid?: boolean;
  readOnly?: boolean;
  className?: string;
  spellCheck?: boolean;
  enableFileDrop?: boolean;
};

const JSON_FILE_HINT = /\.(json|jsonl|geojson|txt|csv)$/i;
const JSON_MIME_HINT = /(json|text\/plain|text\/csv)/i;

export function JsonInput({
  value,
  onChange,
  placeholder,
  rows = 20,
  ariaLabel,
  invalid,
  readOnly = false,
  className,
  spellCheck = false,
  enableFileDrop = true,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const id = useId();

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setDragging(false);
      if (!enableFileDrop || readOnly) return;
      const file = Array.from(e.dataTransfer?.files ?? []).find(
        (f) => JSON_FILE_HINT.test(f.name) || JSON_MIME_HINT.test(f.type),
      );
      if (!file) return;
      const text = await file.text();
      onChange(text);
    },
    [enableFileDrop, onChange, readOnly],
  );

  return (
    <textarea
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onDragOver={
        enableFileDrop && !readOnly
          ? (e) => {
              e.preventDefault();
              setDragging(true);
            }
          : undefined
      }
      onDragLeave={enableFileDrop && !readOnly ? () => setDragging(false) : undefined}
      onDrop={enableFileDrop && !readOnly ? onDrop : undefined}
      placeholder={placeholder}
      rows={rows}
      readOnly={readOnly}
      spellCheck={spellCheck}
      className={cn(
        'min-h-[24rem] w-full resize-y rounded-md border bg-surface px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors',
        invalid
          ? 'border-danger/50 focus:border-danger'
          : 'border-border hover:border-border-strong focus:border-accent',
        dragging && 'ring-2 ring-accent/40',
        className,
      )}
    />
  );
}
