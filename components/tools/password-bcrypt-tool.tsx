'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  bcryptHash,
  bcryptVerify,
} from '@/lib/tools/implementations/password-bcrypt';
import { tpl } from '@/lib/tpl';

type Messages = {
  mode: string;
  modeHash: string;
  modeVerify: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  rounds: string;
  roundsHint: string;
  hashButton: string;
  hashedAs: string;
  elapsed: string;
  copy: string;
  copied: string;
  verifyHashLabel: string;
  verifyHashPlaceholder: string;
  verifyButton: string;
  verifyMatch: string;
  verifyNoMatch: string;
  verifyError: string;
  busy: string;
  show: string;
  hide: string;
};

type Mode = 'hash' | 'verify';

export function PasswordBcryptTool(messages: Messages) {
  const pwdId = useId();
  const roundsId = useId();
  const verifyPwdId = useId();
  const verifyHashId = useId();

  const [mode, setMode] = useState<Mode>('hash');
  const [password, setPassword] = useState('');
  const [rounds, setRounds] = useState(10);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<'match' | 'no-match' | 'error' | null>(null);

  const onHash = useCallback(async () => {
    setBusy(true);
    setOutput('');
    setElapsed(null);
    const start = performance.now();
    try {
      const result = await bcryptHash(password, rounds);
      setOutput(result);
      setElapsed(Math.round(performance.now() - start));
    } finally {
      setBusy(false);
    }
  }, [password, rounds]);

  const onVerify = useCallback(async () => {
    setBusy(true);
    setVerifyResult(null);
    try {
      const ok = await bcryptVerify(verifyPassword, verifyHash);
      setVerifyResult(ok ? 'match' : 'no-match');
    } catch {
      setVerifyResult('error');
    } finally {
      setBusy(false);
    }
  }, [verifyPassword, verifyHash]);

  const onCopy = useCallback(() => {
    if (!output) return;
    void navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [output]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-text-muted">{messages.mode}</span>
        <div role="tablist" className="inline-flex w-fit rounded-md border border-border bg-surface p-0.5">
          {(['hash', 'verify'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-sm rounded-[5px] transition-colors ${
                mode === m
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {m === 'hash' ? messages.modeHash : messages.modeVerify}
            </button>
          ))}
        </div>
      </div>

      {mode === 'hash' ? (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor={pwdId} className="flex items-center justify-between text-xs text-text-muted">
              <span>{messages.passwordLabel}</span>
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-text-faint hover:text-text-primary"
              >
                {show ? messages.hide : messages.show}
              </button>
            </label>
            <Input
              id={pwdId}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={messages.passwordPlaceholder}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={roundsId} className="flex items-center justify-between text-xs text-text-muted">
              <span>{messages.rounds}</span>
              <span className="font-mono text-text-faint">{rounds}</span>
            </label>
            <input
              id={roundsId}
              type="range"
              min={4}
              max={14}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <p className="text-xs text-text-faint">{messages.roundsHint}</p>
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={() => void onHash()} disabled={!password || busy}>
              {busy ? messages.busy : messages.hashButton}
            </Button>
          </div>

          {(output || busy) && (
            <Card className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{messages.hashedAs}</span>
                {elapsed !== null && (
                  <span className="font-mono text-xs text-text-faint">
                    {tpl(messages.elapsed, { ms: elapsed })}
                  </span>
                )}
              </div>
              {output && (
                <code className="block break-all rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary">
                  {output}
                </code>
              )}
              <div className="flex justify-end">
                <Button variant="subtle" size="sm" onClick={onCopy} disabled={!output}>
                  {copied ? messages.copied : messages.copy}
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor={verifyPwdId} className="flex items-center justify-between text-xs text-text-muted">
              <span>{messages.passwordLabel}</span>
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-text-faint hover:text-text-primary"
              >
                {show ? messages.hide : messages.show}
              </button>
            </label>
            <Input
              id={verifyPwdId}
              type={show ? 'text' : 'password'}
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder={messages.passwordPlaceholder}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={verifyHashId} className="text-xs text-text-muted">
              {messages.verifyHashLabel}
            </label>
            <Input
              id={verifyHashId}
              type="text"
              value={verifyHash}
              onChange={(e) => setVerifyHash(e.target.value)}
              placeholder={messages.verifyHashPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={() => void onVerify()} disabled={!verifyPassword || !verifyHash || busy}>
              {busy ? messages.busy : messages.verifyButton}
            </Button>
          </div>

          {verifyResult && (
            <Card className="p-4">
              <p
                className={`text-sm ${
                  verifyResult === 'match'
                    ? 'text-green-500'
                    : verifyResult === 'no-match'
                      ? 'text-orange-500'
                      : 'text-danger'
                }`}
              >
                {verifyResult === 'match'
                  ? messages.verifyMatch
                  : verifyResult === 'no-match'
                    ? messages.verifyNoMatch
                    : messages.verifyError}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
