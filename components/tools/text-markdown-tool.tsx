'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadBlob } from '@/lib/file-utils';
import { renderMarkdown } from '@/lib/tools/implementations/text-markdown';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  inputLabel: string;
  inputPlaceholder: string;
  previewLabel: string;
  htmlLabel: string;
  showHtml: string;
  showPreview: string;
  copyHtml: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
};

const SAMPLE = `# Welcome to omne

omne is a **privacy-first** toolkit. _Everything_ runs in your browser.

## Features

- No upload, no signup
- Works offline
- ~~Hidden trackers~~ — none

### Code

\`\`\`js
const omne = "100% local";
console.log(omne);
\`\`\`

> Privacy is a feature, not an afterthought.

| Tool | Category |
|------|----------|
| Diff | Text     |
| Compress | Video |

Learn more at [omne.test](https://omne.test).`;

const IFRAME_STYLES = `
  body { font: 14px/1.6 system-ui, -apple-system, sans-serif; color: #1f2937; padding: 1rem; margin: 0; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.2; margin: 1em 0 .5em; }
  h1 { font-size: 1.8em; } h2 { font-size: 1.4em; } h3 { font-size: 1.2em; }
  p { margin: .75em 0; }
  code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font: 0.9em ui-monospace, monospace; }
  pre { background: #1f2937; color: #e5e7eb; padding: 1em; border-radius: 6px; overflow: auto; }
  pre code { background: none; padding: 0; color: inherit; }
  a { color: #2563eb; }
  blockquote { border-left: 3px solid #d1d5db; margin: 1em 0; padding: .25em 1em; color: #6b7280; }
  ul, ol { padding-left: 1.5em; }
  li { margin: .25em 0; }
  table { border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
  th { background: #f9fafb; }
  img { max-width: 100%; height: auto; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
  @media (prefers-color-scheme: dark) {
    body { background: #0f172a; color: #e5e7eb; }
    code { background: #1f2937; }
    blockquote { color: #94a3b8; border-color: #374151; }
    th { background: #1f2937; } th, td { border-color: #374151; }
    a { color: #93c5fd; }
    hr { border-color: #1f2937; }
  }
`;

export function TextMarkdownTool(messages: Messages) {
  const inputId = useId();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [view, setView] = useState<'preview' | 'html'>('preview');

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(input), 200);
    return () => window.clearTimeout(h);
  }, [input]);

  const html = useMemo(() => renderMarkdown(debounced), [debounced]);

  const srcDoc = useMemo(() => {
    if (!html) return '';
    return `<!doctype html><html><head><meta charset="utf-8"><style>${IFRAME_STYLES}</style></head><body>${html}</body></html>`;
  }, [html]);

  const onDownload = () => {
    if (!html) return;
    const wrapped = `<!doctype html>\n<html><head><meta charset="utf-8"><title>Markdown export</title></head><body>${html}</body></html>`;
    downloadBlob(new Blob([wrapped], { type: 'text/html;charset=utf-8' }), 'markdown.html');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => setInput(SAMPLE)}>{messages.loadSample}</Button>
          <Button variant="ghost" size="sm" type="button" disabled={!input} onClick={() => setInput('')}>{messages.clear}</Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-xs text-text-muted">{messages.inputLabel}</label>
          <textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder={messages.inputPlaceholder} rows={20}
            className="min-h-[32rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{view === 'preview' ? messages.previewLabel : messages.htmlLabel}</label>
            <button type="button" onClick={() => setView((v) => v === 'preview' ? 'html' : 'preview')} className="text-xs text-text-muted hover:text-text-primary">
              {view === 'preview' ? messages.showHtml : messages.showPreview}
            </button>
          </div>
          {html ? (
            view === 'preview' ? (
              <Card className="min-h-[32rem] overflow-hidden p-0">
                <iframe
                  srcDoc={srcDoc}
                  title={messages.previewLabel}
                  sandbox=""
                  className="h-[32rem] w-full bg-white"
                />
              </Card>
            ) : (
              <Card className="min-h-[32rem] overflow-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-xs text-text-primary">{html}</Card>
            )
          ) : (
            <Card className="flex min-h-[32rem] items-center justify-center px-3 py-2 text-sm text-text-faint">{messages.empty}</Card>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton text={html} copyLabel={messages.copyHtml} copiedLabel={messages.copied} disabled={!html} />
        <Button size="sm" onClick={onDownload} disabled={!html} type="button">{messages.download}</Button>
      </div>
    </div>
  );
}
