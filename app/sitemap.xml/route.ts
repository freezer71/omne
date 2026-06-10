import { locales, type Locale } from '@/lib/i18n/config';
import { TOOLS } from '@/lib/tools/registry';
import { TOOL_CATEGORIES, type ToolCategory } from '@/lib/tools/types';
import { localizedUrl } from '@/lib/seo/site';
import { lastmodFor } from '@/lib/seo/lastmod';

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
  priority: number;
};

function buildEntries(): Entry[] {
  const entries: Entry[] = [];
  const populatedCategories = new Set<ToolCategory>(TOOLS.map((t) => t.category));
  for (const locale of locales) {
    entries.push({ path: '/', locale, priority: 1 });
    entries.push({ path: '/privacy', locale, priority: 0.4 });
    for (const category of TOOL_CATEGORIES) {
      if (populatedCategories.has(category)) {
        entries.push({
          path: `/${category}`,
          locale,
          priority: 0.7,
        });
      }
    }
    for (const tool of TOOLS) {
      entries.push({
        path: tool.href,
        locale,
        priority: priorityFor(tool.status),
      });
    }
  }
  return entries;
}

function renderUrl(entry: Entry): string {
  const loc = xmlEscape(localizedUrl(entry.locale, entry.path));
  const alts = locales
    .map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(localizedUrl(l, entry.path))}"/>`,
    )
    .join('\n');
  const xdef = `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(localizedUrl('en', entry.path))}"/>`;
  // Omitting <lastmod> is valid per the sitemap protocol — more honest than an
  // invented date when a path is missing from lib/seo/lastmod.json.
  const lastmod = lastmodFor(entry.path);
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    alts,
    xdef,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}

export function GET(): Response {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    buildEntries()
      .map((e) => renderUrl(e))
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
