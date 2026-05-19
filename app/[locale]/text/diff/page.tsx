import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { TextDiffTool } from '@/components/tools/text-diff-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('text', 'diff', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.text.diff;

  return (
    <>
      <ToolShell
        locale={locale}
        category="text"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.text}
        backHomeLabel={dict.common.backHome}
        wide
      >
        <TextDiffTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="text" id="diff" locale={locale} />
    </>
  );
}
