import { buildOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/build';
import { isLocale } from '@/lib/i18n/config';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'omne — SVG viewer';

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  return buildOgImage({ kind: 'tool', locale, category: 'svg', id: 'viewer' });
}
