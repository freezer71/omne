'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';
import { safeParse } from '@/lib/json/parse';
import { buildPathIndex, diffJson, summarize } from '@/lib/json/diff';
import type { DiffKind } from '@/lib/json/diff';
import type { JsonValue, ParseResult } from '@/lib/json/types';
import { JsonInput } from '@/components/tools/json/json-input';
import { JsonTree, type Highlight } from '@/components/tools/json/json-tree';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { ErrorBanner } from '@/components/tools/json/error-banner';

type Messages = {
  inputALabel: string;
  inputBLabel: string;
  inputAPlaceholder: string;
  inputBPlaceholder: string;
  empty: string;
  loadSample: string;
  clear: string;
  validBadge: string;
  invalidBadge: string;
  errorTemplate: string;
  statsTemplate: string;
  identicalLabel: string;
  legendAdded: string;
  legendRemoved: string;
  legendChanged: string;
  treeALabel: string;
  treeBLabel: string;
};

const SAMPLE_A = JSON.stringify(
  {
    name: 'omne',
    version: '0.1.0',
    tools: ['format', 'query', 'table'],
    features: { darkMode: true, privacy: '100%' },
  },
  null,
  2,
);

const SAMPLE_B = JSON.stringify(
  {
    name: 'omne',
    version: '0.2.0',
    tools: ['format', 'query', 'table', 'diff'],
    features: { darkMode: true, privacy: '100%', languages: ['en', 'fr'] },
  },
  null,
  2,
);

export function JsonDiffTool(messages: Messages) {
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [parsedA, setParsedA] = useState<ParseResult | null>(null);
  const [parsedB, setParsedB] = useState<ParseResult | null>(null);

  useEffect(() => {
    if (!inputA) return;
    let cancelled = false;
    const h = window.setTimeout(() => {
      const r = safeParse(inputA);
      if (!cancelled) setParsedA(r);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(h);
    };
  }, [inputA]);

  useEffect(() => {
    if (!inputB) return;
    let cancelled = false;
    const h = window.setTimeout(() => {
      const r = safeParse(inputB);
      if (!cancelled) setParsedB(r);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(h);
    };
  }, [inputB]);

  const analysis = useMemo(() => {
    if (!parsedA?.ok || !parsedB?.ok) return null;
    const diff = diffJson(parsedA.value as JsonValue, parsedB.value as JsonValue);
    return {
      diff,
      summary: summarize(diff),
      index: buildPathIndex(diff),
    };
  }, [parsedA, parsedB]);

  const onChangeA = useCallback((value: string) => {
    setInputA(value);
    if (!value) setParsedA(null);
  }, []);

  const onChangeB = useCallback((value: string) => {
    setInputB(value);
    if (!value) setParsedB(null);
  }, []);

  const onLoadSample = () => {
    setInputA(SAMPLE_A);
    setInputB(SAMPLE_B);
  };

  const onClear = () => {
    setInputA('');
    setInputB('');
    setParsedA(null);
    setParsedB(null);
  };

  const hasInput = inputA.length > 0 || inputB.length > 0;
  const validityA = !inputA || !parsedA ? null : parsedA.ok ? 'valid' : 'invalid';
  const validityB = !inputB || !parsedB ? null : parsedB.ok ? 'valid' : 'invalid';

  const highlightA = useCallback(
    (path: string): Highlight => {
      if (!analysis) return null;
      const kind = analysis.index.get(path);
      if (kind === 'del' || kind === 'change') return kind;
      return null;
    },
    [analysis],
  );

  const highlightB = useCallback(
    (path: string): Highlight => {
      if (!analysis) return null;
      const kind = analysis.index.get(path);
      if (kind === 'add' || kind === 'change') return kind;
      return null;
    },
    [analysis],
  );

  const isInvalidA = parsedA?.ok === false;
  const isInvalidB = parsedB?.ok === false;
  const identical =
    analysis &&
    analysis.summary.added === 0 &&
    analysis.summary.removed === 0 &&
    analysis.summary.changed === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {analysis ? (
          identical ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ {messages.identicalLabel}
            </span>
          ) : (
            <span className="font-mono text-xs text-text-faint">
              {tpl(messages.statsTemplate, {
                added: analysis.summary.added,
                removed: analysis.summary.removed,
                changed: analysis.summary.changed,
              })}
            </span>
          )
        ) : null}
        {analysis ? (
          <span className="flex items-center gap-2 text-xs">
            <Pill kind="add">{messages.legendAdded}</Pill>
            <Pill kind="del">{messages.legendRemoved}</Pill>
            <Pill kind="change">{messages.legendChanged}</Pill>
          </span>
        ) : null}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">{messages.inputALabel}</label>
            <ValidityBadge
              validity={validityA}
              validLabel={messages.validBadge}
              invalidLabel={messages.invalidBadge}
            />
          </div>
          {isInvalidA ? (
            <ErrorBanner parseResult={parsedA} errorTemplate={messages.errorTemplate} />
          ) : null}
          <JsonInput
            value={inputA}
            onChange={onChangeA}
            placeholder={messages.inputAPlaceholder}
            invalid={isInvalidA}
            rows={12}
            ariaLabel={messages.inputALabel}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">{messages.inputBLabel}</label>
            <ValidityBadge
              validity={validityB}
              validLabel={messages.validBadge}
              invalidLabel={messages.invalidBadge}
            />
          </div>
          {isInvalidB ? (
            <ErrorBanner parseResult={parsedB} errorTemplate={messages.errorTemplate} />
          ) : null}
          <JsonInput
            value={inputB}
            onChange={onChangeB}
            placeholder={messages.inputBPlaceholder}
            invalid={isInvalidB}
            rows={12}
            ariaLabel={messages.inputBLabel}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">{messages.treeALabel}</label>
          {parsedA?.ok ? (
            <JsonTree
              value={parsedA.value as JsonValue}
              highlight={highlightA}
              initiallyExpandedToDepth={3}
            />
          ) : (
            <Card className="flex min-h-[10rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">{messages.treeBLabel}</label>
          {parsedB?.ok ? (
            <JsonTree
              value={parsedB.value as JsonValue}
              highlight={highlightB}
              initiallyExpandedToDepth={3}
            />
          ) : (
            <Card className="flex min-h-[10rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ kind, children }: { kind: DiffKind; children: React.ReactNode }) {
  const cls =
    kind === 'add'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : kind === 'del'
        ? 'border-danger/30 bg-danger/10 text-danger'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5', cls)}>
      {children}
    </span>
  );
}
