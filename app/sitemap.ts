import type { MetadataRoute } from 'next';
import { locales, type Locale } from '@/lib/i18n/config';
import { TOOLS } from '@/lib/tools/registry';
import { SITE_URL, localizedUrl } from '@/lib/seo/site';

type SitemapEntry = MetadataRoute.Sitemap[number];

function withLanguageAlternates(path: string): NonNullable<SitemapEntry['alternates']> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = localizedUrl(locale, path);
  languages['x-default'] = localizedUrl('en', path);
  return { languages };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: SitemapEntry[] = [];

  for (const locale of locales as readonly Locale[]) {
    entries.push({
      url: localizedUrl(locale, '/'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: withLanguageAlternates('/'),
    });
    entries.push({
      url: localizedUrl(locale, '/privacy'),
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.4,
      alternates: withLanguageAlternates('/privacy'),
    });
    for (const tool of TOOLS) {
      const priority = tool.status === 'stable' ? 0.8 : tool.status === 'beta' ? 0.5 : 0.3;
      entries.push({
        url: localizedUrl(locale, tool.href),
        lastModified,
        changeFrequency: 'monthly',
        priority,
        alternates: withLanguageAlternates(tool.href),
      });
    }
  }

  return entries;
}

export const dynamic = 'force-static';

export { SITE_URL };
