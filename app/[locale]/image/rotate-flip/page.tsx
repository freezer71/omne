import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { ImageRotateTool } from '@/components/tools/image-rotate-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('image', 'rotate-flip', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.image['rotate-flip'];

  return (
    <>
    <ToolShell
      locale={locale}
      category="image"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.image}
      backHomeLabel={dict.common.backHome}
    >
      <ImageRotateTool
        selectButton={tool.ui.selectButton}
        empty={tool.ui.empty}
        applyButton={tool.ui.applyButton}
        rotate90={tool.ui.rotate90}
        rotate180={tool.ui.rotate180}
        rotate270={tool.ui.rotate270}
        flipH={tool.ui.flipH}
        flipV={tool.ui.flipV}
        reset={tool.ui.reset}
        busy={tool.ui.busy}
        error={tool.ui.error}
        removeFile={tool.ui.removeFile}
      />
    </ToolShell>
      <ToolPageJsonLd category="image" id="rotate-flip" locale={locale} />
    </>
  );
}
