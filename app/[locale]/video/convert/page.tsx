import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { VideoConvertTool } from '@/components/tools/video-convert-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('video', 'convert', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.video.convert;

  return (
    <>
    <ToolShell
      locale={locale}
      category="video"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.video}
      backHomeLabel={dict.common.backHome}
    >
      <VideoConvertTool
        selectButton={tool.ui.selectButton}
        empty={tool.ui.empty}
        convertButton={tool.ui.convertButton}
        format={tool.ui.format}
        formatMp4={tool.ui.formatMp4}
        formatWebm={tool.ui.formatWebm}
        formatMov={tool.ui.formatMov}
        formatGif={tool.ui.formatGif}
        outputLabel={tool.ui.outputLabel}
        busy={tool.ui.busy}
        error={tool.ui.error}
        removeFile={tool.ui.removeFile}
        etaLabel={tool.ui.etaLabel}
        etaCalculating={tool.ui.etaCalculating}
        largeFileWarning={dict.common.largeFileWarning} result={dict.common.result}
      />
    </ToolShell>
      <ToolPageJsonLd category="video" id="convert" locale={locale} />
    </>
  );
}
