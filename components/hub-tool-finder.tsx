'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ToolCard } from '@/components/tool-card';
import { searchTools, type RankedResult, type SearchableTool } from '@/lib/tools/search';
import type { Locale } from '@/lib/i18n/config';
import type { ToolCategory, ToolMeta } from '@/lib/tools/types';

type Props = {
  locale: Locale;
  tools: readonly SearchableTool[];
  categoryOrder: readonly ToolCategory[];
  categoryLabels: Record<ToolCategory, string>;
  comingSoonLabel: string;
  placeholder: string;
  emptyLabel: string;
  title?: string;
  subtitle?: string;
};

function toToolMeta(t: SearchableTool): ToolMeta {
  return {
    id: t.id,
    category: t.category as ToolCategory,
    href: t.href,
    i18nKey: `tools.${t.category}.${t.id}`,
    keywords: [...t.keywords],
    acceptedMime: [],
    status: t.status,
  };
}

export function HubToolFinder({
  locale,
  tools,
  categoryOrder,
  categoryLabels,
  comingSoonLabel,
  placeholder,
  emptyLabel,
  title,
  subtitle,
}: Props) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const ranked = useMemo<RankedResult[]>(
    () => searchTools(tools, trimmed),
    [tools, trimmed],
  );

  const grouped = useMemo(() => {
    return categoryOrder
      .map((cat) => ({
        cat,
        items: ranked.filter((r) => r.tool.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [ranked, categoryOrder]);

  return (
    <section id="all-tools" className="flex flex-col gap-6 scroll-mt-20">
      {title ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-text-primary">{title}</h2>
          {subtitle ? <p className="text-sm text-text-muted">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 pl-9"
        />
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map(({ cat, items }) => (
            <section key={cat} id={`cat-${cat}`} className="flex flex-col gap-4 scroll-mt-20">
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-faint">
                {categoryLabels[cat]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((r) => (
                  <ToolCard
                    key={`${r.tool.category}/${r.tool.id}`}
                    tool={toToolMeta(r.tool)}
                    locale={locale}
                    name={r.tool.name}
                    description={r.tool.description}
                    comingSoonLabel={comingSoonLabel}
                    nameRanges={r.nameRanges}
                    descriptionRanges={r.descriptionRanges}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
