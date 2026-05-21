import 'server-only';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getTool, toolsByCategory } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';

type Props = {
  category: ToolCategory;
  id: string;
  locale: Locale;
};

type ToolDictEntry = {
  name?: string;
  description?: string;
  seo?: { keywords?: string[] };
};

export async function ToolFooterSeo({ category, id, locale }: Props) {
  const tool = getTool(category, id);
  if (!tool) return null;

  const dict = await getDictionary(locale);
  const f = dict.common.footer;
  const toolsByCat = (dict.tools as unknown as Record<string, Record<string, ToolDictEntry>>);
  const currentDict = toolsByCat[category]?.[id];
  const keywords = currentDict?.seo?.keywords ?? [];

  const sameCategory = toolsByCategory()[category] ?? [];
  const related = sameCategory.filter((t) => t.id !== id).slice(0, 4);

  return (
    <section
      className="mx-auto w-full max-w-3xl px-4 sm:px-6 pb-16 grid gap-12"
      aria-label="More information about this tool"
    >
      <article className="grid gap-3">
        <h2 className="text-lg font-medium text-text-primary">{f.howItWorksTitle}</h2>
        <ol className="grid gap-2 list-decimal pl-5 text-sm text-text-muted leading-relaxed">
          <li>{f.howItWorksStep1}</li>
          <li>{f.howItWorksStep2}</li>
          <li>{f.howItWorksStep3}</li>
        </ol>
      </article>

      <article className="grid gap-2 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-medium text-text-primary">{f.privacyTitle}</h2>
        <p className="text-sm text-text-muted leading-relaxed">{f.privacyBody}</p>
      </article>

      {related.length > 0 && (
        <article className="grid gap-3">
          <h2 className="text-lg font-medium text-text-primary">{f.relatedTitle}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {related.map((t) => {
              const td = toolsByCat[category]?.[t.id];
              return (
                <li key={t.id}>
                  <Link
                    href={`/${locale}${t.href}`}
                    className="block rounded-md border border-border px-3 py-2 hover:border-text-muted transition-colors"
                  >
                    <span className="block text-sm text-text-primary font-medium">
                      {td?.name ?? t.id}
                    </span>
                    {td?.description && (
                      <span className="mt-0.5 block text-xs text-text-muted leading-snug line-clamp-2">
                        {td.description}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </article>
      )}

      {keywords.length > 0 && (
        <article className="grid gap-2">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide">
            {f.keywordsTitle}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <li
                key={k}
                className="rounded-full border border-border px-3 py-1 text-xs text-text-muted"
              >
                {k}
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
