'use client';

import { LARGE_FILE_BYTES } from '@/lib/file-utils';

type Props = {
  bytes: number | undefined;
  message: string;
  threshold?: number;
};

export function HeavyFileWarning({ bytes, message, threshold = LARGE_FILE_BYTES }: Props) {
  if (!bytes || bytes < threshold) return null;
  return (
    <p
      role="status"
      className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-muted"
    >
      {message}
    </p>
  );
}
