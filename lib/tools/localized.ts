import { TOOLS } from './registry';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { SearchableTool } from './search';

type ToolNode = { name: string; description: string };

export function buildLocalizedTools(dict: Dictionary): SearchableTool[] {
  const node = (dict.tools as unknown) as Record<string, Record<string, ToolNode>>;
  const out: SearchableTool[] = [];
  for (const t of TOOLS) {
    const entry = node[t.category]?.[t.id];
    if (!entry) continue;
    out.push({
      id: t.id,
      category: t.category,
      href: t.href,
      name: entry.name,
      description: entry.description,
      keywords: t.keywords,
      status: t.status,
      acceptedMime: t.acceptedMime,
    });
  }
  return out;
}
