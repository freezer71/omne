import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { PaletteButton } from '@/components/command-palette/palette-button';
import { Logo } from '@/components/logo';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function Header({ locale, dict }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href={`/${locale}`} aria-label={dict.meta.siteName}>
            <Logo />
          </Link>
          <Link
            href={`/${locale}/privacy`}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            {dict.nav.privacy}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <PaletteButton labelOpen={dict.palette.open} shortcut={dict.palette.shortcut} />
          <PrivacyBadge label={dict.badge.privacy} />
          <LocaleSwitcher
            currentLocale={locale}
            labelEn={dict.locale.en}
            labelFr={dict.locale.fr}
            srLabel={dict.locale.label}
          />
          <ThemeToggle
            labelLight={dict.theme.light}
            labelDark={dict.theme.dark}
            srLabel={dict.theme.toggleLabel}
          />
        </div>
      </div>
    </header>
  );
}

function PrivacyBadge({ label }: { label: string }) {
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-success"
      />
      {label}
    </span>
  );
}
