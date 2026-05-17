import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { PasswordPassphraseTool } from '@/components/tools/password-passphrase-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('password', 'passphrase', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.password.passphrase;

  return (
    <ToolShell
      locale={locale}
      category="password"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.password}
      backHomeLabel={dict.common.backHome}
    >
      <PasswordPassphraseTool
        wordCountLabel={tool.ui.wordCountLabel}
        separator={tool.ui.separator}
        separatorSpace={tool.ui.separatorSpace}
        separatorDash={tool.ui.separatorDash}
        separatorDot={tool.ui.separatorDot}
        separatorUnderscore={tool.ui.separatorUnderscore}
        capitalize={tool.ui.capitalize}
        appendDigit={tool.ui.appendDigit}
        regenerate={tool.ui.regenerate}
        copy={tool.ui.copy}
        copied={tool.ui.copied}
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
