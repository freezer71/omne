import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { ToolCard } from '@/components/tool-card';
import { toolsByCategory } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';

const CATEGORY_ORDER: ToolCategory[] = ['pdf', 'video', 'image', 'text', 'utility'];

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const grouped = toolsByCategory();
  const visibleCategories = CATEGORY_ORDER.filter((c) => (grouped[c]?.length ?? 0) > 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 sm:px-6 py-16 sm:py-24">
      <Hero title={dict.hub.title} subtitle={dict.hub.subtitle} dropHint={dict.hub.dropHint} />
      <div className="flex flex-col gap-12">
        {visibleCategories.map((cat) => (
          <ToolSection
            key={cat}
            heading={dict.hub.categories[cat]}
            tools={grouped[cat] ?? []}
            locale={locale}
            dict={dict}
          />
        ))}
      </div>
    </main>
  );
}

function Hero({ title, subtitle, dropHint }: { title: string; subtitle: string; dropHint: string }) {
  return (
    <section className="flex flex-col gap-3 max-w-2xl">
      <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-text-primary">{title}</h1>
      <p className="text-base sm:text-lg text-text-muted leading-relaxed">{subtitle}</p>
      <p className="text-sm text-text-faint font-mono mt-2">↳ {dropHint}</p>
    </section>
  );
}

function ToolSection({
  heading,
  tools,
  locale,
  dict,
}: {
  heading: string;
  tools: { id: string; category: string; href: string; status: 'stable' | 'beta' | 'soon' }[];
  locale: Locale;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-text-faint">{heading}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map((tool) => {
          const node = (dict.tools as Record<string, Record<string, { name: string; description: string }>>)
            [tool.category]?.[tool.id];
          if (!node) return null;
          return (
            <ToolCard
              key={`${tool.category}/${tool.id}`}
              tool={tool as never}
              locale={locale}
              name={node.name}
              description={node.description}
              comingSoonLabel={dict.hub.comingSoon}
            />
          );
        })}
      </div>
    </section>
  );
}
