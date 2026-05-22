'use client';

import { useSyncExternalStore } from 'react';
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

function subscribeToTheme(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

function getServerTheme(): Theme {
  return 'dark';
}

export function ThemeToggle({ labelLight, labelDark, srLabel }: Props) {
  // Subscribe to <html data-theme> mutations so the toggle stays in sync with
  // the value written by /theme-init.js (pre-paint) and by `apply()` below.
  // Using useSyncExternalStore avoids the react-hooks/set-state-in-effect
  // violation that an effect-driven re-hydration would trigger.
  const theme = useSyncExternalStore(subscribeToTheme, readCurrentTheme, getServerTheme);

  const apply = (next: Theme) => {
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
