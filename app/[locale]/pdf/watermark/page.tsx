import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PdfWatermarkTool } from '@/components/tools/pdf-watermark-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('pdf', 'watermark', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const ui = dict.tools.pdf.watermark.ui;
  return (
    <>
      <ToolShell
wide         locale={locale}
        category="pdf"
        name={dict.tools.pdf.watermark.name}
        description={dict.tools.pdf.watermark.description}
        categoryLabel={dict.hub.categories.pdf}
        backHomeLabel={dict.common.backHome}
      >
        <PdfWatermarkTool
          selectButton={ui.selectButton}
          empty={ui.empty}
          applyButton={ui.applyButton}
          pageLabelTemplate={ui.pageLabelTemplate}
          modeLabel={ui.modeLabel}
          modeText={ui.modeText}
          modeImage={ui.modeImage}
          textLabel={ui.textLabel}
          textPlaceholder={ui.textPlaceholder}
          fontSizeLabel={ui.fontSizeLabel}
          imageLabel={ui.imageLabel}
          imageSelectButton={ui.imageSelectButton}
          imageRemove={ui.imageRemove}
          scaleLabel={ui.scaleLabel}
          opacityLabel={ui.opacityLabel}
          angleLabel={ui.angleLabel}
          busy={ui.busy}
          error={ui.error}
          errorUnsupportedChar={ui.errorUnsupportedChar}
          removeFile={ui.removeFile}
          previewLoading={dict.common.previewLoading}
          previewError={dict.common.previewError}
        />
      </ToolShell>
      <ToolPageJsonLd category="pdf" id="watermark" locale={locale} />
    </>
  );
}
