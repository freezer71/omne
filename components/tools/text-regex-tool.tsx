'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  findMatches,
  replaceAll,
  type RegexFlags,
} from '@/lib/tools/implementations/text-regex';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  patternLabel: string;
  patternPlaceholder: string;
  flagsLabel: string;
  flagGlobal: string;
  flagCaseInsensitive: string;
  flagMultiline: string;
  flagDotAll: string;
  flagUnicode: string;
  flagSticky: string;
  inputLabel: string;
  inputPlaceholder: string;
  replacementLabel: string;
  replacementPlaceholder: string;
  matchesLabel: string;
  resultLabel: string;
  matchesTemplate: string;
  errorLabel: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  noMatches: string;
};

const SAMPLE_INPUT = `Contact: alice@example.com, bob@test.org
Phone: +33 6 12 34 56 78
URL: https://omne.test/path?x=1
Date: 2026-05-19`;

const SAMPLE_PATTERN = '(\\w+)@(\\w+\\.\\w+)';

const DEFAULT_FLAGS: RegexFlags = {
  global: true,
  caseInsensitive: false,
  multiline: false,
  dotAll: false,
  unicode: false,
  sticky: false,
};

export function TextRegexTool(messages: Messages) {
  const patternId = useId();
  const inputId = useId();
  const replId = useId();

  const [pattern, setPattern] = useState('');
  const [input, setInput] = useState('');
  const [replacement, setReplacement] = useState('');
  const [flags, setFlags] = useState<RegexFlags>(DEFAULT_FLAGS);
  const [debouncedPattern, setDebouncedPattern] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [debouncedReplacement, setDebouncedReplacement] = useState('');

  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedPattern(pattern), 200);
    return () => window.clearTimeout(h);
  }, [pattern]);
  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedInput(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);
  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedReplacement(replacement), 200);
    return () => window.clearTimeout(h);
  }, [replacement]);

  const result = useMemo(() => findMatches(debouncedInput, debouncedPattern, flags), [debouncedInput, debouncedPattern, flags]);
  const replaced = useMemo(() => (debouncedPattern && result.ok ? replaceAll(debouncedInput, debouncedPattern, debouncedReplacement, flags) : ''), [debouncedInput, debouncedPattern, debouncedReplacement, flags, result]);

  const highlighted = useMemo(() => {
    if (!result.ok || result.matches.length === 0) return null;
    const segments: Array<{ text: string; match: boolean }> = [];
    let cursor = 0;
    for (const m of result.matches) {
      if (m.index > cursor) segments.push({ text: debouncedInput.slice(cursor, m.index), match: false });
      segments.push({ text: debouncedInput.slice(m.index, m.index + m.length), match: true });
      cursor = m.index + m.length;
    }
    if (cursor < debouncedInput.length) segments.push({ text: debouncedInput.slice(cursor), match: false });
    return segments;
  }, [result, debouncedInput]);

  const onLoadSample = () => {
    setPattern(SAMPLE_PATTERN);
    setInput(SAMPLE_INPUT);
  };
  const onClear = () => {
    setPattern('');
    setInput('');
    setReplacement('');
  };
  const onDownload = () => {
    if (!replaced) return;
    downloadBlob(new Blob([replaced], { type: 'text/plain;charset=utf-8' }), 'replaced.txt');
  };

  const matchesCount = result.ok ? result.matches.length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={!pattern && !input} type="button">{messages.clear}</Button>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={patternId} className="text-xs text-text-muted">{messages.patternLabel}</label>
        <input id={patternId} value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder={messages.patternPlaceholder}
          className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
        {!result.ok && pattern && (
          <p role="alert" className="text-xs text-danger">{messages.errorLabel}: {result.error}</p>
        )}
      </div>

      <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-muted">
        <legend className="px-1">{messages.flagsLabel}</legend>
        {([['global', 'g', messages.flagGlobal], ['caseInsensitive', 'i', messages.flagCaseInsensitive], ['multiline', 'm', messages.flagMultiline], ['dotAll', 's', messages.flagDotAll], ['unicode', 'u', messages.flagUnicode], ['sticky', 'y', messages.flagSticky]] as const).map(([key, letter, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={flags[key]} onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))} />
            <span className="font-mono text-text-primary">{letter}</span>
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-xs text-text-muted">{messages.inputLabel}</label>
          <textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder={messages.inputPlaceholder} rows={10}
            className="min-h-[16rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">{messages.matchesLabel} — {tpl(messages.matchesTemplate, { n: matchesCount })}</label>
          {highlighted ? (
            <Card className="min-h-[16rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm">
              {highlighted.map((seg, i) => seg.match ? <mark key={i} className="rounded bg-accent/30 text-text-primary">{seg.text}</mark> : <span key={i} className="text-text-muted">{seg.text}</span>)}
            </Card>
          ) : (
            <Card className="flex min-h-[16rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {pattern ? messages.noMatches : messages.empty}
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={replId} className="text-xs text-text-muted">{messages.replacementLabel}</label>
        <input id={replId} value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={messages.replacementPlaceholder}
          className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.resultLabel}</label>
        {replaced ? (
          <Card className="min-h-[8rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm text-text-primary">{replaced}</Card>
        ) : (
          <Card className="flex min-h-[8rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={replaced} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!replaced} />
        <Button size="sm" onClick={onDownload} disabled={!replaced} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
