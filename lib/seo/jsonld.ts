import 'server-only';
import type { Locale } from '@/lib/i18n/config';
import { locales } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
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
    case 'password':
    case 'text':
    case 'utility':
    case 'json':
      return 'UtilitiesApplication';
    case 'dev':
      return 'DeveloperApplication';
    case 'image':
    case 'video':
    case 'audio':
    case 'pdf':
    case 'svg':
    default:
      return 'MultimediaApplication';
  }
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
  const tree = dict as unknown as Record<string, Record<string, Record<string, { name: string; description: string; seo?: { title?: string; description?: string } }>>>;
  const node = tree['tools']?.[tool.category]?.[tool.id];
  const seo = node?.seo;
  const name = seo?.title ?? node?.name ?? tool.id;
  const description = seo?.description ?? node?.description ?? '';
  const url = localizedUrl(locale, tool.href);

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
    featureList: featureListFromMime(tool.acceptedMime, locale),
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
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
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
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
  };
}

