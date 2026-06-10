// Generates lib/seo/lastmod.json: one honest <lastmod> date per sitemap path,
// derived from git history. The JSON is COMMITTED (never gitignored) because
// Vercel builds on a shallow clone where git dates are unavailable — the
// sitemap route only reads the committed snapshot, and tests/unit/lastmod.test.ts
// fails locally when the snapshot is stale ("run `npm run lastmod`").
//
// Granularity (one date per path, shared by /en and /fr — sources are common):
// - tool /<cat>/<id>:   max(route dir files, files reached by import scan from
//                       page.tsx, messages subtree tools.<cat>.<id>)
// - category /<cat>:    max(its tools, app/[locale]/[category]/** files,
//                       messages subtree categories.<cat>)
// - home /:             max(all tools, home page + og image, messages home)
// - /privacy:           privacy route files + messages subtree privacy
//
// messages/{en,fr}.json are shared files: a commit touching them is attributed
// per-key (only the paths whose watched subtree actually changed get the date),
// otherwise every copy edit would bump all 206 URLs — the exact bug this
// script replaces. Deliberately excluded as "global chrome" (their attribution
// would bump everything): lib/tools/registry.ts, layouts, shared components
// (tool-shell, ui/*), and the nav/common/hub/meta message subtrees.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMPORT_PREFIXES = ['@/components/tools/', '@/lib/tools/implementations/'];
const IMPORT_SCAN_DEPTH = 3;

function git(repoRoot, args) {
  return execFileSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function todayLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Git quotes paths containing special characters ("a\303\251.txt"); this repo
// has none, so a plain unquote of the surrounding quotes is enough.
function unquoteGitPath(path) {
  if (path.startsWith('"') && path.endsWith('"')) return path.slice(1, -1);
  return path;
}

// Parses `git log --format=%x01%cs --name-status -M` (newest first) into a
// Map<repo-relative path, date of most recent commit touching it>.
export function parseGitNameStatusLog(text) {
  const dates = new Map();
  let current = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('\x01')) {
      current = line.slice(1).trim();
      continue;
    }
    if (!line || !current) continue;
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const status = parts[0];
    // Renames/copies (R100, C75) list "old\tnew" — the new path carries the date.
    const target = unquoteGitPath(status.startsWith('R') || status.startsWith('C') ? parts[2] : parts[1]);
    if (!dates.has(target)) dates.set(target, current);
  }
  return dates;
}

function listFilesRecursive(absDir, repoRoot) {
  if (!existsSync(absDir)) return [];
  const out = [];
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const abs = join(absDir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(abs, repoRoot));
    else out.push(abs.slice(repoRoot.length + 1));
  }
  return out;
}

function resolveAliasImport(repoRoot, specifier) {
  const base = join(repoRoot, specifier.slice(2));
  for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (existsSync(base + suffix)) return (base + suffix).slice(repoRoot.length + 1);
  }
  return undefined;
}

// BFS over `@/components/tools/*` and `@/lib/tools/implementations/*` imports
// starting from a tool's page.tsx. Naming conventions are not reliable
// (images-to-pdf-tool.tsx, components/tools/json/…) — following actual imports is.
export function scanToolImports(repoRoot, entryRelPath, maxDepth = IMPORT_SCAN_DEPTH) {
  const seen = new Set();
  let frontier = [entryRelPath];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next = [];
    for (const rel of frontier) {
      const abs = join(repoRoot, rel);
      if (!existsSync(abs)) continue;
      const source = readFileSync(abs, 'utf8');
      for (const m of source.matchAll(/from\s+['"](@\/[^'"]+)['"]/g)) {
        const spec = m[1];
        if (!IMPORT_PREFIXES.some((p) => spec.startsWith(p))) continue;
        const resolved = resolveAliasImport(repoRoot, spec);
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved);
          next.push(resolved);
        }
      }
    }
    frontier = next;
  }
  return [...seen];
}

function latestDate(dates) {
  let max;
  for (const d of dates) {
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

function getSubtree(tree, keys) {
  let node = tree;
  for (const key of keys) {
    if (node === null || typeof node !== 'object') return undefined;
    node = node[key];
  }
  return node;
}

// Pure: which watched URL paths have a different subtree between two parsed
// message trees? watchers: [{ urlPath, keys }]
export function changedWatcherPaths(prevTree, nextTree, watchers) {
  const changed = [];
  for (const { urlPath, keys } of watchers) {
    const before = JSON.stringify(getSubtree(prevTree ?? {}, keys));
    const after = JSON.stringify(getSubtree(nextTree ?? {}, keys));
    if (before !== after) changed.push(urlPath);
  }
  return changed;
}

function readJsonAtRevision(repoRoot, revision, file) {
  try {
    return JSON.parse(git(repoRoot, ['show', `${revision}:${file}`]));
  } catch {
    return {}; // file absent at that revision (or unreadable historical state)
  }
}

const MESSAGE_FILES = ['messages/en.json', 'messages/fr.json'];

function attributeMessageDates(repoRoot, watchers, includeDirty) {
  const dates = new Map();
  const pending = new Set(watchers.map((w) => w.urlPath));
  const record = (urlPath, date) => {
    if (pending.has(urlPath)) {
      dates.set(urlPath, date);
      pending.delete(urlPath);
    }
  };

  if (includeDirty) {
    const dirty = new Set(dirtyFiles(repoRoot));
    for (const file of MESSAGE_FILES) {
      if (!dirty.has(file)) continue;
      const head = readJsonAtRevision(repoRoot, 'HEAD', file);
      let worktree;
      try {
        worktree = JSON.parse(readFileSync(join(repoRoot, file), 'utf8'));
      } catch {
        continue;
      }
      for (const urlPath of changedWatcherPaths(head, worktree, watchers)) {
        record(urlPath, todayLocal());
      }
    }
  }

  const log = git(repoRoot, ['log', '--format=%H %cs', '--', ...MESSAGE_FILES])
    .trim()
    .split('\n')
    .filter(Boolean);
  for (const line of log) {
    if (pending.size === 0) break;
    const [sha, date] = line.split(' ');
    for (const file of MESSAGE_FILES) {
      const next = readJsonAtRevision(repoRoot, sha, file);
      const prev = readJsonAtRevision(repoRoot, `${sha}^`, file);
      for (const urlPath of changedWatcherPaths(prev, next, watchers)) {
        record(urlPath, date);
      }
    }
  }
  return dates;
}

function dirtyFiles(repoRoot) {
  const out = [];
  for (const line of git(repoRoot, ['status', '--porcelain']).split('\n')) {
    if (!line.trim()) continue;
    let path = line.slice(3);
    const arrow = path.indexOf(' -> ');
    if (arrow !== -1) path = path.slice(arrow + 4);
    out.push(unquoteGitPath(path));
  }
  return out;
}

function readRegistryHrefs(repoRoot) {
  const source = readFileSync(join(repoRoot, 'lib/tools/registry.ts'), 'utf8');
  return [...source.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1]);
}

export function computeLastmodEntries({ repoRoot, includeDirty = false }) {
  const fileDates = parseGitNameStatusLog(
    git(repoRoot, ['log', '--format=%x01%cs', '--name-status', '-M']),
  );
  if (includeDirty) {
    const today = todayLocal();
    for (const file of dirtyFiles(repoRoot)) fileDates.set(file, today);
  }
  const dateOf = (relPaths) => latestDate(relPaths.map((p) => fileDates.get(p)));

  const hrefs = readRegistryHrefs(repoRoot);
  const categories = [...new Set(hrefs.map((h) => h.split('/')[1]))];

  const watchers = [
    { urlPath: '/', keys: ['home'] },
    { urlPath: '/privacy', keys: ['privacy'] },
    ...categories.map((cat) => ({ urlPath: `/${cat}`, keys: ['categories', cat] })),
    ...hrefs.map((href) => {
      const [, cat, id] = href.split('/');
      return { urlPath: href, keys: ['tools', cat, id] };
    }),
  ];
  const messageDates = attributeMessageDates(repoRoot, watchers, includeDirty);

  const entries = {};
  for (const href of hrefs) {
    const routeDir = join(repoRoot, 'app', '[locale]', ...href.split('/').filter(Boolean));
    const routeFiles = listFilesRecursive(routeDir, repoRoot);
    const pageRel = `app/[locale]${href}/page.tsx`;
    const imported = scanToolImports(repoRoot, pageRel);
    const date = latestDate([dateOf([...routeFiles, ...imported]), messageDates.get(href)]);
    if (date) entries[href] = date;
  }

  const categoryRouteFiles = listFilesRecursive(join(repoRoot, 'app', '[locale]', '[category]'), repoRoot);
  for (const cat of categories) {
    const toolDates = hrefs.filter((h) => h.startsWith(`/${cat}/`)).map((h) => entries[h]);
    const date = latestDate([...toolDates, dateOf(categoryRouteFiles), messageDates.get(`/${cat}`)]);
    if (date) entries[`/${cat}`] = date;
  }

  const homeDate = latestDate([
    ...hrefs.map((h) => entries[h]),
    dateOf(['app/[locale]/page.tsx', 'app/[locale]/opengraph-image.tsx']),
    messageDates.get('/'),
  ]);
  if (homeDate) entries['/'] = homeDate;

  const privacyFiles = listFilesRecursive(join(repoRoot, 'app', '[locale]', 'privacy'), repoRoot);
  const privacyDate = latestDate([dateOf(privacyFiles), messageDates.get('/privacy')]);
  if (privacyDate) entries['/privacy'] = privacyDate;

  const sorted = {};
  for (const key of Object.keys(entries).sort()) sorted[key] = entries[key];
  return sorted;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    git(repoRoot, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    console.error('[lastmod] not a git repository — run from a full clone of the repo');
    process.exit(1);
  }
  if (git(repoRoot, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    console.error('[lastmod] shallow clone — git dates would be wrong; run from a full clone');
    process.exit(1);
  }
  const entries = computeLastmodEntries({ repoRoot, includeDirty: true });
  const dest = join(repoRoot, 'lib', 'seo', 'lastmod.json');
  writeFileSync(dest, JSON.stringify(entries, null, 2) + '\n');
  const distinct = new Set(Object.values(entries));
  console.log(`[lastmod] wrote ${Object.keys(entries).length} paths (${distinct.size} distinct dates) to lib/seo/lastmod.json`);
}
