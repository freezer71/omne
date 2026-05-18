import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PdfExtractImagesTool } from '@/components/tools/pdf-extract-images-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('pdf', 'extract-images', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const ui = dict.tools.pdf['extract-images'].ui;
  return (
    <>
      <ToolShell
        locale={locale}
        category="pdf"
        name={dict.tools.pdf['extract-images'].name}
        description={dict.tools.pdf['extract-images'].description}
        categoryLabel={dict.hub.categories.pdf}
        backHomeLabel={dict.common.backHome}
      >
        <PdfExtractImagesTool
          selectButton={ui.selectButton}
          empty={ui.empty}
          extracting={ui.extracting}
          noImages={ui.noImages}
          imageLabelTemplate={ui.imageLabelTemplate}
          downloadImageLabelTemplate={ui.downloadImageLabelTemplate}
          downloadAllZip={ui.downloadAllZip}
          busy={ui.busy}
          error={ui.error}
          removeFile={ui.removeFile}
          countTemplate={ui.countTemplate}
          countTemplatePlural={ui.countTemplatePlural}
        />
      </ToolShell>
      <ToolPageJsonLd category="pdf" id="extract-images" locale={locale} />
    </>
  );
}
