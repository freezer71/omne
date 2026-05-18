import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { SvgViewerTool } from '@/components/tools/svg-viewer-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('svg', 'viewer', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.svg.viewer;

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
        <SvgViewerTool
          pasteLabel={tool.ui.pasteLabel}
          selectButton={tool.ui.selectButton}
          dropLabel={tool.ui.dropLabel}
          empty={tool.ui.empty}
          sourceLabel={tool.ui.sourceLabel}
          infoLabel={tool.ui.infoLabel}
          widthLabel={tool.ui.widthLabel}
          heightLabel={tool.ui.heightLabel}
          viewBoxLabel={tool.ui.viewBoxLabel}
          elementsLabel={tool.ui.elementsLabel}
          sizeLabel={tool.ui.sizeLabel}
          previewLabel={tool.ui.previewLabel}
          copyButton={tool.ui.copyButton}
          copied={tool.ui.copied}
          error={tool.ui.error}
        />
      </ToolShell>
      <ToolPageJsonLd category="svg" id="viewer" locale={locale} />
    </>
  );
}
