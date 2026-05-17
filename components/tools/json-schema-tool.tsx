'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import type { SchemaDraft } from '@/lib/json/schema-infer';
import type { ValidationResult } from '@/lib/json/schema-validate';
import {
  generateSchemaFromSample,
  validateAgainstSchema,
} from '@/lib/tools/implementations/json-schema';
import type { ParseResult } from '@/lib/json/types';
import { JsonInput } from '@/components/tools/json/json-input';
import { ValidityBadge } from '@/components/tools/json/validity-badge';
import { ErrorBanner } from '@/components/tools/json/error-banner';
import { CopyButton } from '@/components/tools/json/copy-button';

type Mode = 'validate' | 'generate';

type Messages = {
  modeValidate: string;
  modeGenerate: string;
  draftLabel: string;
  draft07: string;
  draft2020: string;
  dataLabel: string;
  dataPlaceholder: string;
  schemaLabel: string;
  schemaPlaceholder: string;
  sampleLabel: string;
  samplePlaceholder: string;
  generatedSchemaLabel: string;
  validateBadge: string;
  invalidBadge: string;
  validMessage: string;
  errorsTemplate: string;
  errorRowTemplate: string;
  parseDataError: string;
  parseSchemaError: string;
  errorTemplate: string;
  empty: string;
  loadSample: string;
  clear: string;
  copy: string;
  copied: string;
  download: string;
};

const SAMPLE_DATA_FOR_GEN = JSON.stringify(
  [
    { id: 1, name: 'Alice', email: 'alice@example.com', joined: '2025-01-12', tags: ['admin'] },
    { id: 2, name: 'Bob', email: 'bob@example.com', joined: '2025-02-08', tags: ['editor'] },
  ],
  null,
  2,
);

const SAMPLE_VALIDATE_DATA = JSON.stringify({ name: 'Alice', age: 30 }, null, 2);
const SAMPLE_VALIDATE_SCHEMA = JSON.stringify(
  {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer', minimum: 0 },
    },
    required: ['name', 'age'],
  },
  null,
  2,
);

export function JsonSchemaTool(messages: Messages) {
  const [mode, setMode] = useState<Mode>('validate');
  const [draft, setDraft] = useState<SchemaDraft>('2020-12');

  // Validate mode state
  const [data, setData] = useState('');
  const [schema, setSchema] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validateError, setValidateError] = useState<{
    reason: 'parse-data' | 'parse-schema';
    parse: ParseResult;
  } | null>(null);

  // Generate mode state
  const [sample, setSample] = useState('');
  const [generated, setGenerated] = useState('');
  const [generateError, setGenerateError] = useState<ParseResult | null>(null);

  useEffect(() => {
    setValidation(null);
    setValidateError(null);
    setGenerateError(null);
    setGenerated('');
  }, [mode]);

  // Validate mode effect
  useEffect(() => {
    if (mode !== 'validate') return;
    if (!data || !schema) {
      setValidation(null);
      setValidateError(null);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        const out = await validateAgainstSchema(data, schema, draft);
        if (cancelled) return;
        if (out.ok) {
          setValidation(out.result);
          setValidateError(null);
        } else {
          setValidation(null);
          setValidateError({ reason: out.reason, parse: out.parse });
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [mode, data, schema, draft]);

  // Generate mode effect
  useEffect(() => {
    if (mode !== 'generate') return;
    if (!sample) {
      setGenerated('');
      setGenerateError(null);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const out = generateSchemaFromSample(sample, draft);
      if (cancelled) return;
      if (out.ok) {
        setGenerated(out.schema);
        setGenerateError(null);
      } else {
        setGenerated('');
        setGenerateError(out.parse);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [mode, sample, draft]);

  const onLoadSample = () => {
    if (mode === 'validate') {
      setData(SAMPLE_VALIDATE_DATA);
      setSchema(SAMPLE_VALIDATE_SCHEMA);
    } else {
      setSample(SAMPLE_DATA_FOR_GEN);
    }
  };

  const onClear = () => {
    setData('');
    setSchema('');
    setSample('');
    setValidation(null);
    setValidateError(null);
    setGenerated('');
    setGenerateError(null);
  };

  const onDownload = useCallback(() => {
    if (mode === 'generate' && generated) {
      const blob = new Blob([generated], { type: 'application/json' });
      downloadBlob(blob, 'schema.json');
    }
  }, [mode, generated]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex gap-2">
          {(['validate', 'generate'] as const).map((m) => (
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
              {m === 'validate' ? messages.modeValidate : messages.modeGenerate}
            </button>
          ))}
        </div>

        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.draftLabel}</legend>
          {(
            [
              ['2020-12', messages.draft2020],
              ['draft-07', messages.draft07],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                draft === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name="draft"
                value={value}
                checked={draft === value}
                onChange={() => setDraft(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">
            {messages.loadSample}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} type="button">
            {messages.clear}
          </Button>
        </span>
      </div>

      {mode === 'validate' ? (
        <ValidateView
          data={data}
          setData={setData}
          schema={schema}
          setSchema={setSchema}
          validation={validation}
          validateError={validateError}
          messages={messages}
        />
      ) : (
        <GenerateView
          sample={sample}
          setSample={setSample}
          generated={generated}
          generateError={generateError}
          onDownload={onDownload}
          messages={messages}
        />
      )}
    </div>
  );
}

function ValidateView({
  data,
  setData,
  schema,
  setSchema,
  validation,
  validateError,
  messages,
}: {
  data: string;
  setData: (v: string) => void;
  schema: string;
  setSchema: (v: string) => void;
  validation: ValidationResult | null;
  validateError: { reason: 'parse-data' | 'parse-schema'; parse: ParseResult } | null;
  messages: Messages;
}) {
  const isValid = validation?.ok === true;
  const isInvalid = validation?.ok === false;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {validation ? (
          isValid ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ {messages.validMessage}
            </span>
          ) : (
            <span className="font-mono text-xs text-danger">
              {tpl(messages.errorsTemplate, { n: validation.errors.length })}
            </span>
          )
        ) : null}
        {validateError ? (
          <span className="font-mono text-xs text-danger" role="alert">
            {validateError.reason === 'parse-data'
              ? messages.parseDataError
              : messages.parseSchemaError}
            {': '}
            {tpl(messages.errorTemplate, {
              line: validateError.parse.ok ? 0 : validateError.parse.line,
              col: validateError.parse.ok ? 0 : validateError.parse.col,
              message: validateError.parse.ok ? '' : validateError.parse.message,
            })}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">{messages.dataLabel}</label>
          <JsonInput
            value={data}
            onChange={setData}
            placeholder={messages.dataPlaceholder}
            invalid={validateError?.reason === 'parse-data'}
            rows={14}
            ariaLabel={messages.dataLabel}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">{messages.schemaLabel}</label>
          <JsonInput
            value={schema}
            onChange={setSchema}
            placeholder={messages.schemaPlaceholder}
            invalid={validateError?.reason === 'parse-schema'}
            rows={14}
            ariaLabel={messages.schemaLabel}
          />
        </div>
      </div>

      {isInvalid && validation && !validation.ok ? (
        <Card className="px-3 py-3">
          <ul className="flex flex-col gap-1 text-xs">
            {validation.errors.map((e, i) => (
              <li key={i} className="flex gap-2 font-mono text-text-primary">
                <span className="text-danger">●</span>
                <span className="text-text-muted">{e.path || '$'}</span>
                <span className="text-text-faint">—</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

function GenerateView({
  sample,
  setSample,
  generated,
  generateError,
  onDownload,
  messages,
}: {
  sample: string;
  setSample: (v: string) => void;
  generated: string;
  generateError: ParseResult | null;
  onDownload: () => void;
  messages: Messages;
}) {
  const isInvalid = generateError !== null && !generateError.ok;
  const validity = !sample ? null : isInvalid ? 'invalid' : 'valid';

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <ValidityBadge
          validity={validity}
          validLabel={messages.validateBadge}
          invalidLabel={messages.invalidBadge}
        />
        <ErrorBanner parseResult={generateError} errorTemplate={messages.errorTemplate} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-muted">{messages.sampleLabel}</label>
          <JsonInput
            value={sample}
            onChange={setSample}
            placeholder={messages.samplePlaceholder}
            invalid={isInvalid}
            rows={14}
            ariaLabel={messages.sampleLabel}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-text-muted">{messages.generatedSchemaLabel}</label>
            <span className="flex items-center gap-2">
              <CopyButton
                text={generated}
                copyLabel={messages.copy}
                copiedLabel={messages.copied}
                disabled={!generated}
              />
              <Button size="sm" onClick={onDownload} disabled={!generated} type="button">
                {messages.download}
              </Button>
            </span>
          </div>
          {generated ? (
            <JsonInput value={generated} onChange={() => undefined} readOnly enableFileDrop={false} rows={14} />
          ) : (
            <Card className="flex min-h-[18rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
