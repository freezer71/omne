import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { EncodeJwtTool } from '@/components/tools/encode-jwt-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('encode', 'jwt', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.encode.jwt;

  return (
    <>
      <ToolShell
        locale={locale}
        category="encode"
        name={tool.name}
        description={tool.description}
        categoryLabel={dict.hub.categories.encode}
        backHomeLabel={dict.common.backHome}
      >
        <EncodeJwtTool {...tool.ui} />
      </ToolShell>
      <ToolPageJsonLd category="encode" id="jwt" locale={locale} />
    </>
  );
}
