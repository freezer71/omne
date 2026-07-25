import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { PaletteButton } from '@/components/command-palette/palette-button';
import { BrandLockup } from '@/components/brand-lockup';
import { GithubIcon, GITHUB_URL } from '@/components/icons/github';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function Header({ locale, dict }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <BrandLockup
            locale={locale}
            koumaLabel={dict.nav.koumaAriaLabel}
            siteName={dict.meta.siteName}
            size="xl"
            compact
          />
          <Link
            href={`/${locale}/privacy`}
            className="hidden sm:inline text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            {dict.nav.privacy}
          </Link>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={dict.nav.githubAriaLabel}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <GithubIcon size={16} />
            <span>{dict.nav.github}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <PaletteButton labelOpen={dict.palette.open} shortcut={dict.palette.shortcut} />
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
