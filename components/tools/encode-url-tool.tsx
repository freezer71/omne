'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  URL_VARIANTS,
  transformUrl,
  type UrlMode,
  type UrlVariant,
} from '@/lib/tools/implementations/encode-url';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  mode: string;
  modeEncode: string;
  modeDecode: string;
  variant: string;
  variantComponent: string;
  variantFull: string;
  variantForm: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  error: string;
  charsTemplate: string;
  ratioTemplate: string;
};

const SAMPLE_URL = 'https://example.com/path with spaces?q=café & filtre=tout';

export function EncodeUrlTool(messages: Messages) {
  const inputId = useId();
  const modeName = useId();
  const variantName = useId();

  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [mode, setMode] = useState<UrlMode>('encode');
  const [variant, setVariant] = useState<UrlVariant>('component');

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (!cancelled) setDebouncedInput(input);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [input]);

  const result = useMemo<{ ok: true; value: string } | { ok: false }>(() => {
    if (!debouncedInput) return { ok: true, value: '' };
    try {
      return { ok: true, value: transformUrl(debouncedInput, mode, variant) };
    } catch {
      return { ok: false };
    }
  }, [debouncedInput, mode, variant]);

  const output = result.ok ? result.value : '';
  const hasError = !result.ok;

  const inputChars = useMemo(() => [...input].length, [input]);
  const outputChars = useMemo(() => [...output].length, [output]);
  const ratio = useMemo(() => {
    if (!input || !output) return null;
    return Math.round((outputChars / inputChars) * 100);
  }, [input, output, inputChars, outputChars]);

  const onDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, mode === 'encode' ? 'url-encoded.txt' : 'url-decoded.txt');
  }, [output, mode]);

  const onLoadSample = () => setInput(SAMPLE_URL);
  const onClear = () => {
    setInput('');
    setDebouncedInput('');
  };

  const variantLabel: Record<UrlVariant, string> = {
    component: messages.variantComponent,
    full: messages.variantFull,
    form: messages.variantForm,
  };

  const hasInput = input.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {(['encode', 'decode'] as const).map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                mode === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={modeName}
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="sr-only"
              />
              {value === 'encode' ? messages.modeEncode : messages.modeDecode}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.variant}</legend>
          {URL_VARIANTS.map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                variant === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={variantName}
                value={value}
                checked={variant === value}
                onChange={() => setVariant(value)}
                className="sr-only"
              />
              {variantLabel[value]}
            </label>
          ))}
        </fieldset>

        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">
            {messages.loadSample}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={!hasInput}>
            {messages.clear}
          </Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={inputId} className="text-xs text-text-muted">
              {messages.inputLabel}
            </label>
            <span className="font-mono text-xs text-text-faint">
              {tpl(messages.charsTemplate, { n: inputChars })}
            </span>
          </div>
          <textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.inputPlaceholder}
            rows={12}
            className="min-h-[20rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">
              {output && ratio !== null
                ? `${tpl(messages.charsTemplate, { n: outputChars })} · ${tpl(messages.ratioTemplate, { n: ratio })}`
                : output
                  ? tpl(messages.charsTemplate, { n: outputChars })
                  : ''}
            </span>
          </div>
          {hasError ? (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-danger">
              {messages.error}
            </Card>
          ) : output ? (
            <Card className="min-h-[20rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">
              {output}
            </Card>
          ) : (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton
          text={output}
          copyLabel={messages.copy}
          copiedLabel={messages.copied}
          disabled={!output}
        />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">
          {messages.download}
        </Button>
      </div>
    </div>
  );
}
