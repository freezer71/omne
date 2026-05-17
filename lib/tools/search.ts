import type { ToolStatus } from './types';

export type SearchableTool = {
  id: string;
  category: string;
  href: string;
  name: string;
  description: string;
  keywords: readonly string[];
  status: ToolStatus;
};

export function normalizeForSearch(input: string): string {
  return input.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function matchesQuery(tool: SearchableTool, query: string): boolean {
  const q = normalizeForSearch(query.trim());
  if (!q) return true;
  const haystack = normalizeForSearch(
    `${tool.name} ${tool.description} ${tool.keywords.join(' ')}`,
  );
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function filterTools<T extends SearchableTool>(
  tools: readonly T[],
  query: string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [...tools];
  return tools.filter((t) => matchesQuery(t, trimmed));
}
