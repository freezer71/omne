'use client';

import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { buildGradientCss, defaultStops, type GradientKind, type GradientStop } from '@/lib/tools/implementations/color-gradient';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  kind: string;
  kindLinear: string;
  kindRadial: string;
  kindConic: string;
  angleLabel: string;
  stopsLabel: string;
  addStop: string;
  removeStop: string;
  preview: string;
  cssLabel: string;
  copy: string;
  copied: string;
  reset: string;
};

export function ColorGradientTool(messages: Messages) {
  const angleId = useId();
  const [kind, setKind] = useState<GradientKind>('linear');
  const [angle, setAngle] = useState(90);
  const [stops, setStops] = useState<GradientStop[]>(defaultStops());

  const css = useMemo(() => buildGradientCss({ kind, angle, stops }), [kind, angle, stops]);

  const addStop = () => setStops((prev) => [...prev, { color: '#ffffff', position: 50 }]);
  const removeStop = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i));
  const updateStop = (i: number, patch: Partial<GradientStop>) => setStops((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const reset = () => setStops(defaultStops());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.kind}</legend>
          {(['linear', 'radial', 'conic'] as const).map((v) => (
            <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${kind === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="sr-only" />
              {v === 'linear' ? messages.kindLinear : v === 'radial' ? messages.kindRadial : messages.kindConic}
            </label>
          ))}
        </fieldset>
        {kind !== 'radial' && (
          <label htmlFor={angleId} className="flex items-center gap-2 text-xs text-text-muted">
            {messages.angleLabel}
            <input id={angleId} type="number" min="0" max="360" value={angle} onChange={(e) => setAngle(parseInt(e.target.value || '0', 10))} className="h-8 w-20 rounded-md border border-border bg-surface px-2 text-sm text-text-primary" />
          </label>
        )}
        <span className="ml-auto">
          <Button variant="ghost" size="sm" type="button" onClick={reset}>{messages.reset}</Button>
        </span>
      </div>

      <Card className="aspect-[3/1] w-full overflow-hidden" style={{ background: css }} aria-label={messages.preview} />

      <div className="flex flex-col gap-3">
        <label className="text-xs text-text-muted">{messages.stopsLabel}</label>
        {stops.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <input type="color" value={s.color} onChange={(e) => updateStop(i, { color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface" />
            <input value={s.color} onChange={(e) => updateStop(i, { color: e.target.value })} className="h-9 w-32 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary" />
            <input type="range" min="0" max="100" value={s.position} onChange={(e) => updateStop(i, { position: parseInt(e.target.value, 10) })} className="flex-1 accent-accent" aria-label={`${messages.stopsLabel} ${i + 1}`} />
            <span className="w-12 text-right font-mono text-xs text-text-faint">{s.position}%</span>
            <Button variant="subtle" size="sm" type="button" onClick={() => removeStop(i)} disabled={stops.length <= 2}>{messages.removeStop}</Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" type="button" onClick={addStop} className="self-start">{messages.addStop}</Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.cssLabel}</label>
        <Card className="break-all px-3 py-2 font-mono text-sm text-text-primary">background: {css};</Card>
      </div>

      <div className="flex items-center justify-end">
        <CopyButton text={`background: ${css};`} copyLabel={messages.copy} copiedLabel={messages.copied} />
      </div>
    </div>
  );
}
