'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import {
  DEFAULT_READING_OPTIONS,
  READING_FONT_STACKS,
  READING_TINTS,
  splitParagraphs,
  type ReadingAlign,
  type ReadingFontKey,
  type ReadingOptions,
  type ReadingTintKey,
} from '@/lib/tools/implementations/reading';
import { makeReadingHtml, makeReadingPdf } from '@/lib/tools/reading-assets';
import { cn } from '@/lib/cn';
import { useParagraphImport } from '@/lib/hooks/use-paragraph-import';
import { useFullscreen, useIdleHide } from '@/lib/hooks/use-fullscreen';
import { LabeledRange, OptionChips, TintChips } from '@/components/tools/reading/controls';
import { OcrNotice, type OcrNoticeLabels } from '@/components/tools/reading/ocr-notice';
import { SourceInput } from '@/components/tools/reading/source-input';

export type ReadingDyslexiaMessages = {
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
  fontMono: string;
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
  letterSpacingLabel: string;
  wordSpacingLabel: string;
  paragraphSpacingLabel: string;
  lineWidthLabel: string;
  alignLabel: string;
  alignLeft: string;
  alignJustify: string;
  alignCenter: string;
  previewLabel: string;
  empty: string;
  fullscreen: string;
  fullscreenExit: string;
  fullscreenHint: string;
  fontSmaller: string;
  fontLarger: string;
  downloadHtml: string;
  downloadPdf: string;
  busy: string;
  error: string;
} & OcrNoticeLabels;

export function ReadingDyslexiaTool({
  accept = 'text/plain,.txt,application/pdf,.pdf',
  langTag = 'en',
  ...m
}: ReadingDyslexiaMessages & { accept?: string; langTag?: string }) {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [options, setOptions] = useState<ReadingOptions>(DEFAULT_READING_OPTIONS);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileImport = useParagraphImport(setText, m.error);
  const {
    ref: fullscreenRef,
    active: fullscreenActive,
    enter: enterFullscreen,
    exit: exitFullscreen,
    fallbackClass: fullscreenFallbackClass,
  } = useFullscreen<HTMLDivElement>();
  const controlsVisible = useIdleHide(fullscreenActive);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(text), 200);
    return () => window.clearTimeout(handle);
  }, [text]);

  const paragraphs = useMemo(() => splitParagraphs(debounced), [debounced]);

  const set = <K extends keyof ReadingOptions>(key: K, value: ReadingOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const onDownloadHtml = async () => {
    if (paragraphs.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const html = await makeReadingHtml(m.previewLabel, paragraphs, options, undefined, langTag);
      downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), 'dyslexia-friendly.html');
    } catch {
      setError(m.error);
    } finally {
      setExporting(false);
    }
  };

  const onDownloadPdf = async () => {
    if (paragraphs.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const bytes = await makeReadingPdf(paragraphs, options);
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'dyslexia-friendly.pdf');
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
          onFile={fileImport.importFile}
          accept={accept}
          busy={fileImport.busy}
          error={fileImport.error ?? error}
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

        <OcrNotice
          state={fileImport.ocr}
          labels={m}
          canForceOcr={fileImport.canForceOcr}
          onForceOcr={fileImport.retryWithOcr}
          busy={fileImport.busy}
        />

        <OptionChips<ReadingFontKey>
          legend={m.fontLabel}
          value={options.font}
          onChange={(v) => set('font', v)}
          options={[
            { value: 'opendyslexic', label: m.fontOpendyslexic },
            { value: 'sans', label: m.fontSans },
            { value: 'serif', label: m.fontSerif },
            { value: 'mono', label: m.fontMono },
          ]}
        />

        <TintChips legend={m.tintLabel} value={options.tint} labels={tintLabels} onChange={(v) => set('tint', v)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledRange
            label={m.sizeLabel}
            value={options.fontSizePt}
            min={12}
            max={36}
            step={1}
            onChange={(v) => set('fontSizePt', v)}
            format={(v) => `${v}px`}
          />
          <LabeledRange
            label={m.lineHeightLabel}
            value={options.lineHeight}
            min={1.2}
            max={3}
            step={0.1}
            onChange={(v) => set('lineHeight', v)}
            format={(v) => v.toFixed(1)}
          />
          <LabeledRange
            label={m.letterSpacingLabel}
            value={options.letterSpacingEm}
            min={0}
            max={0.3}
            step={0.01}
            onChange={(v) => set('letterSpacingEm', v)}
            format={(v) => `${v.toFixed(2)}em`}
          />
          <LabeledRange
            label={m.wordSpacingLabel}
            value={options.wordSpacingEm}
            min={0}
            max={0.6}
            step={0.02}
            onChange={(v) => set('wordSpacingEm', v)}
            format={(v) => `${v.toFixed(2)}em`}
          />
          <LabeledRange
            label={m.paragraphSpacingLabel}
            value={options.paragraphSpacingEm}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(v) => set('paragraphSpacingEm', v)}
            format={(v) => `${v.toFixed(1)}em`}
          />
          <LabeledRange
            label={m.lineWidthLabel}
            value={options.maxWidthCh}
            min={40}
            max={90}
            step={1}
            onChange={(v) => set('maxWidthCh', v)}
            format={(v) => `${v}ch`}
          />
        </div>

        <OptionChips<ReadingAlign>
          legend={m.alignLabel}
          value={options.align}
          onChange={(v) => set('align', v)}
          options={[
            { value: 'left', label: m.alignLeft },
            { value: 'justify', label: m.alignJustify },
            { value: 'center', label: m.alignCenter },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{m.previewLabel}</span>
          <span className="flex gap-2">
            <Button size="sm" variant="subtle" type="button" disabled={paragraphs.length === 0} onClick={enterFullscreen}>
              {m.fullscreen}
            </Button>
            <Button size="sm" variant="subtle" type="button" disabled={paragraphs.length === 0 || exporting} onClick={onDownloadHtml}>
              {m.downloadHtml}
            </Button>
            <Button size="sm" type="button" disabled={paragraphs.length === 0 || exporting} onClick={onDownloadPdf}>
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
            ref={fullscreenRef}
            className={cn(
              fullscreenActive
                ? 'overflow-auto px-6 py-16'
                : 'min-h-[28rem] overflow-auto rounded-lg border border-border p-6',
              fullscreenFallbackClass,
            )}
            style={{ background: tint.bg, color: tint.fg }}
            aria-label={m.previewLabel}
          >
            {fullscreenActive && (
              <div
                className={cn(
                  'fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 shadow-lg backdrop-blur transition-opacity duration-300',
                  controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  aria-label={m.fontSmaller}
                  disabled={options.fontSizePt <= 12}
                  onClick={() => set('fontSizePt', Math.max(12, options.fontSizePt - 2))}
                >
                  A−
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  aria-label={m.fontLarger}
                  disabled={options.fontSizePt >= 36}
                  onClick={() => set('fontSizePt', Math.min(36, options.fontSizePt + 2))}
                >
                  A+
                </Button>
                <span aria-hidden className="h-4 w-px bg-border" />
                <span className="px-1 text-xs text-text-faint">{m.fullscreenHint}</span>
                <Button size="sm" variant="ghost" type="button" onClick={exitFullscreen}>
                  {m.fullscreenExit}
                </Button>
              </div>
            )}
            <div
              style={{
                maxWidth: `${options.maxWidthCh}ch`,
                margin: '0 auto',
                fontFamily: READING_FONT_STACKS[options.font],
                fontSize: `${options.fontSizePt}px`,
                lineHeight: options.lineHeight,
                letterSpacing: `${options.letterSpacingEm}em`,
                wordSpacing: `${options.wordSpacingEm}em`,
                textAlign: options.align,
              }}
            >
              {paragraphs.map((p, i) => (
                <p key={i} style={{ margin: `0 0 ${options.paragraphSpacingEm}em` }}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
