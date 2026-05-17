'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  hashText,
  type HashOutputFormat,
  type ShaAlgorithm,
} from '@/lib/tools/implementations/password-hash';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  algorithm: string;
  sha1: string;
  sha256: string;
  sha384: string;
  sha512: string;
  format: string;
  formatHex: string;
  formatBase64: string;
  outputLabel: string;
  copy: string;
  copied: string;
  empty: string;
};

const ALGORITHMS: ShaAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export function PasswordHashTool(messages: Messages) {
  const inputId = useId();
  const formatId = useId();

  const [input, setInput] = useState('');
  const [algo, setAlgo] = useState<ShaAlgorithm>('SHA-256');
  const [format, setFormat] = useState<HashOutputFormat>('hex');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await hashText(input, algo, format);
          if (!cancelled) setOutput(result);
        } catch {
          if (!cancelled) setOutput('');
        }
      })();
    }, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [input, algo, format]);

  const displayOutput = input ? output : '';

  const algoLabel: Record<ShaAlgorithm, string> = {
    'SHA-1': messages.sha1,
    'SHA-256': messages.sha256,
    'SHA-384': messages.sha384,
    'SHA-512': messages.sha512,
  };

  const onCopy = useCallback(() => {
    if (!displayOutput) return;
    void navigator.clipboard.writeText(displayOutput);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [displayOutput]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-xs text-text-muted">
          {messages.inputLabel}
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={messages.inputPlaceholder}
          rows={5}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-text-muted">{messages.algorithm}</span>
        <div role="radiogroup" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALGORITHMS.map((a) => (
            <label
              key={a}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                algo === a
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong'
              }`}
            >
              <input
                type="radio"
                name="algo"
                value={a}
                checked={algo === a}
                onChange={() => setAlgo(a)}
                className="sr-only"
              />
              <span>{algoLabel[a]}</span>
            </label>
          ))}
        </div>
      </div>

      <label htmlFor={formatId} className="flex flex-col gap-1.5 text-xs text-text-muted">
        {messages.format}
        <select
          id={formatId}
          value={format}
          onChange={(e) => setFormat(e.target.value as HashOutputFormat)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
        >
          <option value="hex">{messages.formatHex}</option>
          <option value="base64">{messages.formatBase64}</option>
        </select>
      </label>

      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{messages.outputLabel}</span>
          <Button variant="subtle" size="sm" onClick={onCopy} disabled={!displayOutput}>
            {copied ? messages.copied : messages.copy}
          </Button>
        </div>
        {displayOutput ? (
          <code className="block break-all rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary">
            {displayOutput}
          </code>
        ) : (
          <p className="text-sm text-text-faint">{messages.empty}</p>
        )}
      </Card>
    </div>
  );
}
