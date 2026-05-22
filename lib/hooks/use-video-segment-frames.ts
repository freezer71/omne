'use client';

import { useEffect, useState } from 'react';

export function useVideoSegmentFrames(
  file: File | null,
  boundaries: Array<[number, number]> | null,
  boundariesKey: string | null,
): (ImageBitmap | null)[] {
  const N = boundaries?.length ?? 0;
  const initialFrames = (): (ImageBitmap | null)[] =>
    !file || !boundaries || N < 2 ? [] : (Array(N).fill(null) as (ImageBitmap | null)[]);
  const [frames, setFrames] = useState<(ImageBitmap | null)[]>(initialFrames);
  const [trackedKey, setTrackedKey] = useState<{ file: File | null; key: string | null }>({
    file,
    key: boundariesKey,
  });

  if (trackedKey.file !== file || trackedKey.key !== boundariesKey) {
    setTrackedKey({ file, key: boundariesKey });
    setFrames(initialFrames());
  }

  useEffect(() => {
    if (!file || !boundaries || N < 2) return;
    let cancelled = false;
    const buf: (ImageBitmap | null)[] = Array(N).fill(null);

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    const capture = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
            reject(new Error('video load failed'));
          };
          video.addEventListener('loadeddata', onLoaded);
          video.addEventListener('error', onError);
        });
        for (let i = 0; i < N; i++) {
          if (cancelled) break;
          const [s, e] = boundaries[i]!;
          const mid = Math.min(e - 0.05, Math.max(s + 0.05, (s + e) / 2));
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              resolve();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = mid;
          });
          if (cancelled) break;
          try {
            const bmp = await createImageBitmap(video);
            buf[i] = bmp;
            if (!cancelled) setFrames(buf.slice());
          } catch {
            /* skip single failed seek */
          }
        }
      } catch {
        /* ignore load failure */
      }
    };
    capture();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      buf.forEach((b) => b?.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, boundariesKey]);

  return frames;
}
