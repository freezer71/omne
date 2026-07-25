import Link from 'next/link';
import { BrandLockup } from '@/components/brand-lockup';
import { GithubIcon, GITHUB_URL } from '@/components/icons/github';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { ToolCategory } from '@/lib/tools/types';

type Props = {
  locale: Locale;
  dict: Dictionary;
  categoryOrder: readonly ToolCategory[];
};

export function Footer({ locale, dict, categoryOrder }: Props) {
  const labels = dict.hub.categories as Record<ToolCategory, string>;
  return (
    <footer className="mt-12 border-t border-border bg-surface/40">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <BrandLockup
              locale={locale}
              koumaLabel={dict.nav.koumaAriaLabel}
              siteName={dict.meta.siteName}
            />
            <p className="text-sm text-text-muted max-w-xs leading-relaxed">
              {dict.home.footer.tagline}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-faint">
              {dict.home.footer.categories}
            </span>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
              {categoryOrder.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/${locale}#cat-${cat}`}
                    className="text-sm text-text-muted transition-colors hover:text-text-primary"
                  >
                    {labels[cat]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-faint">
              {dict.home.footer.about}
            </span>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-sm text-text-muted transition-colors hover:text-text-primary"
                >
                  {dict.home.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-primary"
                >
                  <GithubIcon size={14} />
                  {dict.home.footer.github}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-text-faint">
          <span>{dict.home.footer.copyright}</span>
          <span className="font-mono">{dict.badge.privacy}</span>
        </div>
      </div>
    </footer>
  );
}
