'use client';

import { useEffect, useState } from 'react';

// Creates an object URL for the given File/Blob and revokes it on cleanup.
//
// The naive pattern `const url = useMemo(() => URL.createObjectURL(file), [file])`
// + cleanup effect breaks under React Strict Mode (default in Next.js dev):
// Strict Mode mounts the effect twice, the first cleanup revokes the URL before
// the <video>/<audio>/<img> has fetched it, producing net::ERR_FILE_NOT_FOUND.
//
// Creating the URL inside the effect avoids that: each mount instance gets its
// own URL, and the cleanup only revokes URLs that are no longer mounted.
export function useBlobUrl(file: File | Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the URL must be created after mount (not during render or via lazy useState) so Strict Mode's artificial unmount/remount does not revoke it before the consumer can fetch. */
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  return url;
}
