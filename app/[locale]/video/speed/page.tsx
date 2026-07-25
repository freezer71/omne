import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { VideoSpeedTool } from '@/components/tools/video-speed-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('video', 'speed', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.video.speed;
  return (
    <>
      <ToolShell locale={locale} category="video" name={tool.name} description={tool.description}
        categoryLabel={dict.hub.categories.video} backHomeLabel={dict.common.backHome}>
        <VideoSpeedTool {...tool.ui} largeFileWarning={dict.common.largeFileWarning} result={dict.common.result} />
      </ToolShell>
      <ToolPageJsonLd category="video" id="speed" locale={locale} />
    </>
  );
}
