import { CategoryIcon } from '@/components/command-palette/category-icons';
import { tpl } from '@/lib/tpl';
import type { SearchableTool } from '@/lib/tools/search';
import type { ToolCategory } from '@/lib/tools/types';

type CountTpl = {
  singular: string;
  plural: string;
};

type Props = {
  title: string;
  subtitle: string;
  tools: readonly SearchableTool[];
  categoryOrder: readonly ToolCategory[];
  categoryLabels: Record<ToolCategory, string>;
  countTpl: CountTpl;
};

export function HubCategoryGrid({
  title,
  subtitle,
  tools,
  categoryOrder,
  categoryLabels,
  countTpl,
}: Props) {
  const groups = categoryOrder
    .map((cat) => ({
      cat,
      count: tools.filter((t) => t.category === cat).length,
    }))
    .filter((g) => g.count > 0);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-text-primary">{title}</h2>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {groups.map(({ cat, count }) => {
          const countLabel = tpl(count === 1 ? countTpl.singular : countTpl.plural, { n: count });
          return (
            <a
              key={cat}
              href={`#cat-${cat}`}
              className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover focus:outline-none focus-visible:border-accent"
            >
              <CategoryIcon
                category={cat}
                className="h-5 w-5 shrink-0 text-text-faint transition-colors group-hover:text-text-primary"
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-text-primary">
                  {categoryLabels[cat]}
                </span>
                <span className="truncate text-xs text-text-faint">{countLabel}</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
