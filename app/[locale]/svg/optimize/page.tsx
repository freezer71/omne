import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { SvgOptimizeTool } from '@/components/tools/svg-optimize-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('svg', 'optimize', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.svg.optimize;

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
        <SvgOptimizeTool
          pasteLabel={tool.ui.pasteLabel}
          selectButton={tool.ui.selectButton}
          dropLabel={tool.ui.dropLabel}
          empty={tool.ui.empty}
          precisionLabel={tool.ui.precisionLabel}
          cleanupIdsLabel={tool.ui.cleanupIdsLabel}
          removeViewBoxLabel={tool.ui.removeViewBoxLabel}
          multipassLabel={tool.ui.multipassLabel}
          beforeLabel={tool.ui.beforeLabel}
          afterLabel={tool.ui.afterLabel}
          savingsLabel={tool.ui.savingsLabel}
          downloadButton={tool.ui.downloadButton}
          copyButton={tool.ui.copyButton}
          copied={tool.ui.copied}
          busy={tool.ui.busy}
          error={tool.ui.error}
        />
      </ToolShell>
      <ToolPageJsonLd category="svg" id="optimize" locale={locale} />
    </>
  );
}
