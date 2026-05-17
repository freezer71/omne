'use client';

import { usePalette } from './palette-context';

type Props = {
  labelOpen: string;
  shortcut: string;
};

export function PaletteButton({ labelOpen, shortcut }: Props) {
  const { setOpen } = usePalette();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={labelOpen}
      title={labelOpen}
      className="hidden sm:inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text-primary"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <kbd className="font-mono text-[10px] tracking-wider text-text-faint">{shortcut}</kbd>
    </button>
  );
}
