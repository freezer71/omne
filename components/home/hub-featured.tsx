import Link from 'next/link';
import { ToolIcon } from '@/components/command-palette/category-icons';
import type { Locale } from '@/lib/i18n/config';
import type { SearchableTool } from '@/lib/tools/search';
import type { ToolCategory } from '@/lib/tools/types';

type Props = {
  locale: Locale;
  title: string;
  subtitle: string;
  tools: readonly SearchableTool[];
};

export function HubFeatured({ locale, title, subtitle, tools }: Props) {
  if (tools.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-text-primary">{title}</h2>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map((tool) => (
          <Link
            key={`${tool.category}/${tool.id}`}
            href={`/${locale}${tool.href}`}
            className="group flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-hover focus:outline-none focus-visible:border-accent"
          >
            <ToolIcon
              category={tool.category as ToolCategory}
              id={tool.id}
              className="h-5 w-5 text-text-faint transition-colors group-hover:text-text-primary"
            />
            <h3 className="text-base font-medium text-text-primary">{tool.name}</h3>
            <p className="text-sm text-text-muted leading-relaxed line-clamp-2">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
