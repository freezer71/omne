'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  getRecentTools,
  invalidateRecentCache,
  RECENT_STORAGE_KEY,
  type RecentEntry,
} from '@/lib/tools/recent';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === null || e.key === RECENT_STORAGE_KEY) {
      invalidateRecentCache();
      callback();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

const EMPTY: RecentEntry[] = [];

function getServerSnapshot(): RecentEntry[] {
  return EMPTY;
}

export function useRecentTools(limit = 5): RecentEntry[] {
  const all = useSyncExternalStore(subscribe, () => getRecentTools(Infinity), getServerSnapshot);
  return useMemo(() => (limit >= all.length ? all : all.slice(0, limit)), [all, limit]);
}
