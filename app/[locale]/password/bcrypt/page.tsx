import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getToolMetadata } from '@/lib/tools/metadata';
import { ToolShell } from '@/components/tool-shell';
import { ToolPageJsonLd } from '@/components/tool-page-jsonld';
import { PasswordBcryptTool } from '@/components/tools/password-bcrypt-tool';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getToolMetadata('password', 'bcrypt', locale);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tool = dict.tools.password.bcrypt;

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
      <PasswordBcryptTool
        mode={tool.ui.mode}
        modeHash={tool.ui.modeHash}
        modeVerify={tool.ui.modeVerify}
        passwordLabel={tool.ui.passwordLabel}
        passwordPlaceholder={tool.ui.passwordPlaceholder}
        rounds={tool.ui.rounds}
        roundsHint={tool.ui.roundsHint}
        hashButton={tool.ui.hashButton}
        hashedAs={tool.ui.hashedAs}
        elapsed={tool.ui.elapsed}
        copy={tool.ui.copy}
        copied={tool.ui.copied}
        verifyHashLabel={tool.ui.verifyHashLabel}
        verifyHashPlaceholder={tool.ui.verifyHashPlaceholder}
        verifyButton={tool.ui.verifyButton}
        verifyMatch={tool.ui.verifyMatch}
        verifyNoMatch={tool.ui.verifyNoMatch}
        verifyError={tool.ui.verifyError}
        busy={tool.ui.busy}
        show={tool.ui.show}
        hide={tool.ui.hide}
      />
    </ToolShell>
      <ToolPageJsonLd category="password" id="bcrypt" locale={locale} />
    </>
  );
}
