import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getTool } from './registry';

type ToolMessages = {
  name: string;
  description: string;
};

export async function getToolMetadata(
  category: string,
  id: string,
  locale: Locale,
): Promise<Metadata> {
  const tool = getTool(category, id);
  if (!tool) return {};
  const dict = await getDictionary(locale);
  const node = (dict as unknown as Record<string, Record<string, Record<string, ToolMessages>>>)
    ['tools']?.[category]?.[id];
  if (!node) return {};
  return { title: node.name, description: node.description };
}
