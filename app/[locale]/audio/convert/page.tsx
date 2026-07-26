import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { AudioConvertTool } from '@/components/tools/audio-convert-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('audio', 'convert', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.audio.convert;

  return (
    <>
      <ToolShell
        locale={locale}
        category="audio"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.audio}
        backHomeLabel={dict.common.backHome}
      >
        <AudioConvertTool
          selectButton={tool.ui.selectButton}
          empty={tool.ui.empty}
          convertButton={tool.ui.convertButton}
          format={tool.ui.format}
          formatMp3={tool.ui.formatMp3}
          formatWav={tool.ui.formatWav}
          formatFlac={tool.ui.formatFlac}
          formatAac={tool.ui.formatAac}
          formatOpus={tool.ui.formatOpus}
          formatM4a={tool.ui.formatM4a}
          bitrate={tool.ui.bitrate}
          busy={tool.ui.busy}
          error={tool.ui.error}
          removeFile={tool.ui.removeFile}
          outputLabel={tool.ui.outputLabel}
          estimatedSizeLabel={tool.ui.estimatedSizeLabel}
          etaLabel={tool.ui.etaLabel}
          etaCalculating={tool.ui.etaCalculating}
          largeFileWarning={dict.common.largeFileWarning} result={dict.common.result} cancelLabel={dict.common.cancelRun} cancelledLabel={dict.common.runCancelled} mediaError={dict.common.mediaError}
        />
      </ToolShell>
      <ToolPageJsonLd category="audio" id="convert" locale={locale} />
    </>
  );
}
