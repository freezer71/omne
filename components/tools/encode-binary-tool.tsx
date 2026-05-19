'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { binaryToText, textToBinary } from '@/lib/tools/implementations/encode-binary';
import { CopyButton } from '@/components/tools/json/copy-button';

type Sep = '' | ' ' | '-';

type Messages = {
  mode: string;
  modeEncode: string;
  modeDecode: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  separator: string;
  sepNone: string;
  sepSpace: string;
  sepDash: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  errorLabel: string;
  charsTemplate: string;
};

export function EncodeBinaryTool(messages: Messages) {
  const inputId = useId();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [separator, setSeparator] = useState<Sep>(' ');

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const { output, error } = useMemo(() => {
    if (!debounced) return { output: '', error: null as string | null };
    try {
      if (mode === 'encode') return { output: textToBinary(debounced, { separator, bitsPerByte: 8 }), error: null };
      return { output: binaryToText(debounced), error: null };
    } catch (e) {
      return { output: '', error: (e as Error).message };
    }
  }, [debounced, mode, separator]);

  const onDownload = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), mode === 'encode' ? 'encoded.bin.txt' : 'decoded.txt');
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
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => setInput(mode === 'encode' ? 'Hi' : '01001000 01101001')}>{messages.loadSample}</Button>
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
          {error ? (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-danger">{messages.errorLabel}: {error}</Card>
          ) : output ? (
            <Card className="min-h-[20rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      {mode === 'encode' && (
        <fieldset className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <legend className="px-1 text-text-muted">{messages.separator}</legend>
          {([['', messages.sepNone], [' ', messages.sepSpace], ['-', messages.sepDash]] as const).map(([v, l]) => (
            <label key={v || 'none'} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 ${separator === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="sep" value={v} checked={separator === v} onChange={() => setSeparator(v as Sep)} className="sr-only" />
              {l}
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
