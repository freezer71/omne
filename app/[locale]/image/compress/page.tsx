import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ImageCompressTool } from '@/components/tools/image-compress-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('image', 'compress', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.image.compress;

  return (
    <ToolShell
      locale={locale}
      category="image"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.image}
      backHomeLabel={dict.common.backHome}
    >
      <ImageCompressTool
        selectButton={tool.ui.selectButton}
        empty={tool.ui.empty}
        compressButton={tool.ui.compressButton}
        qualityLabel={tool.ui.qualityLabel}
        format={tool.ui.format}
        formatJpeg={tool.ui.formatJpeg}
        formatWebp={tool.ui.formatWebp}
        previewLabel={tool.ui.previewLabel}
        previewSummary={tool.ui.previewSummary}
        previewComparison={tool.ui.previewComparison}
        busy={tool.ui.busy}
        error={tool.ui.error}
        removeFile={tool.ui.removeFile}
      />
    </ToolShell>
  );
}
