import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PdfResizeTool } from '@/components/tools/pdf-resize-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('pdf', 'resize', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const ui = dict.tools.pdf.resize.ui;
  return (
    <>
    <ToolShell
wide       locale={locale}
      category="pdf"
      name={dict.tools.pdf.resize.name}
      description={dict.tools.pdf.resize.description}
      categoryLabel={dict.hub.categories.pdf}
      backHomeLabel={dict.common.backHome}
    >
      <PdfResizeTool
        selectButton={ui.selectButton}
        empty={ui.empty}
        resizeButton={ui.resizeButton}
        pageLabelTemplate={ui.pageLabelTemplate}
        removeFile={ui.removeFile}
        busy={ui.busy}
        error={ui.error}
        pageSizeLabel={ui.pageSizeLabel}
        presetA3={ui.presetA3}
        presetA4={ui.presetA4}
        presetA5={ui.presetA5}
        presetLetter={ui.presetLetter}
        presetLegal={ui.presetLegal}
        presetCustom={ui.presetCustom}
        widthLabel={ui.widthLabel}
        heightLabel={ui.heightLabel}
        unitMm={ui.unitMm}
        unitInch={ui.unitInch}
        orientationLabel={ui.orientationLabel}
        orientationPortrait={ui.orientationPortrait}
        orientationLandscape={ui.orientationLandscape}
        fitModeLabel={ui.fitModeLabel}
        fitModeFit={ui.fitModeFit}
        fitModeFill={ui.fitModeFill}
        fitModeStretch={ui.fitModeStretch}
        currentSizeTemplate={ui.currentSizeTemplate}
        targetSizeTemplate={ui.targetSizeTemplate}
        previewLoading={dict.common.previewLoading}
        previewError={dict.common.previewError}
      />
    </ToolShell>
      <ToolPageJsonLd category="pdf" id="resize" locale={locale} />
    </>
  );
}
