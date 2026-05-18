'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import {
  generateLorem,
  type LoremOptions,
  type LoremUnit,
} from '@/lib/tools/implementations/text-lorem';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  unit: string;
  unitWords: string;
  unitSentences: string;
  unitParagraphs: string;
  count: string;
  startWithLoremIpsum: string;
  htmlWrap: string;
  outputLabel: string;
  regenerate: string;
  copy: string;
  copied: string;
  download: string;
  empty: string;
};

const UNITS: readonly LoremUnit[] = ['words', 'sentences', 'paragraphs'];

export function TextLoremTool(messages: Messages) {
  const unitName = useId();
  const countId = useId();
  const startId = useId();
  const htmlId = useId();

  const [unit, setUnit] = useState<LoremUnit>('paragraphs');
  const [count, setCount] = useState(3);
  const [startWithLoremIpsum, setStartWithLoremIpsum] = useState(true);
  const [htmlWrap, setHtmlWrap] = useState(false);
  // Bumping the seed forces re-generation; an initial value picks a starting variant.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0xffffffff) || 1);

  const options: LoremOptions = useMemo(
    () => ({ unit, count, startWithLoremIpsum, htmlWrap }),
    [unit, count, startWithLoremIpsum, htmlWrap],
  );

  const output = useMemo(() => {
    try {
      return generateLorem(options, seed);
    } catch {
      return '';
    }
  }, [options, seed]);

  const onRegenerate = useCallback(() => {
    setSeed(Math.floor(Math.random() * 0xffffffff) || 1);
  }, []);

  const onDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'lorem.txt');
  }, [output]);

  const unitLabel: Record<LoremUnit, string> = {
    words: messages.unitWords,
    sentences: messages.unitSentences,
    paragraphs: messages.unitParagraphs,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.unit}</legend>
          {UNITS.map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                unit === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={unitName}
                value={value}
                checked={unit === value}
                onChange={() => setUnit(value)}
                className="sr-only"
              />
              {unitLabel[value]}
            </label>
          ))}
        </fieldset>

        <label htmlFor={countId} className="flex items-center gap-2 text-xs text-text-muted">
          {messages.count}
          <input
            id={countId}
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (!Number.isFinite(n)) return;
              setCount(Math.max(1, Math.min(100, n)));
            }}
            className="h-8 w-20 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary"
          />
        </label>

        <label htmlFor={startId} className="flex items-center gap-2 text-xs text-text-muted">
          <input
            id={startId}
            type="checkbox"
            checked={startWithLoremIpsum}
            onChange={(e) => setStartWithLoremIpsum(e.target.checked)}
          />
          {messages.startWithLoremIpsum}
        </label>

        <label htmlFor={htmlId} className="flex items-center gap-2 text-xs text-text-muted">
          <input
            id={htmlId}
            type="checkbox"
            checked={htmlWrap}
            onChange={(e) => setHtmlWrap(e.target.checked)}
          />
          {messages.htmlWrap}
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.outputLabel}</label>
        {output ? (
          <Card className="min-h-[24rem] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm text-text-primary">
            {output}
          </Card>
        ) : (
          <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
            {messages.empty}
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="subtle" size="sm" onClick={onRegenerate} type="button">
          {messages.regenerate}
        </Button>
        <CopyButton
          text={output}
          copyLabel={messages.copy}
          copiedLabel={messages.copied}
          disabled={!output}
        />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">
          {messages.download}
        </Button>
      </div>
    </div>
  );
}
