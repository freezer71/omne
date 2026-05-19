import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { VideoCompressTool } from '@/components/tools/video-compress-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('video', 'compress', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.video.compress;

  return (
    <>
      <ToolShell locale={locale} category="video" name={tool.name} description={tool.description}
        categoryLabel={dict.hub.categories.video} backHomeLabel={dict.common.backHome}>
        <VideoCompressTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="video" id="compress" locale={locale} />
    </>
  );
}
