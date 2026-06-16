import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { XmlFormatTool } from '@/components/tools/xml-format-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('xml', 'format', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.xml.format;

  return (
    <>
      <ToolShell
        locale={locale}
        category="xml"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.xml}
        backHomeLabel={dict.common.backHome}
      >
        <XmlFormatTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="xml" id="format" locale={locale} />
    </>
  );
}
