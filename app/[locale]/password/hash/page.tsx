import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { PasswordHashTool } from '@/components/tools/password-hash-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('password', 'hash', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.password.hash;

  return (
    <ToolShell
      locale={locale}
      category="password"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.password}
      backHomeLabel={dict.common.backHome}
    >
      <PasswordHashTool
        inputLabel={tool.ui.inputLabel}
        inputPlaceholder={tool.ui.inputPlaceholder}
        algorithm={tool.ui.algorithm}
        sha1={tool.ui.sha1}
        sha256={tool.ui.sha256}
        sha384={tool.ui.sha384}
        sha512={tool.ui.sha512}
        format={tool.ui.format}
        formatHex={tool.ui.formatHex}
        formatBase64={tool.ui.formatBase64}
        outputLabel={tool.ui.outputLabel}
        copy={tool.ui.copy}
        copied={tool.ui.copied}
        empty={tool.ui.empty}
      />
    </ToolShell>
  );
}
