'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  DEFAULT_SORT_OPTIONS,
  sortLines,
  type SortMode,
  type SortOrder,
} from '@/lib/tools/implementations/text-sort-lines';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  mode: string;
  modeAlpha: string;
  modeNatural: string;
  modeNumeric: string;
  modeLength: string;
  modeReverse: string;
  modeShuffle: string;
  order: string;
  orderAsc: string;
  orderDesc: string;
  caseSensitive: string;
  trim: string;
  removeEmpty: string;
  removeDuplicates: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  linesTemplate: string;
};

const SAMPLE = `Banana
apple
Cherry
banana
12
3
21
Apple`;

const MODES: SortMode[] = ['alphabetical', 'natural', 'numeric', 'length', 'reverse', 'shuffle'];

export function TextSortLinesTool(messages: Messages) {
  const inputId = useId();

  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [mode, setMode] = useState<SortMode>('alphabetical');
  const [order, setOrder] = useState<SortOrder>('asc');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [trim, setTrim] = useState(false);
  const [removeEmpty, setRemoveEmpty] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const output = useMemo(() => {
    if (!debounced) return '';
    void shuffleSeed;
    return sortLines(debounced, {
      ...DEFAULT_SORT_OPTIONS,
      mode,
      order,
      caseSensitive,
      trim,
      removeEmpty,
      removeDuplicates,
    });
  }, [debounced, mode, order, caseSensitive, trim, removeEmpty, removeDuplicates, shuffleSeed]);

  const onDownload = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), 'sorted.txt');
  };

  const modeLabel: Record<SortMode, string> = {
    alphabetical: messages.modeAlpha,
    natural: messages.modeNatural,
    numeric: messages.modeNumeric,
    length: messages.modeLength,
    reverse: messages.modeReverse,
    shuffle: messages.modeShuffle,
  };

  const inputLines = input ? input.split(/\r?\n/).length : 0;
  const outputLines = output ? output.split(/\r?\n/).length : 0;
  const showOrder = mode !== 'reverse' && mode !== 'shuffle';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {MODES.map((value) => (
            <label key={value}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${mode === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
              {modeLabel[value]}
            </label>
          ))}
        </fieldset>
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)} type="button">{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" onClick={() => setInput('')} disabled={!input} type="button">{messages.clear}</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={inputId} className="text-xs text-text-muted">{messages.inputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{tpl(messages.linesTemplate, { n: inputLines })}</span>
          </div>
          <textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.inputPlaceholder}
            rows={14}
            className="min-h-[24rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{output ? tpl(messages.linesTemplate, { n: outputLines }) : ''}</span>
          </div>
          {output ? (
            <Card className="min-h-[24rem] overflow-auto whitespace-pre break-words px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        {showOrder && (
          <fieldset className="flex items-center gap-2">
            <legend className="px-1 text-text-muted">{messages.order}</legend>
            {(['asc', 'desc'] as const).map((value) => (
              <label key={value} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 ${order === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
                <input type="radio" name="order" value={value} checked={order === value} onChange={() => setOrder(value)} className="sr-only" />
                {value === 'asc' ? messages.orderAsc : messages.orderDesc}
              </label>
            ))}
          </fieldset>
        )}
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />{messages.caseSensitive}</label>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />{messages.trim}</label>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={removeEmpty} onChange={(e) => setRemoveEmpty(e.target.checked)} />{messages.removeEmpty}</label>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={removeDuplicates} onChange={(e) => setRemoveDuplicates(e.target.checked)} />{messages.removeDuplicates}</label>
        {mode === 'shuffle' && (
          <Button variant="ghost" size="sm" onClick={() => setShuffleSeed((s) => s + 1)} type="button">{messages.modeShuffle}</Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
