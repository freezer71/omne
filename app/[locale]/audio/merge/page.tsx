import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { AudioMergeTool } from '@/components/tools/audio-merge-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('audio', 'merge', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.audio.merge;

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
        <AudioMergeTool
          selectButton={tool.ui.selectButton}
          empty={tool.ui.empty}
          mergeButton={tool.ui.mergeButton}
          format={tool.ui.format}
          formatMp3={tool.ui.formatMp3}
          formatWav={tool.ui.formatWav}
          formatFlac={tool.ui.formatFlac}
          formatM4a={tool.ui.formatM4a}
          bitrate={tool.ui.bitrate}
          busy={tool.ui.busy}
          error={tool.ui.error}
          removeFile={tool.ui.removeFile}
          moveUpLabel={tool.ui.moveUpLabel}
          moveDownLabel={tool.ui.moveDownLabel}
          totalLabel={tool.ui.totalLabel}
          needMore={tool.ui.needMore}
        />
      </ToolShell>
      <ToolPageJsonLd category="audio" id="merge" locale={locale} />
    </>
  );
}
