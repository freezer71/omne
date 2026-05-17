import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { HubToolFinder } from '@/components/hub-tool-finder';
import { JsonLd } from '@/components/json-ld';
import { buildLocalizedTools } from '@/lib/tools/localized';
import { TOOL_CATEGORIES, type ToolCategory } from '@/lib/tools/types';
import { buildHubMetadata } from '@/lib/seo/metadata';
import { siteJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildHubMetadata(locale);
}

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tools = buildLocalizedTools(dict);
  const categoryLabels = dict.hub.categories as Record<ToolCategory, string>;
  const jsonLd = await siteJsonLd(locale);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 sm:px-6 py-16 sm:py-24">
      <Hero title={dict.hub.title} subtitle={dict.hub.subtitle} dropHint={dict.hub.dropHint} />
      <HubToolFinder
        locale={locale}
        tools={tools}
        categoryOrder={TOOL_CATEGORIES}
        categoryLabels={categoryLabels}
        comingSoonLabel={dict.hub.comingSoon}
        placeholder={dict.palette.placeholder}
        emptyLabel={dict.palette.empty}
      />
      <JsonLd data={jsonLd} id="omne-site-jsonld" />
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
