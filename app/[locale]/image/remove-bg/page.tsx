import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { ImageRemoveBgTool } from '@/components/tools/image-remove-bg-tool';
import { EnsureCrossOriginIsolated } from '@/components/ensure-cross-origin-isolated';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('image', 'remove-bg', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.image['remove-bg'];

  return (
    <>
    {/* /image/remove-bg is COOP/COEP-isolated (FFMPEG_ROUTES in next.config.ts) */}
    <EnsureCrossOriginIsolated />
    <ToolShell
      locale={locale}
      category="image"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.image}
      backHomeLabel={dict.common.backHome}
    >
      <ImageRemoveBgTool
        selectButton={tool.ui.selectButton}
        empty={tool.ui.empty}
        removeButton={tool.ui.removeButton}
        downloadButton={tool.ui.downloadButton}
        resetButton={tool.ui.resetButton}
        resultLabel={tool.ui.resultLabel}
        modelNotice={tool.ui.modelNotice}
        modelLoading={tool.ui.modelLoading}
        busy={tool.ui.busy}
        error={tool.ui.error}
        removeFile={tool.ui.removeFile}
      />
    </ToolShell>
      <ToolPageJsonLd category="image" id="remove-bg" locale={locale} />
    </>
  );
}
