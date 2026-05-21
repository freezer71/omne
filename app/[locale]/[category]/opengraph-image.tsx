import { buildOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/build';
import { isLocale } from '@/lib/i18n/config';
import { isToolCategory } from '@/lib/tools/types';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'omne — category tools';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!isLocale(locale) || !isToolCategory(category)) {
    return new Response(null, { status: 404 });
  }
  return buildOgImage({ kind: 'category', locale, category });
}
