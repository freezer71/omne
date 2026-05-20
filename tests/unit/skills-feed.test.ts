import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRscPayload, type FeedSkill } from '@/lib/tools/implementations/skills-feed';

const FIXTURES_DIR = resolve(__dirname, '../fixtures/skills-feed');

function loadFixture(name: 'all-time' | 'trending' | 'hot'): string {
  return readFileSync(resolve(FIXTURES_DIR, `${name}.html`), 'utf-8');
}

describe('parseRscPayload — all-time', () => {
  const html = loadFixture('all-time');
  const skills = parseRscPayload(html, 'all-time');

  it('extracts at least 50 skills', () => {
    expect(skills.length).toBeGreaterThanOrEqual(50);
  });

  it('finds find-skills as the top entry from vercel-labs/skills', () => {
    const findSkills = skills.find((s) => s.skillId === 'find-skills');
    expect(findSkills).toBeDefined();
    expect(findSkills?.source).toBe('vercel-labs/skills');
    expect(findSkills?.installs).toBeGreaterThan(1_000_000);
    expect(findSkills?.isOfficial).toBe(true);
  });

  it('builds id as `${source}/${skillId}`', () => {
    const findSkills = skills.find((s) => s.skillId === 'find-skills');
    expect(findSkills?.id).toBe('vercel-labs/skills/find-skills');
  });

  it('does not include installsYesterday or change for all-time entries', () => {
    expect(skills.every((s) => s.installsYesterday === undefined)).toBe(true);
    expect(skills.every((s) => s.change === undefined)).toBe(true);
  });

  it('deduplicates entries with the same source/skillId', () => {
    const ids = skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('parseRscPayload — trending', () => {
  const html = loadFixture('trending');
  const skills = parseRscPayload(html, 'trending');

  it('extracts skills from the trending RSC payload', () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it('uses 24h install counts (smaller than all-time)', () => {
    const max = Math.max(...skills.map((s) => s.installs));
    expect(max).toBeLessThan(100_000);
  });

  it('does not include hot-specific fields', () => {
    expect(skills.every((s) => s.installsYesterday === undefined)).toBe(true);
    expect(skills.every((s) => s.change === undefined)).toBe(true);
  });
});

describe('parseRscPayload — hot', () => {
  const html = loadFixture('hot');
  const skills = parseRscPayload(html, 'hot');

  it('extracts skills from the hot RSC payload', () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it('preserves installsYesterday and change numeric fields when present', () => {
    const withDelta = skills.find(
      (s) => s.installsYesterday !== undefined && s.change !== undefined,
    );
    expect(withDelta).toBeDefined();
    expect(typeof withDelta!.installsYesterday).toBe('number');
    expect(typeof withDelta!.change).toBe('number');
  });
});

describe('parseRscPayload — edge cases', () => {
  it('returns [] for empty HTML', () => {
    expect(parseRscPayload('', 'all-time')).toEqual([]);
  });

  it('returns [] for HTML without skills payload', () => {
    expect(parseRscPayload('<html><body>nope</body></html>', 'all-time')).toEqual([]);
  });

  it('handles missing isOfficial field', () => {
    const html = '\\"source\\":\\"a/b\\",\\"skillId\\":\\"c\\",\\"name\\":\\"c\\",\\"installs\\":42}';
    const out = parseRscPayload(html, 'all-time');
    expect(out).toHaveLength(1);
    expect(out[0]?.isOfficial).toBeUndefined();
  });

  it('deduplicates identical entries appearing twice', () => {
    const entry = '\\"source\\":\\"a/b\\",\\"skillId\\":\\"c\\",\\"name\\":\\"c\\",\\"installs\\":42}';
    const html = `${entry} foo ${entry}`;
    expect(parseRscPayload(html, 'all-time')).toHaveLength(1);
  });

  it('returns FeedSkill objects with required SkillResult shape', () => {
    const html = loadFixture('all-time');
    const [first] = parseRscPayload(html, 'all-time') as FeedSkill[];
    expect(first).toMatchObject({
      id: expect.any(String),
      skillId: expect.any(String),
      name: expect.any(String),
      installs: expect.any(Number),
      source: expect.any(String),
    });
  });
});
