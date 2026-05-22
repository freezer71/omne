'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { downloadBlob } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';
import {
  QR_ERROR_CORRECTIONS,
  QR_PAYLOAD_MODES,
  buildQrPayload,
  type QrErrorCorrection,
  type QrPayloadMode,
  type WifiEncryption,
} from '@/lib/tools/implementations/qr-generate';
import { CopyButton } from '@/components/tools/json/copy-button';

type Messages = {
  modeLabel: string;
  modeText: string;
  modeUrl: string;
  modeWifi: string;
  modeVcard: string;
  textLabel: string;
  textPlaceholder: string;
  urlLabel: string;
  urlPlaceholder: string;
  wifiSsid: string;
  wifiSsidPlaceholder: string;
  wifiPassword: string;
  wifiPasswordPlaceholder: string;
  wifiEncryption: string;
  wifiEncryptionWpa: string;
  wifiEncryptionWep: string;
  wifiEncryptionNone: string;
  wifiHidden: string;
  vcardFirstName: string;
  vcardLastName: string;
  vcardOrg: string;
  vcardTitle: string;
  vcardEmail: string;
  vcardPhone: string;
  vcardUrl: string;
  fgLabel: string;
  bgLabel: string;
  ecLabel: string;
  ecHelp: string;
  marginLabel: string;
  sizeLabel: string;
  pixelTemplate: string;
  previewLabel: string;
  previewEmpty: string;
  downloadPng: string;
  downloadSvg: string;
  copyDataUri: string;
  copyPayload: string;
  copied: string;
  payloadLabel: string;
  payloadHint: string;
  error: string;
  sampleHint: string;
};

const SAMPLE_URL = 'https://omne.app';
const SAMPLE_SSID = 'omne-guest';
const PIXEL_MIN = 4;
const PIXEL_MAX = 20;
const PIXEL_DEFAULT = 8;
const MARGIN_MIN = 0;
const MARGIN_MAX = 16;
const MARGIN_DEFAULT = 4;
// `qrcode` uses `width` (output pixel size, not module size). We pick a
// sensible final canvas size that scales the QR. 1 module ~= pixelSize px
// at version 1 (21 modules) → width = 21 * pixelSize. We don't know the
// version up-front, so we use a flat width derived from a "reference"
// 25-module symbol; the lib auto-fits inside the requested width.
function computeWidth(pixelSize: number): number {
  return Math.max(64, Math.min(1024, pixelSize * 32));
}

export function QrGenerateTool(messages: Messages) {
  const modeName = useId();
  const ecName = useId();
  const textId = useId();
  const urlId = useId();
  const ssidId = useId();
  const passId = useId();
  const encName = useId();
  const hiddenId = useId();
  const fnId = useId();
  const lnId = useId();
  const orgId = useId();
  const titleId = useId();
  const emailId = useId();
  const phoneId = useId();
  const cardUrlId = useId();
  const fgId = useId();
  const bgId = useId();
  const marginId = useId();
  const sizeId = useId();

  const [mode, setMode] = useState<QrPayloadMode>('url');

  // text / url
  const [textValue, setTextValue] = useState('');
  const [urlValue, setUrlValue] = useState(SAMPLE_URL);

  // wifi
  const [wifiSsid, setWifiSsid] = useState(SAMPLE_SSID);
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiEncryption, setWifiEncryption] = useState<WifiEncryption>('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);

  // vcard
  const [vFirst, setVFirst] = useState('');
  const [vLast, setVLast] = useState('');
  const [vOrg, setVOrg] = useState('');
  const [vTitle, setVTitle] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vUrl, setVUrl] = useState('');

  // visual options
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [ec, setEc] = useState<QrErrorCorrection>('M');
  const [margin, setMargin] = useState(MARGIN_DEFAULT);
  const [pixelSize, setPixelSize] = useState(PIXEL_DEFAULT);

  // Build the payload string (cheap, pure).
  const payload = useMemo(() => {
    if (mode === 'text') return buildQrPayload({ mode: 'text', text: textValue });
    if (mode === 'url') return buildQrPayload({ mode: 'url', url: urlValue });
    if (mode === 'wifi')
      return buildQrPayload({
        mode: 'wifi',
        wifi: {
          ssid: wifiSsid,
          password: wifiPassword,
          encryption: wifiEncryption,
          hidden: wifiHidden,
        },
      });
    return buildQrPayload({
      mode: 'vcard',
      vcard: {
        firstName: vFirst,
        lastName: vLast,
        organization: vOrg,
        title: vTitle,
        email: vEmail,
        phone: vPhone,
        url: vUrl,
      },
    });
  }, [
    mode,
    textValue,
    urlValue,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    wifiHidden,
    vFirst,
    vLast,
    vOrg,
    vTitle,
    vEmail,
    vPhone,
    vUrl,
  ]);

  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgText, setSvgText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Debounced render to PNG dataURL + SVG.
  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      if (cancelled) return;
      const trimmed = payload.trim();
      if (!trimmed) {
        setDataUrl('');
        setSvgText('');
        setError(null);
        return;
      }
      const width = computeWidth(pixelSize);
      const options = {
        errorCorrectionLevel: ec,
        margin,
        color: { dark: fg, light: bg },
        width,
      } as const;
      try {
        const [png, svg] = await Promise.all([
          QRCode.toDataURL(payload, options),
          QRCode.toString(payload, { ...options, type: 'svg' }),
        ]);
        if (cancelled) return;
        setDataUrl(png);
        setSvgText(svg);
        setError(null);
      } catch {
        if (!cancelled) {
          setDataUrl('');
          setSvgText('');
          setError(messages.error);
        }
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [payload, ec, margin, pixelSize, fg, bg, messages.error]);

  const onDownloadPng = () => {
    if (!dataUrl) return;
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      downloadBlob(blob, `qr-${mode}.png`);
    } catch {
      /* swallow */
    }
  };

  const onDownloadSvg = () => {
    if (!svgText) return;
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `qr-${mode}.svg`);
  };

  const modeLabel: Record<QrPayloadMode, string> = {
    text: messages.modeText,
    url: messages.modeUrl,
    wifi: messages.modeWifi,
    vcard: messages.modeVcard,
  };

  const wifiEncLabel: Record<WifiEncryption, string> = {
    WPA: messages.wifiEncryptionWpa,
    WEP: messages.wifiEncryptionWep,
    nopass: messages.wifiEncryptionNone,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Mode picker */}
      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.modeLabel}</legend>
        {QR_PAYLOAD_MODES.map((value) => (
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
            {modeLabel[value]}
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(260px,360px)]">
        {/* LEFT — inputs */}
        <div className="flex flex-col gap-4">
          {mode === 'text' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={textId} className="text-xs text-text-muted">
                {messages.textLabel}
              </label>
              <textarea
                id={textId}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder={messages.textPlaceholder}
                rows={6}
                className="min-h-[10rem] resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
              />
            </div>
          )}

          {mode === 'url' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={urlId} className="text-xs text-text-muted">
                {messages.urlLabel}
              </label>
              <input
                id={urlId}
                type="text"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder={messages.urlPlaceholder}
                className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
              />
            </div>
          )}

          {mode === 'wifi' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={ssidId} className="text-xs text-text-muted">
                  {messages.wifiSsid}
                </label>
                <input
                  id={ssidId}
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder={messages.wifiSsidPlaceholder}
                  className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={passId} className="text-xs text-text-muted">
                  {messages.wifiPassword}
                </label>
                <input
                  id={passId}
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder={messages.wifiPasswordPlaceholder}
                  disabled={wifiEncryption === 'nopass'}
                  className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary placeholder:text-text-faint hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors disabled:opacity-50"
                />
              </div>
              <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
                <legend className="text-xs text-text-muted">{messages.wifiEncryption}</legend>
                <div className="flex flex-wrap gap-2">
                  {(['WPA', 'WEP', 'nopass'] as const).map((value) => (
                    <label
                      key={value}
                      className={cn(
                        'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
                        wifiEncryption === value
                          ? 'border-accent bg-surface-hover text-text-primary'
                          : 'border-border bg-surface text-text-muted hover:border-border-strong',
                      )}
                    >
                      <input
                        type="radio"
                        name={encName}
                        value={value}
                        checked={wifiEncryption === value}
                        onChange={() => setWifiEncryption(value)}
                        className="sr-only"
                      />
                      {wifiEncLabel[value]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label
                htmlFor={hiddenId}
                className="flex items-center gap-2 text-sm text-text-primary sm:col-span-2"
              >
                <input
                  id={hiddenId}
                  type="checkbox"
                  checked={wifiHidden}
                  onChange={(e) => setWifiHidden(e.target.checked)}
                />
                {messages.wifiHidden}
              </label>
            </div>
          )}

          {mode === 'vcard' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={fnId} className="text-xs text-text-muted">
                  {messages.vcardFirstName}
                </label>
                <input
                  id={fnId}
                  type="text"
                  value={vFirst}
                  onChange={(e) => setVFirst(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={lnId} className="text-xs text-text-muted">
                  {messages.vcardLastName}
                </label>
                <input
                  id={lnId}
                  type="text"
                  value={vLast}
                  onChange={(e) => setVLast(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={orgId} className="text-xs text-text-muted">
                  {messages.vcardOrg}
                </label>
                <input
                  id={orgId}
                  type="text"
                  value={vOrg}
                  onChange={(e) => setVOrg(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={titleId} className="text-xs text-text-muted">
                  {messages.vcardTitle}
                </label>
                <input
                  id={titleId}
                  type="text"
                  value={vTitle}
                  onChange={(e) => setVTitle(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={emailId} className="text-xs text-text-muted">
                  {messages.vcardEmail}
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={vEmail}
                  onChange={(e) => setVEmail(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={phoneId} className="text-xs text-text-muted">
                  {messages.vcardPhone}
                </label>
                <input
                  id={phoneId}
                  type="tel"
                  value={vPhone}
                  onChange={(e) => setVPhone(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor={cardUrlId} className="text-xs text-text-muted">
                  {messages.vcardUrl}
                </label>
                <input
                  id={cardUrlId}
                  type="url"
                  value={vUrl}
                  onChange={(e) => setVUrl(e.target.value)}
                  className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text-primary hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Visual options */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={fgId} className="text-xs text-text-muted">
                {messages.fgLabel}
              </label>
              <input
                id={fgId}
                type="color"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-md border border-border bg-surface px-1.5"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={bgId} className="text-xs text-text-muted">
                {messages.bgLabel}
              </label>
              <input
                id={bgId}
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-md border border-border bg-surface px-1.5"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={marginId} className="text-xs text-text-muted">
                {messages.marginLabel} · {margin}
              </label>
              <input
                id={marginId}
                type="range"
                min={MARGIN_MIN}
                max={MARGIN_MAX}
                step={1}
                value={margin}
                onChange={(e) =>
                  setMargin(
                    Math.max(
                      MARGIN_MIN,
                      Math.min(MARGIN_MAX, parseInt(e.target.value, 10) || MARGIN_DEFAULT),
                    ),
                  )
                }
                className="h-10 w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={sizeId} className="text-xs text-text-muted">
                {messages.sizeLabel} · {tpl(messages.pixelTemplate, { n: pixelSize })}
              </label>
              <input
                id={sizeId}
                type="range"
                min={PIXEL_MIN}
                max={PIXEL_MAX}
                step={1}
                value={pixelSize}
                onChange={(e) =>
                  setPixelSize(
                    Math.max(
                      PIXEL_MIN,
                      Math.min(PIXEL_MAX, parseInt(e.target.value, 10) || PIXEL_DEFAULT),
                    ),
                  )
                }
                className="h-10 w-full"
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <legend className="text-xs text-text-muted">{messages.ecLabel}</legend>
              <span className="text-xs text-text-faint">{messages.ecHelp}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QR_ERROR_CORRECTIONS.map((value) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
                    ec === value
                      ? 'border-accent bg-surface-hover text-text-primary'
                      : 'border-border bg-surface text-text-muted hover:border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    name={ecName}
                    value={value}
                    checked={ec === value}
                    onChange={() => setEc(value)}
                    className="sr-only"
                  />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="text-xs text-text-faint">{messages.sampleHint}</p>
        </div>

        {/* RIGHT — preview */}
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-wider text-text-muted">
            {messages.previewLabel}
          </span>
          <Card className="flex aspect-square items-center justify-center p-4">
            {error ? (
              <p role="alert" className="text-center text-sm text-danger">
                {error}
              </p>
            ) : dataUrl ? (
               
              <img
                src={dataUrl}
                alt={messages.previewLabel}
                className="block h-full w-full object-contain"
              />
            ) : (
              <p className="text-center text-sm text-text-faint">{messages.previewEmpty}</p>
            )}
          </Card>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={onDownloadPng}
              disabled={!dataUrl}
              type="button"
            >
              {messages.downloadPng}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDownloadSvg}
              disabled={!svgText}
              type="button"
            >
              {messages.downloadSvg}
            </Button>
            <CopyButton
              text={dataUrl}
              copyLabel={messages.copyDataUri}
              copiedLabel={messages.copied}
              disabled={!dataUrl}
            />
          </div>
          <details className="rounded-md border border-border bg-surface px-3 py-2 text-xs">
            <summary className="cursor-pointer select-none text-text-muted">
              {messages.payloadLabel}
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-text-primary">
              {payload || messages.payloadHint}
            </pre>
            <div className="mt-2">
              <CopyButton
                text={payload}
                copyLabel={messages.copyPayload}
                copiedLabel={messages.copied}
                disabled={!payload}
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
