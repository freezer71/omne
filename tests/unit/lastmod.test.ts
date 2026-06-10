import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { TOOLS } from '@/lib/tools/registry';
import { TOOL_CATEGORIES } from '@/lib/tools/types';
import lastmodJson from '@/lib/seo/lastmod.json';
import {
  computeLastmodEntries,
  parseGitNameStatusLog,
  changedWatcherPaths,
} from '../../scripts/generate-lastmod.mjs';

const REPO_ROOT = join(__dirname, '..', '..');
const entries: Record<string, string> = lastmodJson;

function expectedSitemapPaths(): string[] {
  const populated = new Set(TOOLS.map((t) => t.category));
  return [
    '/',
    '/privacy',
    ...TOOL_CATEGORIES.filter((c) => populated.has(c)).map((c) => `/${c}`),
    ...TOOLS.map((t) => t.href),
  ];
}

function isFullGitRepo(): boolean {
  try {
    const shallow = execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', '--is-shallow-repository'], {
      encoding: 'utf8',
    }).trim();
    return shallow === 'false';
  } catch {
    return false;
  }
}

describe('lib/seo/lastmod.json', () => {
  it('covers every sitemap path, with no orphan keys', () => {
    const expected = expectedSitemapPaths().sort();
    expect(Object.keys(entries).sort()).toEqual(expected);
  });

  it('holds only valid W3C dates, none in the future', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const [path, date] of Object.entries(entries)) {
      expect(date, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(date)), `${path}: unparseable ${date}`).toBe(false);
      expect(date <= tomorrow, `${path}: future date ${date}`).toBe(true);
    }
  });

  it.skipIf(!isFullGitRepo())('is fresh — matches a recompute from git history', () => {
    // includeDirty: false compares against HEAD, so this stays green while
    // uncommitted edits are in flight.
    const recomputed = computeLastmodEntries({ repoRoot: REPO_ROOT, includeDirty: false });
    expect(entries, 'stale lib/seo/lastmod.json — run `npm run lastmod` and commit it').toEqual(
      recomputed,
    );
  });
});

describe('parseGitNameStatusLog', () => {
  it('keeps the newest date per file (log is newest-first)', () => {
    const log = [
      '\x012026-06-06',
      '',
      'M\tapp/a.ts',
      'A\tapp/b.ts',
      '\x012026-05-01',
      '',
      'M\tapp/a.ts',
      'M\tapp/c.ts',
    ].join('\n');
    const dates = parseGitNameStatusLog(log);
    expect(dates.get('app/a.ts')).toBe('2026-06-06');
    expect(dates.get('app/b.ts')).toBe('2026-06-06');
    expect(dates.get('app/c.ts')).toBe('2026-05-01');
  });

  it('attributes renames to the new path', () => {
    const log = ['\x012026-06-02', '', 'R100\told/name.ts\tnew/name.ts'].join('\n');
    const dates = parseGitNameStatusLog(log);
    expect(dates.get('new/name.ts')).toBe('2026-06-02');
    expect(dates.has('old/name.ts')).toBe(false);
  });
});

describe('changedWatcherPaths', () => {
  const watchers = [
    { urlPath: '/pdf/merge', keys: ['tools', 'pdf', 'merge'] },
    { urlPath: '/', keys: ['home'] },
  ];

  it('reports only the paths whose subtree changed', () => {
    const prev = { tools: { pdf: { merge: { name: 'Merge' } } }, home: { title: 'Hi' }, nav: { a: 1 } };
    const next = { tools: { pdf: { merge: { name: 'Merge PDF' } } }, home: { title: 'Hi' }, nav: { a: 2 } };
    expect(changedWatcherPaths(prev, next, watchers)).toEqual(['/pdf/merge']);
  });

  it('treats a subtree appearing as a change', () => {
    const prev = {};
    const next = { tools: { pdf: { merge: { name: 'Merge' } } } };
    expect(changedWatcherPaths(prev, next, watchers)).toEqual(['/pdf/merge']);
  });
});
