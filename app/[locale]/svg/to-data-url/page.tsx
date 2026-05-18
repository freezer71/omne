import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { SvgToDataUrlTool } from '@/components/tools/svg-to-data-url-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('svg', 'to-data-url', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.svg['to-data-url'];

  return (
    <>
      <ToolShell
        locale={locale}
        category="svg"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.svg}
        backHomeLabel={dict.common.backHome}
      >
        <SvgToDataUrlTool
          pasteLabel={tool.ui.pasteLabel}
          selectButton={tool.ui.selectButton}
          dropLabel={tool.ui.dropLabel}
          empty={tool.ui.empty}
          base64Label={tool.ui.base64Label}
          urlEncodedLabel={tool.ui.urlEncodedLabel}
          copyButton={tool.ui.copyButton}
          copied={tool.ui.copied}
          previewLabel={tool.ui.previewLabel}
          bytesLabel={tool.ui.bytesLabel}
        />
      </ToolShell>
      <ToolPageJsonLd category="svg" id="to-data-url" locale={locale} />
    </>
  );
}
