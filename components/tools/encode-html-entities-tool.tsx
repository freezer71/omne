'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { decodeEntities, encodeEntities, type EntityMode } from '@/lib/tools/implementations/encode-html-entities';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  mode: string;
  modeEncode: string;
  modeDecode: string;
  format: string;
  formatNamed: string;
  formatNumeric: string;
  formatHex: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  charsTemplate: string;
};

export function EncodeHtmlEntitiesTool(messages: Messages) {
  const inputId = useId();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [format, setFormat] = useState<EntityMode>('named');
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const output = useMemo(() => {
    if (!debounced) return '';
    return mode === 'encode' ? encodeEntities(debounced, format) : decodeEntities(debounced);
  }, [debounced, mode, format]);

  const onDownload = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), `${mode === 'encode' ? 'encoded' : 'decoded'}.txt`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {(['encode', 'decode'] as const).map((v) => (
            <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${mode === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
              {v === 'encode' ? messages.modeEncode : messages.modeDecode}
            </label>
          ))}
        </fieldset>
        {mode === 'encode' && (
          <fieldset className="flex items-center gap-2 text-xs">
            <legend className="px-1 text-text-muted">{messages.format}</legend>
            {(['named', 'numeric', 'hex'] as const).map((v) => (
              <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${format === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
                <input type="radio" name="format" value={v} checked={format === v} onChange={() => setFormat(v)} className="sr-only" />
                {v === 'named' ? messages.formatNamed : v === 'numeric' ? messages.formatNumeric : messages.formatHex}
              </label>
            ))}
          </fieldset>
        )}
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => setInput(mode === 'encode' ? '<p>"Tom & Jerry" © 2026 — café</p>' : '&lt;p&gt;&quot;Tom &amp; Jerry&quot; &copy; 2026 &mdash; caf&eacute;&lt;/p&gt;')}>{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" type="button" disabled={!input} onClick={() => setInput('')}>{messages.clear}</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={inputId} className="text-xs text-text-muted">{messages.inputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{tpl(messages.charsTemplate, { n: [...input].length })}</span>
          </div>
          <textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder={messages.inputPlaceholder} rows={12}
            className="min-h-[20rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{output ? tpl(messages.charsTemplate, { n: [...output].length }) : ''}</span>
          </div>
          {output ? (
            <Card className="min-h-[20rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
