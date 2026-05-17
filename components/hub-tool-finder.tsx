'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ToolCard } from '@/components/tool-card';
import { filterTools, type SearchableTool } from '@/lib/tools/search';
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
}: Props) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const filtered = useMemo(() => filterTools(tools, trimmed), [tools, trimmed]);

  const grouped = useMemo(() => {
    return categoryOrder
      .map((cat) => ({
        cat,
        items: filtered.filter((t) => t.category === cat),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered, categoryOrder]);

  return (
    <div className="flex flex-col gap-8">
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
          className="h-10 pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-12">
          {grouped.map(({ cat, items }) => (
            <section key={cat} className="flex flex-col gap-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-text-faint">
                {categoryLabels[cat]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((tool) => (
                  <ToolCard
                    key={`${tool.category}/${tool.id}`}
                    tool={toToolMeta(tool)}
                    locale={locale}
                    name={tool.name}
                    description={tool.description}
                    comingSoonLabel={comingSoonLabel}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
