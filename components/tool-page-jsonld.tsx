import 'server-only';
import type { Locale } from '@/lib/i18n/config';
import { getTool } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';
import { toolJsonLd, toolBreadcrumbJsonLd } from '@/lib/seo/jsonld';
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
  const [appData, breadcrumbData] = await Promise.all([
    toolJsonLd(tool, locale),
    toolBreadcrumbJsonLd(tool, locale),
  ]);
  return (
    <>
      <JsonLd data={appData} id={`omne-jsonld-${category}-${id}`} />
      <JsonLd data={breadcrumbData} id={`omne-breadcrumb-${category}-${id}`} />
      <ToolFooterSeo category={category} id={id} locale={locale} />
    </>
  );
}
