'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { diffStats, diffText, type DiffMode } from '@/lib/tools/implementations/text-diff';

type Messages = {
  leftLabel: string;
  rightLabel: string;
  leftPlaceholder: string;
  rightPlaceholder: string;
  mode: string;
  modeLine: string;
  modeWord: string;
  modeChar: string;
  statsAdditions: string;
  statsDeletions: string;
  statsUnchanged: string;
  showUnchanged: string;
  swap: string;
  clear: string;
  loadSample: string;
  download: string;
  empty: string;
};

const SAMPLE_A = `The quick brown fox
jumps over the lazy dog.
Another line.
Common ending.`;

const SAMPLE_B = `The quick red fox
jumps over the lazy cat.
New line inserted.
Common ending.`;

export function TextDiffTool(messages: Messages) {
  const leftId = useId();
  const rightId = useId();

  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [debouncedLeft, setDebouncedLeft] = useState('');
  const [debouncedRight, setDebouncedRight] = useState('');
  const [mode, setMode] = useState<DiffMode>('line');
  const [showUnchanged, setShowUnchanged] = useState(true);

  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedLeft(left), 200);
    return () => window.clearTimeout(h);
  }, [left]);
  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedRight(right), 200);
    return () => window.clearTimeout(h);
  }, [right]);

  const diff = useMemo(() => diffText(debouncedLeft, debouncedRight, mode), [debouncedLeft, debouncedRight, mode]);
  const stats = useMemo(() => diffStats(diff), [diff]);

  const visible = useMemo(() => (showUnchanged ? diff : diff.filter((d) => d.kind !== 'eq')), [diff, showUnchanged]);

  const onSwap = () => {
    setLeft(right);
    setRight(left);
  };

  const onLoadSample = () => {
    setLeft(SAMPLE_A);
    setRight(SAMPLE_B);
  };

  const onClear = () => {
    setLeft('');
    setRight('');
  };

  const onDownload = () => {
    if (diff.length === 0) return;
    const text = diff.map((op) => {
      const prefix = op.kind === 'add' ? '+ ' : op.kind === 'del' ? '- ' : '  ';
      return prefix + op.text;
    }).join('\n');
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'diff.txt');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {(['line', 'word', 'char'] as const).map((value) => (
            <label key={value}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${mode === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
              {value === 'line' ? messages.modeLine : value === 'word' ? messages.modeWord : messages.modeChar}
            </label>
          ))}
        </fieldset>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} />
          {messages.showUnchanged}
        </label>
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSwap} type="button">{messages.swap}</Button>
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={!left && !right} type="button">{messages.clear}</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={leftId} className="text-xs text-text-muted">{messages.leftLabel}</label>
          <textarea id={leftId} value={left} onChange={(e) => setLeft(e.target.value)} placeholder={messages.leftPlaceholder} rows={10}
            className="min-h-[16rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={rightId} className="text-xs text-text-muted">{messages.rightLabel}</label>
          <textarea id={rightId} value={right} onChange={(e) => setRight(e.target.value)} placeholder={messages.rightPlaceholder} rows={10}
            className="min-h-[16rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="text-success">+ {tpl(messages.statsAdditions, { n: stats.additions })}</span>
        <span className="text-danger">− {tpl(messages.statsDeletions, { n: stats.deletions })}</span>
        <span className="text-text-faint">{tpl(messages.statsUnchanged, { n: stats.unchanged })}</span>
        <span className="ml-auto">
          <Button size="sm" onClick={onDownload} disabled={diff.length === 0} type="button">{messages.download}</Button>
        </span>
      </div>

      {visible.length === 0 ? (
        <Card className="flex min-h-[12rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
      ) : mode === 'line' ? (
        <Card className="overflow-auto p-0 font-mono text-sm">
          <table className="w-full border-collapse">
            <tbody>
              {visible.map((op, i) => {
                const bg = op.kind === 'add' ? 'bg-success/10' : op.kind === 'del' ? 'bg-danger/10' : '';
                const prefix = op.kind === 'add' ? '+' : op.kind === 'del' ? '−' : ' ';
                const color = op.kind === 'add' ? 'text-success' : op.kind === 'del' ? 'text-danger' : 'text-text-faint';
                return (
                  <tr key={i} className={bg}>
                    <td className="select-none border-r border-border/50 px-2 text-right text-text-faint tabular-nums w-12">{op.aLine ?? ''}</td>
                    <td className="select-none border-r border-border/50 px-2 text-right text-text-faint tabular-nums w-12">{op.bLine ?? ''}</td>
                    <td className={`select-none px-2 ${color}`}>{prefix}</td>
                    <td className="whitespace-pre break-all px-2 py-0.5 text-text-primary">{op.text || ' '}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="min-h-[12rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm leading-relaxed">
          {visible.map((op, i) => {
            const cls = op.kind === 'add' ? 'bg-success/20 text-success' : op.kind === 'del' ? 'bg-danger/20 text-danger line-through' : 'text-text-primary';
            return <span key={i} className={cls}>{op.text}</span>;
          })}
        </Card>
      )}
    </div>
  );
}
