import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { ColorGradientTool } from '@/components/tools/color-gradient-tool';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('color', 'gradient', locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.color.gradient;
  return (
    <>
      <ToolShell locale={locale} category="color" name={tool.name} description={tool.description}
        categoryLabel={dict.hub.categories.color} backHomeLabel={dict.common.backHome}>
        <ColorGradientTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="color" id="gradient" locale={locale} />
    </>
  );
}
