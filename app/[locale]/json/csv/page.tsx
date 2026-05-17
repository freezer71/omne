import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { JsonCsvTool } from '@/components/tools/json-csv-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('json', 'csv', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.json.csv;

  return (
    <>
      <ToolShell
        locale={locale}
        category="json"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.json}
        backHomeLabel={dict.common.backHome}
      >
        <JsonCsvTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="json" id="csv" locale={locale} />
    </>
  );
}
