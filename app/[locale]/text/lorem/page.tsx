import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { TextLoremTool } from '@/components/tools/text-lorem-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('text', 'lorem', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.text.lorem;

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
        <TextLoremTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="text" id="lorem" locale={locale} />
    </>
  );
}
