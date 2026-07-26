import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { AudioTrimTool } from '@/components/tools/audio-trim-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('audio', 'trim', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.audio.trim;

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
        <AudioTrimTool
          selectButton={tool.ui.selectButton}
          empty={tool.ui.empty}
          trimButton={tool.ui.trimButton}
          startLabel={tool.ui.startLabel}
          endLabel={tool.ui.endLabel}
          preciseLabel={tool.ui.preciseLabel}
          preciseHint={tool.ui.preciseHint}
          busy={tool.ui.busy}
          error={tool.ui.error}
          removeFile={tool.ui.removeFile}
          clipDurationLabel={tool.ui.clipDurationLabel}
          timelineLabel={tool.ui.timelineLabel}
          startHandleLabel={tool.ui.startHandleLabel}
          endHandleLabel={tool.ui.endHandleLabel}
          playLabel={tool.ui.playLabel}
          pauseLabel={tool.ui.pauseLabel}
          muteLabel={tool.ui.muteLabel}
          unmuteLabel={tool.ui.unmuteLabel}
          largeFileWarning={dict.common.largeFileWarning} result={dict.common.result} cancelLabel={dict.common.cancelRun} cancelledLabel={dict.common.runCancelled} mediaError={dict.common.mediaError}
        />
      </ToolShell>
      <ToolPageJsonLd category="audio" id="trim" locale={locale} />
    </>
  );
}
