import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { PasswordGenerateTool } from '@/components/tools/password-generate-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('password', 'generate', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.password.generate;

  return (
    <ToolShell
      locale={locale}
      category="password"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.password}
      backHomeLabel={dict.common.backHome}
    >
      <PasswordGenerateTool
        lengthLabel={tool.ui.lengthLabel}
        count={tool.ui.count}
        count1={tool.ui.count1}
        count5={tool.ui.count5}
        count10={tool.ui.count10}
        count25={tool.ui.count25}
        useUppercase={tool.ui.useUppercase}
        useLowercase={tool.ui.useLowercase}
        useDigits={tool.ui.useDigits}
        useSymbols={tool.ui.useSymbols}
        excludeAmbiguous={tool.ui.excludeAmbiguous}
        regenerate={tool.ui.regenerate}
        copy={tool.ui.copy}
        copied={tool.ui.copied}
        download={tool.ui.download}
        noCharsetError={tool.ui.noCharsetError}
        strength={tool.ui.strength}
        strengthVeryWeak={tool.ui.strengthVeryWeak}
        strengthWeak={tool.ui.strengthWeak}
        strengthFair={tool.ui.strengthFair}
        strengthStrong={tool.ui.strengthStrong}
        strengthVeryStrong={tool.ui.strengthVeryStrong}
        entropyLabel={tool.ui.entropyLabel}
      />
    </ToolShell>
  );
}
