'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { tpl } from '@/lib/tpl';
import {
  computeStats,
  formatDuration,
} from '@/lib/tools/implementations/text-count';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  clear: string;
  loadSample: string;
  characters: string;
  charactersNoSpaces: string;
  words: string;
  lines: string;
  paragraphs: string;
  sentences: string;
  readingTime: string;
  speakingTime: string;
  countTemplate: string;
};

const SAMPLE =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, ' +
  'quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo ' +
  'consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse ' +
  'cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat ' +
  'non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

export function TextCountTool(messages: Messages) {
  const inputId = useId();

  const [input, setInput] = useState('');
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

  const stats = useMemo(() => computeStats(debouncedInput), [debouncedInput]);

  const onLoadSample = () => setInput(SAMPLE);
  const onClear = () => {
    setInput('');
    setDebouncedInput('');
  };

  const hasInput = input.length > 0;

  const cards: Array<{ label: string; value: string }> = [
    { label: messages.characters, value: tpl(messages.countTemplate, { n: stats.characters }) },
    {
      label: messages.charactersNoSpaces,
      value: tpl(messages.countTemplate, { n: stats.charactersNoSpaces }),
    },
    { label: messages.words, value: tpl(messages.countTemplate, { n: stats.words }) },
    { label: messages.lines, value: tpl(messages.countTemplate, { n: stats.lines }) },
    { label: messages.paragraphs, value: tpl(messages.countTemplate, { n: stats.paragraphs }) },
    { label: messages.sentences, value: tpl(messages.countTemplate, { n: stats.sentences }) },
    { label: messages.readingTime, value: formatDuration(stats.readingTimeMinutes) },
    { label: messages.speakingTime, value: formatDuration(stats.speakingTimeMinutes) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">
          {messages.loadSample}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={!hasInput}>
          {messages.clear}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5 lg:col-span-3">
          <label htmlFor={inputId} className="text-xs text-text-muted">
            {messages.inputLabel}
          </label>
          <textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.inputPlaceholder}
            rows={16}
            className="min-h-[28rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2 sm:grid-cols-2">
          {cards.map((c) => (
            <Card key={c.label} className="flex flex-col gap-1 px-3 py-3">
              <span className="text-xs text-text-muted">{c.label}</span>
              <span className="font-mono text-xl text-text-primary">{c.value}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
