'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { safeParse } from '@/lib/json/parse';
import { format, type IndentMode } from '@/lib/json/format';
import type { ParseResult } from '@/lib/json/types';
import { JsonInput } from '@/components/tools/json/json-input';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { ErrorBanner } from '@/components/tools/json/error-banner';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  indent: string;
  indent2: string;
  indent4: string;
  indentTab: string;
  minify: string;
  sortKeys: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  validBadge: string;
  invalidBadge: string;
  errorTemplate: string;
  sizeTemplate: string;
};

const SAMPLE = JSON.stringify(
  {
    name: 'omne',
    privacy: '100% local',
    tools: [
      { id: 'format', stable: true },
      { id: 'query', stable: true },
      { id: 'table', stable: true },
    ],
    created: '2026-05-17',
    counts: { pdf: 5, image: 6, json: 7 },
  },
  null,
  2,
);

export function JsonFormatTool(messages: Messages) {
  const inputId = useId();
  const outputId = useId();
  const indentName = useId();
  const sortId = useId();

  const [input, setInput] = useState('');
  const [indent, setIndent] = useState<IndentMode>('2');
  const [sortKeys, setSortKeys] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const result = safeParse(input);
      if (!cancelled) setParsed(result);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [input]);

  const output = useMemo(() => {
    if (!parsed || !parsed.ok) return '';
    try {
      return format(parsed.value, { indent, sortKeys });
    } catch {
      return '';
    }
  }, [parsed, indent, sortKeys]);

  const inputSize = useMemo(() => new TextEncoder().encode(input).length, [input]);
  const outputSize = useMemo(() => new TextEncoder().encode(output).length, [output]);

  const onChangeInput = useCallback((value: string) => {
    setInput(value);
    if (!value) setParsed(null);
  }, []);

  const onDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/json' });
    downloadBlob(blob, 'formatted.json');
  }, [output]);

  const onLoadSample = () => setInput(SAMPLE);
  const onClear = () => {
    setInput('');
    setParsed(null);
  };

  const hasInput = input.length > 0;
  const validity = !hasInput || !parsed ? null : parsed.ok ? 'valid' : 'invalid';
  const isInvalid = parsed?.ok === false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ValidityBadge
          validity={validity}
          validLabel={messages.validBadge}
          invalidLabel={messages.invalidBadge}
        />
        <ErrorBanner parseResult={parsed} errorTemplate={messages.errorTemplate} />
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">
            {messages.loadSample}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={!hasInput}>
            {messages.clear}
          </Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={inputId} className="text-xs text-text-muted">
              {messages.inputLabel}
            </label>
            <span className="font-mono text-xs text-text-faint">
              {tpl(messages.sizeTemplate, { bytes: inputSize })}
            </span>
          </div>
          <JsonInput
            value={input}
            onChange={onChangeInput}
            placeholder={messages.inputPlaceholder}
            invalid={isInvalid}
            ariaLabel={messages.inputLabel}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={outputId} className="text-xs text-text-muted">
              {messages.outputLabel}
            </label>
            <span className="font-mono text-xs text-text-faint">
              {output ? tpl(messages.sizeTemplate, { bytes: outputSize }) : ''}
            </span>
          </div>
          {output ? (
            <JsonInput
              value={output}
              onChange={() => undefined}
              readOnly
              enableFileDrop={false}
              ariaLabel={messages.outputLabel}
            />
          ) : (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.indent}</legend>
          {(
            [
              ['2', messages.indent2],
              ['4', messages.indent4],
              ['tab', messages.indentTab],
              ['minify', messages.minify],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                indent === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={indentName}
                value={value}
                checked={indent === value}
                onChange={() => setIndent(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label htmlFor={sortId} className="flex items-center gap-2 text-xs text-text-muted">
          <input
            id={sortId}
            type="checkbox"
            checked={sortKeys}
            onChange={(e) => setSortKeys(e.target.checked)}
          />
          {messages.sortKeys}
        </label>

        <span className="ml-auto flex items-center gap-2">
          <CopyButton
            text={output}
            copyLabel={messages.copy}
            copiedLabel={messages.copied}
            disabled={!output}
          />
          <Button size="sm" onClick={onDownload} disabled={!output} type="button">
            {messages.download}
          </Button>
        </span>
      </div>
    </div>
  );
}
