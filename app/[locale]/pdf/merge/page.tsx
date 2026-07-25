import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PdfMergeTool } from '@/components/tools/pdf-merge-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('pdf', 'merge', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.pdf.merge;

  return (
    <>
      <ToolShell
        locale={locale}
        category="pdf"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.pdf}
        backHomeLabel={dict.common.backHome}
      >
        <PdfMergeTool
        selectButton={tool.ui.selectButton}
        empty={tool.ui.empty}
        mergeButton={tool.ui.mergeButton}
        removeFile={tool.ui.removeFile}
        moveUp={tool.ui.moveUp}
        moveDown={tool.ui.moveDown}
        dragHandle={tool.ui.dragHandle}
        busy={tool.ui.busy}
        error={tool.ui.error}
        previewLoading={dict.common.previewLoading}
        previewError={dict.common.previewError}
        pageLabelTemplate={tool.ui.pageLabelTemplate}
        filesCountSingular={tool.ui.filesCountSingular}
        filesCountPlural={tool.ui.filesCountPlural}
        />
      </ToolShell>
      <ToolPageJsonLd category="pdf" id="merge" locale={locale} />
    </>
  );
}
