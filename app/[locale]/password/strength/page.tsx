import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PasswordStrengthTool } from '@/components/tools/password-strength-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('password', 'strength', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.password.strength;

  return (
    <>
    <ToolShell
      locale={locale}
      category="password"
      name={tool.name}
      description={tool.description}
      categoryLabel={dict.hub.categories.password}
      backHomeLabel={dict.common.backHome}
    >
      <PasswordStrengthTool
        inputLabel={tool.ui.inputLabel}
        inputPlaceholder={tool.ui.inputPlaceholder}
        show={tool.ui.show}
        hide={tool.ui.hide}
        entropyLabel={tool.ui.entropyLabel}
        lengthLabel={tool.ui.lengthLabel}
        charsetLabel={tool.ui.charsetLabel}
        label={tool.ui.label}
        strengthVeryWeak={tool.ui.strengthVeryWeak}
        strengthWeak={tool.ui.strengthWeak}
        strengthFair={tool.ui.strengthFair}
        strengthStrong={tool.ui.strengthStrong}
        strengthVeryStrong={tool.ui.strengthVeryStrong}
        warningsTitle={tool.ui.warningsTitle}
        warningSequential={tool.ui.warningSequential}
        warningRepeated={tool.ui.warningRepeated}
        warningCommon={tool.ui.warningCommon}
        warningTooShort={tool.ui.warningTooShort}
        empty={tool.ui.empty}
      />
    </ToolShell>
      <ToolPageJsonLd category="password" id="strength" locale={locale} />
    </>
  );
}
