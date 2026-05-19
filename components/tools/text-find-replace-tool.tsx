'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { findOccurrences, replaceOccurrences, type FindReplaceOptions } from '@/lib/tools/implementations/text-find-replace';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  findLabel: string;
  findPlaceholder: string;
  replaceLabel: string;
  replacePlaceholder: string;
  regex: string;
  caseSensitive: string;
  wholeWord: string;
  matchesTemplate: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
};

const SAMPLE_INPUT = `The quick brown fox jumps over the lazy dog.
The quick brown fox is a clever fox.
A lazy dog and a clever fox walked together.`;

export function TextFindReplaceTool(messages: Messages) {
  const inputId = useId();
  const findId = useId();
  const replId = useId();

  const [input, setInput] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [debouncedFind, setDebouncedFind] = useState('');
  const [debouncedReplace, setDebouncedReplace] = useState('');
  const [options, setOptions] = useState<FindReplaceOptions>({ regex: false, caseSensitive: false, wholeWord: false });

  useEffect(() => { const h = window.setTimeout(() => setDebouncedInput(input), 200); return () => window.clearTimeout(h); }, [input]);
  useEffect(() => { const h = window.setTimeout(() => setDebouncedFind(find), 200); return () => window.clearTimeout(h); }, [find]);
  useEffect(() => { const h = window.setTimeout(() => setDebouncedReplace(replace), 200); return () => window.clearTimeout(h); }, [replace]);

  const matches = useMemo(() => findOccurrences(debouncedInput, debouncedFind, options), [debouncedInput, debouncedFind, options]);
  const output = useMemo(() => debouncedFind ? replaceOccurrences(debouncedInput, debouncedFind, debouncedReplace, options) : debouncedInput, [debouncedInput, debouncedFind, debouncedReplace, options]);

  const highlighted = useMemo(() => {
    if (matches.length === 0) return null;
    const segs: Array<{ text: string; m: boolean }> = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) segs.push({ text: debouncedInput.slice(cursor, m.index), m: false });
      segs.push({ text: debouncedInput.slice(m.index, m.index + m.length), m: true });
      cursor = m.index + m.length;
    }
    if (cursor < debouncedInput.length) segs.push({ text: debouncedInput.slice(cursor), m: false });
    return segs;
  }, [matches, debouncedInput]);

  const onDownload = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), 'replaced.txt');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => { setInput(SAMPLE_INPUT); setFind('fox'); setReplace('cat'); }}>{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" type="button" disabled={!input && !find && !replace} onClick={() => { setInput(''); setFind(''); setReplace(''); }}>{messages.clear}</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label htmlFor={findId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.findLabel}
          <input id={findId} value={find} onChange={(e) => setFind(e.target.value)} placeholder={messages.findPlaceholder}
            className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint" />
        </label>
        <label htmlFor={replId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.replaceLabel}
          <input id={replId} value={replace} onChange={(e) => setReplace(e.target.value)} placeholder={messages.replacePlaceholder}
            className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={options.regex} onChange={(e) => setOptions((o) => ({ ...o, regex: e.target.checked }))} />{messages.regex}</label>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={options.caseSensitive} onChange={(e) => setOptions((o) => ({ ...o, caseSensitive: e.target.checked }))} />{messages.caseSensitive}</label>
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={options.wholeWord} onChange={(e) => setOptions((o) => ({ ...o, wholeWord: e.target.checked }))} />{messages.wholeWord}</label>
        <span className="ml-auto font-mono text-text-faint">{tpl(messages.matchesTemplate, { n: matches.length })}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-xs text-text-muted">{messages.inputLabel}</label>
          <textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder={messages.inputPlaceholder} rows={12}
            className="min-h-[18rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
          {highlighted && (
            <Card className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs">
              {highlighted.map((s, i) => s.m ? <mark key={i} className="rounded bg-accent/30">{s.text}</mark> : <span key={i} className="text-text-muted">{s.text}</span>)}
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">{messages.outputLabel}</label>
          {output ? (
            <Card className="min-h-[18rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[18rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
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
