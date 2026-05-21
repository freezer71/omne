'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'omne-theme';

type Props = {
  labelLight: string;
  labelDark: string;
  srLabel: string;
};

function readCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
}

export function ThemeToggle({ labelLight, labelDark, srLabel }: Props) {
  const [theme, setTheme] = useState<Theme>(() => readCurrentTheme());

  useEffect(() => {
    setTheme(readCurrentTheme());
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset['theme'] = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {
      /* localStorage unavailable */
    }
  };

  const btn = (active: boolean) =>
    cn(
      'h-7 px-2 sm:px-3 rounded text-xs font-medium transition-colors duration-150',
      active
        ? 'bg-surface-elevated text-text-primary'
        : 'text-text-muted hover:text-text-primary',
    );

  return (
    <div
      role="group"
      aria-label={srLabel}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1"
    >
      <button
        type="button"
        className={btn(theme === 'light')}
        aria-pressed={theme === 'light'}
        onClick={() => apply('light')}
      >
        {labelLight}
      </button>
      <button
        type="button"
        className={btn(theme === 'dark')}
        aria-pressed={theme === 'dark'}
        onClick={() => apply('dark')}
      >
        {labelDark}
      </button>
    </div>
  );
}
