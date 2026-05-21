import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';
import { TOOL_CATEGORIES } from '@/lib/tools/types';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          ...TOOL_CATEGORIES.map((category) => `/${category}/`),
          '/privacy',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

export const dynamic = 'force-static';
