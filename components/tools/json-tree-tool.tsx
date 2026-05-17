'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { tpl } from '@/lib/tpl';
import { safeParse } from '@/lib/json/parse';
import { computeStats } from '@/lib/json/tree-utils';
import type { JsonValue, ParseResult } from '@/lib/json/types';
import { JsonInput } from '@/components/tools/json/json-input';
import { JsonTree } from '@/components/tools/json/json-tree';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { ErrorBanner } from '@/components/tools/json/error-banner';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  searchLabel: string;
  searchPlaceholder: string;
  empty: string;
  loadSample: string;
  clear: string;
  validBadge: string;
  invalidBadge: string;
  errorTemplate: string;
  statsTemplate: string;
  copyPath: string;
  copyValue: string;
  copiedToast: string;
  expandAll: string;
  collapseAll: string;
  emptyObject: string;
  emptyArray: string;
};

const SAMPLE = JSON.stringify(
  {
    site: 'omne',
    privacy: { localOnly: true, uploadCount: 0 },
    categories: ['pdf', 'image', 'video', 'password', 'json'],
    tools: [
      { id: 'format', category: 'json', stable: true, features: ['minify', 'sort'] },
      { id: 'query', category: 'json', stable: true, engine: 'jsonpath-plus' },
      { id: 'tree', category: 'json', stable: true, features: ['search', 'copy-path'] },
    ],
    counts: { pdf: 5, image: 6, video: 2, password: 5, json: 7 },
    metadata: { created: '2026-05-17', authors: ['team@omne'] },
  },
  null,
  2,
);

export function JsonTreeTool(messages: Messages) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [expandDepth, setExpandDepth] = useState(2);
  const [treeKey, setTreeKey] = useState(0);

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

  const stats = useMemo(() => {
    if (!parsed?.ok) return null;
    return computeStats(parsed.value as JsonValue);
  }, [parsed]);

  const onChangeInput = useCallback((value: string) => {
    setInput(value);
    if (!value) setParsed(null);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1500);
  }, []);

  const onCopyPath = useCallback(
    (path: string) => {
      void navigator.clipboard.writeText(path);
      showToast(messages.copiedToast);
    },
    [messages.copiedToast, showToast],
  );

  const onCopyValue = useCallback(
    (value: JsonValue) => {
      const text =
        typeof value === 'object' && value !== null
          ? JSON.stringify(value, null, 2)
          : JSON.stringify(value);
      void navigator.clipboard.writeText(text);
      showToast(messages.copiedToast);
    },
    [messages.copiedToast, showToast],
  );

  const onExpandAll = () => {
    setExpandDepth(Number.MAX_SAFE_INTEGER);
    setTreeKey((k) => k + 1);
  };
  const onCollapseAll = () => {
    setExpandDepth(0);
    setTreeKey((k) => k + 1);
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
        {stats ? (
          <span className="font-mono text-xs text-text-faint">
            {tpl(messages.statsTemplate, {
              nodes: stats.nodes,
              depth: stats.depth,
              keys: stats.keys,
            })}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)} type="button">
            {messages.loadSample}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInput('');
              setParsed(null);
            }}
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

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={messages.searchPlaceholder}
          aria-label={messages.searchLabel}
          className="h-9 flex-1 min-w-[12rem] rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <Button variant="ghost" size="sm" onClick={onExpandAll} type="button" disabled={!parsed?.ok}>
          {messages.expandAll}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapseAll}
          type="button"
          disabled={!parsed?.ok}
        >
          {messages.collapseAll}
        </Button>
      </div>

      <div className="relative">
        {parsed?.ok ? (
          <JsonTree
            key={treeKey}
            value={parsed.value as JsonValue}
            searchQuery={search}
            initiallyExpandedToDepth={expandDepth}
            showCopyButtons
            onCopyPath={onCopyPath}
            onCopyValue={onCopyValue}
            messages={{
              copyPath: messages.copyPath,
              copyValue: messages.copyValue,
              emptyObject: messages.emptyObject,
              emptyArray: messages.emptyArray,
            }}
          />
        ) : (
          <Card className="flex min-h-[16rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
            {messages.empty}
          </Card>
        )}
        {toast ? (
          <span
            className="pointer-events-none absolute right-3 top-3 rounded-md bg-text-primary px-2.5 py-1 text-xs text-surface shadow-lg"
            role="status"
          >
            {toast}
          </span>
        ) : null}
      </div>
    </div>
  );
}
