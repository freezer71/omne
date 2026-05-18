'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import {
  contrastRatio,
  wcagVerdict,
} from '@/lib/tools/implementations/color-contrast';
import {
  parseColor,
  rgbToHex,
} from '@/lib/tools/implementations/color-convert';

type Messages = {
  foregroundLabel: string;
  backgroundLabel: string;
  swapLabel: string;
  resetLabel: string;
  ratioLabel: string;
  ratioTemplate: string; // "{n}:1"
  verdictTitle: string;
  aaNormal: string;
  aaLarge: string;
  aaaNormal: string;
  aaaLarge: string;
  pass: string;
  fail: string;
  previewTitle: string;
  previewSampleSmall: string;
  previewSampleNormal: string;
  previewSampleLarge: string;
  previewSampleBold: string;
  error: string;
};

const DEFAULT_FG = '#1f2937';
const DEFAULT_BG = '#f9fafb';

function toHexOrEmpty(value: string): string {
  const p = parseColor(value);
  if (!p) return '';
  return rgbToHex(p.rgb).slice(0, 7); // strip alpha for native <input type="color">
}

export function ColorContrastTool(messages: Messages) {
  const fgTextId = useId();
  const bgTextId = useId();
  const fgPickerId = useId();
  const bgPickerId = useId();

  const [fg, setFg] = useState(DEFAULT_FG);
  const [bg, setBg] = useState(DEFAULT_BG);
  const [debouncedFg, setDebouncedFg] = useState(DEFAULT_FG);
  const [debouncedBg, setDebouncedBg] = useState(DEFAULT_BG);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedFg(fg), 150);
    return () => window.clearTimeout(handle);
  }, [fg]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedBg(bg), 150);
    return () => window.clearTimeout(handle);
  }, [bg]);

  const evaluation = useMemo(() => {
    const fgParsed = parseColor(debouncedFg);
    const bgParsed = parseColor(debouncedBg);
    if (!fgParsed || !bgParsed) return null;
    const ratio = contrastRatio(fgParsed.rgb, bgParsed.rgb);
    return {
      fgRgb: fgParsed.rgb,
      bgRgb: bgParsed.rgb,
      fgCss: rgbToHex(fgParsed.rgb),
      bgCss: rgbToHex(bgParsed.rgb),
      ratio,
      verdict: wcagVerdict(ratio),
    };
  }, [debouncedFg, debouncedBg]);

  const onSwap = () => {
    const oldFg = fg;
    setFg(bg);
    setBg(oldFg);
  };

  const onReset = () => {
    setFg(DEFAULT_FG);
    setBg(DEFAULT_BG);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField
          id={fgTextId}
          pickerId={fgPickerId}
          label={messages.foregroundLabel}
          value={fg}
          onChange={setFg}
        />
        <ColorField
          id={bgTextId}
          pickerId={bgPickerId}
          label={messages.backgroundLabel}
          value={bg}
          onChange={setBg}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSwap} type="button">
          {messages.swapLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset} type="button">
          {messages.resetLabel}
        </Button>
      </div>

      {!evaluation ? (
        <Card className="px-4 py-6 text-sm text-danger">{messages.error}</Card>
      ) : (
        <>
          <Card className="flex flex-col items-center gap-2 px-4 py-6">
            <span className="text-xs uppercase tracking-wider text-text-muted">
              {messages.ratioLabel}
            </span>
            <span className="font-mono text-4xl text-text-primary">
              {messages.ratioTemplate.replace(
                '{n}',
                evaluation.ratio.toFixed(2),
              )}
            </span>
          </Card>

          <Card className="flex flex-col gap-3 px-4 py-4">
            <span className="text-xs uppercase tracking-wider text-text-muted">
              {messages.verdictTitle}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <VerdictRow
                label={messages.aaNormal}
                pass={evaluation.verdict.aaNormal}
                passLabel={messages.pass}
                failLabel={messages.fail}
              />
              <VerdictRow
                label={messages.aaLarge}
                pass={evaluation.verdict.aaLarge}
                passLabel={messages.pass}
                failLabel={messages.fail}
              />
              <VerdictRow
                label={messages.aaaNormal}
                pass={evaluation.verdict.aaaNormal}
                passLabel={messages.pass}
                failLabel={messages.fail}
              />
              <VerdictRow
                label={messages.aaaLarge}
                pass={evaluation.verdict.aaaLarge}
                passLabel={messages.pass}
                failLabel={messages.fail}
              />
            </div>
          </Card>

          <Card
            className="flex flex-col gap-3 rounded-lg px-4 py-6"
            style={{ backgroundColor: evaluation.bgCss, color: evaluation.fgCss }}
          >
            <span className="text-xs uppercase tracking-wider opacity-70">
              {messages.previewTitle}
            </span>
            <p className="text-xs">{messages.previewSampleSmall}</p>
            <p className="text-sm">{messages.previewSampleNormal}</p>
            <p className="text-sm font-bold">{messages.previewSampleBold}</p>
            <p className="text-2xl">{messages.previewSampleLarge}</p>
          </Card>
        </>
      )}
    </div>
  );
}

function ColorField({
  id,
  pickerId,
  label,
  value,
  onChange,
}: {
  id: string;
  pickerId: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const pickerValue = toHexOrEmpty(value) || '#000000';
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={pickerId}
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-surface p-1"
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </div>
    </div>
  );
}

function VerdictRow({
  label,
  pass,
  passLabel,
  failLabel,
}: {
  label: string;
  pass: boolean;
  passLabel: string;
  failLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <span className="text-sm text-text-primary">{label}</span>
      <span
        className={cn(
          'rounded px-2 py-0.5 text-xs font-medium',
          pass
            ? 'bg-accent/15 text-accent'
            : 'bg-danger/15 text-danger',
        )}
      >
        {pass ? passLabel : failLabel}
      </span>
    </div>
  );
}
