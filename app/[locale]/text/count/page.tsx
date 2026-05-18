import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { TextCountTool } from '@/components/tools/text-count-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('text', 'count', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.text.count;

  return (
    <>
      <ToolShell
        locale={locale}
        category="text"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.text}
        backHomeLabel={dict.common.backHome}
      >
        <TextCountTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="text" id="count" locale={locale} />
    </>
  );
}
