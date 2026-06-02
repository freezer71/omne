import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { ReadAloudTool } from '@/components/tools/reading-read-aloud-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('reading', 'read-aloud', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.reading['read-aloud'];

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
        <ReadAloudTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="reading" id="read-aloud" locale={locale} />
    </>
  );
}
