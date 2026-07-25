'use client';

import { useState } from 'react';

export type ToolOutput = {
  blob: Blob;
  filename: string;
};

// Holds the file a tool just produced, and drops it as soon as the inputs that
// produced it change.
//
// Without the invalidation the panel would keep showing a result that no longer
// matches the controls on screen — the user switches quality from medium to low,
// the old medium-quality clip stays on display, and the "Download" button hands
// them a file that contradicts the UI. `signature` is a string built by the
// caller from the source file identity plus every option that feeds the
// pipeline; any change to it clears the stale result.
//
// The render-phase reset is React's sanctioned derived-state pattern (the same
// one components/ui/pdf-thumbnail.tsx uses) and re-renders immediately, so no
// stale frame is ever painted.
// Identifies a picked file well enough to notice it was swapped for another.
// Two different files can share a name, so size and mtime are part of the key.
export function fileSignature(file: File | null | undefined): string {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : '';
}

export function filesSignature(files: readonly File[]): string {
  return files.map(fileSignature).join('|');
}

export function useToolResult(signature: string) {
  const [result, setResult] = useState<ToolOutput | null>(null);
  const [trackedSignature, setTrackedSignature] = useState(signature);

  if (trackedSignature !== signature) {
    setTrackedSignature(signature);
    if (result !== null) setResult(null);
  }

  return [result, setResult] as const;
}
