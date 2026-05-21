import 'server-only';
import type { Locale } from '@/lib/i18n/config';
import { getTool } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';
import { toolJsonLd } from '@/lib/seo/jsonld';
import { JsonLd } from './json-ld';
import { ToolFooterSeo } from './tool-footer-seo';

type Props = {
  category: ToolCategory;
  id: string;
  locale: Locale;
};

export async function ToolPageJsonLd({ category, id, locale }: Props) {
  const tool = getTool(category, id);
  if (!tool) return null;
  const data = await toolJsonLd(tool, locale);
  return (
    <>
      <JsonLd data={data} id={`omne-jsonld-${category}-${id}`} />
      <ToolFooterSeo category={category} id={id} locale={locale} />
    </>
  );
}
