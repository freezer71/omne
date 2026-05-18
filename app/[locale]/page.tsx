import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { HubToolFinder } from '@/components/hub-tool-finder';
import { HubHero } from '@/components/home/hub-hero';
import { HubStats } from '@/components/home/hub-stats';
import { HubFeatured } from '@/components/home/hub-featured';
import { HubCategoryGrid } from '@/components/home/hub-category-grid';
import { HubHowItWorks } from '@/components/home/hub-how-it-works';
import { JsonLd } from '@/components/json-ld';
import { buildLocalizedTools } from '@/lib/tools/localized';
import { TOOL_CATEGORIES, type ToolCategory } from '@/lib/tools/types';
import { TOOLS } from '@/lib/tools/registry';
import { FEATURED_TOOL_KEYS } from '@/lib/home/featured';
import { buildHubMetadata } from '@/lib/seo/metadata';
import { siteJsonLd } from '@/lib/seo/jsonld';
import type { SearchableTool } from '@/lib/tools/search';

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

  const toolsByKey = new Map<string, SearchableTool>();
  for (const t of tools) toolsByKey.set(`${t.category}/${t.id}`, t);
  const featured = FEATURED_TOOL_KEYS
    .map((k) => toolsByKey.get(k))
    .filter((t): t is SearchableTool => Boolean(t));

  const stats = [
    { value: String(TOOLS.length), label: dict.home.stats.toolsLabel },
    { value: '0', label: dict.home.stats.uploadsLabel },
    { value: '100%', label: dict.home.stats.ossLabel },
  ];

  const howSteps = [
    { title: dict.home.howItWorks.step1Title, body: dict.home.howItWorks.step1Body },
    { title: dict.home.howItWorks.step2Title, body: dict.home.howItWorks.step2Body },
    { title: dict.home.howItWorks.step3Title, body: dict.home.howItWorks.step3Body },
  ];

  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 sm:px-6 py-12 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] [background:radial-gradient(ellipse_60%_60%_at_50%_0%,color-mix(in_srgb,var(--text-primary)_8%,transparent),transparent_70%)]"
      />
      <HubHero
        eyebrow={dict.home.hero.eyebrow}
        title={dict.home.hero.title}
        subtitle={dict.home.hero.subtitle}
        ctaBrowse={dict.home.hero.ctaBrowse}
        ctaSearch={dict.home.hero.ctaSearch}
        shortcut={dict.palette.shortcut}
      />
      <HubStats stats={stats} />
      <HubFeatured
        locale={locale}
        title={dict.home.featured.title}
        subtitle={dict.home.featured.subtitle}
        tools={featured}
      />
      <HubCategoryGrid
        title={dict.home.categoryGrid.title}
        subtitle={dict.home.categoryGrid.subtitle}
        tools={tools}
        categoryOrder={TOOL_CATEGORIES}
        categoryLabels={categoryLabels}
        countTpl={{
          singular: dict.home.categoryGrid.countSingular,
          plural: dict.home.categoryGrid.countPlural,
        }}
      />
      <HubToolFinder
        locale={locale}
        tools={tools}
        categoryOrder={TOOL_CATEGORIES}
        categoryLabels={categoryLabels}
        comingSoonLabel={dict.hub.comingSoon}
        placeholder={dict.palette.placeholder}
        emptyLabel={dict.palette.empty}
        title={dict.home.tools.title}
        subtitle={dict.home.tools.subtitle}
      />
      <HubHowItWorks
        title={dict.home.howItWorks.title}
        subtitle={dict.home.howItWorks.subtitle}
        steps={howSteps}
      />
      <JsonLd data={jsonLd} id="omne-site-jsonld" />
    </main>
  );
}
