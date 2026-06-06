'use client';

import { useEffect } from 'react';
import { ensureCrossOriginIsolated } from '@/lib/ensure-isolation';

/**
 * Rendered by every route that needs cross-origin isolation (the ffmpeg/wasm
 * tools — see FFMPEG_ROUTES in next.config.ts). Reloads the page once when the
 * document is not isolated, which happens after a client-side navigation from
 * a non-isolated page (hub, command palette…). See lib/ensure-isolation.ts.
 */
export function EnsureCrossOriginIsolated() {
  useEffect(() => {
    ensureCrossOriginIsolated({
      isolated:
        typeof crossOriginIsolated === 'undefined' ? undefined : crossOriginIsolated,
      storage: window.sessionStorage,
      reload: () => window.location.reload(),
    });
  }, []);
  return null;
}
