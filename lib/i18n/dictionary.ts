import 'server-only';
import type { Locale } from './config';

const loaders = {
  en: () => import('@/messages/en.json').then((m) => m.default),
  fr: () => import('@/messages/fr.json').then((m) => m.default),
} as const;

export type Dictionary = Awaited<ReturnType<(typeof loaders)['en']>>;

export const getDictionary = async (locale: Locale): Promise<Dictionary> => loaders[locale]();
