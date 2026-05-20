import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config';

const localesSet = new Set<string>(locales);

function detectLocale(request: NextRequest): Locale {
  const header = request.headers.get('accept-language') ?? '';
  for (const part of header.split(',')) {
    const tag = part.trim().split(';')[0]?.toLowerCase().split('-')[0];
    if (tag && localesSet.has(tag)) return tag as Locale;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const firstSegment = pathname.split('/')[1];
  if (firstSegment && localesSet.has(firstSegment)) {
    return NextResponse.next();
  }

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api/|.*\\..*).*)'],
};
