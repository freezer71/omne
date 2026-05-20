import type { ParsedCommand } from './skills';

export type SkillResult = {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
};

export type SearchResponse = {
  query: string;
  searchType?: string;
  skills: SkillResult[];
  count: number;
  duration_ms?: number;
  error?: string;
};

export function toCommands(selected: SkillResult[]): ParsedCommand[] {
  return selected.map((s) => ({
    source: s.source,
    skills: [s.skillId],
    extraFlags: [],
  }));
}

export function skillKey(s: SkillResult): string {
  return s.id;
}
