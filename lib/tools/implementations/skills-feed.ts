import type { SkillResult } from './skills-browse';

export type FeedType = 'all-time' | 'trending' | 'hot';

export const FEED_TYPES: readonly FeedType[] = ['all-time', 'trending', 'hot'] as const;

export type FeedSkill = SkillResult & {
  isOfficial?: boolean;
  installsYesterday?: number;
  change?: number;
};

export type FeedResponse = {
  type: FeedType;
  skills: FeedSkill[];
  count: number;
  error?: string;
};

const SKILL_RE =
  /\\"source\\":\\"([^"\\]+)\\",\\"skillId\\":\\"([^"\\]+)\\",\\"name\\":\\"([^"\\]+)\\",\\"installs\\":(\d+)([^}]{0,200})/g;

const OFFICIAL_RE = /\\"isOfficial\\":(true|false)/;
const YESTERDAY_RE = /\\"installsYesterday\\":(\d+)/;
const CHANGE_RE = /\\"change\\":(-?\d+)/;

export function parseRscPayload(html: string, type: FeedType): FeedSkill[] {
  if (!html || typeof html !== 'string') return [];

  const seen = new Set<string>();
  const skills: FeedSkill[] = [];

  for (const m of html.matchAll(SKILL_RE)) {
    const [, source, skillId, name, installsStr, tail = ''] = m;
    if (!source || !skillId || !name || installsStr === undefined) continue;

    const key = `${source}/${skillId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const skill: FeedSkill = {
      id: key,
      skillId,
      name,
      installs: Number(installsStr),
      source,
    };

    const officialMatch = tail.match(OFFICIAL_RE);
    if (officialMatch) {
      skill.isOfficial = officialMatch[1] === 'true';
    }

    if (type === 'hot') {
      const yesterdayMatch = tail.match(YESTERDAY_RE);
      if (yesterdayMatch?.[1]) {
        skill.installsYesterday = Number(yesterdayMatch[1]);
      }
      const changeMatch = tail.match(CHANGE_RE);
      if (changeMatch?.[1]) {
        skill.change = Number(changeMatch[1]);
      }
    }

    skills.push(skill);
  }

  return skills;
}
