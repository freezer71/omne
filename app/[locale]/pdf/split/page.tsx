import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { PdfSplitTool } from '@/components/tools/pdf-split-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('pdf', 'split', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const ui = dict.tools.pdf.split.ui;
  return (
    <ToolShell
      locale={locale}
      category="pdf"
      name={dict.tools.pdf.split.name}
      description={dict.tools.pdf.split.description}
      categoryLabel={dict.hub.categories.pdf}
      backHomeLabel={dict.common.backHome}
    >
      <PdfSplitTool
        selectButton={ui.selectButton}
        empty={ui.empty}
        pageLabelTemplate={ui.pageLabelTemplate}
        selectedCountTemplate={ui.selectedCountTemplate}
        downloadSeparate={ui.downloadSeparate}
        extractSelection={ui.extractSelection}
        downloadAll={ui.downloadAll}
        busy={ui.busy}
        error={ui.error}
        removeFile={ui.removeFile}
        previewLoading={dict.common.previewLoading}
        previewError={dict.common.previewError}
      />
    </ToolShell>
  );
}
