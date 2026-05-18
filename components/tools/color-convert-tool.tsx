'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  describeColor,
  parseColor,
  type ColorAllFormats,
} from '@/lib/tools/implementations/color-convert';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  swatchLabel: string;
  alphaNote: string;
  hex: string;
  rgb: string;
  hsl: string;
  hsv: string;
  oklch: string;
  named: string;
  copy: string;
  copied: string;
  clear: string;
  loadSample: string;
  empty: string;
  error: string;
};

const SAMPLE = '#3b82f6';

export function ColorConvertTool(messages: Messages) {
  const inputId = useId();
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (!cancelled) setDebouncedInput(input);
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [input]);

  const parsed = useMemo<ColorAllFormats | null>(() => {
    if (!debouncedInput.trim()) return null;
    const out = parseColor(debouncedInput);
    if (!out) return null;
    return describeColor(out.rgb);
  }, [debouncedInput]);

  const showError = debouncedInput.trim().length > 0 && parsed === null;

  const hasAlpha = parsed ? parsed.rgb.a < 1 : false;
  const swatchColor = parsed ? parsed.rgbString : 'transparent';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={inputId} className="text-xs text-text-muted">
            {messages.inputLabel}
          </label>
          <input
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.inputPlaceholder}
            spellCheck={false}
            autoComplete="off"
            className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput(SAMPLE)}
            type="button"
          >
            {messages.loadSample}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInput('');
              setDebouncedInput('');
            }}
            disabled={input.length === 0}
            type="button"
          >
            {messages.clear}
          </Button>
        </div>
      </div>

      <Card className="flex flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:items-stretch">
        <div className="flex flex-col items-center gap-1.5">
          <div
            aria-label={messages.swatchLabel}
            style={
              hasAlpha
                ? {
                    backgroundImage:
                      'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                  }
                : undefined
            }
            className="h-32 w-32 overflow-hidden rounded-md border border-border bg-surface"
          >
            <div
              className="h-full w-full"
              style={{ backgroundColor: swatchColor }}
            />
          </div>
          {hasAlpha && (
            <span className="text-xs text-text-faint">{messages.alphaNote}</span>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2 text-sm">
          {showError && (
            <p role="alert" className="text-sm text-danger">
              {messages.error}
            </p>
          )}
          {!parsed && !showError && (
            <p className="text-sm text-text-faint">{messages.empty}</p>
          )}
          {parsed && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormatRow
                label={messages.hex}
                value={parsed.hex}
                copy={messages.copy}
                copied={messages.copied}
              />
              <FormatRow
                label={messages.rgb}
                value={parsed.rgbString}
                copy={messages.copy}
                copied={messages.copied}
              />
              <FormatRow
                label={messages.hsl}
                value={parsed.hslString}
                copy={messages.copy}
                copied={messages.copied}
              />
              <FormatRow
                label={messages.hsv}
                value={parsed.hsvString}
                copy={messages.copy}
                copied={messages.copied}
              />
              <FormatRow
                label={messages.oklch}
                value={parsed.oklchString}
                copy={messages.copy}
                copied={messages.copied}
              />
              <FormatRow
                label={messages.named}
                value={parsed.namedClosest}
                copy={messages.copy}
                copied={messages.copied}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function FormatRow({
  label,
  value,
  copy,
  copied,
}: {
  label: string;
  value: string;
  copy: string;
  copied: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-text-primary">
          {value}
        </code>
        <CopyButton text={value} copyLabel={copy} copiedLabel={copied} size="sm" />
      </div>
    </div>
  );
}
