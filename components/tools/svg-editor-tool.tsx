'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  applyRootAttrs,
  applyRootTransform,
  extractFills,
  parseSvgDoc,
  readRootAttrs,
  readRootTransform,
  replaceColor,
  sanitizeForRender,
  type ColorEntry,
} from '@/lib/tools/implementations/svg-editor';
import { downloadBlob, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  heading: string;
  dropLabel: string;
  selectButton: string;
  sampleButton: string;
  sourceLabel: string;
  previewLabel: string;
  controlsLabel: string;
  dimensionsLabel: string;
  widthLabel: string;
  heightLabel: string;
  viewBoxLabel: string;
  preserveAspectRatioLabel: string;
  colorsLabel: string;
  colorsEmpty: string;
  transformLabel: string;
  rotateLabel: string;
  scaleLabel: string;
  translateXLabel: string;
  translateYLabel: string;
  resetTransformButton: string;
  backgroundLabel: string;
  transparentLabel: string;
  showBoundsLabel: string;
  formatButton: string;
  downloadButton: string;
  copyButton: string;
  copied: string;
  resetButton: string;
  busy: string;
  error: string;
};

function formatXml(markup: string, indent = 2): string {
  // Lightweight pretty-printer: inserts newlines between tags, indents by depth.
  const tokens = markup.replace(/>\s+</g, '><').split(/(<[^>]+>)/g).filter(Boolean);
  let depth = 0;
  const lines: string[] = [];
  const pad = (n: number) => ' '.repeat(Math.max(0, n) * indent);
  for (const tok of tokens) {
    if (tok.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      lines.push(`${pad(depth)}${tok}`);
    } else if (tok.startsWith('<') && !tok.endsWith('/>') && !tok.startsWith('<?') && !tok.startsWith('<!')) {
      lines.push(`${pad(depth)}${tok}`);
      depth += 1;
    } else {
      lines.push(`${pad(depth)}${tok}`);
    }
  }
  return lines.join('\n');
}

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="28" fill="#6366f1"/><path d="M20 32 L28 40 L44 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function SvgEditorTool(messages: Messages) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [markup, setMarkup] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [background, setBackground] = useState('#ffffff');
  const [showBounds, setShowBounds] = useState(true);

  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [viewBox, setViewBox] = useState('');
  const [preserveAspectRatio, setPreserveAspectRatio] = useState('');
  const [rotate, setRotate] = useState(0);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const hasMarkup = markup.trim().length > 0;
  const sanitized = useMemo(() => (hasMarkup ? sanitizeForRender(markup) : ''), [markup, hasMarkup]);

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    if (!sanitized) {
      node.replaceChildren();
      return;
    }
    const parsed = new DOMParser().parseFromString(sanitized, 'image/svg+xml');
    const root = parsed.documentElement;
    if (!root || parsed.querySelector('parsererror')) {
      node.replaceChildren();
      return;
    }
    const imported = document.importNode(root, true);
    node.replaceChildren(imported);
  }, [sanitized]);

  // Recompute colors + read root state when markup changes
  useEffect(() => {
    if (!hasMarkup) {
      setColors([]);
      setError(null);
      return;
    }
    const handle = setTimeout(() => {
      const { doc, error: parseError } = parseSvgDoc(markup);
      if (parseError || !doc) {
        setError(parseError);
        setColors([]);
        return;
      }
      setError(null);
      setColors(extractFills(doc));
      const attrs = readRootAttrs(markup);
      setWidth(attrs.width ?? '');
      setHeight(attrs.height ?? '');
      setViewBox(attrs.viewBox ?? '');
      setPreserveAspectRatio(attrs.preserveAspectRatio ?? '');
      const t = readRootTransform(markup);
      setRotate(t.rotate ?? 0);
      setScale(t.scale ?? 1);
      setTranslateX(t.translateX ?? 0);
      setTranslateY(t.translateY ?? 0);
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup]);

  // Preserve cursor in textarea when markup is updated externally (via controls)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !selectionRef.current) return;
    const { start, end } = selectionRef.current;
    if (document.activeElement === ta) {
      ta.setSelectionRange(start, end);
    }
    selectionRef.current = null;
  }, [markup]);

  const captureSelection = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    selectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  };

  const onPickFiles = (incoming: FileList | File[] | null) => {
    const first = Array.from(incoming ?? []).find(
      (f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'),
    );
    if (!first) return;
    setFileName(first.name);
    setError(null);
    void first.text().then((text) => setMarkup(text));
  };

  const loadSample = () => {
    setFileName('sample.svg');
    setMarkup(SAMPLE_SVG);
  };

  const onColorChange = (from: string, to: string) => {
    captureSelection();
    setMarkup((current) => replaceColor(current, from, to));
  };

  const onRootAttrChange = (patch: Parameters<typeof applyRootAttrs>[1]) => {
    captureSelection();
    setMarkup((current) => applyRootAttrs(current, patch));
  };

  const onTransformChange = (patch: Partial<{ rotate: number; scale: number; translateX: number; translateY: number }>) => {
    captureSelection();
    const next = {
      rotate: patch.rotate ?? rotate,
      scale: patch.scale ?? scale,
      translateX: patch.translateX ?? translateX,
      translateY: patch.translateY ?? translateY,
    };
    setMarkup((current) => applyRootTransform(current, next));
  };

  const resetTransform = () => {
    captureSelection();
    setMarkup((current) => applyRootTransform(current, {}));
    setRotate(0);
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const onFormat = () => {
    captureSelection();
    setMarkup((current) => formatXml(current));
  };

  const onCopy = () => {
    if (!markup) return;
    void navigator.clipboard.writeText(markup);
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(false), 1400);
  };

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const onDownload = () => {
    if (!hasMarkup || busy) return;
    setBusy(true);
    try {
      const blob = new Blob([markup], { type: 'image/svg+xml' });
      const name = outputName('edited', [fileName ?? 'svg.svg'], 'svg');
      downloadBlob(blob, name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          'p-6 border-2 border-dashed transition-colors',
          dragging ? 'border-accent bg-surface-hover' : 'border-border',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPickFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/svg+xml,.svg"
          className="sr-only"
          onChange={(e) => onPickFiles(e.target.files)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm text-text-primary">{messages.heading}</p>
            <p className="text-xs text-text-faint">{messages.dropLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
              {messages.selectButton}
            </Button>
            <Button variant="subtle" size="sm" type="button" onClick={loadSample}>
              {messages.sampleButton}
            </Button>
            {hasMarkup ? (
              <Button
                variant="subtle"
                size="sm"
                type="button"
                onClick={() => {
                  setMarkup('');
                  setFileName(null);
                }}
              >
                {messages.resetButton}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {hasMarkup ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
          {/* Source */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">{messages.sourceLabel}</span>
              <div className="flex items-center gap-2">
                <Button variant="subtle" size="sm" type="button" onClick={onFormat}>
                  {messages.formatButton}
                </Button>
                <Button variant="subtle" size="sm" type="button" onClick={onCopy}>
                  {copied ? messages.copied : messages.copyButton}
                </Button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              spellCheck={false}
              wrap="soft"
              style={{ wordBreak: 'break-all' }}
              className="h-80 w-full min-w-0 resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-text-primary"
            />
          </div>

          {/* Preview */}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs text-text-muted">{messages.previewLabel}</span>
            <div
              ref={previewRef}
              role="img"
              aria-label={messages.previewLabel}
              className={cn(
                'flex h-72 w-full items-center justify-center overflow-hidden rounded-md border border-border p-2 [&_svg]:max-h-full [&_svg]:max-w-full',
                showBounds && '[&_svg]:outline [&_svg]:outline-1 [&_svg]:outline-dashed [&_svg]:outline-accent/60',
                transparent &&
                  'bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:16px_16px]',
              )}
              style={transparent ? undefined : { background }}
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span>{messages.backgroundLabel}</span>
              <input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                disabled={transparent}
                className="h-7 w-10 cursor-pointer rounded border border-border bg-surface disabled:opacity-40"
              />
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                />
                {messages.transparentLabel}
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={showBounds}
                  onChange={(e) => setShowBounds(e.target.checked)}
                />
                {messages.showBoundsLabel}
              </label>
            </div>
          </div>

          {/* Controls */}
          <aside className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4">
            <span className="text-xs text-text-muted">{messages.controlsLabel}</span>

            <section className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wide text-text-faint">
                {messages.dimensionsLabel}
              </span>
              <FieldRow label={messages.widthLabel}>
                <input
                  value={width}
                  onChange={(e) => {
                    setWidth(e.target.value);
                    onRootAttrChange({ width: e.target.value });
                  }}
                  className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-xs text-text-primary"
                />
              </FieldRow>
              <FieldRow label={messages.heightLabel}>
                <input
                  value={height}
                  onChange={(e) => {
                    setHeight(e.target.value);
                    onRootAttrChange({ height: e.target.value });
                  }}
                  className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-xs text-text-primary"
                />
              </FieldRow>
              <FieldRow label={messages.viewBoxLabel}>
                <input
                  value={viewBox}
                  onChange={(e) => {
                    setViewBox(e.target.value);
                    onRootAttrChange({ viewBox: e.target.value });
                  }}
                  className="h-8 w-32 rounded-md border border-border bg-surface px-2 font-mono text-xs text-text-primary"
                />
              </FieldRow>
              <FieldRow label={messages.preserveAspectRatioLabel}>
                <select
                  value={preserveAspectRatio}
                  onChange={(e) => {
                    setPreserveAspectRatio(e.target.value);
                    onRootAttrChange({ preserveAspectRatio: e.target.value });
                  }}
                  className="h-8 w-32 rounded-md border border-border bg-surface px-2 text-xs text-text-primary"
                >
                  <option value="">—</option>
                  <option value="xMidYMid meet">xMidYMid meet</option>
                  <option value="xMidYMid slice">xMidYMid slice</option>
                  <option value="none">none</option>
                </select>
              </FieldRow>
            </section>

            <section className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wide text-text-faint">
                {messages.colorsLabel}
              </span>
              {colors.length === 0 ? (
                <p className="text-xs text-text-faint">{messages.colorsEmpty}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {colors.map((c) => (
                    <li key={c.color} className="flex items-center justify-between gap-2">
                      <input
                        type="color"
                        value={c.color.startsWith('#') ? c.color : '#000000'}
                        onChange={(e) => onColorChange(c.color, e.target.value)}
                        className="h-7 w-10 cursor-pointer rounded border border-border bg-surface"
                      />
                      <span className="flex-1 truncate font-mono text-[11px] text-text-muted">
                        {c.color}
                      </span>
                      <span className="font-mono text-[11px] text-text-faint">×{c.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-text-faint">
                  {messages.transformLabel}
                </span>
                <Button variant="subtle" size="sm" type="button" onClick={resetTransform}>
                  {messages.resetTransformButton}
                </Button>
              </div>
              <SliderRow
                label={messages.rotateLabel}
                value={rotate}
                min={-180}
                max={180}
                step={1}
                onChange={(v) => {
                  setRotate(v);
                  onTransformChange({ rotate: v });
                }}
              />
              <SliderRow
                label={messages.scaleLabel}
                value={scale}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(v) => {
                  setScale(v);
                  onTransformChange({ scale: v });
                }}
              />
              <SliderRow
                label={messages.translateXLabel}
                value={translateX}
                min={-200}
                max={200}
                step={1}
                onChange={(v) => {
                  setTranslateX(v);
                  onTransformChange({ translateX: v });
                }}
              />
              <SliderRow
                label={messages.translateYLabel}
                value={translateY}
                min={-200}
                max={200}
                step={1}
                onChange={(v) => {
                  setTranslateY(v);
                  onTransformChange({ translateY: v });
                }}
              />
            </section>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {error && (
                <p role="alert" className="text-xs text-danger">
                  {messages.error}
                </p>
              )}
              <Button onClick={onDownload} disabled={busy || !hasMarkup}>
                {busy ? messages.busy : messages.downloadButton}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-muted">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-mono text-[11px] text-text-faint">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full"
      />
    </label>
  );
}
