import { locales, type Locale } from '@/lib/i18n/config';
import { TOOLS } from '@/lib/tools/registry';
import { localizedUrl } from '@/lib/seo/site';

export const dynamic = 'force-static';

const XML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ESCAPE[c]!);
}

function priorityFor(status: string): number {
  if (status === 'stable') return 0.8;
  if (status === 'beta') return 0.5;
  return 0.3;
}

type Entry = {
  path: string;
  locale: Locale;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: number;
};

function buildEntries(): Entry[] {
  const entries: Entry[] = [];
  for (const locale of locales) {
    entries.push({ path: '/', locale, changefreq: 'weekly', priority: 1 });
    entries.push({ path: '/privacy', locale, changefreq: 'yearly', priority: 0.4 });
    for (const tool of TOOLS) {
      entries.push({
        path: tool.href,
        locale,
        changefreq: 'monthly',
        priority: priorityFor(tool.status),
      });
    }
  }
  return entries;
}

function renderUrl(entry: Entry, lastmod: string): string {
  const loc = xmlEscape(localizedUrl(entry.locale, entry.path));
  const alts = locales
    .map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(localizedUrl(l, entry.path))}"/>`,
    )
    .join('\n');
  const xdef = `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(localizedUrl('en', entry.path))}"/>`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    alts,
    xdef,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}

export function GET(): Response {
  const lastmod = new Date().toISOString();
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    buildEntries()
      .map((e) => renderUrl(e, lastmod))
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
