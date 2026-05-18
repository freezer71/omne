const STORAGE_KEY = 'omne:recent-tools';
const MAX_KEEP = 20;

export type RecentEntry = {
  id: string;
  category: string;
  ts: number;
};

let cache: RecentEntry[] | null = null;

function safeRead(): RecentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        e && typeof e.id === 'string' && typeof e.category === 'string' && typeof e.ts === 'number',
    );
  } catch {
    return [];
  }
}

function loadCache(): RecentEntry[] {
  if (cache === null) cache = safeRead();
  return cache;
}

function safeWrite(entries: RecentEntry[]): void {
  cache = entries;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch {
    /* storage unavailable */
  }
}

export function recordRecentTool(category: string, id: string): void {
  const now = Date.now();
  const previous = loadCache();
  const key = `${category}/${id}`;
  const filtered = previous.filter((e) => `${e.category}/${e.id}` !== key);
  filtered.unshift({ category, id, ts: now });
  safeWrite(filtered.slice(0, MAX_KEEP));
}

export function getRecentTools(limit = 5): RecentEntry[] {
  const data = loadCache();
  return limit >= data.length ? data : data.slice(0, limit);
}

export function clearRecentTools(): void {
  safeWrite([]);
}

export function invalidateRecentCache(): void {
  cache = null;
}

export const RECENT_STORAGE_KEY = STORAGE_KEY;
