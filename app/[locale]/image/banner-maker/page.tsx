import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { BannerMakerTool } from '@/components/tools/banner-maker-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('image', 'banner-maker', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.image['banner-maker'];

  return (
    <>
      <ToolShell
        locale={locale}
        category="image"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.image}
        backHomeLabel={dict.common.backHome}
        wide
      >
        <BannerMakerTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="image" id="banner-maker" locale={locale} />
    </>
  );
}
