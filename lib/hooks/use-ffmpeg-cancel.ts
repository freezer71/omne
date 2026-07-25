'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { terminateFfmpeg } from '@/lib/ffmpeg-loader';

// Gives a long ffmpeg run the two exits it was missing: a Cancel button, and a
// warning before the tab is closed or navigated away mid-encode.
//
// Nothing is persisted server-side — that is the whole product — so losing the
// tab loses the work outright. An encode can run for minutes, which is long
// enough for a user to change their mind, notice they picked the wrong file, or
// click a breadcrumb by reflex.
//
// Cancellation is tracked in a ref, not in state, because the handler's `catch`
// block reads it after an await and must see the value at that moment rather
// than the one captured when the run started. `cancelled` is the state twin,
// used only for rendering the notice.
export function useFfmpegCancel(busy: boolean) {
  const cancelledRef = useRef(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  // Call at the top of the run handler, before the first await.
  const beginRun = useCallback(() => {
    cancelledRef.current = false;
    setCancelled(false);
  }, []);

  const cancelRun = useCallback(() => {
    cancelledRef.current = true;
    setCancelled(true);
    terminateFfmpeg();
  }, []);

  // True when the rejection the handler is about to report is our own doing.
  // The tool uses it to stay quiet instead of blaming the file.
  const wasCancelled = useCallback(() => cancelledRef.current, []);

  return { beginRun, cancelRun, wasCancelled, cancelled };
}
