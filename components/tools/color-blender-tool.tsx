'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { blendColors, generateBlendScale, type BlendMode } from '@/lib/tools/implementations/color-blender';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  colorALabel: string;
  colorBLabel: string;
  ratioLabel: string;
  mode: string;
  modeRgb: string;
  modeHsl: string;
  modeOklch: string;
  blendedLabel: string;
  scaleLabel: string;
  copy: string;
  copied: string;
  copyOne: string;
};

export function ColorBlenderTool(messages: Messages) {
  const [a, setA] = useState('#3b82f6');
  const [b, setB] = useState('#ec4899');
  const [ratio, setRatio] = useState(0.5);
  const [mode, setMode] = useState<BlendMode>('rgb');

  const blended = useMemo(() => blendColors(a, b, ratio, mode), [a, b, ratio, mode]);
  const scale = useMemo(() => generateBlendScale(a, b, 9, mode), [a, b, mode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.colorALabel}
          <div className="flex items-center gap-2">
            <input type="color" value={a} onChange={(e) => setA(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface" />
            <input value={a} onChange={(e) => setA(e.target.value)} className="h-9 flex-1 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary" />
          </div>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.colorBLabel}
          <div className="flex items-center gap-2">
            <input type="color" value={b} onChange={(e) => setB(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface" />
            <input value={b} onChange={(e) => setB(e.target.value)} className="h-9 flex-1 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary" />
          </div>
        </label>
      </div>

      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.mode}</legend>
        {(['rgb', 'hsl', 'oklch'] as const).map((v) => (
          <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${mode === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
            <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
            {v === 'rgb' ? messages.modeRgb : v === 'hsl' ? messages.modeHsl : messages.modeOklch}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1.5 text-xs text-text-muted">
        {messages.ratioLabel} ({Math.round(ratio * 100)}%)
        <input type="range" min="0" max="1" step="0.01" value={ratio} onChange={(e) => setRatio(parseFloat(e.target.value))} className="accent-accent" />
      </label>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.blendedLabel}</label>
        <Card className="flex items-center overflow-hidden p-0">
          <div className="aspect-[3/1] flex-1" style={{ background: blended ?? 'transparent' }} />
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="font-mono text-sm text-text-primary">{blended ?? '—'}</span>
            <CopyButton text={blended ?? ''} copyLabel={messages.copy} copiedLabel={messages.copied} />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.scaleLabel}</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
          {scale.map((c, i) => (
            <Card key={`${c}-${i}`} className="overflow-hidden p-0">
              <div className="aspect-square w-full" style={{ background: c }} />
              <div className="flex items-center justify-between px-2 py-1">
                <span className="font-mono text-xs text-text-primary">{c.slice(0, 7)}</span>
                <CopyButton text={c} copyLabel={messages.copyOne} copiedLabel={messages.copied} variant="ghost" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
