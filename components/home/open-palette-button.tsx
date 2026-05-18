'use client';

import { usePalette } from '@/components/command-palette/palette-context';
import { cn } from '@/lib/cn';

type Props = {
  label: string;
  shortcut: string;
  className?: string;
};

export function OpenPaletteButton({ label, shortcut, className }: Props) {
  const { setOpen } = usePalette();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text-primary',
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span>{label}</span>
      <kbd className="ml-1 inline-flex items-center rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-faint">
        {shortcut}
      </kbd>
    </button>
  );
}
