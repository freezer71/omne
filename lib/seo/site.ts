import { type Locale, locales } from '@/lib/i18n/config';

function resolveSiteUrl(): string {
  const explicit = process.env['NEXT_PUBLIC_SITE_URL']?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'] ?? process.env['VERCEL_URL'];
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'https://omne.app';
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = 'omne';

export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR',
};

export function ogAlternateLocales(current: Locale): string[] {
  return locales.filter((l): l is Locale => l !== current).map((l) => OG_LOCALE[l]);
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function localizedUrl(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}/${locale}${clean === '/' ? '' : clean}`;
}
