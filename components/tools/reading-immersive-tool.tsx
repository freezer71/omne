'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  READING_FONT_STACKS,
  READING_TINTS,
  splitSentences,
  type ReadingFontKey,
  type ReadingTintKey,
} from '@/lib/tools/implementations/reading';
import { useParagraphImport } from '@/lib/hooks/use-paragraph-import';
import { LabeledRange, OptionChips, TintChips } from '@/components/tools/reading/controls';
import { OcrNotice, type OcrNoticeLabels } from '@/components/tools/reading/ocr-notice';
import { SourceInput } from '@/components/tools/reading/source-input';
import { tpl } from '@/lib/tpl';

export type ImmersiveMessages = {
  inputLabel: string;
  inputPlaceholder: string;
  dropHint: string;
  selectButton: string;
  clearButton: string;
  sampleButton: string;
  sampleText: string;
  charsTemplate: string;
  fontLabel: string;
  fontOpendyslexic: string;
  fontSans: string;
  fontSerif: string;
  tintLabel: string;
  tintWhite: string;
  tintCream: string;
  tintPeach: string;
  tintMint: string;
  tintSky: string;
  tintGrey: string;
  tintDark: string;
  sizeLabel: string;
  lineHeightLabel: string;
  focusLabel: string;
  prev: string;
  next: string;
  progressTemplate: string;
  empty: string;
  error: string;
} & OcrNoticeLabels;

export function ImmersiveReaderTool(m: ImmersiveMessages) {
  const [text, setText] = useState('');
  const [font, setFont] = useState<ReadingFontKey>('opendyslexic');
  const [tintKey, setTintKey] = useState<ReadingTintKey>('cream');
  const [fontSize, setFontSize] = useState(22);
  const [lineHeight, setLineHeight] = useState(2);
  const [focusMode, setFocusMode] = useState(true);
  const [index, setIndex] = useState(0);
  const activeRef = useRef<HTMLSpanElement>(null);
  const fileImport = useParagraphImport((t) => {
    setText(t);
    setIndex(0);
  }, m.error);

  const sentences = useMemo(() => splitSentences(text), [text]);
  const safeIndex = Math.min(index, Math.max(0, sentences.length - 1));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [safeIndex]);

  const step = (delta: number) =>
    setIndex((i) => {
      const last = Math.max(0, sentences.length - 1);
      return Math.min(last, Math.max(0, Math.min(i, last) + delta));
    });

  useEffect(() => {
    if (!focusMode || sentences.length === 0) return;
    const last = Math.max(0, sentences.length - 1);
    const move = (delta: number) =>
      setIndex((i) => Math.min(last, Math.max(0, Math.min(i, last) + delta)));
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        move(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, sentences.length]);

  const tint = READING_TINTS[tintKey];
  const tintLabels: Record<ReadingTintKey, string> = {
    white: m.tintWhite,
    cream: m.tintCream,
    peach: m.tintPeach,
    mint: m.tintMint,
    sky: m.tintSky,
    grey: m.tintGrey,
    dark: m.tintDark,
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <SourceInput
          text={text}
          onText={(v) => {
            setText(v);
            setIndex(0);
          }}
          onFile={fileImport.importFile}
          accept="text/plain,.txt,application/pdf,.pdf"
          busy={fileImport.busy}
          error={fileImport.error}
          onSample={() => {
            setText(m.sampleText);
            setIndex(0);
          }}
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

        <OcrNotice
          state={fileImport.ocr}
          labels={m}
          canForceOcr={fileImport.canForceOcr}
          onForceOcr={fileImport.retryWithOcr}
          busy={fileImport.busy}
        />

        <OptionChips<ReadingFontKey>
          legend={m.fontLabel}
          value={font}
          onChange={setFont}
          options={[
            { value: 'opendyslexic', label: m.fontOpendyslexic },
            { value: 'sans', label: m.fontSans },
            { value: 'serif', label: m.fontSerif },
          ]}
        />

        <TintChips legend={m.tintLabel} value={tintKey} labels={tintLabels} onChange={setTintKey} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledRange label={m.sizeLabel} value={fontSize} min={16} max={44} step={1} onChange={setFontSize} format={(v) => `${v}px`} />
          <LabeledRange label={m.lineHeightLabel} value={lineHeight} min={1.4} max={3.2} step={0.1} onChange={setLineHeight} format={(v) => v.toFixed(1)} />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" checked={focusMode} onChange={(e) => setFocusMode(e.target.checked)} className="accent-accent" />
          {m.focusLabel}
        </label>

        {focusMode && sentences.length > 0 && (
          <div className="flex items-center gap-3">
            <Button size="sm" variant="subtle" type="button" onClick={() => step(-1)} disabled={safeIndex === 0}>
              {m.prev}
            </Button>
            <Button size="sm" type="button" onClick={() => step(1)} disabled={safeIndex >= sentences.length - 1}>
              {m.next}
            </Button>
            <span className="font-mono text-xs text-text-faint">
              {tpl(m.progressTemplate, { n: safeIndex + 1, total: sentences.length })}
            </span>
          </div>
        )}
      </div>

      {sentences.length === 0 ? (
        <Card className="flex min-h-[28rem] items-center justify-center px-4 py-6 text-sm text-text-faint">
          {m.empty}
        </Card>
      ) : (
        <div
          className="min-h-[28rem] overflow-auto rounded-lg border border-border p-6"
          style={{ background: tint.bg, color: tint.fg, fontFamily: READING_FONT_STACKS[font], fontSize: `${fontSize}px`, lineHeight }}
        >
          <p style={{ margin: 0 }}>
            {sentences.map((s, i) => {
              const active = i === safeIndex;
              return (
                <span
                  key={i}
                  ref={active ? activeRef : undefined}
                  onClick={() => setIndex(i)}
                  style={{
                    cursor: 'pointer',
                    opacity: focusMode && !active ? 0.32 : 1,
                    background: focusMode && active ? 'rgba(255, 213, 74, 0.5)' : 'transparent',
                    transition: 'opacity 0.15s, background 0.15s',
                  }}
                >
                  {s}{' '}
                </span>
              );
            })}
          </p>
        </div>
      )}
    </div>
  );
}
