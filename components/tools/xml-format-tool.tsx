'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { formatXml, type XmlIndent, type XmlMode, type XmlResult } from '@/lib/tools/implementations/xml-format';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  mode: string;
  modePretty: string;
  modeMinify: string;
  modeToJson: string;
  modeFromJson: string;
  indent: string;
  indent2: string;
  indent4: string;
  indentTab: string;
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

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="bk101" lang="en">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price>44.95</price>
  </book>
  <!-- second entry -->
  <book id="bk102" lang="fr">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price>5.95</price>
  </book>
</catalog>`;

const JSON_SAMPLE = JSON.stringify(
  {
    catalog: {
      book: [
        { '@_id': 'bk101', author: 'Gambardella, Matthew', price: 44.95 },
        { '@_id': 'bk102', author: 'Ralls, Kim', price: 5.95 },
      ],
    },
  },
  null,
  2,
);

const XML_FILE_HINT = /\.(xml|svg|xsd|xsl|xslt|rss|atom|plist|html?)$/i;
const XML_MIME_HINT = /(xml|svg|text\/plain|text\/html)/i;

const MODES: readonly XmlMode[] = ['pretty', 'minify', 'to-json', 'from-json'];

export function XmlFormatTool(messages: Messages) {
  const modeName = useId();
  const indentName = useId();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<XmlMode>('pretty');
  const [indent, setIndent] = useState<XmlIndent>('2');
  const [result, setResult] = useState<XmlResult | null>(null);
  const [dragging, setDragging] = useState(false);

  // Empty input clears the result in the change handler (not here) — setting
  // state directly in an effect body triggers the react-hooks lint rule.
  useEffect(() => {
    if (!input.trim()) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const next = formatXml(input, { mode, indent });
      if (!cancelled) setResult(next);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [input, mode, indent]);

  const onChangeInput = useCallback((value: string) => {
    setInput(value);
    if (!value.trim()) setResult(null);
  }, []);

  const output = result?.ok ? result.output : '';
  const error = result && !result.ok ? result.error : null;

  const hasInput = input.trim().length > 0;
  const validity = !hasInput || !result ? null : result.ok ? 'valid' : 'invalid';
  const isJsonOutput = mode === 'to-json';

  const inputSize = useMemo(() => new TextEncoder().encode(input).length, [input]);
  const outputSize = useMemo(() => new TextEncoder().encode(output).length, [output]);

  const modeLabels: Record<XmlMode, string> = {
    pretty: messages.modePretty,
    minify: messages.modeMinify,
    'to-json': messages.modeToJson,
    'from-json': messages.modeFromJson,
  };

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find(
        (f) => XML_FILE_HINT.test(f.name) || XML_MIME_HINT.test(f.type),
      );
      if (!file) return;
      onChangeInput(await file.text());
    },
    [onChangeInput],
  );

  const onDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], {
      type: isJsonOutput ? 'application/json' : 'application/xml',
    });
    downloadBlob(blob, isJsonOutput ? 'converted.json' : 'formatted.xml');
  }, [output, isJsonOutput]);

  const onLoadSample = () => setInput(mode === 'from-json' ? JSON_SAMPLE : XML_SAMPLE);
  const onClear = () => {
    setInput('');
    setResult(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ValidityBadge
          validity={validity}
          validLabel={messages.validBadge}
          invalidLabel={messages.invalidBadge}
        />
        {error ? (
          <span className="font-mono text-xs text-danger" role="alert">
            {tpl(messages.errorTemplate, {
              line: error.line,
              col: error.col,
              message: error.message,
            })}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">
            {messages.loadSample}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={!input}>
            {messages.clear}
          </Button>
        </span>
      </div>

        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {MODES.map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                mode === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={modeName}
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="sr-only"
              />
              {modeLabels[value]}
            </label>
          ))}
        </fieldset>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.inputLabel}</label>
            <span className="font-mono text-xs text-text-faint">
              {tpl(messages.sizeTemplate, { bytes: inputSize })}
            </span>
          </div>
          <textarea
            aria-label={messages.inputLabel}
            value={input}
            onChange={(e) => onChangeInput(e.target.value)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            placeholder={messages.inputPlaceholder}
            rows={20}
            spellCheck={false}
            className={cn(
              'min-h-[24rem] w-full resize-y rounded-md border bg-surface px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors',
              validity === 'invalid'
                ? 'border-danger/50 focus:border-danger'
                : 'border-border hover:border-border-strong focus:border-accent',
              dragging && 'ring-2 ring-accent/40',
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">
              {output ? tpl(messages.sizeTemplate, { bytes: outputSize }) : ''}
            </span>
          </div>
          {output ? (
            <textarea
              aria-label={messages.outputLabel}
              value={output}
              readOnly
              rows={20}
              spellCheck={false}
              className="min-h-[24rem] w-full resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          ) : (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {mode === 'minify' ? null : (
          <fieldset className="flex flex-wrap items-center gap-2 text-xs">
            <legend className="px-1 text-text-muted">{messages.indent}</legend>
            {(
              [
                ['2', messages.indent2],
                ['4', messages.indent4],
                ['tab', messages.indentTab],
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
        )}

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
