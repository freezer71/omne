'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PdfThumbnail } from '@/components/ui/pdf-thumbnail';
import { formatBytes } from '@/lib/file-utils';

type Messages = {
  selectButton: string;
  empty: string;
  comingSoon: string;
  removeFile?: string;
  previewLoading: string;
  previewError: string;
};

export function PdfToImagesTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (arr[0]) setFile(arr[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-8 border-2 border-dashed border-border">
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
              {messages.selectButton}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <PdfThumbnail
              file={file}
              maxWidth={96}
              loadingLabel={messages.previewLoading}
              errorLabel={messages.previewError}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">{file.name}</p>
              <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
            </div>
            <Button variant="subtle" size="sm" onClick={() => setFile(null)}>
              ✕
            </Button>
          </div>
        )}
      </Card>
      <p className="text-xs font-mono uppercase tracking-wider text-text-faint text-center">
        {messages.comingSoon}
      </p>
    </div>
  );
}
