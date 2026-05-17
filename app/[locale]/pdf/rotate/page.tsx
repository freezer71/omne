import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PdfRotateTool } from '@/components/tools/pdf-rotate-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('pdf', 'rotate', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const ui = dict.tools.pdf.rotate.ui;
  return (
    <>
    <ToolShell
      locale={locale}
      category="pdf"
      name={dict.tools.pdf.rotate.name}
      description={dict.tools.pdf.rotate.description}
      categoryLabel={dict.hub.categories.pdf}
      backHomeLabel={dict.common.backHome}
    >
      <PdfRotateTool
        selectButton={ui.selectButton}
        empty={ui.empty}
        rotateButton={ui.rotateButton}
        pageLabelTemplate={ui.pageLabelTemplate}
        rotatePageLabelTemplate={ui.rotatePageLabelTemplate}
        rotateAll90={ui.rotateAll90}
        rotateAll180={ui.rotateAll180}
        rotateAll270={ui.rotateAll270}
        resetAll={ui.resetAll}
        busy={ui.busy}
        error={ui.error}
        removeFile={ui.removeFile}
        previewLoading={dict.common.previewLoading}
        previewError={dict.common.previewError}
      />
    </ToolShell>
      <ToolPageJsonLd category="pdf" id="rotate" locale={locale} />
    </>
  );
}
