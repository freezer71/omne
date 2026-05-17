'use client';

import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { locales, type Locale } from '@/lib/i18n/config';

type Props = {
  currentLocale: Locale;
  labelEn: string;
  labelFr: string;
  srLabel: string;
};

function switchLocale(pathname: string, current: Locale, next: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === current) {
    segments[0] = next;
    return '/' + segments.join('/');
  }
  return `/${next}`;
}

export function LocaleSwitcher({ currentLocale, labelEn, labelFr, srLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const onSelect = (next: Locale) => {
    if (next === currentLocale) return;
    router.push(switchLocale(pathname, currentLocale, next));
  };

  const btn = (active: boolean) =>
    cn(
      'h-7 px-3 rounded text-xs font-medium transition-colors duration-150',
      active
        ? 'bg-surface-elevated text-text-primary'
        : 'text-text-muted hover:text-text-primary',
    );

  const labelFor: Record<Locale, string> = { en: labelEn, fr: labelFr };

  return (
    <div
      role="group"
      aria-label={srLabel}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1"
    >
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          className={btn(loc === currentLocale)}
          aria-pressed={loc === currentLocale}
          onClick={() => onSelect(loc)}
        >
          {labelFor[loc]}
        </button>
      ))}
    </div>
  );
}
