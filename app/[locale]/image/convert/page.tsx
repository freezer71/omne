import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ImageConvertTool } from '@/components/tools/image-convert-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('image', 'convert', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.image.convert;

  return (
    <ToolShell
      locale={locale}
      category="image"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.image}
      backHomeLabel={dict.common.backHome}
    >
      <ImageConvertTool
        selectButton={tool.ui.selectButton}
        empty={tool.ui.empty}
        convertButton={tool.ui.convertButton}
        format={tool.ui.format}
        formatPng={tool.ui.formatPng}
        formatJpeg={tool.ui.formatJpeg}
        formatWebp={tool.ui.formatWebp}
        previewLabel={tool.ui.previewLabel}
        previewSummary={tool.ui.previewSummary}
        busy={tool.ui.busy}
        error={tool.ui.error}
        removeFile={tool.ui.removeFile}
      />
    </ToolShell>
  );
}
