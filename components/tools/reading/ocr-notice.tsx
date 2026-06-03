'use client';

import { Button } from '@/components/ui/button';
import { tpl } from '@/lib/tpl';
import type { OcrUiState } from '@/lib/hooks/use-paragraph-import';

export type OcrNoticeLabels = {
  /** Corrupted text layer detected — OCR pass starting/running. */
  ocrCorruptNotice: string;
  /** No selectable text (scanned PDF) — OCR pass starting/running. */
  ocrEmptyNotice: string;
  /** "Recognizing page {n} of {total}…" */
  ocrProgressTemplate: string;
  /** OCR finished and replaced the text. */
  ocrDoneNotice: string;
  /** Text layer corrupt but OCR failed — original text kept. */
  ocrFailedNotice: string;
  /** Manual "re-read with OCR" button label. */
  forceOcrLabel: string;
};

/** Status line + manual OCR button shown under the reading tools' file input. */
export function OcrNotice({
  state,
  labels,
  canForceOcr,
  onForceOcr,
  busy = false,
}: {
  state: OcrUiState;
  labels: OcrNoticeLabels;
  canForceOcr: boolean;
  onForceOcr: () => void;
  busy?: boolean;
}) {
  if (state.kind === 'idle' && !canForceOcr) return null;

  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      {state.kind === 'running' && (
        <p className="text-xs text-text-muted">
          {state.reason === 'empty' && <>{labels.ocrEmptyNotice} </>}
          {state.reason === 'corrupt' && <>{labels.ocrCorruptNotice} </>}
          <span className="font-mono text-text-faint">
            {tpl(labels.ocrProgressTemplate, { n: state.done, total: state.total })}
          </span>
        </p>
      )}
      {state.kind === 'ocr-done' && <p className="text-xs text-text-faint">{labels.ocrDoneNotice}</p>}
      {state.kind === 'ocr-failed' && <p className="text-xs text-danger">{labels.ocrFailedNotice}</p>}
      {canForceOcr && state.kind !== 'running' && (
        <span>
          <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={onForceOcr}>
            {labels.forceOcrLabel}
          </Button>
        </span>
      )}
    </div>
  );
}
