import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { ToolCategory } from '@/lib/tools/types';
import { cn } from '@/lib/cn';
import { RecentTracker } from '@/components/command-palette/recent-tracker';

type Props = {
  locale: Locale;
  category: ToolCategory;
  name: string;
  description: string;
  categoryLabel: string;
  backHomeLabel: string;
  wide?: boolean;
  children: React.ReactNode;
};

export function ToolShell({
  locale,
  category,
  name,
  description,
  categoryLabel,
  backHomeLabel,
  wide = false,
  children,
}: Props) {
  return (
    <main
      id="main-content"
      className={cn(
        'mx-auto flex w-full flex-1 flex-col gap-8 px-4 sm:px-6 py-10 sm:py-16',
        wide ? 'max-w-6xl' : 'max-w-3xl',
      )}
    >
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-sm text-text-muted"
      >
        <Link href={`/${locale}`} className="hover:text-text-primary transition-colors">
          {backHomeLabel}
        </Link>
        <span aria-hidden className="text-text-faint">/</span>
        <span className="text-text-faint">{categoryLabel}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium tracking-tight text-text-primary">{name}</h1>
        <p className="text-base text-text-muted leading-relaxed">{description}</p>
      </header>

      <section data-tool-category={category}>{children}</section>
      <RecentTracker />
    </main>
  );
}
