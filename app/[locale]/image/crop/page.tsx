import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { ImageCropTool } from '@/components/tools/image-crop-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('image', 'crop', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.image.crop;

  return (
    <>
    <ToolShell
wide       locale={locale}
      category="image"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.image}
      backHomeLabel={dict.common.backHome}
    >
      <ImageCropTool
        selectButton={tool.ui.selectButton}
        empty={tool.ui.empty}
        cropButton={tool.ui.cropButton}
        xLabel={tool.ui.xLabel}
        yLabel={tool.ui.yLabel}
        widthLabel={tool.ui.widthLabel}
        heightLabel={tool.ui.heightLabel}
        hint={tool.ui.hint}
        previewLabel={tool.ui.previewLabel}
        previewEmpty={tool.ui.previewEmpty}
        busy={tool.ui.busy}
        error={tool.ui.error}
        removeFile={tool.ui.removeFile}
      />
    </ToolShell>
      <ToolPageJsonLd category="image" id="crop" locale={locale} />
    </>
  );
}
