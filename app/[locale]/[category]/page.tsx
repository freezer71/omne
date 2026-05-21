import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, locales } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isToolCategory, TOOL_CATEGORIES } from '@/lib/tools/types';
import type { ToolCategory } from '@/lib/tools/types';
import { TOOLS } from '@/lib/tools/registry';
import { buildCategoryMetadata } from '@/lib/seo/metadata';
import { categoryJsonLd, categoryBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import { JsonLd } from '@/components/json-ld';

type Params = { locale: string; category: string };

export function generateStaticParams() {
  const params: { locale: string; category: string }[] = [];
  const populated = new Set<ToolCategory>(TOOLS.map((t) => t.category));
  for (const locale of locales) {
    for (const category of TOOL_CATEGORIES) {
      if (populated.has(category)) {
        params.push({ locale, category });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isLocale(locale) || !isToolCategory(category)) return {};
  return buildCategoryMetadata(category, locale);
}

type CategoryDict = {
  name?: string;
  intro?: string;
};

type ToolEntry = {
  name?: string;
  description?: string;
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, category } = await params;
  if (!isLocale(locale)) notFound();
  if (!isToolCategory(category)) notFound();

  const dict = await getDictionary(locale);
  const tree = dict as unknown as Record<string, unknown>;
  const categoriesDict = (tree['categories'] as Record<string, CategoryDict> | undefined) ?? {};
  const node = categoriesDict[category] ?? {};
  const hubCategories =
    ((tree['hub'] as { categories?: Record<string, string> } | undefined)?.categories ?? {}) as
      Record<string, string>;
  const heading = node.name ?? hubCategories[category] ?? category;
  const intro = node.intro ?? '';

  const toolsInCategory = TOOLS.filter((t) => t.category === category);
  if (toolsInCategory.length === 0) notFound();

  const toolsDict =
    ((tree['tools'] as Record<string, Record<string, ToolEntry>> | undefined)?.[category] ?? {}) as
      Record<string, ToolEntry>;

  const [collectionLd, breadcrumbLd] = await Promise.all([
    categoryJsonLd(category, locale),
    categoryBreadcrumbJsonLd(category, locale),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-4 sm:px-6 py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-xs text-text-faint">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-text-primary transition-colors">
              omne
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-text-muted">{heading}</li>
        </ol>
      </nav>

      <header className="grid gap-4">
        <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary tracking-tight">
          {heading}
        </h1>
        {intro && (
          <p className="max-w-prose text-base sm:text-lg text-text-muted leading-relaxed">
            {intro}
          </p>
        )}
      </header>

      <section aria-labelledby="cat-tools" className="grid gap-4">
        <h2 id="cat-tools" className="sr-only">
          {heading}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {toolsInCategory.map((tool) => {
            const entry = toolsDict[tool.id];
            const name = entry?.name ?? tool.id;
            const description = entry?.description ?? '';
            return (
              <li key={`${tool.category}/${tool.id}`}>
                <Link
                  href={`/${locale}${tool.href}`}
                  className="block h-full rounded-lg border border-border bg-surface px-4 py-4 hover:border-text-muted transition-colors"
                >
                  <span className="block text-sm font-medium text-text-primary">{name}</span>
                  {description && (
                    <span className="mt-1 block text-xs text-text-muted leading-snug line-clamp-3">
                      {description}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <JsonLd data={collectionLd} id={`omne-jsonld-cat-${category}`} />
      <JsonLd data={breadcrumbLd} id={`omne-breadcrumb-cat-${category}`} />
    </main>
  );
}
