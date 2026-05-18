import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { ColorConvertTool } from '@/components/tools/color-convert-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('color', 'convert', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.color.convert;

  return (
    <>
      <ToolShell
        locale={locale}
        category="color"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.color}
        backHomeLabel={dict.common.backHome}
      >
        <ColorConvertTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="color" id="convert" locale={locale} />
    </>
  );
}
