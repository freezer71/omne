'use client';

import { useEffect, useRef, useState } from 'react';

export type WaveformData = {
  peaks: Float32Array;
  duration: number;
};

export async function decodeWaveform(file: File, buckets = 800): Promise<WaveformData> {
  const buffer = await file.arrayBuffer();
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(buffer);
    const channel = audio.getChannelData(0);
    const samplesPerBucket = Math.max(1, Math.floor(channel.length / buckets));
    const peaks = new Float32Array(buckets);
    for (let i = 0; i < buckets; i++) {
      let max = 0;
      const start = i * samplesPerBucket;
      const end = Math.min(channel.length, start + samplesPerBucket);
      for (let j = start; j < end; j++) {
        const v = Math.abs(channel[j]!);
        if (v > max) max = v;
      }
      peaks[i] = max;
    }
    return { peaks, duration: audio.duration };
  } finally {
    void ctx.close();
  }
}

export function Waveform({
  file,
  startSec,
  endSec,
  duration,
}: {
  file: File;
  startSec: number;
  endSec: number;
  duration: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<WaveformData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await decodeWaveform(file);
        if (!cancelled) setData(result);
      } catch {
        /* ignore decode errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const total = duration > 0 ? duration : data.duration;
    const startRatio = total > 0 ? Math.max(0, Math.min(1, startSec / total)) : 0;
    const endRatio = total > 0 ? Math.max(0, Math.min(1, endSec / total)) : 1;

    const buckets = data.peaks.length;
    const barWidth = cssWidth / buckets;
    const mid = cssHeight / 2;

    for (let i = 0; i < buckets; i++) {
      const ratio = i / buckets;
      const inSelection = ratio >= startRatio && ratio <= endRatio;
      ctx.fillStyle = inSelection ? 'rgba(94, 106, 210, 0.85)' : 'rgba(120, 120, 120, 0.35)';
      const peak = data.peaks[i]!;
      const h = Math.max(1, peak * cssHeight);
      ctx.fillRect(i * barWidth, mid - h / 2, Math.max(1, barWidth - 0.5), h);
    }
  }, [data, startSec, endSec, duration]);

  return (
    <canvas
      ref={canvasRef}
      className="h-20 w-full rounded-md border border-border bg-surface"
      style={{ display: 'block' }}
    />
  );
}
