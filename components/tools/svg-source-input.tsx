'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type Messages = {
  pasteLabel: string;
  selectButton: string;
  dropLabel: string;
  empty: string;
};

type Props = {
  markup: string;
  onMarkupChange: (next: string) => void;
  onPickFiles: (files: FileList | File[] | null) => void;
  messages: Messages;
  trailing?: ReactNode;
};

export function SvgSourceInput({ markup, onMarkupChange, onPickFiles, messages, trailing }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
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
      <input
        ref={inputRef}
        type="file"
        accept="image/svg+xml,.svg"
        className="sr-only"
        aria-label={messages.selectButton}
        onChange={(e) => onPickFiles(e.target.files)}
      />
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-xs text-text-muted">
          {messages.pasteLabel}
          <textarea
            value={markup}
            onChange={(e) => onMarkupChange(e.target.value)}
            placeholder={messages.empty}
            spellCheck={false}
            className="min-h-32 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
            {messages.selectButton}
          </Button>
          {trailing ?? <span className="text-xs text-text-faint">{messages.dropLabel}</span>}
        </div>
      </div>
    </Card>
  );
}
