import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { QrBarcodeGenerateTool } from '@/components/tools/qr-barcode-generate-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('qr', 'barcode-generate', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.qr['barcode-generate'];
  return (
    <>
      <ToolShell locale={locale} category="qr" name={tool.name} description={tool.description}
        categoryLabel={dict.hub.categories.qr} backHomeLabel={dict.common.backHome}>
        <QrBarcodeGenerateTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="qr" id="barcode-generate" locale={locale} />
    </>
  );
}
