import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { SkillsBrowseTool } from '@/components/tools/skills-browse-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('dev', 'skills-browse', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.dev['skills-browse'];

  return (
    <>
      <ToolShell
        locale={locale}
        category="dev"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.dev}
        backHomeLabel={dict.common.backHome}
        wide
      >
        <SkillsBrowseTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="dev" id="skills-browse" locale={locale} />
    </>
  );
}
