'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import {
  DEFAULT_READING_OPTIONS,
  READING_FONT_STACKS,
  READING_TINTS,
  bionicSplit,
  splitParagraphs,
  type BionicIntensity,
  type ReadingFontKey,
  type ReadingOptions,
  type ReadingTintKey,
} from '@/lib/tools/implementations/reading';
import { makeReadingHtml, makeReadingPdf, paragraphsFromFile } from '@/lib/tools/reading-assets';
import { LabeledRange, OptionChips, TintChips } from '@/components/tools/reading/controls';
import { SourceInput } from '@/components/tools/reading/source-input';

export type ReadingFocusMessages = {
  inputLabel: string;
  inputPlaceholder: string;
  dropHint: string;
  selectButton: string;
  clearButton: string;
  sampleButton: string;
  sampleText: string;
  charsTemplate: string;
  intensityLabel: string;
  intensityLow: string;
  intensityMedium: string;
  intensityHigh: string;
  fontLabel: string;
  fontOpendyslexic: string;
  fontSans: string;
  sizeLabel: string;
  lineHeightLabel: string;
  tintLabel: string;
  tintWhite: string;
  tintCream: string;
  tintPeach: string;
  tintMint: string;
  tintSky: string;
  tintGrey: string;
  tintDark: string;
  previewLabel: string;
  empty: string;
  downloadHtml: string;
  downloadPdf: string;
  busy: string;
  error: string;
};

function BionicText({ paragraph, intensity }: { paragraph: string; intensity: BionicIntensity }) {
  const tokens = paragraph.split(/(\s+)/);
  return (
    <>
      {tokens.map((token, i) => {
        if (token === '' || /^\s+$/.test(token)) return <Fragment key={i}>{token}</Fragment>;
        const { head, tail } = bionicSplit(token, intensity);
        return (
          <Fragment key={i}>
            <b>{head}</b>
            {tail}
          </Fragment>
        );
      })}
    </>
  );
}

export function ReadingFocusTool({
  langTag = 'en',
  ...m
}: ReadingFocusMessages & { langTag?: string }) {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [intensity, setIntensity] = useState<BionicIntensity>('medium');
  const [font, setFont] = useState<ReadingFontKey>('opendyslexic');
  const [options, setOptions] = useState({
    fontSizePt: DEFAULT_READING_OPTIONS.fontSizePt,
    lineHeight: DEFAULT_READING_OPTIONS.lineHeight,
    tint: 'white' as ReadingTintKey,
  });
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(text), 200);
    return () => window.clearTimeout(handle);
  }, [text]);

  const paragraphs = useMemo(() => splitParagraphs(debounced), [debounced]);

  const readingOptions = (): ReadingOptions => ({
    ...DEFAULT_READING_OPTIONS,
    font,
    fontSizePt: options.fontSizePt,
    lineHeight: options.lineHeight,
    tint: options.tint,
    letterSpacingEm: 0,
    wordSpacingEm: 0.08,
    align: 'left',
  });

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

  const exportAs = async (kind: 'html' | 'pdf') => {
    if (paragraphs.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      if (kind === 'html') {
        const html = await makeReadingHtml(m.previewLabel, paragraphs, readingOptions(), intensity, langTag);
        downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), 'reading-focus.html');
      } else {
        const bytes = await makeReadingPdf(paragraphs, readingOptions(), intensity);
        downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'reading-focus.pdf');
      }
    } catch {
      setError(m.error);
    } finally {
      setExporting(false);
    }
  };

  const tint = READING_TINTS[options.tint];
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
          onText={setText}
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

        <OptionChips<BionicIntensity>
          legend={m.intensityLabel}
          value={intensity}
          onChange={setIntensity}
          options={[
            { value: 'low', label: m.intensityLow },
            { value: 'medium', label: m.intensityMedium },
            { value: 'high', label: m.intensityHigh },
          ]}
        />

        <OptionChips<ReadingFontKey>
          legend={m.fontLabel}
          value={font}
          onChange={setFont}
          options={[
            { value: 'opendyslexic', label: m.fontOpendyslexic },
            { value: 'sans', label: m.fontSans },
          ]}
        />

        <TintChips
          legend={m.tintLabel}
          value={options.tint}
          labels={tintLabels}
          onChange={(v) => setOptions((p) => ({ ...p, tint: v }))}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledRange
            label={m.sizeLabel}
            value={options.fontSizePt}
            min={12}
            max={36}
            step={1}
            onChange={(v) => setOptions((p) => ({ ...p, fontSizePt: v }))}
            format={(v) => `${v}px`}
          />
          <LabeledRange
            label={m.lineHeightLabel}
            value={options.lineHeight}
            min={1.2}
            max={3}
            step={0.1}
            onChange={(v) => setOptions((p) => ({ ...p, lineHeight: v }))}
            format={(v) => v.toFixed(1)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{m.previewLabel}</span>
          <span className="flex gap-2">
            <Button size="sm" variant="subtle" type="button" disabled={paragraphs.length === 0 || exporting} onClick={() => exportAs('html')}>
              {m.downloadHtml}
            </Button>
            <Button size="sm" type="button" disabled={paragraphs.length === 0 || exporting} onClick={() => exportAs('pdf')}>
              {exporting ? m.busy : m.downloadPdf}
            </Button>
          </span>
        </div>

        {paragraphs.length === 0 ? (
          <Card className="flex min-h-[28rem] items-center justify-center px-4 py-6 text-sm text-text-faint">
            {m.empty}
          </Card>
        ) : (
          <div
            className="min-h-[28rem] overflow-auto rounded-lg border border-border p-6"
            style={{ background: tint.bg, color: tint.fg }}
            aria-label={m.previewLabel}
          >
            <div
              style={{
                fontFamily: READING_FONT_STACKS[font],
                fontSize: `${options.fontSizePt}px`,
                lineHeight: options.lineHeight,
                textAlign: 'left',
              }}
            >
              {paragraphs.map((p, i) => (
                <p key={i} style={{ margin: '0 0 1.1em' }}>
                  <BionicText paragraph={p} intensity={intensity} />
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
