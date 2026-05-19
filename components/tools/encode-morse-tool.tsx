'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import { DEFAULT_PLAYBACK, morseToText, playMorse, textToMorse } from '@/lib/tools/implementations/encode-morse';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  mode: string;
  modeEncode: string;
  modeDecode: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  play: string;
  stop: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  charsTemplate: string;
};

export function EncodeMorseTool(messages: Messages) {
  const inputId = useId();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  useEffect(() => {
    return () => {
      try { ctxRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  const output = useMemo(() => {
    if (!debounced) return '';
    return mode === 'encode' ? textToMorse(debounced) : morseToText(debounced);
  }, [debounced, mode]);

  const onPlay = async () => {
    if (playing) return;
    const morse = mode === 'encode' ? output : debounced;
    if (!morse) return;
    setPlaying(true);
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
      await playMorse(morse, ctxRef.current, DEFAULT_PLAYBACK);
    } finally {
      setPlaying(false);
    }
  };

  const onDownload = () => {
    if (!output) return;
    downloadBlob(new Blob([output], { type: 'text/plain;charset=utf-8' }), mode === 'encode' ? 'morse.txt' : 'decoded.txt');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {(['encode', 'decode'] as const).map((v) => (
            <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors ${mode === v ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong'}`}>
              <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
              {v === 'encode' ? messages.modeEncode : messages.modeDecode}
            </label>
          ))}
        </fieldset>
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => setInput(mode === 'encode' ? 'SOS HELLO' : '... --- ... / .... . .-.. .-.. ---')}>{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" type="button" disabled={!input} onClick={() => setInput('')}>{messages.clear}</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={inputId} className="text-xs text-text-muted">{messages.inputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{tpl(messages.charsTemplate, { n: [...input].length })}</span>
          </div>
          <textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder={messages.inputPlaceholder} rows={12}
            className="min-h-[20rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">{output ? tpl(messages.charsTemplate, { n: [...output].length }) : ''}</span>
          </div>
          {output ? (
            <Card className="min-h-[20rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">{output}</Card>
          ) : (
            <Card className="flex min-h-[20rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onPlay} disabled={playing || (!output && !debounced)} type="button">
          {playing ? messages.stop : messages.play}
        </Button>
        <CopyButton text={output} copyLabel={messages.copy} copiedLabel={messages.copied} disabled={!output} />
        <Button size="sm" onClick={onDownload} disabled={!output} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
