'use client';

import { useEffect, useState } from 'react';

export type ClipMetadata = {
  durationSec: number;
  width?: number | undefined;
  height?: number | undefined;
  /** A JPEG data URL of the first frame. Video only, and only if it could be drawn. */
  poster?: string | undefined;
};

const POSTER_WIDTH = 96;
// Far enough in to be past a black leading frame, early enough to be instant.
const POSTER_AT_SEC = 0.1;

function firstFrame(video: HTMLVideoElement): string | undefined {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_WIDTH;
  canvas.height = Math.max(1, Math.round((POSTER_WIDTH * videoHeight) / videoWidth));
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return undefined;
  }
}

function probeVideo(file: File): Promise<ClipMetadata | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const done = (value: ClipMetadata | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    video.addEventListener('error', () => done(null), { once: true });
    video.addEventListener(
      'loadedmetadata',
      () => {
        const meta: ClipMetadata = {
          durationSec: Number.isFinite(video.duration) ? video.duration : Number.NaN,
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
        };
        // The poster is a bonus: if the seek never lands we still report the
        // duration and size, which are what the merge order depends on.
        video.addEventListener('seeked', () => done({ ...meta, poster: firstFrame(video) }), {
          once: true,
        });
        video.currentTime = Math.min(POSTER_AT_SEC, Math.max(0, video.duration - 0.01));
        window.setTimeout(() => done(meta), 3000);
      },
      { once: true },
    );

    video.src = url;
  });
}

function probeAudio(file: File): Promise<ClipMetadata | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const done = (value: ClipMetadata | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.addEventListener('error', () => done(null), { once: true });
    audio.addEventListener(
      'loadedmetadata',
      () => done({ durationSec: Number.isFinite(audio.duration) ? audio.duration : Number.NaN }),
      { once: true },
    );
    audio.src = url;
  });
}

// Measures each clip queued for a merge, so the list can show what it is
// actually about to concatenate instead of a column of file names.
//
// Results arrive one at a time and are keyed by the file list they belong to:
// adding or reordering files while probes are in flight must not attach a
// measurement to the wrong row. Files that cannot be read stay null, which the
// summary helpers treat as "not measured yet" rather than guessing.
export function useClipMetadata(files: readonly File[], kind: 'video' | 'audio') {
  const key = files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|');
  const [entries, setEntries] = useState<Record<string, ClipMetadata | null>>({});

  useEffect(() => {
    let cancelled = false;
    const probe = kind === 'video' ? probeVideo : probeAudio;
    const pending = files.filter((f) => !(fileKey(f) in entries));

    (async () => {
      for (const file of pending) {
        const meta = await probe(file);
        if (cancelled) return;
        setEntries((prev) => ({ ...prev, [fileKey(file)]: meta }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // `entries` is deliberately absent: it changes on every probe and would
    // restart the loop. `key` covers every change to the file list itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, kind]);

  return files.map((f) => entries[fileKey(f)] ?? null);
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
