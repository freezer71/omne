'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  generatePassphrase,
  passphraseEntropyBits,
  type PassphraseOptions,
  type Separator,
} from '@/lib/tools/implementations/password-passphrase';
import { labelFromEntropy, type StrengthLabel } from '@/lib/tools/implementations/password-generate';
import { tpl } from '@/lib/tpl';

type Messages = {
  wordCountLabel: string;
  separator: string;
  separatorSpace: string;
  separatorDash: string;
  separatorDot: string;
  separatorUnderscore: string;
  capitalize: string;
  appendDigit: string;
  regenerate: string;
  copy: string;
  copied: string;
  strength: string;
  strengthVeryWeak: string;
  strengthWeak: string;
  strengthFair: string;
  strengthStrong: string;
  strengthVeryStrong: string;
  entropyLabel: string;
};

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

export function PasswordPassphraseTool(messages: Messages) {
  const wcId = useId();
  const sepId = useId();

  const [wordCount, setWordCount] = useState(6);
  const [separator, setSeparator] = useState<Separator>('-');
  const [capitalize, setCapitalize] = useState(false);
  const [appendDigit, setAppendDigit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seed, setSeed] = useState(0);

  const options: PassphraseOptions = useMemo(
    () => ({ wordCount, separator, capitalize, appendDigit }),
    [wordCount, separator, capitalize, appendDigit],
  );

  const phrase = useMemo(
    () => generatePassphrase(options),
    // seed is intentional: bumping it regenerates the phrase on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, seed],
  );

  const entropyBits = useMemo(
    () => passphraseEntropyBits(wordCount, appendDigit),
    [wordCount, appendDigit],
  );
  const strengthLabel = labelFromEntropy(entropyBits);
  const labelText: Record<StrengthLabel, string> = {
    'very-weak': messages.strengthVeryWeak,
    weak: messages.strengthWeak,
    fair: messages.strengthFair,
    strong: messages.strengthStrong,
    'very-strong': messages.strengthVeryStrong,
  };

  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(phrase);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [phrase]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5 flex flex-col gap-4">
        <code className="block break-all rounded-md border border-border bg-surface px-4 py-4 font-mono text-base sm:text-lg text-text-primary">
          {phrase}
        </code>
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
        <div className="flex items-center justify-end gap-2">
          <Button variant="subtle" size="sm" onClick={onCopy}>
            {copied ? messages.copied : messages.copy}
          </Button>
          <Button size="sm" onClick={() => setSeed((s) => s + 1)}>
            {messages.regenerate}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={wcId} className="flex items-center justify-between text-xs text-text-muted">
            <span>{messages.wordCountLabel}</span>
            <span className="font-mono text-text-faint">{wordCount}</span>
          </label>
          <input
            id={wcId}
            type="range"
            min={3}
            max={10}
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        <label htmlFor={sepId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.separator}
          <select
            id={sepId}
            value={separator}
            onChange={(e) => setSeparator(e.target.value as Separator)}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
          >
            <option value=" ">{messages.separatorSpace}</option>
            <option value="-">{messages.separatorDash}</option>
            <option value=".">{messages.separatorDot}</option>
            <option value="_">{messages.separatorUnderscore}</option>
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-text-primary">
            <input
              type="checkbox"
              checked={capitalize}
              onChange={(e) => setCapitalize(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span>{messages.capitalize}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-text-primary">
            <input
              type="checkbox"
              checked={appendDigit}
              onChange={(e) => setAppendDigit(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span>{messages.appendDigit}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
