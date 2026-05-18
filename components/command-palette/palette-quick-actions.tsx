'use client';

import { Command } from 'cmdk';
import type { ComponentProps } from 'react';
import type { Locale } from '@/lib/i18n/config';

const SVG: ComponentProps<'svg'> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function IconSun(props: ComponentProps<'svg'>) {
  return (
    <svg {...SVG} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M17 7l1.4-1.4M5.6 18.4 7 17" />
    </svg>
  );
}

function IconGlobe(props: ComponentProps<'svg'>) {
  return (
    <svg {...SVG} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13 13 0 0 1 0 18" />
      <path d="M12 3a13 13 0 0 0 0 18" />
    </svg>
  );
}

function IconShield(props: ComponentProps<'svg'>) {
  return (
    <svg {...SVG} {...props}>
      <path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconGrid(props: ComponentProps<'svg'>) {
  return (
    <svg {...SVG} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

type Theme = 'light' | 'dark';
const THEME_KEY = 'omne-theme';

function applyTheme(next: Theme): void {
  document.documentElement.dataset['theme'] = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* localStorage unavailable */
  }
}

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
}

export type QuickActionLabels = {
  heading: string;
  toggleTheme: string;
  changeLanguage: string;
  openPrivacy: string;
  browseAll: string;
};

type Props = {
  locale: Locale;
  labels: QuickActionLabels;
  onAction: () => void;
  onNavigate: (path: string) => void;
};

export function PaletteQuickActions({ locale, labels, onAction, onNavigate }: Props) {
  const otherLocale: Locale = locale === 'en' ? 'fr' : 'en';

  const itemCls =
    'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text-primary aria-selected:bg-surface-hover';
  const iconCls = 'h-4 w-4 text-text-faint shrink-0';

  return (
    <Command.Group
      heading={labels.heading}
      className="px-1 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-faint"
    >
      <Command.Item
        value="quick:theme"
        keywords={['theme', 'thème', 'dark', 'light', 'sombre', 'clair']}
        onSelect={() => {
          const next: Theme = readTheme() === 'light' ? 'dark' : 'light';
          applyTheme(next);
          onAction();
        }}
        className={itemCls}
      >
        <IconSun className={iconCls} />
        <span className="font-medium normal-case tracking-normal">{labels.toggleTheme}</span>
      </Command.Item>

      <Command.Item
        value="quick:language"
        keywords={['language', 'langue', 'locale', 'english', 'français', 'french']}
        onSelect={() => {
          onNavigate(`/${otherLocale}`);
        }}
        className={itemCls}
      >
        <IconGlobe className={iconCls} />
        <span className="font-medium normal-case tracking-normal">{labels.changeLanguage}</span>
      </Command.Item>

      <Command.Item
        value="quick:privacy"
        keywords={['privacy', 'confidentialité', 'vie privée']}
        onSelect={() => {
          onNavigate(`/${locale}/privacy`);
        }}
        className={itemCls}
      >
        <IconShield className={iconCls} />
        <span className="font-medium normal-case tracking-normal">{labels.openPrivacy}</span>
      </Command.Item>

      <Command.Item
        value="quick:browse"
        keywords={['browse', 'voir', 'outils', 'tous', 'all']}
        onSelect={() => {
          onNavigate(`/${locale}`);
        }}
        className={itemCls}
      >
        <IconGrid className={iconCls} />
        <span className="font-medium normal-case tracking-normal">{labels.browseAll}</span>
      </Command.Item>
    </Command.Group>
  );
}
