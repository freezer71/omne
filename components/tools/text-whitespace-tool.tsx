'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  cleanWhitespace,
  DEFAULT_WHITESPACE_OPTIONS,
  type WhitespaceOptions,
} from '@/lib/tools/implementations/text-whitespace';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  trimLines: string;
  collapseSpaces: string;
  removeBlankLines: string;
  trimDocument: string;
  removeTrailingSpaces: string;
  lineEndings: string;
  endingsUnix: string;
  endingsWindows: string;
  endingsMac: string;
  endingsKeep: string;
  tabsToSpaces: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  charsTemplate: string;
};

const SAMPLE = `   Hello   world
\t\tindented line
        \t

       another paragraph    \t

`;

export function TextWhitespaceTool(messages: Messages) {
  const inputId = useId();

  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [opts, setOpts] = useState<WhitespaceOptions>(DEFAULT_WHITESPACE_OPTIONS);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const output = useMemo(() => (debounced ? cleanWhitespace(debounced, opts) : ''), [debounced, opts]);

  const update = (patch: Partial<WhitespaceOptions>) => setOpts((prev) => ({ ...prev, ...patch }));

  const onDownload = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), 'cleaned.txt');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
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
            rows={14}
            className="min-h-[24rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{output ? tpl(messages.charsTemplate, { n: [...output].length }) : ''}</span>
          </div>
          {output ? (
            <Card className="min-h-[24rem] overflow-auto whitespace-pre break-words px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 text-xs text-text-muted">
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={opts.trimLines} onChange={(e) => update({ trimLines: e.target.checked })} />{messages.trimLines}</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={opts.removeTrailingSpaces} onChange={(e) => update({ removeTrailingSpaces: e.target.checked })} />{messages.removeTrailingSpaces}</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={opts.collapseSpaces} onChange={(e) => update({ collapseSpaces: e.target.checked })} />{messages.collapseSpaces}</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={opts.removeBlankLines} onChange={(e) => update({ removeBlankLines: e.target.checked })} />{messages.removeBlankLines}</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={opts.trimDocument} onChange={(e) => update({ trimDocument: e.target.checked })} />{messages.trimDocument}</label>
        </div>
        <div className="flex flex-col gap-2 text-xs text-text-muted">
          <label className="flex flex-col gap-1.5">
            {messages.lineEndings}
            <select value={opts.normalizeLineEndings} onChange={(e) => update({ normalizeLineEndings: e.target.value as WhitespaceOptions['normalizeLineEndings'] })} className="h-8 rounded-md border border-border bg-surface px-2 text-sm text-text-primary">
              <option value="unix">{messages.endingsUnix}</option>
              <option value="windows">{messages.endingsWindows}</option>
              <option value="mac">{messages.endingsMac}</option>
              <option value="keep">{messages.endingsKeep}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            {messages.tabsToSpaces}
            <input type="number" min="0" max="8" value={opts.tabsToSpaces} onChange={(e) => update({ tabsToSpaces: Math.max(0, Math.min(8, parseInt(e.target.value || '0', 10))) })} className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-sm text-text-primary" />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
