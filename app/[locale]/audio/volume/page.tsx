import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { AudioVolumeTool } from '@/components/tools/audio-volume-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('audio', 'volume', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.audio.volume;

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
        <AudioVolumeTool
          selectButton={tool.ui.selectButton}
          empty={tool.ui.empty}
          applyButton={tool.ui.applyButton}
          gainLabel={tool.ui.gainLabel}
          normalizeLabel={tool.ui.normalizeLabel}
          normalizeHint={tool.ui.normalizeHint}
          fadeInLabel={tool.ui.fadeInLabel}
          fadeOutLabel={tool.ui.fadeOutLabel}
          filterPreviewLabel={tool.ui.filterPreviewLabel}
          noFilterLabel={tool.ui.noFilterLabel}
          busy={tool.ui.busy}
          error={tool.ui.error}
          removeFile={tool.ui.removeFile}
          largeFileWarning={dict.common.largeFileWarning} result={dict.common.result} cancelLabel={dict.common.cancelRun} cancelledLabel={dict.common.runCancelled} mediaError={dict.common.mediaError}
        />
      </ToolShell>
      <ToolPageJsonLd category="audio" id="volume" locale={locale} />
    </>
  );
}
