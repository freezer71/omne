'use client';

import { useId, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  evaluateStrength,
  type StrengthLabel,
  type StrengthWarning,
} from '@/lib/tools/implementations/password-strength';
import { tpl } from '@/lib/tpl';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  show: string;
  hide: string;
  entropyLabel: string;
  lengthLabel: string;
  charsetLabel: string;
  label: string;
  strengthVeryWeak: string;
  strengthWeak: string;
  strengthFair: string;
  strengthStrong: string;
  strengthVeryStrong: string;
  warningsTitle: string;
  warningSequential: string;
  warningRepeated: string;
  warningCommon: string;
  warningTooShort: string;
  empty: string;
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

export function PasswordStrengthTool(messages: Messages) {
  const inputId = useId();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const result = useMemo(() => evaluateStrength(password), [password]);

  const labelText: Record<StrengthLabel, string> = {
    'very-weak': messages.strengthVeryWeak,
    weak: messages.strengthWeak,
    fair: messages.strengthFair,
    strong: messages.strengthStrong,
    'very-strong': messages.strengthVeryStrong,
  };

  const warningText: Record<StrengthWarning, string> = {
    sequential: messages.warningSequential,
    repeated: messages.warningRepeated,
    'common-pattern': messages.warningCommon,
    'too-short': messages.warningTooShort,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="flex items-center justify-between text-xs text-text-muted">
          <span>{messages.inputLabel}</span>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-text-faint hover:text-text-primary"
          >
            {show ? messages.hide : messages.show}
          </button>
        </label>
        <Input
          id={inputId}
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={messages.inputPlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {password ? (
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{messages.label}</span>
              <span className="font-mono text-text-faint">
                {labelText[result.label]} ·{' '}
                {tpl(messages.entropyLabel, { bits: Math.round(result.entropyBits) })}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className={`h-full ${STRENGTH_COLORS[result.label]} ${STRENGTH_WIDTH[result.label]} transition-all`}
                data-strength={result.label}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
            <div>{tpl(messages.lengthLabel, { n: result.length })}</div>
            <div>{tpl(messages.charsetLabel, { n: result.charsetClasses })}</div>
          </div>

          {result.warnings.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-text-muted">{messages.warningsTitle}</p>
              <ul className="flex flex-col gap-1 text-sm text-orange-500">
                {result.warnings.map((w) => (
                  <li key={w}>• {warningText[w]}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <p className="text-sm text-text-faint">{messages.empty}</p>
      )}
    </div>
  );
}
