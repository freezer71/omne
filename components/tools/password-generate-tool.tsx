'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  buildAlphabet,
  estimateEntropyBits,
  generatePasswords,
  labelFromEntropy,
  type GenerateOptions,
  type StrengthLabel,
} from '@/lib/tools/implementations/password-generate';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';

type Messages = {
  lengthLabel: string;
  count: string;
  count1: string;
  count5: string;
  count10: string;
  count25: string;
  useUppercase: string;
  useLowercase: string;
  useDigits: string;
  useSymbols: string;
  excludeAmbiguous: string;
  regenerate: string;
  copy: string;
  copied: string;
  download: string;
  noCharsetError: string;
  strength: string;
  strengthVeryWeak: string;
  strengthWeak: string;
  strengthFair: string;
  strengthStrong: string;
  strengthVeryStrong: string;
  entropyLabel: string;
};

const COUNT_OPTIONS = [1, 5, 10, 25];

const STRENGTH_COLORS: Record<StrengthLabel, string> = {
  'very-weak': 'bg-danger',
  weak: 'bg-orange-500',
  fair: 'bg-yellow-500',
  strong: 'bg-green-500',
  'very-strong': 'bg-emerald-500',
};

const STRENGTH_WIDTH: Record<StrengthLabel, string> = {
  'very-weak': 'w-[15%]',
  weak: 'w-[35%]',
  fair: 'w-[60%]',
  strong: 'w-[85%]',
  'very-strong': 'w-full',
};

export function PasswordGenerateTool(messages: Messages) {
  const lengthId = useId();
  const countId = useId();

  const [length, setLength] = useState(20);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [count, setCount] = useState(1);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [seed, setSeed] = useState(0);

  const options: GenerateOptions = useMemo(
    () => ({ length, uppercase, lowercase, digits, symbols, excludeAmbiguous, count }),
    [length, uppercase, lowercase, digits, symbols, excludeAmbiguous, count],
  );

  const alphabet = useMemo(() => buildAlphabet(options), [options]);
  const noCharset = alphabet.length === 0;

  const passwords = useMemo<string[]>(() => {
    if (noCharset) return [];
    try {
      return generatePasswords(options);
    } catch {
      return [];
    }
    // seed is intentional: bumping it regenerates the list on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, noCharset, seed]);

  const entropyBits = useMemo(
    () => estimateEntropyBits(length, alphabet.length),
    [length, alphabet.length],
  );
  const strengthLabel = labelFromEntropy(entropyBits);
  const labelText: Record<StrengthLabel, string> = {
    'very-weak': messages.strengthVeryWeak,
    weak: messages.strengthWeak,
    fair: messages.strengthFair,
    strong: messages.strengthStrong,
    'very-strong': messages.strengthVeryStrong,
  };

  const onCopy = useCallback(
    (value: string, idx: number) => {
      void navigator.clipboard.writeText(value);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx((i) => (i === idx ? null : i)), 1200);
    },
    [setCopiedIdx],
  );

  const onDownload = () => {
    const blob = new Blob([passwords.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'passwords.txt');
  };

  const countLabel = (n: number): string => {
    if (n === 1) return messages.count1;
    if (n === 5) return messages.count5;
    if (n === 10) return messages.count10;
    if (n === 25) return messages.count25;
    return String(n);
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5 flex flex-col gap-4">
        {noCharset ? (
          <p role="alert" className="text-sm text-danger">
            {messages.noCharsetError}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {passwords.map((pwd, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
              >
                <code className="flex-1 font-mono text-sm text-text-primary break-all">{pwd}</code>
                <Button variant="subtle" size="sm" onClick={() => onCopy(pwd, i)}>
                  {copiedIdx === i ? messages.copied : messages.copy}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{messages.strength}</span>
            <span className="font-mono text-text-faint">
              {labelText[strengthLabel]} · {tpl(messages.entropyLabel, { bits: Math.round(entropyBits) })}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className={`h-full ${STRENGTH_COLORS[strengthLabel]} ${STRENGTH_WIDTH[strengthLabel]} transition-all`}
              data-strength={strengthLabel}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={lengthId} className="flex items-center justify-between text-xs text-text-muted">
            <span>{messages.lengthLabel}</span>
            <span className="font-mono text-text-faint">{length}</span>
          </label>
          <input
            id={lengthId}
            type="range"
            min={8}
            max={128}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Toggle checked={uppercase} onChange={setUppercase} label={messages.useUppercase} />
          <Toggle checked={lowercase} onChange={setLowercase} label={messages.useLowercase} />
          <Toggle checked={digits} onChange={setDigits} label={messages.useDigits} />
          <Toggle checked={symbols} onChange={setSymbols} label={messages.useSymbols} />
          <Toggle
            checked={excludeAmbiguous}
            onChange={setExcludeAmbiguous}
            label={messages.excludeAmbiguous}
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <label htmlFor={countId} className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.count}
            <select
              id={countId}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            >
              {COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {countLabel(n)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            {count > 1 && passwords.length > 0 && (
              <Button variant="subtle" size="sm" onClick={onDownload}>
                {messages.download}
              </Button>
            )}
            <Button onClick={() => setSeed((s) => s + 1)} disabled={noCharset}>
              {messages.regenerate}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}
