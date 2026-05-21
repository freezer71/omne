import { headers } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { TOOLS } from '@/lib/tools/registry';
import { FEATURED_TOOL_KEYS } from '@/lib/home/featured';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const STRINGS = {
  en: {
    eyebrow: '404',
    h1: 'This page does not exist',
    body: 'The page you are looking for has moved or was never here. Pick a tool below or head back to the home page.',
    backHome: 'Back to home',
    popularTitle: 'Popular tools',
  },
  fr: {
    eyebrow: '404',
    h1: "Cette page n'existe pas",
    body: "La page que vous cherchez a été déplacée ou n'a jamais existé. Choisissez un outil ci-dessous ou retournez à l'accueil.",
    backHome: "Retour à l'accueil",
    popularTitle: 'Outils populaires',
  },
} as const;

async function detectLocale(): Promise<Locale> {
  const h = await headers();
  const header = h.get('accept-language') ?? '';
  for (const part of header.split(',')) {
    const tag = part.trim().split(';')[0]?.toLowerCase().split('-')[0];
    if (tag && isLocale(tag)) return tag;
  }
  return defaultLocale;
}

export default async function NotFound() {
  const locale = await detectLocale();
  const dict = await getDictionary(locale);
  const t = STRINGS[locale];
  const toolsByCat = dict.tools as unknown as Record<
    string,
    Record<string, { name?: string; description?: string }>
  >;

  const popular = FEATURED_TOOL_KEYS
    .map((key) => {
      const [category, id] = key.split('/');
      const tool = TOOLS.find((x) => x.category === category && x.id === id);
      if (!tool) return null;
      const entry = toolsByCat[tool.category]?.[tool.id];
      return {
        tool,
        name: entry?.name ?? tool.id,
        description: entry?.description ?? '',
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 sm:px-6 py-16 sm:py-24">
      <header className="grid gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-text-faint">
          {t.eyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight">
          {t.h1}
        </h1>
        <p className="text-base text-text-muted leading-relaxed max-w-prose">{t.body}</p>
        <div>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:border-text-muted transition-colors"
          >
            ← {t.backHome}
          </Link>
        </div>
      </header>

      {popular.length > 0 && (
        <section className="grid gap-4" aria-labelledby="nf-popular">
          <h2 id="nf-popular" className="text-lg font-medium text-text-primary">
            {t.popularTitle}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {popular.map(({ tool, name, description }) => (
              <li key={`${tool.category}/${tool.id}`}>
                <Link
                  href={`/${locale}${tool.href}`}
                  className="block rounded-md border border-border px-4 py-3 hover:border-text-muted transition-colors"
                >
                  <span className="block text-sm font-medium text-text-primary">{name}</span>
                  {description && (
                    <span className="mt-0.5 block text-xs text-text-muted leading-snug line-clamp-2">
                      {description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
