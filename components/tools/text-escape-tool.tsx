'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { escapeText, type EscapeKind, type EscapeMode } from '@/lib/tools/implementations/text-escape';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  mode: string;
  modeEscape: string;
  modeUnescape: string;
  kind: string;
  kindHtml: string;
  kindJs: string;
  kindJson: string;
  kindXml: string;
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

const SAMPLES: Record<EscapeKind, { escape: string; unescape: string }> = {
  html: {
    escape: '<a href="x">Tom & Jerry</a>',
    unescape: '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;',
  },
  js: {
    escape: 'Hello\n"world"\t\\path',
    unescape: 'Hello\\n\\"world\\"\\t\\\\path',
  },
  json: {
    escape: 'Hello\n"world"\t/path',
    unescape: 'Hello\\n\\"world\\"\\t/path',
  },
  xml: {
    escape: '<note attr="hi">Tom & Jerry</note>',
    unescape: '&lt;note attr=&quot;hi&quot;&gt;Tom &amp; Jerry&lt;/note&gt;',
  },
};

export function TextEscapeTool(messages: Messages) {
  const inputId = useId();

  const [mode, setMode] = useState<EscapeMode>('escape');
  const [kind, setKind] = useState<EscapeKind>('html');
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const output = useMemo(() => (debounced ? escapeText(debounced, kind, mode) : ''), [debounced, kind, mode]);

  const onDownload = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), `${mode}-${kind}.txt`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {(['escape', 'unescape'] as const).map((value) => (
            <label key={value}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${mode === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
              {value === 'escape' ? messages.modeEscape : messages.modeUnescape}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.kind}</legend>
          {(['html', 'js', 'json', 'xml'] as const).map((value) => {
            const label = value === 'html' ? messages.kindHtml : value === 'js' ? messages.kindJs : value === 'json' ? messages.kindJson : messages.kindXml;
            return (
              <label key={value}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${kind === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
                <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
                {label}
              </label>
            );
          })}
        </fieldset>
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLES[kind][mode])} type="button">{messages.loadSample}</Button>
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
            rows={12}
            className="min-h-[20rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
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
