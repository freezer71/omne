import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { FaviconFromSvgTool } from '@/components/tools/favicon-from-svg-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('svg', 'favicon', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.svg.favicon;

  return (
    <>
      <ToolShell
        locale={locale}
        category="svg"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.svg}
        backHomeLabel={dict.common.backHome}
      >
        <FaviconFromSvgTool
          pasteLabel={tool.ui.pasteLabel}
          dropLabel={tool.ui.dropLabel}
          empty={tool.ui.empty}
          appNameLabel={tool.ui.appNameLabel}
          previewLabel={tool.ui.previewLabel}
          previewLargeLabel={tool.ui.previewLargeLabel}
          previewSmallLabel={tool.ui.previewSmallLabel}
          downloadButton={tool.ui.downloadButton}
          includesLabel={tool.ui.includesLabel}
          busy={tool.ui.busy}
          error={tool.ui.error}
        />
      </ToolShell>
      <ToolPageJsonLd category="svg" id="favicon" locale={locale} />
    </>
  );
}
