import 'server-only';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { TOOLS } from '@/lib/tools/registry';
import type { ToolCategory, ToolMeta } from '@/lib/tools/types';
import { SITE_NAME, SITE_URL, localizedUrl } from './site';

const PDF_MIME_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
};
const IMAGE_MIME_LABEL: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WebP',
};
const VIDEO_MIME_LABEL: Record<string, string> = {
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/quicktime': 'MOV',
  'video/x-matroska': 'MKV',
};
const AUDIO_MIME_LABEL: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/flac': 'FLAC',
  'audio/x-flac': 'FLAC',
  'audio/aac': 'AAC',
  'audio/mp4': 'M4A',
  'audio/x-m4a': 'M4A',
  'audio/ogg': 'OGG',
  'audio/opus': 'Opus',
  'audio/webm': 'WebM',
};
const MIME_LABEL: Record<string, string> = {
  ...PDF_MIME_LABEL,
  ...IMAGE_MIME_LABEL,
  ...VIDEO_MIME_LABEL,
  ...AUDIO_MIME_LABEL,
};

function applicationCategory(category: ToolCategory): string {
  switch (category) {
    case 'image':
    case 'video':
    case 'audio':
    case 'pdf':
      return 'MultimediaApplication';
    case 'svg':
      return 'DesignApplication';
    case 'dev':
      return 'DeveloperApplication';
    case 'password':
    case 'text':
    case 'json':
    case 'encode':
    case 'color':
    case 'qr':
    case 'utility':
    default:
      return 'UtilitiesApplication';
  }
}

function organizationSchema(): JsonLd {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon.svg`,
      width: 512,
      height: 512,
    },
  };
}

function breadcrumbHomeLabel(locale: Locale): string {
  return locale === 'fr' ? 'Accueil' : 'Home';
}

function localeTag(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'fr-FR';
}

function privacyClaim(locale: Locale): string {
  return locale === 'fr'
    ? 'Exécution 100 % locale dans le navigateur — aucun fichier envoyé.'
    : 'Runs 100% locally in the browser — no file uploaded.';
}

function featureListFromMime(mime: string[], locale: Locale): string[] {
  const labels = Array.from(new Set(mime.map((m) => MIME_LABEL[m] ?? m).filter(Boolean)));
  if (labels.length === 0) return [privacyClaim(locale)];
  const prefix = locale === 'fr' ? 'Formats pris en charge :' : 'Supported formats:';
  return [`${prefix} ${labels.join(', ')}`, privacyClaim(locale)];
}

export type JsonLd = Record<string, unknown>;

export async function toolJsonLd(
  tool: ToolMeta,
  locale: Locale,
): Promise<JsonLd> {
  const dict = await getDictionary(locale);
  const tree = dict as unknown as Record<string, Record<string, Record<string, { name: string; description: string; seo?: { title?: string; description?: string }; content?: { features?: string[] } }>>>;
  const node = tree['tools']?.[tool.category]?.[tool.id];
  const seo = node?.seo;
  const name = seo?.title ?? node?.name ?? tool.id;
  const description = seo?.description ?? node?.description ?? '';
  const url = localizedUrl(locale, tool.href);

  const dictFeatures = node?.content?.features ?? [];
  const mimeFeatures = featureListFromMime(tool.acceptedMime, locale);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: applicationCategory(tool.category),
    operatingSystem: 'Web Browser',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    inLanguage: localeTag(locale),
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [...dictFeatures, ...mimeFeatures],
    author: organizationSchema(),
  };
}

export async function toolBreadcrumbJsonLd(
  tool: ToolMeta,
  locale: Locale,
): Promise<JsonLd> {
  const dict = await getDictionary(locale);
  const tree = dict as unknown as Record<string, Record<string, unknown>>;
  const hub = tree['hub'] as { categories?: Record<string, string> } | undefined;
  const categoryLabel = hub?.categories?.[tool.category] ?? tool.category;
  const tools = tree['tools'] as Record<string, Record<string, { name?: string; seo?: { title?: string } }>> | undefined;
  const node = tools?.[tool.category]?.[tool.id];
  const toolName = node?.seo?.title ?? node?.name ?? tool.id;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: breadcrumbHomeLabel(locale),
        item: localizedUrl(locale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryLabel,
        item: localizedUrl(locale, `/${tool.category}`),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: toolName,
        item: localizedUrl(locale, tool.href),
      },
    ],
  };
}

export async function siteJsonLd(locale: Locale): Promise<JsonLd> {
  const dict = await getDictionary(locale);
  const tree = dict as unknown as Record<string, Record<string, unknown>>;
  const meta = (tree['meta'] ?? {}) as { siteName?: string; tagline?: string; seo?: { description?: string } };
  const description = meta.seo?.description ?? meta.tagline ?? '';
  const homeUrl = localizedUrl(locale, '/');

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: meta.siteName ?? SITE_NAME,
    description,
    url: homeUrl,
    inLanguage: locales.map(localeTag),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/${locale}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: organizationSchema(),
  };
}

export async function categoryJsonLd(
  category: ToolCategory,
  locale: Locale,
): Promise<JsonLd> {
  const dict = await getDictionary(locale);
  const tree = dict as unknown as Record<string, Record<string, unknown>>;
  const categoryNode = (tree['categories']?.[category] ?? {}) as {
    name?: string;
    seo?: { title?: string; description?: string };
  };
  const hubCategories = (tree['hub']?.['categories'] ?? {}) as Record<string, string>;
  const toolsDict = (tree['tools']?.[category] ?? {}) as Record<
    string,
    { name?: string; description?: string }
  >;

  const name = categoryNode.seo?.title ?? categoryNode.name ?? hubCategories[category] ?? category;
  const description = categoryNode.seo?.description ?? '';
  const url = localizedUrl(locale, `/${category}`);

  const tools = TOOLS.filter((t) => t.category === category);
  const itemListElement = tools.map((t, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: localizedUrl(locale, t.href),
    name: toolsDict[t.id]?.name ?? t.id,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    inLanguage: localeTag(locale),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    publisher: organizationSchema(),
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: itemListElement.length,
      itemListElement,
    },
  };
}

export async function categoryBreadcrumbJsonLd(
  category: ToolCategory,
  locale: Locale,
): Promise<JsonLd> {
  const dict = await getDictionary(locale);
  const tree = dict as unknown as Record<string, Record<string, unknown>>;
  const categoryNode = (tree['categories']?.[category] ?? {}) as {
    name?: string;
    seo?: { title?: string };
  };
  const hubCategories = (tree['hub']?.['categories'] ?? {}) as Record<string, string>;
  const label = categoryNode.name ?? hubCategories[category] ?? category;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: breadcrumbHomeLabel(locale),
        item: localizedUrl(locale, '/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: localizedUrl(locale, `/${category}`),
      },
    ],
  };
}

export async function privacyJsonLd(locale: Locale): Promise<JsonLd> {
  const dict = await getDictionary(locale);
  const tree = dict as unknown as Record<string, Record<string, unknown>>;
  const privacy = (tree['privacy'] ?? {}) as { title?: string; leadParagraph?: string; seo?: { description?: string } };
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: privacy.title ?? 'Privacy',
    description: privacy.seo?.description ?? privacy.leadParagraph ?? '',
    url: localizedUrl(locale, '/privacy'),
    inLanguage: localeTag(locale),
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: organizationSchema(),
  };
}

