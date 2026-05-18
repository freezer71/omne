'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { CopyButton } from '@/components/tools/json/copy-button';
import {
  parseQrPayload,
  type ParsedQrPayload,
} from '@/lib/tools/implementations/qr-scan';

type Messages = {
  sourceLabel: string;
  sourceCamera: string;
  sourceImage: string;
  cameraStart: string;
  cameraStop: string;
  cameraScanning: string;
  cameraInsecure: string;
  cameraDenied: string;
  cameraUnavailable: string;
  scanAgain: string;
  dropLabel: string;
  dropHint: string;
  selectImage: string;
  decodingImage: string;
  imageError: string;
  noResult: string;
  resultLabel: string;
  payloadRaw: string;
  copy: string;
  copied: string;
  kindUrl: string;
  kindWifi: string;
  kindVcard: string;
  kindText: string;
  openLink: string;
  wifiSsidLabel: string;
  wifiPasswordLabel: string;
  wifiEncryptionLabel: string;
  wifiHiddenLabel: string;
  wifiYes: string;
  wifiNo: string;
  copyPassword: string;
  vcardNameLabel: string;
  vcardOrgLabel: string;
  vcardTitleLabel: string;
  vcardEmailLabel: string;
  vcardPhoneLabel: string;
  vcardUrlLabel: string;
  vcardDownload: string;
};

const ACCEPT = 'image/png,image/jpeg,image/webp';
type Source = 'camera' | 'image';

function buildVCardText(p: ParsedQrPayload): string | null {
  if (p.kind !== 'vcard') return null;
  // If raw was a vCard, that *is* the .vcf body. Return it as-is.
  return p.raw;
}

function isSecureContextForCamera(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.isSecureContext) return true;
  // localhost / 127.0.0.1 are treated as secure for getUserMedia by browsers.
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

export function QrScanTool(messages: Messages) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // qr-scanner instance is lazily created; type comes from the dynamic import.
  const scannerRef = useRef<unknown>(null);
  const cancelledRef = useRef(false);

  const inputId = useId();
  const sourceName = useId();

  const [source, setSource] = useState<Source>('camera');
  const [secure, setSecure] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [decoded, setDecoded] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSecure(isSecureContextForCamera());
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const s = scannerRef.current as { stop?: () => void; destroy?: () => void } | null;
      if (s) {
        try {
          s.stop?.();
          s.destroy?.();
        } catch {
          /* ignore */
        }
      }
      scannerRef.current = null;
    };
  }, []);

  const parsed = useMemo(() => (decoded ? parseQrPayload(decoded) : null), [decoded]);

  const stopCamera = () => {
    const s = scannerRef.current as { stop?: () => void; destroy?: () => void } | null;
    if (s) {
      try {
        s.stop?.();
        s.destroy?.();
      } catch {
        /* ignore */
      }
    }
    scannerRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setImageError(null);
    setDecoded(null);
    if (!secure) {
      setCameraError(messages.cameraInsecure);
      return;
    }
    try {
      setBusy(true);
      const { default: QrScanner } = await import('qr-scanner');
      // Point the worker at our self-hosted copy (privacy promise).
      try {
        (QrScanner as unknown as { WORKER_PATH: string }).WORKER_PATH =
          '/qr-scanner/qr-scanner-worker.min.js';
      } catch {
        /* WORKER_PATH is deprecated but still functional. */
      }
      const video = videoRef.current;
      if (!video) {
        setBusy(false);
        return;
      }
      const scanner = new QrScanner(
        video,
        (result) => {
          if (cancelledRef.current) return;
          setDecoded(result.data);
          // Stop after the first hit; user can rescan with the button.
          stopCamera();
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setCameraActive(true);
    } catch (err) {
      const msg =
        err instanceof Error && /Permission|NotAllowed/i.test(err.message)
          ? messages.cameraDenied
          : messages.cameraUnavailable;
      setCameraError(msg);
      stopCamera();
    } finally {
      setBusy(false);
    }
  };

  const onImageFiles = async (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const file = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    setImageError(null);
    setCameraError(null);
    setDecoded(null);
    setBusy(true);
    try {
      const { default: QrScanner } = await import('qr-scanner');
      try {
        (QrScanner as unknown as { WORKER_PATH: string }).WORKER_PATH =
          '/qr-scanner/qr-scanner-worker.min.js';
      } catch {
        /* ignore */
      }
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      setDecoded(result.data);
    } catch {
      setImageError(messages.imageError);
    } finally {
      setBusy(false);
    }
  };

  const onSwitchSource = (next: Source) => {
    if (next === source) return;
    if (cameraActive) stopCamera();
    setDecoded(null);
    setCameraError(null);
    setImageError(null);
    setSource(next);
  };

  const onScanAgain = () => {
    setDecoded(null);
    if (source === 'camera') void startCamera();
  };

  const onDownloadVcf = () => {
    if (!parsed || parsed.kind !== 'vcard') return;
    const body = buildVCardText(parsed);
    if (!body) return;
    const blob = new Blob([body], { type: 'text/vcard;charset=utf-8' });
    downloadBlob(blob, 'contact.vcf');
  };

  const kindLabel = (p: ParsedQrPayload): string => {
    if (p.kind === 'url') return messages.kindUrl;
    if (p.kind === 'wifi') return messages.kindWifi;
    if (p.kind === 'vcard') return messages.kindVcard;
    return messages.kindText;
  };

  const wifiEncryptionLabel = (enc: 'WPA' | 'WEP' | 'nopass'): string => enc;

  return (
    <div className="flex flex-col gap-5">
      {/* Source picker */}
      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.sourceLabel}</legend>
        {(['camera', 'image'] as const).map((value) => (
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
              onChange={() => onSwitchSource(value)}
              className="sr-only"
            />
            {value === 'camera' ? messages.sourceCamera : messages.sourceImage}
          </label>
        ))}
      </fieldset>

      {/* Camera surface */}
      {source === 'camera' && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="relative overflow-hidden rounded-md border border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn(
                'block aspect-video w-full bg-black object-cover',
                !cameraActive && 'opacity-30',
              )}
            />
            {!cameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">
                {busy ? messages.cameraScanning : messages.cameraStart}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cameraActive ? (
              <Button size="sm" variant="ghost" onClick={stopCamera} type="button">
                {messages.cameraStop}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={startCamera}
                disabled={busy || !secure}
                type="button"
              >
                {messages.cameraStart}
              </Button>
            )}
          </div>
          {!secure && (
            <p role="alert" className="text-sm text-danger">
              {messages.cameraInsecure}
            </p>
          )}
          {cameraError && (
            <p role="alert" className="text-sm text-danger">
              {cameraError}
            </p>
          )}
        </Card>
      )}

      {/* Image surface */}
      {source === 'image' && (
        <Card
          className={cn(
            'p-8 border-2 border-dashed transition-colors',
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
            void onImageFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.dropLabel}</p>
            <p className="text-xs text-text-faint">{messages.dropHint}</p>
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept={ACCEPT}
              aria-label={messages.selectImage}
              className="sr-only"
              onChange={(e) => void onImageFiles(e.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {busy ? messages.decodingImage : messages.selectImage}
            </Button>
          </div>
          {imageError && (
            <p role="alert" className="mt-3 text-center text-sm text-danger">
              {imageError}
            </p>
          )}
        </Card>
      )}

      {/* Result */}
      {decoded && parsed ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wider text-text-muted">
              {messages.resultLabel} · {kindLabel(parsed)}
            </span>
            <Button size="sm" variant="ghost" onClick={onScanAgain} type="button">
              {messages.scanAgain}
            </Button>
          </div>

          {parsed.kind === 'url' && (
            <>
              <p className="break-all font-mono text-sm text-text-primary">{parsed.url}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={() => window.open(parsed.url, '_blank', 'noopener,noreferrer')}
                >
                  {messages.openLink}
                </Button>
                <CopyButton
                  text={parsed.url}
                  copyLabel={messages.copy}
                  copiedLabel={messages.copied}
                />
              </div>
            </>
          )}

          {parsed.kind === 'wifi' && (
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs text-text-muted">{messages.wifiSsidLabel}</div>
                <div className="font-mono text-text-primary">{parsed.ssid || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted">{messages.wifiEncryptionLabel}</div>
                <div className="font-mono text-text-primary">
                  {wifiEncryptionLabel(parsed.encryption)}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-text-muted">{messages.wifiPasswordLabel}</div>
                <div className="flex items-center gap-2">
                  <code className="break-all rounded-md border border-border bg-surface px-2 py-1 font-mono text-sm text-text-primary">
                    {parsed.password || '—'}
                  </code>
                  <CopyButton
                    text={parsed.password}
                    copyLabel={messages.copyPassword}
                    copiedLabel={messages.copied}
                    disabled={!parsed.password}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted">{messages.wifiHiddenLabel}</div>
                <div className="font-mono text-text-primary">
                  {parsed.hidden ? messages.wifiYes : messages.wifiNo}
                </div>
              </div>
            </div>
          )}

          {parsed.kind === 'vcard' && (
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="text-xs text-text-muted">{messages.vcardNameLabel}</div>
                <div className="text-text-primary">{parsed.fullName || '—'}</div>
              </div>
              {parsed.organization && (
                <div>
                  <div className="text-xs text-text-muted">{messages.vcardOrgLabel}</div>
                  <div className="text-text-primary">{parsed.organization}</div>
                </div>
              )}
              {parsed.title && (
                <div>
                  <div className="text-xs text-text-muted">{messages.vcardTitleLabel}</div>
                  <div className="text-text-primary">{parsed.title}</div>
                </div>
              )}
              {parsed.email && (
                <div>
                  <div className="text-xs text-text-muted">{messages.vcardEmailLabel}</div>
                  <div className="font-mono text-text-primary">{parsed.email}</div>
                </div>
              )}
              {parsed.phone && (
                <div>
                  <div className="text-xs text-text-muted">{messages.vcardPhoneLabel}</div>
                  <div className="font-mono text-text-primary">{parsed.phone}</div>
                </div>
              )}
              {parsed.url && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-text-muted">{messages.vcardUrlLabel}</div>
                  <div className="break-all font-mono text-text-primary">{parsed.url}</div>
                </div>
              )}
              <div className="sm:col-span-2">
                <Button size="sm" onClick={onDownloadVcf} type="button">
                  {messages.vcardDownload}
                </Button>
              </div>
            </div>
          )}

          {parsed.kind === 'text' && (
            <>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary">
                {parsed.text}
              </pre>
              <div>
                <CopyButton
                  text={parsed.text}
                  copyLabel={messages.copy}
                  copiedLabel={messages.copied}
                />
              </div>
            </>
          )}

          <details className="rounded-md border border-border bg-surface px-3 py-2 text-xs">
            <summary className="cursor-pointer select-none text-text-muted">
              {messages.payloadRaw}
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-text-primary">
              {parsed.raw}
            </pre>
          </details>
        </Card>
      ) : (
        !busy && (source === 'image' || cameraActive) && (
          <p className="text-sm text-text-faint">{messages.noResult}</p>
        )
      )}
    </div>
  );
}
