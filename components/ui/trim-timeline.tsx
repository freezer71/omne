'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const TRIM_MIN_GAP = 0.1;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export type TrimTimelineProps = {
  start: number;
  end: number;
  duration: number;
  currentTime: number;
  onStartChange: (next: number) => void;
  onEndChange: (next: number) => void;
  onSeek: (time: number) => void;
  labels: { timeline: string; startHandle: string; endHandle: string };
  // Optional element rendered behind the selection overlay and handles. Used
  // by audio-trim to slot a waveform; video-trim leaves it empty for a plain
  // track.
  backdrop?: ReactNode;
  // Vertical size of the interactive track. Defaults to 40px (video). Audio
  // passes a taller value so the waveform is readable.
  trackClassName?: string;
};

export function TrimTimeline({
  start,
  end,
  duration,
  currentTime,
  onStartChange,
  onEndChange,
  onSeek,
  labels,
  backdrop,
  trackClassName,
}: TrimTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef({ start, end, duration });
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ clientX: number; which: 'start' | 'end' } | null>(null);
  const disabled = !(duration > 0);

  useEffect(() => {
    valuesRef.current = { start, end, duration };
  }, [start, end, duration]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const commit = useCallback(() => {
    rafRef.current = null;
    const p = pendingRef.current;
    if (!p || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const v = valuesRef.current;
    if (v.duration <= 0) return;
    const ratio = clamp((p.clientX - rect.left) / rect.width, 0, 1);
    const t = ratio * v.duration;
    if (p.which === 'start') {
      onStartChange(clamp(t, 0, v.end - TRIM_MIN_GAP));
    } else {
      onEndChange(clamp(t, v.start + TRIM_MIN_GAP, v.duration));
    }
  }, [onStartChange, onEndChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>, which: 'start' | 'end') => {
    if (disabled) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    pendingRef.current = { clientX: e.clientX, which };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(commit);
  };

  const handlePointerUp = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      commit();
    }
    pendingRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, which: 'start' | 'end') => {
    if (disabled) return;
    const step = e.shiftKey ? 1 : 0.1;
    const v = valuesRef.current;
    const current = which === 'start' ? v.start : v.end;
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = current - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = current + step;
    else if (e.key === 'Home') next = which === 'start' ? 0 : v.start + TRIM_MIN_GAP;
    else if (e.key === 'End') next = which === 'start' ? v.end - TRIM_MIN_GAP : v.duration;
    if (next === null) return;
    e.preventDefault();
    if (which === 'start') {
      onStartChange(clamp(next, 0, v.end - TRIM_MIN_GAP));
    } else {
      onEndChange(clamp(next, v.start + TRIM_MIN_GAP, v.duration));
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.target !== e.currentTarget) return;
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    onSeek(ratio * duration);
  };

  const startPct = disabled ? 0 : (start / duration) * 100;
  const endPct = disabled ? 100 : (end / duration) * 100;
  const playheadPct = disabled ? 0 : clamp((currentTime / duration) * 100, 0, 100);
  const handleClass =
    'absolute inset-y-0 w-3 -translate-x-1/2 rounded-sm bg-accent cursor-ew-resize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-default';

  return (
    <div
      role="group"
      aria-label={labels.timeline}
      className={cn('select-none', disabled && 'opacity-50')}
    >
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className={cn(
          'relative w-full overflow-hidden rounded-md border border-border bg-surface touch-none',
          trackClassName ?? 'h-10',
          !disabled && 'cursor-pointer',
        )}
      >
        {backdrop ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {backdrop}
          </div>
        ) : null}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 rounded-sm bg-accent/30"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />
        {!disabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-px bg-text-primary"
            style={{ left: `${playheadPct}%` }}
          />
        )}
        <button
          type="button"
          role="slider"
          aria-label={labels.startHandle}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, roundTo(end - TRIM_MIN_GAP))}
          aria-valuenow={roundTo(start)}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => handlePointerMove(e, 'start')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'start')}
          className={handleClass}
          style={{ left: `${startPct}%` }}
        />
        <button
          type="button"
          role="slider"
          aria-label={labels.endHandle}
          aria-orientation="horizontal"
          aria-valuemin={Math.min(duration, roundTo(start + TRIM_MIN_GAP))}
          aria-valuemax={duration}
          aria-valuenow={roundTo(end)}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => handlePointerMove(e, 'end')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'end')}
          className={handleClass}
          style={{ left: `${endPct}%` }}
        />
      </div>
    </div>
  );
}
