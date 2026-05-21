import 'server-only';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getTool } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';
import { OG_LOCALE, SITE_NAME, SITE_URL, localizedUrl, ogAlternateLocales } from './site';

type SeoBlock = {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
};

function buildLanguageAlternates(path: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of locales) map[l] = localizedUrl(l, path);
  map['x-default'] = localizedUrl('en', path);
  return map;
}

function commonMetadata(opts: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogType?: 'website' | 'article';
}): Metadata {
  const url = localizedUrl(opts.locale, opts.path);
  const ogTitle = opts.ogTitle ?? opts.title;
  return {
    metadataBase: new URL(SITE_URL),
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(opts.path),
    },
    openGraph: {
      type: opts.ogType ?? 'website',
      url,
      siteName: SITE_NAME,
      title: ogTitle,
      description: opts.description,
      locale: OG_LOCALE[opts.locale],
      alternateLocale: ogAlternateLocales(opts.locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: opts.description,
    },
    robots: { index: true, follow: true },
  };
}

type DictTree = Record<string, unknown>;

function readSeo(dict: DictTree, path: string[]): SeoBlock | undefined {
  let node: unknown = dict;
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  if (!node || typeof node !== 'object') return undefined;
  const candidate = node as Partial<SeoBlock>;
  if (
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    Array.isArray(candidate.keywords)
  ) {
    return candidate as SeoBlock;
  }
  return undefined;
}

export async function buildToolMetadata(
  category: ToolCategory,
  id: string,
  locale: Locale,
): Promise<Metadata> {
  const tool = getTool(category, id);
  if (!tool) return {};
  const dict = await getDictionary(locale);
  const dictTree = dict as unknown as DictTree;
  const seo = readSeo(dictTree, ['tools', category, id, 'seo']);

  const fallbackTools = (dictTree['tools'] as DictTree)?.[category] as DictTree | undefined;
  const fallbackTool = fallbackTools?.[id] as { name?: string; description?: string } | undefined;
  const fallbackTitle = fallbackTool?.name ?? id;
  const fallbackDesc = fallbackTool?.description ?? '';

  const title = seo?.title ?? fallbackTitle;
  const description = seo?.description ?? fallbackDesc;
  const keywords = seo?.keywords ?? tool.keywords;
  const ogTitle = seo?.ogTitle ?? title;

  return commonMetadata({ locale, path: tool.href, title, description, keywords, ogTitle });
}

export async function buildHubMetadata(locale: Locale): Promise<Metadata> {
  const dict = await getDictionary(locale);
  const dictTree = dict as unknown as DictTree;
  const meta = (dictTree['meta'] ?? {}) as { siteName?: string; tagline?: string };
  const seo = readSeo(dictTree, ['meta', 'seo']);
  const title = seo?.title ?? `${meta.siteName ?? SITE_NAME} — ${meta.tagline ?? ''}`.trim();
  const description = seo?.description ?? meta.tagline ?? '';
  const keywords = seo?.keywords ?? [];
  const ogTitle = seo?.ogTitle ?? title;
  return commonMetadata({ locale, path: '/', title, description, keywords, ogTitle });
}

export async function buildCategoryMetadata(
  category: ToolCategory,
  locale: Locale,
): Promise<Metadata> {
  const dict = await getDictionary(locale);
  const dictTree = dict as unknown as DictTree;
  const categoryNode = (dictTree['categories'] as DictTree | undefined)?.[category] as
    | { name?: string }
    | undefined;
  const hubCategories = ((dictTree['hub'] as DictTree | undefined)?.['categories'] ?? {}) as Record<
    string,
    string
  >;
  const fallbackName = categoryNode?.name ?? hubCategories[category] ?? category;
  const seo = readSeo(dictTree, ['categories', category, 'seo']);

  const title = seo?.title ?? fallbackName;
  const description = seo?.description ?? '';
  const keywords = seo?.keywords ?? [];
  const ogTitle = seo?.ogTitle ?? title;

  return commonMetadata({
    locale,
    path: `/${category}`,
    title,
    description,
    keywords,
    ogTitle,
  });
}

export async function buildPrivacyMetadata(locale: Locale): Promise<Metadata> {
  const dict = await getDictionary(locale);
  const dictTree = dict as unknown as DictTree;
  const privacy = (dictTree['privacy'] ?? {}) as { title?: string; leadParagraph?: string };
  const seo = readSeo(dictTree, ['privacy', 'seo']);
  const title = seo?.title ?? privacy.title ?? 'Privacy';
  const description = seo?.description ?? privacy.leadParagraph ?? '';
  const keywords = seo?.keywords ?? [];
  return commonMetadata({
    locale,
    path: '/privacy',
    title,
    description,
    keywords,
  });
}
