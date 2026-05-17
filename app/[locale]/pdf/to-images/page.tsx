import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
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
  const tool = dict.tools.pdf['to-images'];
  return (
    <ToolShell
      locale={locale}
      category="pdf"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.pdf}
      backHomeLabel={dict.common.backHome}
    >
      <PdfToImagesTool
        {...tool.ui}
        previewLoading={dict.common.previewLoading}
        previewError={dict.common.previewError}
      />
    </ToolShell>
  );
}
