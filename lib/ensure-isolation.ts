export const ISOLATION_RELOAD_KEY = 'coi-reload';

type EnsureOpts = {
  /** `crossOriginIsolated` of the current document; `undefined` when the API is unsupported. */
  isolated: boolean | undefined;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  reload: () => void;
};

/**
 * COOP/COEP are document response headers: they only take effect on a full
 * navigation. A client-side <Link> into an isolated route (video/audio/
 * remove-bg) keeps the previous, non-isolated document — SharedArrayBuffer is
 * then unavailable and ffmpeg-mt fails to load. Reload once so the browser
 * performs a real document navigation and picks the headers up. The
 * sessionStorage flag prevents a reload loop when the headers are genuinely
 * missing (e.g. stripped by a corporate proxy).
 *
 * Returns true when a reload was triggered.
 */
export function ensureCrossOriginIsolated({ isolated, storage, reload }: EnsureOpts): boolean {
  if (isolated === undefined) return false; // no API → a reload can't help
  try {
    if (isolated) {
      storage.removeItem(ISOLATION_RELOAD_KEY);
      return false;
    }
    if (storage.getItem(ISOLATION_RELOAD_KEY)) return false; // already tried once
    storage.setItem(ISOLATION_RELOAD_KEY, '1');
  } catch {
    // Storage unavailable (privacy mode…): without the loop guard, don't risk
    // an infinite reload — fall back to the tool's own error message.
    return false;
  }
  reload();
  return true;
}
