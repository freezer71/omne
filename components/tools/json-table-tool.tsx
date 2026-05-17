'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { safeParse } from '@/lib/json/parse';
import { flattenForTable, type TableShape } from '@/lib/json/tree-utils';
import { jsonToCsv } from '@/lib/json/csv';
import type { JsonValue, ParseResult } from '@/lib/json/types';
import { JsonInput } from '@/components/tools/json/json-input';
import { JsonTable } from '@/components/tools/json/json-table';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { ErrorBanner } from '@/components/tools/json/error-banner';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  empty: string;
  notArray: string;
  loadSample: string;
  clear: string;
  validBadge: string;
  invalidBadge: string;
  errorTemplate: string;
  searchPlaceholder: string;
  filterPlaceholder: string;
  prev: string;
  next: string;
  pageTemplate: string;
  rowsTemplate: string;
  exportCsv: string;
  exportJson: string;
  columnsLabel: string;
  columnsTemplate: string;
};

const SAMPLE = JSON.stringify(
  [
    { id: 1, name: 'Alice', role: 'admin', signedUp: '2025-01-12', active: true },
    { id: 2, name: 'Bob', role: 'editor', signedUp: '2025-02-08', active: true },
    { id: 3, name: 'Carol', role: 'viewer', signedUp: '2025-02-22', active: false },
    { id: 4, name: 'Dan', role: 'editor', signedUp: '2025-03-14', active: true },
    { id: 5, name: 'Eve', role: 'admin', signedUp: '2025-04-04', active: true },
    { id: 6, name: 'Frank', role: 'viewer', signedUp: '2025-04-19', active: false },
  ],
  null,
  2,
);

export function JsonTableTool(messages: Messages) {
  const [input, setInput] = useState('');
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

  const shape: TableShape | null = useMemo(() => {
    if (!parsed?.ok) return null;
    return flattenForTable(parsed.value as JsonValue);
  }, [parsed]);

  const onChangeInput = useCallback((value: string) => {
    setInput(value);
    if (!value) setParsed(null);
  }, []);

  const onLoadSample = () => setInput(SAMPLE);
  const onClear = () => {
    setInput('');
    setParsed(null);
  };

  const onExportCsv = useCallback(() => {
    if (!shape) return;
    const csv = jsonToCsv(shape.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, 'table.csv');
  }, [shape]);

  const onExportJson = useCallback(() => {
    if (!shape) return;
    const json = JSON.stringify(shape.rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, 'table.json');
  }, [shape]);

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
        {shape ? (
          <span className="font-mono text-xs text-text-faint">
            {tpl(messages.columnsTemplate, {
              cols: shape.columns.length,
              rows: shape.rows.length,
            })}
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

      <details className="rounded-md border border-border">
        <summary className="cursor-pointer px-3 py-2 text-xs text-text-muted hover:bg-surface-hover">
          {messages.inputLabel}
        </summary>
        <div className="border-t border-border px-3 py-2">
          <JsonInput
            value={input}
            onChange={onChangeInput}
            placeholder={messages.inputPlaceholder}
            invalid={isInvalid}
            rows={8}
            ariaLabel={messages.inputLabel}
          />
        </div>
      </details>

      {shape && shape.columns.length > 0 ? (
        <>
          <JsonTable
            columns={shape.columns}
            rows={shape.rows}
            messages={{
              searchPlaceholder: messages.searchPlaceholder,
              filterPlaceholder: messages.filterPlaceholder,
              prev: messages.prev,
              next: messages.next,
              pageTemplate: messages.pageTemplate,
              rowsTemplate: messages.rowsTemplate,
              empty: messages.empty,
            }}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="subtle" size="sm" onClick={onExportCsv} type="button">
              {messages.exportCsv}
            </Button>
            <Button size="sm" onClick={onExportJson} type="button">
              {messages.exportJson}
            </Button>
          </div>
        </>
      ) : parsed?.ok && !shape ? (
        <Card className="px-3 py-4 text-sm text-text-faint">{messages.notArray}</Card>
      ) : (
        <Card className="flex min-h-[10rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
          {messages.empty}
        </Card>
      )}
    </div>
  );
}
