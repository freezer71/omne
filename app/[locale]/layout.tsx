import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { isLocale, locales } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Header } from '@/components/header';
import { PaletteProvider } from '@/components/command-palette/palette-context';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { buildLocalizedTools } from '@/lib/tools/localized';
import { TOOL_CATEGORIES, type ToolCategory } from '@/lib/tools/types';
import '../globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: { default: dict.meta.siteName, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.tagline,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const tools = buildLocalizedTools(dict);
  const categoryLabels = dict.hub.categories as Record<ToolCategory, string>;

  return (
    <html
      lang={locale}
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-full flex flex-col">
        <PaletteProvider>
          <Header locale={locale} dict={dict} />
          {children}
          <CommandPalette
            locale={locale}
            tools={tools}
            categoryOrder={TOOL_CATEGORIES}
            categoryLabels={categoryLabels}
            messages={{
              placeholder: dict.palette.placeholder,
              empty: dict.palette.empty,
            }}
          />
        </PaletteProvider>
      </body>
    </html>
  );
}
