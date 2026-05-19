export type EscapeKind = 'html' | 'js' | 'json' | 'xml';
export type EscapeMode = 'escape' | 'unescape';

const HTML_ESCAPE: Array<[RegExp, string]> = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
  [/"/g, '&quot;'],
  [/'/g, '&#39;'],
];

const HTML_UNESCAPE_MAP: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', hellip: '…',
  laquo: '«', raquo: '»', mdash: '—', ndash: '–',
};

const XML_ESCAPE: Array<[RegExp, string]> = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
  [/"/g, '&quot;'],
  [/'/g, '&apos;'],
];

const XML_UNESCAPE_MAP: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

function escapeHtml(input: string): string {
  let out = input;
  for (const [re, rep] of HTML_ESCAPE) out = out.replace(re, rep);
  return out;
}

function unescapeWithMap(input: string, map: Record<string, string>): string {
  return input.replace(/&(#x?)?([a-zA-Z0-9]+);/g, (full, hashKind: string | undefined, body: string) => {
    if (hashKind === '#') {
      const n = parseInt(body, 10);
      if (Number.isFinite(n)) return String.fromCodePoint(n);
      return full;
    }
    if (hashKind === '#x') {
      const n = parseInt(body, 16);
      if (Number.isFinite(n)) return String.fromCodePoint(n);
      return full;
    }
    return map[body] ?? full;
  });
}

function escapeXml(input: string): string {
  let out = input;
  for (const [re, rep] of XML_ESCAPE) out = out.replace(re, rep);
  return out;
}

const JS_CTRL_RANGE = new RegExp('[\\u0000-\\u001f]', 'g');

function escapeJs(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/`/g, '\\`')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\v/g, '\\v')
    .replace(/\0/g, '\\0')
    .replace(JS_CTRL_RANGE, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function unescapeJs(input: string): string {
  return input.replace(/\\([\\"'`nrtfv0])|\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g, (_full, simple, ub, u4, x2) => {
    if (simple) {
      const map: Record<string, string> = { '\\': '\\', '"': '"', "'": "'", '`': '`', n: '\n', r: '\r', t: '\t', f: '\f', v: '\v', '0': '\0' };
      return map[simple] ?? simple;
    }
    if (ub) return String.fromCodePoint(parseInt(ub, 16));
    if (u4) return String.fromCodePoint(parseInt(u4, 16));
    if (x2) return String.fromCodePoint(parseInt(x2, 16));
    return '';
  });
}

function escapeJson(input: string): string {
  return JSON.stringify(input).slice(1, -1);
}

function unescapeJson(input: string): string {
  try {
    return JSON.parse(`"${input}"`) as string;
  } catch {
    return input;
  }
}

export function escapeText(input: string, kind: EscapeKind, mode: EscapeMode): string {
  if (!input) return '';
  if (mode === 'escape') {
    switch (kind) {
      case 'html': return escapeHtml(input);
      case 'xml': return escapeXml(input);
      case 'js': return escapeJs(input);
      case 'json': return escapeJson(input);
    }
  }
  switch (kind) {
    case 'html': return unescapeWithMap(input, HTML_UNESCAPE_MAP);
    case 'xml': return unescapeWithMap(input, XML_UNESCAPE_MAP);
    case 'js': return unescapeJs(input);
    case 'json': return unescapeJson(input);
  }
}
