'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fullscreen for a single element, with a CSS fallback where the
 * Fullscreen API is unavailable (iOS Safari only exposes it for <video>).
 * Native fullscreen handles Esc itself; the fallback adds its own listener.
 * Apply `fallbackClass` to the target so the emulated mode fills the viewport.
 */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setNative(document.fullscreenElement !== null && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const active = native || fallback;

  // The browser already exits native fullscreen on Esc; handling it here too
  // keeps the fallback consistent and makes the behaviour deterministic in
  // embeddings that don't intercept Esc at the UI layer (e.g. headless).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setFallback(false);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const enter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => setFallback(true));
    } else {
      setFallback(true);
    }
  }, []);

  const exit = useCallback(() => {
    setFallback(false);
    if (document.fullscreenElement) void document.exitFullscreen();
  }, []);

  const toggle = useCallback(() => (active ? exit() : enter()), [active, enter, exit]);

  return {
    ref,
    active,
    enter,
    exit,
    toggle,
    fallbackClass: fallback ? 'fixed inset-0 z-50' : '',
  };
}

/**
 * Reader-mode chrome: controls show on activity (pointer, key, tap) and fade
 * out after `delayMs` of stillness, so nothing overlaps the text while reading.
 */
export function useIdleHide(enabled: boolean, delayMs = 2500) {
  const [hidden, setHidden] = useState(false);

  // Render-phase tracked state: each new session starts with the controls
  // shown, without a setState-in-effect cascade.
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setHidden(false);
  }

  useEffect(() => {
    if (!enabled) return;
    let handle = window.setTimeout(() => setHidden(true), delayMs);
    const show = () => {
      setHidden(false);
      window.clearTimeout(handle);
      handle = window.setTimeout(() => setHidden(true), delayMs);
    };
    window.addEventListener('pointermove', show);
    window.addEventListener('pointerdown', show);
    window.addEventListener('keydown', show);
    return () => {
      window.clearTimeout(handle);
      window.removeEventListener('pointermove', show);
      window.removeEventListener('pointerdown', show);
      window.removeEventListener('keydown', show);
    };
  }, [enabled, delayMs]);

  return enabled ? !hidden : true;
}
