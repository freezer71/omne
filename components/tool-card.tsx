import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { ToolMeta } from '@/lib/tools/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  tool: ToolMeta;
  locale: Locale;
  name: string;
  description: string;
  comingSoonLabel: string;
};

export function ToolCard({ tool, locale, name, description, comingSoonLabel }: Props) {
  const isSoon = tool.status === 'soon';
  const content = (
    <Card
      interactive={!isSoon}
      aria-disabled={isSoon}
      className={cn('p-5 h-full flex flex-col gap-2', isSoon && 'opacity-50 cursor-not-allowed')}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-medium text-text-primary">{name}</h3>
        {isSoon && (
          <span className="text-[10px] uppercase tracking-wider font-medium text-text-faint">
            {comingSoonLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </Card>
  );

  if (isSoon) return content;
  return (
    <Link href={`/${locale}${tool.href}`} className="block focus:outline-none">
      {content}
    </Link>
  );
}
