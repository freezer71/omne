export type SvgDataUrlResult = {
  base64: string;
  urlEncoded: string;
  base64Bytes: number;
  urlEncodedBytes: number;
};

function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

function toBase64Utf8(s: string): string {
  // Convert UTF-8 string to base64 via the binary-string bridge.
  return btoa(unescape(encodeURIComponent(s)));
}

function toUrlEncodedSvg(markup: string): string {
  return markup
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/\{/g, '%7B')
    .replace(/\}/g, '%7D')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ')
    .trim();
}

export function svgToDataUrl(markup: string): SvgDataUrlResult {
  const trimmed = markup.trim();
  if (!trimmed) {
    return { base64: '', urlEncoded: '', base64Bytes: 0, urlEncodedBytes: 0 };
  }
  const base64 = `data:image/svg+xml;base64,${toBase64Utf8(trimmed)}`;
  const urlEncoded = `data:image/svg+xml;utf8,${toUrlEncodedSvg(trimmed)}`;
  return {
    base64,
    urlEncoded,
    base64Bytes: utf8Bytes(base64),
    urlEncodedBytes: utf8Bytes(urlEncoded),
  };
}
