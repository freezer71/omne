import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PdfFontSwapTool } from '@/components/tools/pdf-dyslexia-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('reading', 'pdf-dyslexia', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.reading['pdf-dyslexia'];

  return (
    <>
      <ToolShell
        locale={locale}
        category="reading"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.reading}
        backHomeLabel={dict.common.backHome}
        wide
      >
        <PdfFontSwapTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="reading" id="pdf-dyslexia" locale={locale} />
    </>
  );
}
