import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { isLocale, locales } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PaletteProvider } from '@/components/command-palette/palette-context';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { buildLocalizedTools } from '@/lib/tools/localized';
import { TOOL_CATEGORIES, type ToolCategory } from '@/lib/tools/types';
import {
  OG_LOCALE,
  SITE_NAME,
  SITE_URL,
  ogAlternateLocales,
} from '@/lib/seo/site';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'optional',
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'optional',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  colorScheme: 'dark light',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const tagline = dict.meta.tagline;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.siteName, template: `%s · ${dict.meta.siteName}` },
    description: tagline,
    applicationName: SITE_NAME,
    referrer: 'strict-origin-when-cross-origin',
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: ogAlternateLocales(locale),
    },
    twitter: { card: 'summary_large_image' },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
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
        {/* Must run before paint to avoid theme flash. Served as a static file
            (not inlined) per CLAUDE.md security-hook constraint. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-full flex flex-col">
        <PaletteProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface-elevated focus:px-3 focus:py-2 focus:text-sm focus:text-text-primary focus:shadow-md focus:outline-2 focus:outline-accent"
          >
            {dict.common.skipToContent}
          </a>
          <Header locale={locale} dict={dict} />
          {children}
          <Footer locale={locale} dict={dict} categoryOrder={TOOL_CATEGORIES} />
          <CommandPalette
            locale={locale}
            tools={tools}
            categoryOrder={TOOL_CATEGORIES}
            categoryLabels={categoryLabels}
            messages={{
              placeholder: dict.palette.placeholder,
              empty: dict.palette.empty,
              recent: dict.palette.recent,
              results: dict.palette.results,
              badgeBeta: dict.palette.badge.beta,
              badgeSoon: dict.palette.badge.soon,
              hintNavigate: dict.palette.hint.navigate,
              hintSelect: dict.palette.hint.select,
              hintClose: dict.palette.hint.close,
              quickActions: {
                heading: dict.palette.actions.heading,
                toggleTheme: dict.palette.actions.toggleTheme,
                changeLanguage: dict.palette.actions.changeLanguage,
                openPrivacy: dict.palette.actions.openPrivacy,
                browseAll: dict.palette.actions.browseAll,
              },
            }}
          />
        </PaletteProvider>
      </body>
    </html>
  );
}
