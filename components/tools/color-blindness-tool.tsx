'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { simulateColor, simulateImageData, type Deficiency } from '@/lib/tools/implementations/color-blindness';
import { cn } from '@/lib/cn';

type Messages = {
  mode: string;
  modeColor: string;
  modeImage: string;
  colorLabel: string;
  deficiency: string;
  protanopia: string;
  deuteranopia: string;
  tritanopia: string;
  achromatopsia: string;
  empty: string;
  selectImage: string;
  removeImage: string;
  originalLabel: string;
  simulatedLabel: string;
};

const DEFICIENCIES: Deficiency[] = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

export function ColorBlindnessTool(messages: Messages) {
  const [mode, setMode] = useState<'color' | 'image'>('color');
  const [color, setColor] = useState('#ef4444');
  const [deficiency, setDeficiency] = useState<Deficiency>('deuteranopia');
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const simulated = useMemo(() => simulateColor(color, deficiency), [color, deficiency]);

  const label: Record<Deficiency, string> = {
    protanopia: messages.protanopia,
    deuteranopia: messages.deuteranopia,
    tritanopia: messages.tritanopia,
    achromatopsia: messages.achromatopsia,
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.mode}</legend>
        {(['color', 'image'] as const).map((v) => (
          <label key={v} className={cn('flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
            mode === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong')}>
            <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
            {v === 'color' ? messages.modeColor : messages.modeImage}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.deficiency}</legend>
        {DEFICIENCIES.map((d) => (
          <label key={d} className={cn('flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
            deficiency === d ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong')}>
            <input type="radio" name="deficiency" value={d} checked={deficiency === d} onChange={() => setDeficiency(d)} className="sr-only" />
            {label[d]}
          </label>
        ))}
      </fieldset>

      {mode === 'color' ? (
        <>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            {messages.colorLabel}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface" />
            <input value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-32 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">{messages.originalLabel}</span>
              <Card className="aspect-square overflow-hidden" style={{ background: color }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">{messages.simulatedLabel}</span>
              <Card className="aspect-square overflow-hidden" style={{ background: simulated ?? color }} />
            </div>
          </div>
        </>
      ) : (
        <>
          <Card className="p-6">
            {!file ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-text-muted">{messages.empty}</p>
                <input ref={inputRef} type="file" accept="image/*" className="sr-only" aria-label={messages.selectImage} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectImage}</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ImagePane file={file} deficiency={null} label={messages.originalLabel} />
                  <ImagePane file={file} deficiency={deficiency} label={messages.simulatedLabel} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm text-text-muted">{file.name}</p>
                  <Button variant="subtle" size="sm" type="button" onClick={() => setFile(null)}>{messages.removeImage}</Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function ImagePane({ file, deficiency, label }: { file: File; deficiency: Deficiency | null; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bitmap = await createImageBitmap(file);
      if (cancelled) { bitmap.close?.(); return; }
      const canvas = canvasRef.current;
      if (!canvas) { bitmap.close?.(); return; }
      const maxW = 600;
      const ratio = Math.min(1, maxW / bitmap.width);
      const w = Math.round(bitmap.width * ratio);
      const h = Math.round(bitmap.height * ratio);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { bitmap.close?.(); return; }
      ctx.drawImage(bitmap, 0, 0, w, h);
      if (deficiency) {
        const data = ctx.getImageData(0, 0, w, h);
        const transformed = simulateImageData(data.data, deficiency);
        for (let i = 0; i < transformed.length; i++) data.data[i] = transformed[i] ?? 0;
        ctx.putImageData(data, 0, 0);
      }
      bitmap.close?.();
    })();
    return () => { cancelled = true; };
  }, [file, deficiency]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <canvas ref={canvasRef} className="w-full rounded-md border border-border bg-black" />
    </div>
  );
}
