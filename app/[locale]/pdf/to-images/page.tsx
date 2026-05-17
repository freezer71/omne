import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PdfToImagesTool } from '@/components/tools/pdf-to-images-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('pdf', 'to-images', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const ui = dict.tools.pdf['to-images'].ui;
  return (
    <>
    <ToolShell
      locale={locale}
      category="pdf"
      name={dict.tools.pdf['to-images'].name}
      description={dict.tools.pdf['to-images'].description}
      categoryLabel={dict.hub.categories.pdf}
      backHomeLabel={dict.common.backHome}
    >
      <PdfToImagesTool
        selectButton={ui.selectButton}
        empty={ui.empty}
        format={ui.format}
        formatPng={ui.formatPng}
        formatJpg={ui.formatJpg}
        pageLabelTemplate={ui.pageLabelTemplate}
        downloadPageLabelTemplate={ui.downloadPageLabelTemplate}
        downloadAllZip={ui.downloadAllZip}
        busy={ui.busy}
        error={ui.error}
        removeFile={ui.removeFile}
        previewLoading={dict.common.previewLoading}
        previewError={dict.common.previewError}
      />
    </ToolShell>
      <ToolPageJsonLd category="pdf" id="to-images" locale={locale} />
    </>
  );
}
