import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { ImageFromClipboardTool } from '@/components/tools/image-from-clipboard-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('image', 'from-clipboard', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.image['from-clipboard'];

  return (
    <>
      <ToolShell
        locale={locale}
        category="image"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.image}
        backHomeLabel={dict.common.backHome}
      >
        <ImageFromClipboardTool
          pasteButton={tool.ui.pasteButton}
          empty={tool.ui.empty}
          downloadButton={tool.ui.downloadButton}
          format={tool.ui.format}
          formatPng={tool.ui.formatPng}
          formatJpeg={tool.ui.formatJpeg}
          formatWebp={tool.ui.formatWebp}
          previewLabel={tool.ui.previewLabel}
          previewSummary={tool.ui.previewSummary}
          busy={tool.ui.busy}
          errorEmpty={tool.ui.errorEmpty}
          errorPermission={tool.ui.errorPermission}
          errorGeneric={tool.ui.errorGeneric}
          replace={tool.ui.replace}
        />
      </ToolShell>
      <ToolPageJsonLd category="image" id="from-clipboard" locale={locale} />
    </>
  );
}
