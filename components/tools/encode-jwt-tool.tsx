'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';
import {
  decodeJwt,
  formatUnixSeconds,
  SAMPLE_JWT,
  type JwtParts,
} from '@/lib/tools/implementations/encode-jwt';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  headerLabel: string;
  payloadLabel: string;
  signatureLabel: string;
  notVerifiedNote: string;
  noVerifyWarning: string;
  loadSample: string;
  clear: string;
  copy: string;
  copied: string;
  error: string;
  empty: string;
  status: string;
  statusValid: string;
  statusExpired: string;
  statusNotYetValid: string;
  statusUnknown: string;
  claimIat: string;
  claimExp: string;
  claimNbf: string;
  dateTemplate: string;
};

type DecodeResult =
  | { ok: true; parts: JwtParts }
  | { ok: false; error: string }
  | { kind: 'empty' };

function isEmpty(r: DecodeResult): r is { kind: 'empty' } {
  return 'kind' in r && r.kind === 'empty';
}

function tryDecode(token: string): DecodeResult {
  if (!token.trim()) return { kind: 'empty' };
  try {
    return { ok: true, parts: decodeJwt(token) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'invalid' };
  }
}

function prettyJson(o: unknown): string {
  try {
    return JSON.stringify(o, null, 2);
  } catch {
    return String(o);
  }
}

export function EncodeJwtTool(messages: Messages) {
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

  const result = useMemo<DecodeResult>(() => tryDecode(debouncedInput), [debouncedInput]);

  const onLoadSample = () => setInput(SAMPLE_JWT);
  const onClear = () => {
    setInput('');
    setDebouncedInput('');
  };

  const hasInput = input.length > 0;

  const statusLabel = (s: JwtParts['status']) => {
    switch (s) {
      case 'valid': return messages.statusValid;
      case 'expired': return messages.statusExpired;
      case 'notYetValid': return messages.statusNotYetValid;
      case 'unknown': return messages.statusUnknown;
    }
  };

  const statusClass = (s: JwtParts['status']) => {
    switch (s) {
      case 'valid': return 'text-success';
      case 'expired': return 'text-danger';
      case 'notYetValid': return 'text-warning';
      case 'unknown': return 'text-text-muted';
    }
  };

  const headerJson = result && 'ok' in result && result.ok ? prettyJson(result.parts.header) : '';
  const payloadJson = result && 'ok' in result && result.ok ? prettyJson(result.parts.payload) : '';
  const signature = result && 'ok' in result && result.ok ? result.parts.signature : '';

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-muted">
        {messages.noVerifyWarning}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">
            {messages.loadSample}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={!hasInput}>
            {messages.clear}
          </Button>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs text-text-muted">
          {messages.inputLabel}
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={messages.inputPlaceholder}
          rows={6}
          spellCheck={false}
          className="min-h-[8rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors break-all"
        />
      </div>

      {isEmpty(result) ? (
        <Card className="flex min-h-[12rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
          {messages.empty}
        </Card>
      ) : !result.ok ? (
        <Card className="flex min-h-[12rem] flex-col items-start gap-1 px-3 py-2 text-sm text-danger">
          <span>{messages.error}</span>
          <span className="font-mono text-xs text-text-muted">{result.error}</span>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {(result.parts.status !== 'unknown') && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span>{messages.status}:</span>
              <span className={cn('font-medium', statusClass(result.parts.status))}>
                {statusLabel(result.parts.status)}
              </span>
              {result.parts.iat !== undefined && (
                <span className="font-mono">
                  {tpl(messages.claimIat, { date: formatUnixSeconds(result.parts.iat) })}
                </span>
              )}
              {result.parts.exp !== undefined && (
                <span className="font-mono">
                  {tpl(messages.claimExp, { date: formatUnixSeconds(result.parts.exp) })}
                </span>
              )}
              {result.parts.nbf !== undefined && (
                <span className="font-mono">
                  {tpl(messages.claimNbf, { date: formatUnixSeconds(result.parts.nbf) })}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs text-text-muted">{messages.headerLabel}</label>
                <CopyButton
                  text={headerJson}
                  copyLabel={messages.copy}
                  copiedLabel={messages.copied}
                  variant="ghost"
                />
              </div>
              <Card className="min-h-[12rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-xs text-text-primary">
                {headerJson}
              </Card>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs text-text-muted">{messages.payloadLabel}</label>
                <CopyButton
                  text={payloadJson}
                  copyLabel={messages.copy}
                  copiedLabel={messages.copied}
                  variant="ghost"
                />
              </div>
              <Card className="min-h-[12rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-xs text-text-primary">
                {payloadJson}
              </Card>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs text-text-muted">{messages.signatureLabel}</label>
                <CopyButton
                  text={signature}
                  copyLabel={messages.copy}
                  copiedLabel={messages.copied}
                  variant="ghost"
                />
              </div>
              <Card className="flex min-h-[12rem] flex-col gap-2 break-all px-3 py-2 font-mono text-xs text-text-primary">
                <span>{signature || '—'}</span>
                <span className="text-text-faint">{messages.notVerifiedNote}</span>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
