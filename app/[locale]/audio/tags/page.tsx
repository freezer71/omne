import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { AudioTagsTool } from '@/components/tools/audio-tags-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('audio', 'tags', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.audio.tags;

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
        <AudioTagsTool
          selectButton={tool.ui.selectButton}
          empty={tool.ui.empty}
          applyButton={tool.ui.applyButton}
          busy={tool.ui.busy}
          error={tool.ui.error}
          removeFile={tool.ui.removeFile}
          titleLabel={tool.ui.titleLabel}
          artistLabel={tool.ui.artistLabel}
          albumLabel={tool.ui.albumLabel}
          albumArtistLabel={tool.ui.albumArtistLabel}
          yearLabel={tool.ui.yearLabel}
          genreLabel={tool.ui.genreLabel}
          trackLabel={tool.ui.trackLabel}
          commentLabel={tool.ui.commentLabel}
          coverHeading={tool.ui.coverHeading}
          coverHint={tool.ui.coverHint}
          coverSelect={tool.ui.coverSelect}
          coverRemove={tool.ui.coverRemove}
          coverNone={tool.ui.coverNone}
          loadingTags={tool.ui.loadingTags}
          loadTagsError={tool.ui.loadTagsError} result={dict.common.result}
        />
      </ToolShell>
      <ToolPageJsonLd category="audio" id="tags" locale={locale} />
    </>
  );
}
