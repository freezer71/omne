import Link from 'next/link';
import { OpenPaletteButton } from './open-palette-button';

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaBrowse: string;
  ctaSearch: string;
  shortcut: string;
};

export function HubHero({ eyebrow, title, subtitle, ctaBrowse, ctaSearch, shortcut }: Props) {
  return (
    <section className="flex flex-col gap-6 max-w-3xl pt-4">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
        {eyebrow}
      </span>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tighter text-text-primary leading-[1.05]">
        {title}
      </h1>
      <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl">{subtitle}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link
          href="#all-tools"
          className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          {ctaBrowse}
        </Link>
        <OpenPaletteButton label={ctaSearch} shortcut={shortcut} className="h-10" />
      </div>
    </section>
  );
}
