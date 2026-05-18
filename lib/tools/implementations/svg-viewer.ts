export type SvgInfo = {
  width: number | null;
  height: number | null;
  viewBox: string | null;
  rootAttrs: Record<string, string>;
  elementCount: number;
  bytes: number;
};

const NUMBER_REGEX = /^-?\d*\.?\d+(?:e[+-]?\d+)?(?:px|pt|pc|em|rem|%|cm|mm|in)?$/i;

function parseNumeric(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!NUMBER_REGEX.test(trimmed)) return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function countElements(node: Element): number {
  let total = 1;
  for (const child of Array.from(node.children)) {
    total += countElements(child);
  }
  return total;
}

function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function inspectSvg(markup: string): SvgInfo {
  const bytes = utf8Bytes(markup);
  const empty: SvgInfo = {
    width: null,
    height: null,
    viewBox: null,
    rootAttrs: {},
    elementCount: 0,
    bytes,
  };
  if (!markup.trim()) return empty;

  if (typeof DOMParser === 'undefined') return empty;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return { ...empty, bytes };

  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return { ...empty, bytes };

  const rootAttrs: Record<string, string> = {};
  for (const attr of Array.from(root.attributes)) {
    rootAttrs[attr.name] = attr.value;
  }

  return {
    width: parseNumeric(root.getAttribute('width')),
    height: parseNumeric(root.getAttribute('height')),
    viewBox: root.getAttribute('viewBox'),
    rootAttrs,
    elementCount: countElements(root),
    bytes,
  };
}

const TOKEN_REGEX = /(&lt;|&gt;|&amp;|&quot;|&#?\w+;|<\/?[\w:-]+|>|\s+[\w:-]+(?==)|"[^"]*"|'[^']*'|<!--[\s\S]*?-->)/g;

export type Token = { type: 'tag' | 'attr' | 'string' | 'comment' | 'text'; value: string };

export function tokenizeSvg(markup: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of markup.matchAll(TOKEN_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      tokens.push({ type: 'text', value: markup.slice(lastIndex, start) });
    }
    const raw = match[0];
    if (raw.startsWith('<!--')) {
      tokens.push({ type: 'comment', value: raw });
    } else if (raw.startsWith('<') || raw === '>') {
      tokens.push({ type: 'tag', value: raw });
    } else if (raw.startsWith('"') || raw.startsWith("'")) {
      tokens.push({ type: 'string', value: raw });
    } else if (/^\s/.test(raw)) {
      tokens.push({ type: 'attr', value: raw });
    } else {
      tokens.push({ type: 'text', value: raw });
    }
    lastIndex = start + raw.length;
  }
  if (lastIndex < markup.length) {
    tokens.push({ type: 'text', value: markup.slice(lastIndex) });
  }
  return tokens;
}
