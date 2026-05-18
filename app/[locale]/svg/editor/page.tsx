import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { SvgEditorTool } from '@/components/tools/svg-editor-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('svg', 'editor', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.svg.editor;

  return (
    <>
      <ToolShell
        locale={locale}
        category="svg"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.svg}
        backHomeLabel={dict.common.backHome}
        wide
      >
        <SvgEditorTool
          pasteLabel={tool.ui.pasteLabel}
          selectButton={tool.ui.selectButton}
          dropLabel={tool.ui.dropLabel}
          empty={tool.ui.empty}
          sourceLabel={tool.ui.sourceLabel}
          previewLabel={tool.ui.previewLabel}
          controlsLabel={tool.ui.controlsLabel}
          dimensionsLabel={tool.ui.dimensionsLabel}
          widthLabel={tool.ui.widthLabel}
          heightLabel={tool.ui.heightLabel}
          viewBoxLabel={tool.ui.viewBoxLabel}
          preserveAspectRatioLabel={tool.ui.preserveAspectRatioLabel}
          colorsLabel={tool.ui.colorsLabel}
          colorsEmpty={tool.ui.colorsEmpty}
          transformLabel={tool.ui.transformLabel}
          rotateLabel={tool.ui.rotateLabel}
          scaleLabel={tool.ui.scaleLabel}
          translateXLabel={tool.ui.translateXLabel}
          translateYLabel={tool.ui.translateYLabel}
          resetTransformButton={tool.ui.resetTransformButton}
          backgroundLabel={tool.ui.backgroundLabel}
          transparentLabel={tool.ui.transparentLabel}
          showBoundsLabel={tool.ui.showBoundsLabel}
          formatButton={tool.ui.formatButton}
          downloadButton={tool.ui.downloadButton}
          copyButton={tool.ui.copyButton}
          copied={tool.ui.copied}
          resetButton={tool.ui.resetButton}
          busy={tool.ui.busy}
          error={tool.ui.error}
        />
      </ToolShell>
      <ToolPageJsonLd category="svg" id="editor" locale={locale} />
    </>
  );
}
