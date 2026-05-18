'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  CASE_MODES,
  convertCase,
  type CaseMode,
} from '@/lib/tools/implementations/text-case';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  mode: string;
  modeUpper: string;
  modeLower: string;
  modeTitle: string;
  modeSentence: string;
  modeCamel: string;
  modePascal: string;
  modeSnake: string;
  modeKebab: string;
  modeConstant: string;
  modeDot: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  charsTemplate: string;
};

const SAMPLE = 'the quick brown fox jumps over the lazy dog';

export function TextCaseTool(messages: Messages) {
  const inputId = useId();
  const modeName = useId();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<CaseMode>('upper');
  const [debouncedInput, setDebouncedInput] = useState('');

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

  const output = useMemo(() => {
    if (!debouncedInput) return '';
    try {
      return convertCase(debouncedInput, mode);
    } catch {
      return '';
    }
  }, [debouncedInput, mode]);

  const inputChars = useMemo(() => [...input].length, [input]);
  const outputChars = useMemo(() => [...output].length, [output]);

  const onDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'converted.txt');
  }, [output]);

  const onLoadSample = () => setInput(SAMPLE);
  const onClear = () => {
    setInput('');
    setDebouncedInput('');
  };

  const hasInput = input.length > 0;

  const modeLabel: Record<CaseMode, string> = {
    upper: messages.modeUpper,
    lower: messages.modeLower,
    title: messages.modeTitle,
    sentence: messages.modeSentence,
    camel: messages.modeCamel,
    pascal: messages.modePascal,
    snake: messages.modeSnake,
    kebab: messages.modeKebab,
    constant: messages.modeConstant,
    dot: messages.modeDot,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
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
            className="min-h-[24rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">
              {output ? tpl(messages.charsTemplate, { n: outputChars }) : ''}
            </span>
          </div>
          {output ? (
            <Card className="min-h-[24rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm text-text-primary">
              {output}
            </Card>
          ) : (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>

      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.mode}</legend>
        {CASE_MODES.map((value) => (
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
            {modeLabel[value]}
          </label>
        ))}
      </fieldset>

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
