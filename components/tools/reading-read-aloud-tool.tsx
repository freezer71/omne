'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { paragraphsFromFile } from '@/lib/tools/reading-assets';
import { LabeledRange } from '@/components/tools/reading/controls';
import { SourceInput } from '@/components/tools/reading/source-input';

export type ReadAloudMessages = {
  inputLabel: string;
  inputPlaceholder: string;
  dropHint: string;
  selectButton: string;
  clearButton: string;
  sampleButton: string;
  sampleText: string;
  charsTemplate: string;
  voiceLabel: string;
  rateLabel: string;
  pitchLabel: string;
  play: string;
  pause: string;
  resume: string;
  stop: string;
  unsupported: string;
  onDeviceNote: string;
  remoteWarning: string;
  noVoices: string;
  error: string;
};

type Status = 'idle' | 'speaking' | 'paused';

export function ReadAloudTool(m: ReadAloudMessages) {
  const [text, setText] = useState('');
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [status, setStatus] = useState<Status>('idle');
  const [highlight, setHighlight] = useState<{ start: number; end: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) {
      const id = window.setTimeout(() => setSupported(false), 0);
      return () => window.clearTimeout(id);
    }
    const load = () => setVoices(synth.getVoices());
    synth.addEventListener('voiceschanged', load);
    const id = window.setTimeout(load, 0);
    return () => {
      window.clearTimeout(id);
      synth.removeEventListener('voiceschanged', load);
      synth.cancel();
    };
  }, []);

  // Prefer on-device voices to keep everything local (privacy promise).
  const localVoices = useMemo(() => voices.filter((v) => v.localService), [voices]);
  const onlyRemote = voices.length > 0 && localVoices.length === 0;
  // Some platforms (e.g. macOS) list several voices that share the same voiceURI;
  // dedupe so React keys stay unique and selection is unambiguous.
  const usableVoices = useMemo(() => {
    const base = localVoices.length > 0 ? localVoices : voices;
    const seen = new Set<string>();
    return base.filter((v) => {
      if (seen.has(v.voiceURI)) return false;
      seen.add(v.voiceURI);
      return true;
    });
  }, [localVoices, voices]);
  const selectedURI = voiceURI || usableVoices[0]?.voiceURI || '';

  const onFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      setText((await paragraphsFromFile(file)).join('\n\n'));
    } catch {
      setError(m.error);
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setStatus('idle');
    setHighlight(null);
  };

  const play = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const content = text;
    const utter = new SpeechSynthesisUtterance(content);
    const voice = usableVoices.find((v) => v.voiceURI === selectedURI);
    if (voice) utter.voice = voice;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.onboundary = (e) => {
      const start = e.charIndex ?? 0;
      const rest = content.slice(start);
      const match = rest.match(/^\S+/);
      setHighlight({ start, end: start + (match ? match[0].length : 0) });
    };
    utter.onend = () => {
      setStatus('idle');
      setHighlight(null);
    };
    utter.onerror = () => {
      setStatus('idle');
      setHighlight(null);
    };
    synth.speak(utter);
    setStatus('speaking');
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus('paused');
  };
  const resume = () => {
    window.speechSynthesis.resume();
    setStatus('speaking');
  };

  const hasText = text.trim().length > 0;

  if (!supported) {
    return (
      <Card className="flex min-h-[12rem] items-center justify-center px-4 py-6 text-sm text-text-muted">
        {m.unsupported}
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <SourceInput
          text={text}
          onText={(v) => {
            setText(v);
            if (status !== 'idle') stop();
          }}
          onFile={onFile}
          accept="text/plain,.txt,application/pdf,.pdf"
          busy={busy}
          error={error}
          onSample={() => setText(m.sampleText)}
          labels={{
            inputLabel: m.inputLabel,
            inputPlaceholder: m.inputPlaceholder,
            dropHint: m.dropHint,
            selectButton: m.selectButton,
            clearButton: m.clearButton,
            sampleButton: m.sampleButton,
            charsTemplate: m.charsTemplate,
          }}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ra-voice" className="text-xs text-text-muted">
            {m.voiceLabel}
          </label>
          <select
            id="ra-voice"
            value={selectedURI}
            onChange={(e) => setVoiceURI(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none"
          >
            {usableVoices.length === 0 && <option value="">{m.noVoices}</option>}
            {usableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <p className="text-xs text-text-faint">{onlyRemote ? m.remoteWarning : m.onDeviceNote}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledRange label={m.rateLabel} value={rate} min={0.5} max={2} step={0.1} onChange={setRate} format={(v) => `${v.toFixed(1)}×`} />
          <LabeledRange label={m.pitchLabel} value={pitch} min={0} max={2} step={0.1} onChange={setPitch} format={(v) => v.toFixed(1)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {status === 'speaking' ? (
            <Button size="sm" type="button" onClick={pause}>
              {m.pause}
            </Button>
          ) : status === 'paused' ? (
            <Button size="sm" type="button" onClick={resume}>
              {m.resume}
            </Button>
          ) : (
            <Button size="sm" type="button" disabled={!hasText || usableVoices.length === 0} onClick={play}>
              {m.play}
            </Button>
          )}
          <Button size="sm" variant="subtle" type="button" disabled={status === 'idle'} onClick={stop}>
            {m.stop}
          </Button>
        </div>
      </div>

      <div
        className="min-h-[28rem] overflow-auto rounded-lg border border-border p-6"
        style={{ background: '#faf3e0', color: '#2b2620', fontFamily: '"OpenDyslexic", system-ui, sans-serif', fontSize: '19px', lineHeight: 1.9 }}
        aria-live="polite"
      >
        {hasText ? (
          highlight ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {text.slice(0, highlight.start)}
              <mark style={{ background: '#ffd54a', color: 'inherit' }}>{text.slice(highlight.start, highlight.end)}</mark>
              {text.slice(highlight.end)}
            </p>
          ) : (
            <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
          )
        ) : (
          <span className="text-sm" style={{ color: '#8a8275' }}>
            {m.inputPlaceholder}
          </span>
        )}
      </div>
    </div>
  );
}
