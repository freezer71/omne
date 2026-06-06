import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { HighlightedText } from '@/components/ui/highlighted-text';
import { ToolIcon } from '@/components/command-palette/category-icons';
import { cn } from '@/lib/cn';
import type { Range } from '@/lib/tools/highlight';
import type { ToolMeta, ToolCategory } from '@/lib/tools/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  tool: ToolMeta;
  locale: Locale;
  name: string;
  description: string;
  comingSoonLabel: string;
  nameRanges?: readonly Range[];
  descriptionRanges?: readonly Range[];
};

export function ToolCard({
  tool,
  locale,
  name,
  description,
  comingSoonLabel,
  nameRanges,
  descriptionRanges,
}: Props) {
  const isSoon = tool.status === 'soon';
  const content = (
    <Card
      interactive={!isSoon}
      aria-disabled={isSoon}
      className={cn('p-5 h-full flex flex-col gap-2', isSoon && 'opacity-50 cursor-not-allowed')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ToolIcon
            category={tool.category as ToolCategory}
            id={tool.id}
            className="h-4 w-4 shrink-0 text-text-faint"
          />
          <HighlightedText
            text={name}
            {...(nameRanges ? { ranges: nameRanges } : {})}
            className="text-base font-medium text-text-primary truncate"
          />
        </div>
        {isSoon && (
          <span className="shrink-0 text-[10px] uppercase tracking-wider font-medium text-text-faint">
            {comingSoonLabel}
          </span>
        )}
      </div>
      <HighlightedText
        text={description}
        {...(descriptionRanges ? { ranges: descriptionRanges } : {})}
        className="text-sm text-text-muted leading-relaxed"
      />
    </Card>
  );

  if (isSoon) return content;
  return (
    <Link href={`/${locale}${tool.href}`} className="block focus:outline-none">
      {content}
    </Link>
  );
}
