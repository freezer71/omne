import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { SvgToPngTool } from '@/components/tools/svg-to-png-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('svg', 'to-png', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.svg['to-png'];

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
        <SvgToPngTool
          selectButton={tool.ui.selectButton}
          empty={tool.ui.empty}
          pasteLabel={tool.ui.pasteLabel}
          widthLabel={tool.ui.widthLabel}
          heightLabel={tool.ui.heightLabel}
          scaleLabel={tool.ui.scaleLabel}
          scalePreset1x={tool.ui.scalePreset1x}
          scalePreset2x={tool.ui.scalePreset2x}
          scalePreset4x={tool.ui.scalePreset4x}
          formatLabel={tool.ui.formatLabel}
          backgroundLabel={tool.ui.backgroundLabel}
          transparentLabel={tool.ui.transparentLabel}
          lockAspect={tool.ui.lockAspect}
          previewLabel={tool.ui.previewLabel}
          downloadButton={tool.ui.downloadButton}
          busy={tool.ui.busy}
          error={tool.ui.error}
          removeFile={tool.ui.removeFile}
        />
      </ToolShell>
      <ToolPageJsonLd category="svg" id="to-png" locale={locale} />
    </>
  );
}
