'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { slugify } from '@/lib/tools/implementations/text-slugify';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  separator: string;
  separatorHyphen: string;
  separatorUnderscore: string;
  separatorDot: string;
  lowercase: string;
  removeDiacritics: string;
  collapse: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  charsTemplate: string;
};

const SAMPLE = "Voilà l'été — café au lait & croissants à 5€";

export function TextSlugifyTool(messages: Messages) {
  const inputId = useId();

  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [separator, setSeparator] = useState<'-' | '_' | '.'>('-');
  const [lowercase, setLowercase] = useState(true);
  const [diacritics, setDiacritics] = useState(true);
  const [collapse, setCollapse] = useState(true);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const output = useMemo(() => {
    if (!debounced) return '';
    return slugify(debounced, {
      separator,
      lowercase,
      removeDiacritics: diacritics,
      collapse,
    });
  }, [debounced, separator, lowercase, diacritics, collapse]);

  const onDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'slug.txt');
  };

  const sepLabel: Record<typeof separator, string> = {
    '-': messages.separatorHyphen,
    '_': messages.separatorUnderscore,
    '.': messages.separatorDot,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.separator}</legend>
          {(['-', '_', '.'] as const).map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${separator === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}
            >
              <input type="radio" name="sep" value={value} checked={separator === value} onChange={() => setSeparator(value)} className="sr-only" />
              {sepLabel[value]}
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
            <span className="font-mono text-xs text-text-faint">{tpl(messages.charsTemplate, { n: [...input].length })}</span>
          </div>
          <textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.inputPlaceholder}
            rows={10}
            className="min-h-[20rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{output ? tpl(messages.charsTemplate, { n: [...output].length }) : ''}</span>
          </div>
          {output ? (
            <Card className="min-h-[20rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} />
          {messages.lowercase}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={diacritics} onChange={(e) => setDiacritics(e.target.checked)} />
          {messages.removeDiacritics}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={collapse} onChange={(e) => setCollapse(e.target.checked)} />
          {messages.collapse}
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
