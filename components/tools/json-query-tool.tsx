'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';
import { safeParse } from '@/lib/json/parse';
import { query } from '@/lib/json/path';
import type { JsonValue, ParseResult } from '@/lib/json/types';
import { JsonInput } from '@/components/tools/json/json-input';
import { JsonTree } from '@/components/tools/json/json-tree';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { ErrorBanner } from '@/components/tools/json/error-banner';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  pathLabel: string;
  pathPlaceholder: string;
  outputLabel: string;
  empty: string;
  loadSample: string;
  clear: string;
  validBadge: string;
  invalidBadge: string;
  errorTemplate: string;
  pathError: string;
  resultsTemplate: string;
  noResults: string;
  copy: string;
  copied: string;
  examples: string;
  exampleAllKeys: string;
  exampleAllValues: string;
  exampleByName: string;
  exampleFilter: string;
  exampleRecursive: string;
};

const SAMPLE_DATA = {
  store: {
    book: [
      { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
      { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
      { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', price: 8.99 },
      { category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', price: 22.99 },
    ],
    bicycle: { color: 'red', price: 19.95 },
  },
};
const SAMPLE = JSON.stringify(SAMPLE_DATA, null, 2);

const EXAMPLES: Array<{ key: keyof Pick<Messages, 'exampleAllKeys' | 'exampleAllValues' | 'exampleByName' | 'exampleFilter' | 'exampleRecursive'>; path: string }> = [
  { key: 'exampleAllKeys', path: '$.*' },
  { key: 'exampleAllValues', path: '$..*' },
  { key: 'exampleByName', path: '$.store.book[*].title' },
  { key: 'exampleFilter', path: '$.store.book[?(@.price>10)]' },
  { key: 'exampleRecursive', path: '$..author' },
];

export function JsonQueryTool(messages: Messages) {
  const pathId = useId();
  const [input, setInput] = useState('');
  const [path, setPath] = useState('$..*');
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

  const queryResult = useMemo(() => {
    if (!parsed?.ok || !path.trim()) return null;
    return query(parsed.value as JsonValue, path);
  }, [parsed, path]);

  const onChangeInput = useCallback((value: string) => {
    setInput(value);
    if (!value) setParsed(null);
  }, []);

  const onLoadSample = () => {
    setInput(SAMPLE);
    setPath('$.store.book[?(@.price>10)]');
  };
  const onClear = () => {
    setInput('');
    setParsed(null);
  };

  const hasInput = input.length > 0;
  const validity = !hasInput || !parsed ? null : parsed.ok ? 'valid' : 'invalid';
  const isInvalid = parsed?.ok === false;

  const outputJson = useMemo<JsonValue>(() => {
    if (!queryResult || !queryResult.ok) return [];
    return queryResult.results as JsonValue;
  }, [queryResult]);
  const outputText = useMemo(() => JSON.stringify(outputJson, null, 2), [outputJson]);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            type="button"
            disabled={!hasInput}
          >
            {messages.clear}
          </Button>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.inputLabel}</label>
        <JsonInput
          value={input}
          onChange={onChangeInput}
          placeholder={messages.inputPlaceholder}
          invalid={isInvalid}
          rows={10}
          ariaLabel={messages.inputLabel}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor={pathId} className="text-xs text-text-muted">
            {messages.pathLabel}
          </label>
          {queryResult && queryResult.ok ? (
            <span className="font-mono text-xs text-text-faint">
              {tpl(messages.resultsTemplate, { n: queryResult.results.length })}
            </span>
          ) : null}
        </div>
        <input
          id={pathId}
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder={messages.pathPlaceholder}
          spellCheck={false}
          className={cn(
            'h-9 w-full rounded-md border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors',
            queryResult && !queryResult.ok
              ? 'border-danger/50 focus:border-danger'
              : 'border-border hover:border-border-strong focus:border-accent',
          )}
        />
        {queryResult && !queryResult.ok ? (
          <span className="font-mono text-xs text-danger" role="alert">
            {tpl(messages.pathError, { message: queryResult.message })}
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-muted">{messages.examples}:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.path}
              type="button"
              onClick={() => setPath(ex.path)}
              className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-text-muted hover:border-border-strong hover:bg-surface-hover"
            >
              {messages[ex.key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label className="text-xs text-text-muted">{messages.outputLabel}</label>
          {queryResult?.ok ? (
            <CopyButton
              text={outputText}
              copyLabel={messages.copy}
              copiedLabel={messages.copied}
              disabled={queryResult.results.length === 0}
            />
          ) : null}
        </div>
        {queryResult?.ok && queryResult.results.length > 0 ? (
          <JsonTree value={queryResult.results as JsonValue} rootPath="$" initiallyExpandedToDepth={2} />
        ) : (
          <Card className="flex min-h-[12rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
            {queryResult?.ok && queryResult.results.length === 0
              ? messages.noResults
              : messages.empty}
          </Card>
        )}
      </div>
    </div>
  );
}
