'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateVariations, type ShadeMode } from '@/lib/tools/implementations/color-shades';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  baseLabel: string;
  mode: string;
  modeTints: string;
  modeShades: string;
  modeTones: string;
  countLabel: string;
  copyAll: string;
  copied: string;
  copyOne: string;
};

export function ColorShadesTool(messages: Messages) {
  const [base, setBase] = useState('#3b82f6');
  const [mode, setMode] = useState<ShadeMode>('shades');
  const [count, setCount] = useState(10);

  const variations = useMemo(() => generateVariations(base, mode, count), [base, mode, count]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          {messages.baseLabel}
          <input type="color" value={base} onChange={(e) => setBase(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface" />
          <input value={base} onChange={(e) => setBase(e.target.value)} className="h-9 w-32 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary" />
        </label>
        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {(['tints', 'shades', 'tones'] as const).map((v) => (
            <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${mode === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
              {v === 'tints' ? messages.modeTints : v === 'shades' ? messages.modeShades : messages.modeTones}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          {messages.countLabel}
          <input type="number" min="2" max="20" value={count} onChange={(e) => setCount(Math.max(2, Math.min(20, parseInt(e.target.value || '10', 10))))} className="h-8 w-16 rounded-md border border-border bg-surface px-2 text-sm text-text-primary" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {variations.map((c, i) => (
          <Card key={`${c}-${i}`} className="flex flex-col items-stretch overflow-hidden p-0">
            <div className="aspect-square w-full" style={{ background: c }} />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="font-mono text-xs text-text-primary">{c}</span>
              <CopyButton text={c} copyLabel={messages.copyOne} copiedLabel={messages.copied} variant="ghost" />
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={() => navigator.clipboard.writeText(variations.join(', '))}>{messages.copyAll}</Button>
      </div>
    </div>
  );
}
