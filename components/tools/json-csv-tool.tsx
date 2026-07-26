'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  convertCsvToJson,
  convertJsonToCsv,
  detectDelimiter,
  type CsvDelimiter,
  type CsvQuote,
} from '@/lib/tools/implementations/json-csv';
import { JsonInput } from '@/components/tools/json/json-input';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { ErrorBanner } from '@/components/tools/json/error-banner';
import { CopyButton } from '@/components/tools/json/copy-button';

type Mode = 'json-to-csv' | 'csv-to-json';

type Messages = {
  modeJsonToCsv: string;
  modeCsvToJson: string;
  jsonInputLabel: string;
  jsonInputPlaceholder: string;
  csvInputLabel: string;
  csvInputPlaceholder: string;
  jsonOutputLabel: string;
  csvOutputLabel: string;
  delimiter: string;
  delimiterComma: string;
  delimiterSemicolon: string;
  delimiterTab: string;
  delimiterPipe: string;
  headers: string;
  notArray: string;
  empty: string;
  loadSample: string;
  clear: string;
  validBadge: string;
  invalidBadge: string;
  errorTemplate: string;
  copy: string;
  copied: string;
  download: string;
  autoDetect: string;
  rowsTemplate: string;
};

const SAMPLE_JSON = JSON.stringify(
  [
    { id: 1, name: 'Alice', email: 'alice@example.com', signedUp: '2025-01-12' },
    { id: 2, name: 'Bob', email: 'bob@example.com', signedUp: '2025-02-08' },
    { id: 3, name: 'Carol', email: 'carol@example.com', signedUp: '2025-02-22' },
  ],
  null,
  2,
);

const SAMPLE_CSV = `id,name,email,signedUp
1,Alice,alice@example.com,2025-01-12
2,Bob,bob@example.com,2025-02-08
3,Carol,carol@example.com,2025-02-22`;

export function JsonCsvTool(messages: Messages) {
  const [mode, setMode] = useState<Mode>('json-to-csv');
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(',');
  const [headers, setHeaders] = useState(true);
  const quote: CsvQuote = '"';

  // Reset input when the mode changes (clearing the textarea), and
  // auto-detect the CSV delimiter when switching to / typing CSV input.
  // Both are derivations of mode/input, so we run them during render with a
  // tracked-state guard instead of inside useEffect.
  const [trackedMode, setTrackedMode] = useState<Mode>(mode);
  const [trackedInput, setTrackedInput] = useState<string>(input);
  if (trackedMode !== mode) {
    // Mode change: clear input. Skip delimiter detection this render because
    // `input` still holds the previous mode's text; the next render (with the
    // cleared input) will reconcile both trackers.
    setTrackedMode(mode);
    setTrackedInput('');
    setInput('');
  } else if (trackedInput !== input) {
    setTrackedInput(input);
    if (mode === 'csv-to-json' && input) {
      const detected = detectDelimiter(input);
      if (detected !== delimiter) setDelimiter(detected);
    }
  }

  const onChangeInput = useCallback((value: string) => {
    setInput(value);
  }, []);

  const jsonToCsvResult = useMemo(() => {
    if (mode !== 'json-to-csv' || !input) return null;
    return convertJsonToCsv(input, { delimiter, quote, headers });
  }, [mode, input, delimiter, quote, headers]);

  const csvToJsonResult = useMemo(() => {
    if (mode !== 'csv-to-json' || !input) return null;
    return convertCsvToJson(input, { delimiter, quote, headers });
  }, [mode, input, delimiter, quote, headers]);

  const onClear = () => {
    setInput('');
  };

  const onLoadSample = () => {
    setInput(mode === 'json-to-csv' ? SAMPLE_JSON : SAMPLE_CSV);
  };

  const onDownload = () => {
    if (mode === 'json-to-csv' && jsonToCsvResult?.ok) {
      const blob = new Blob([jsonToCsvResult.csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, 'data.csv');
    } else if (mode === 'csv-to-json' && csvToJsonResult) {
      const blob = new Blob([csvToJsonResult.text], { type: 'application/json' });
      downloadBlob(blob, 'data.json');
    }
  };

  const hasInput = input.length > 0;
  const jsonError =
    mode === 'json-to-csv' && jsonToCsvResult && !jsonToCsvResult.ok && jsonToCsvResult.reason === 'parse'
      ? jsonToCsvResult.parse
      : null;
  const isNotArray =
    mode === 'json-to-csv' && jsonToCsvResult?.ok === false && jsonToCsvResult.reason === 'not-array';
  const validity =
    mode === 'json-to-csv' && hasInput
      ? jsonError
        ? 'invalid'
        : isNotArray
          ? 'invalid'
          : jsonToCsvResult?.ok
            ? 'valid'
            : null
      : null;

  const outputText =
    mode === 'json-to-csv'
      ? jsonToCsvResult?.ok
        ? jsonToCsvResult.csv
        : ''
      : csvToJsonResult?.text ?? '';

  const rowsTemplate =
    mode === 'json-to-csv'
      ? jsonToCsvResult?.ok
        ? tpl(messages.rowsTemplate, {
            rows: jsonToCsvResult.rowCount,
            cols: jsonToCsvResult.columnCount,
          })
        : ''
      : csvToJsonResult
        ? tpl(messages.rowsTemplate, {
            rows: csvToJsonResult.json.length,
            cols: Object.keys(csvToJsonResult.json[0] ?? {}).length,
          })
        : '';

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-2">
        {(['json-to-csv', 'csv-to-json'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs transition-colors',
              mode === m
                ? 'border-accent bg-surface-hover text-text-primary'
                : 'border-border bg-surface text-text-muted hover:border-border-strong',
            )}
          >
            {m === 'json-to-csv' ? messages.modeJsonToCsv : messages.modeCsvToJson}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ValidityBadge
          validity={validity}
          validLabel={messages.validBadge}
          invalidLabel={messages.invalidBadge}
        />
        {jsonError ? (
          <ErrorBanner parseResult={jsonError} errorTemplate={messages.errorTemplate} />
        ) : null}
        {isNotArray ? (
          <span className="font-mono text-xs text-danger" role="alert">
            {messages.notArray}
          </span>
        ) : null}
        <span className="font-mono text-xs text-text-faint">{rowsTemplate}</span>
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

        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.delimiter}</legend>
          {(
            [
              [',', messages.delimiterComma],
              [';', messages.delimiterSemicolon],
              ['\t', messages.delimiterTab],
              ['|', messages.delimiterPipe],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                delimiter === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name="delimiter"
                value={value}
                checked={delimiter === value}
                onChange={() => setDelimiter(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </fieldset>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">
            {mode === 'json-to-csv' ? messages.jsonInputLabel : messages.csvInputLabel}
          </label>
          <JsonInput
            value={input}
            onChange={onChangeInput}
            placeholder={
              mode === 'json-to-csv' ? messages.jsonInputPlaceholder : messages.csvInputPlaceholder
            }
            invalid={validity === 'invalid'}
            ariaLabel={mode === 'json-to-csv' ? messages.jsonInputLabel : messages.csvInputLabel}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">
            {mode === 'json-to-csv' ? messages.csvOutputLabel : messages.jsonOutputLabel}
          </label>
          {outputText ? (
            <JsonInput value={outputText} onChange={() => undefined} readOnly enableFileDrop={false} />
          ) : (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={headers}
            onChange={(e) => setHeaders(e.target.checked)}
          />
          {messages.headers}
        </label>

        <span className="ml-auto flex items-center gap-2">
          <CopyButton
            text={outputText}
            copyLabel={messages.copy}
            copiedLabel={messages.copied}
            disabled={!outputText}
          />
          <Button size="sm" onClick={onDownload} disabled={!outputText} type="button">
            {messages.download}
          </Button>
        </span>
      </div>
    </div>
  );
}
