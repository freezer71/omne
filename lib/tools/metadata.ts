import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { buildToolMetadata } from '@/lib/seo/metadata';
import { isToolCategory } from './types';

export async function getToolMetadata(
  category: string,
  id: string,
  locale: Locale,
): Promise<Metadata> {
  if (!isToolCategory(category)) return {};
  return buildToolMetadata(category, id, locale);
}
