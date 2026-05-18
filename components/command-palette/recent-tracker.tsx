'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { recordRecentTool } from '@/lib/tools/recent';
import { isToolCategory } from '@/lib/tools/types';

export function RecentTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length < 3) return;
    const category = segments[1] ?? '';
    const id = segments.slice(2).join('/');
    if (!isToolCategory(category)) return;
    recordRecentTool(category, id);
  }, [pathname]);
  return null;
}
