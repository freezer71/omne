'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  decodeBase64ToBytes,
  decodeBase64ToText,
  encodeBytesToBase64,
  encodeTextToBase64,
  parseDataUri,
  sniffMimeAndExt,
  toDataUri,
  type Base64Mode,
  type Base64Options,
} from '@/lib/tools/implementations/encode-base64';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  mode: string;
  modeEncode: string;
  modeDecode: string;
  source: string;
  sourceText: string;
  sourceFile: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  dropHint: string;
  fileSelected: string;
  removeFile: string;
  urlSafe: string;
  wrapLines: string;
  dataUri: string;
  copy: string;
  copied: string;
  download: string;
  clear: string;
  loadSample: string;
  empty: string;
  error: string;
  charsTemplate: string;
  bytesTemplate: string;
};

type Source = 'text' | 'file';

const TEXT_SAMPLE = 'hello world — café';
const B64_SAMPLE = 'aGVsbG8gd29ybGQg4oCUIGNhZsOp';

export function EncodeBase64Tool(messages: Messages) {
  const inputId = useId();
  const modeName = useId();
  const sourceName = useId();
  const urlSafeId = useId();
  const wrapId = useId();
  const dataUriId = useId();

  const [mode, setMode] = useState<Base64Mode>('encode');
  const [source, setSource] = useState<Source>('text');
  const [textInput, setTextInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [fileReadError, setFileReadError] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [dataUri, setDataUri] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (!cancelled) setDebouncedInput(textInput);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [textInput]);

  // Read bytes from the dropped/selected file. This effect is *only* about
  // talking to the platform (FileReader/arrayBuffer) — the early-return path
  // when `file === null` does NOT setState, the reset happens in the caller.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    file.arrayBuffer()
      .then((buf) => {
        if (!cancelled) {
          setFileBytes(new Uint8Array(buf));
          setFileReadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFileReadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const onPickFile = (f: File | null) => {
    setFile(f);
    setFileBytes(null);
    setFileReadError(false);
  };

  const options: Base64Options = useMemo(
    () => ({ urlSafe, wrap }),
    [urlSafe, wrap],
  );

  type TextResult = { kind: 'text'; value: string } | { kind: 'error'; value: string } | { kind: 'empty' };
  type FileResult =
    | { kind: 'b64'; value: string; mime: string }
    | { kind: 'bytes'; bytes: Uint8Array; mime: string; ext: string }
    | { kind: 'error'; value: string }
    | { kind: 'empty' };

  const textResult: TextResult = useMemo(() => {
    if (!debouncedInput) return { kind: 'empty' };
    try {
      if (mode === 'encode') {
        return { kind: 'text', value: encodeTextToBase64(debouncedInput, options) };
      }
      return { kind: 'text', value: decodeBase64ToText(debouncedInput) };
    } catch {
      return { kind: 'error', value: messages.error };
    }
  }, [debouncedInput, mode, options, messages.error]);

  const fileResult: FileResult = useMemo(() => {
    if (source !== 'file') return { kind: 'empty' };

    if (mode === 'encode') {
      if (!fileBytes) return { kind: 'empty' };
      try {
        const b64 = encodeBytesToBase64(fileBytes, options);
        const mime = file?.type || 'application/octet-stream';
        const value = dataUri ? toDataUri(b64, mime) : b64;
        return { kind: 'b64', value, mime };
      } catch {
        return { kind: 'error', value: messages.error };
      }
    }
    // mode === 'decode' on a file: the user dropped a .txt with base64 content
    if (!fileBytes) return { kind: 'empty' };
    try {
      const txt = new TextDecoder('utf-8').decode(fileBytes);
      const dataMatch = parseDataUri(txt);
      const payload = dataMatch ? dataMatch.base64 : txt;
      const bytes = decodeBase64ToBytes(payload);
      const sniffed = sniffMimeAndExt(bytes);
      const mime = dataMatch?.mime ?? sniffed.mime;
      return { kind: 'bytes', bytes, mime, ext: sniffed.ext };
    } catch {
      return { kind: 'error', value: messages.error };
    }
  }, [source, mode, fileBytes, options, dataUri, file, messages.error]);

  // Derived: the single error string to show. No effect needed.
  const errorMsg = useMemo<string | null>(() => {
    if (fileReadError) return messages.error;
    if (source === 'text') return textResult.kind === 'error' ? textResult.value : null;
    return fileResult.kind === 'error' ? fileResult.value : null;
  }, [fileReadError, source, textResult, fileResult, messages.error]);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onPickFile(f);
  }, []);

  const onClear = () => {
    setTextInput('');
    setDebouncedInput('');
    onPickFile(null);
  };

  const onLoadSample = () => {
    setSource('text');
    setTextInput(mode === 'encode' ? TEXT_SAMPLE : B64_SAMPLE);
  };

  const onDownloadText = useCallback(() => {
    const value = source === 'text' && textResult.kind === 'text' ? textResult.value
      : source === 'file' && fileResult.kind === 'b64' ? fileResult.value
      : '';
    if (!value) return;
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, mode === 'encode' ? 'encoded.txt' : 'decoded.txt');
  }, [source, textResult, fileResult, mode]);

  const onDownloadFile = useCallback(() => {
    if (source !== 'file' || fileResult.kind !== 'bytes') return;
    const { bytes, mime, ext } = fileResult;
    const view = new Uint8Array(bytes); // ensure plain Uint8Array, not subarray
    const blob = new Blob([view as BlobPart], { type: mime });
    downloadBlob(blob, `decoded.${ext}`);
  }, [source, fileResult]);

  // What's currently displayed in the output panel:
  const outputText =
    source === 'text'
      ? textResult.kind === 'text' ? textResult.value : ''
      : fileResult.kind === 'b64' ? fileResult.value : '';

  const outputBytes =
    source === 'file' && fileResult.kind === 'bytes' ? fileResult.bytes : null;

  const inputChars = useMemo(() => [...textInput].length, [textInput]);
  const outputChars = useMemo(() => [...outputText].length, [outputText]);

  const hasInput =
    source === 'text' ? textInput.length > 0 : file !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.mode}</legend>
          {(['encode', 'decode'] as const).map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                mode === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={modeName}
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="sr-only"
              />
              {value === 'encode' ? messages.modeEncode : messages.modeDecode}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.source}</legend>
          {(['text', 'file'] as const).map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                source === value
                  ? 'border-accent bg-surface-hover text-text-primary'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={sourceName}
                value={value}
                checked={source === value}
                onChange={() => setSource(value)}
                className="sr-only"
              />
              {value === 'text' ? messages.sourceText : messages.sourceFile}
            </label>
          ))}
        </fieldset>

        <span className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLoadSample} type="button">
            {messages.loadSample}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} type="button" disabled={!hasInput}>
            {messages.clear}
          </Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={inputId} className="text-xs text-text-muted">
              {messages.inputLabel}
            </label>
            {source === 'text' ? (
              <span className="font-mono text-xs text-text-faint">
                {tpl(messages.charsTemplate, { n: inputChars })}
              </span>
            ) : (
              fileBytes && (
                <span className="font-mono text-xs text-text-faint">
                  {tpl(messages.bytesTemplate, { n: fileBytes.length })}
                </span>
              )
            )}
          </div>

          {source === 'text' ? (
            <textarea
              id={inputId}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={messages.inputPlaceholder}
              rows={12}
              className="min-h-[24rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
            />
          ) : (
            <label
              htmlFor={inputId}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
              onDrop={onDrop}
              className={cn(
                'flex min-h-[24rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-4 py-6 text-center text-sm transition-colors',
                dragging
                  ? 'border-accent bg-surface-hover'
                  : 'border-border bg-surface hover:border-border-strong',
              )}
            >
              <input
                id={inputId}
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  onPickFile(f);
                }}
              />
              {file ? (
                <>
                  <span className="font-mono text-sm text-text-primary break-all">
                    {tpl(messages.fileSelected, { name: file.name })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onPickFile(null);
                    }}
                  >
                    {messages.removeFile}
                  </Button>
                </>
              ) : (
                <span className="text-text-muted">{messages.dropHint}</span>
              )}
            </label>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-xs text-text-muted">{messages.outputLabel}</label>
            <span className="font-mono text-xs text-text-faint">
              {outputBytes
                ? tpl(messages.bytesTemplate, { n: outputBytes.length })
                : outputText
                  ? tpl(messages.charsTemplate, { n: outputChars })
                  : ''}
            </span>
          </div>
          {errorMsg ? (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-danger">
              {errorMsg}
            </Card>
          ) : outputBytes ? (
            <Card className="flex min-h-[24rem] flex-col items-start gap-2 break-words px-3 py-2 font-mono text-sm text-text-primary">
              <span className="text-text-muted">
                {(fileResult.kind === 'bytes' && fileResult.mime) || 'application/octet-stream'}
              </span>
              <span className="text-text-faint">
                {tpl(messages.bytesTemplate, { n: outputBytes.length })}
              </span>
            </Card>
          ) : outputText ? (
            <Card className="min-h-[24rem] whitespace-pre-wrap break-all px-3 py-2 font-mono text-sm text-text-primary">
              {outputText}
            </Card>
          ) : (
            <Card className="flex min-h-[24rem] items-center justify-center px-3 py-2 text-sm text-text-faint">
              {messages.empty}
            </Card>
          )}
        </div>
      </div>

      {mode === 'encode' && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
          <label htmlFor={urlSafeId} className="flex cursor-pointer items-center gap-2">
            <input
              id={urlSafeId}
              type="checkbox"
              checked={urlSafe}
              onChange={(e) => setUrlSafe(e.target.checked)}
            />
            {messages.urlSafe}
          </label>
          <label htmlFor={wrapId} className="flex cursor-pointer items-center gap-2">
            <input
              id={wrapId}
              type="checkbox"
              checked={wrap}
              onChange={(e) => setWrap(e.target.checked)}
            />
            {messages.wrapLines}
          </label>
          {source === 'file' && (
            <label htmlFor={dataUriId} className="flex cursor-pointer items-center gap-2">
              <input
                id={dataUriId}
                type="checkbox"
                checked={dataUri}
                onChange={(e) => setDataUri(e.target.checked)}
              />
              {messages.dataUri}
            </label>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <CopyButton
          text={outputText}
          copyLabel={messages.copy}
          copiedLabel={messages.copied}
          disabled={!outputText}
        />
        {outputBytes ? (
          <Button size="sm" onClick={onDownloadFile} type="button">
            {messages.download}
          </Button>
        ) : (
          <Button size="sm" onClick={onDownloadText} disabled={!outputText} type="button">
            {messages.download}
          </Button>
        )}
      </div>
    </div>
  );
}
