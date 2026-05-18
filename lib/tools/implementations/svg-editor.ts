export type ColorEntry = { color: string; count: number };

export type ParseResult = {
  doc: Document | null;
  root: SVGSVGElement | null;
  error: string | null;
};

export type RootAttrs = {
  width?: string;
  height?: string;
  viewBox?: string;
  preserveAspectRatio?: string;
};

export type RootTransform = {
  rotate?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
};

const COLOR_ATTRS = ['fill', 'stroke'] as const;
const TRANSFORM_MARKER = 'data-omne-transform';

const SHORT_HEX_REGEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/;
const FULL_HEX_REGEX = /^#[0-9a-f]{6}$/;
const FULL_HEX_ALPHA_REGEX = /^#[0-9a-f]{8}$/;
const RGB_REGEX = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/;
const TRANSLATE_REGEX = /translate\(\s*(-?\d*\.?\d+)\s*[ ,]\s*(-?\d*\.?\d+)\s*\)/;
const ROTATE_REGEX = /rotate\(\s*(-?\d*\.?\d+)\s*\)/;
const SCALE_REGEX = /scale\(\s*(-?\d*\.?\d+)\s*\)/;

export function parseSvgDoc(markup: string): ParseResult {
  if (typeof DOMParser === 'undefined') {
    return { doc: null, root: null, error: 'DOMParser unavailable' };
  }
  if (!markup.trim()) return { doc: null, root: null, error: 'Empty markup' };
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return { doc: null, root: null, error: parserError.textContent ?? 'Parse error' };
  }
  const root = doc.documentElement as unknown as SVGSVGElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') {
    return { doc: null, root: null, error: 'Root element is not <svg>' };
  }
  return { doc, root, error: null };
}

function serialize(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}

function normalizeHex(color: string): string | null {
  const c = color.trim().toLowerCase();
  if (c === 'none' || c === 'currentcolor' || c === 'transparent' || c === 'inherit') return null;
  const shortHex = c.match(SHORT_HEX_REGEX);
  if (shortHex && shortHex[1] && shortHex[2] && shortHex[3]) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  }
  if (FULL_HEX_REGEX.test(c)) return c;
  if (FULL_HEX_ALPHA_REGEX.test(c)) return c.slice(0, 7);
  const rgb = c.match(RGB_REGEX);
  if (rgb && rgb[1] !== undefined && rgb[2] !== undefined && rgb[3] !== undefined) {
    const r = Math.min(255, parseInt(rgb[1], 10)).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgb[2], 10)).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgb[3], 10)).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return null;
}

function readStyleColors(style: string): Array<{ prop: 'fill' | 'stroke'; value: string }> {
  const out: Array<{ prop: 'fill' | 'stroke'; value: string }> = [];
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const name = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (name === 'fill' || name === 'stroke') out.push({ prop: name, value });
  }
  return out;
}

function rewriteStyle(style: string, from: string, to: string): string {
  return style
    .split(';')
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx < 0) return decl;
      const name = decl.slice(0, idx).trim().toLowerCase();
      if (name !== 'fill' && name !== 'stroke') return decl;
      const value = decl.slice(idx + 1).trim();
      const normalized = normalizeHex(value);
      if (normalized === from.toLowerCase() || value.toLowerCase() === from.toLowerCase()) {
        return `${decl.slice(0, idx + 1)} ${to}`;
      }
      return decl;
    })
    .join(';');
}

export function extractFills(doc: Document): ColorEntry[] {
  const counts = new Map<string, number>();

  const visit = (el: Element) => {
    for (const attr of COLOR_ATTRS) {
      const value = el.getAttribute(attr);
      if (value) {
        const norm = normalizeHex(value) ?? value.trim().toLowerCase();
        if (norm && norm !== 'none') {
          counts.set(norm, (counts.get(norm) ?? 0) + 1);
        }
      }
    }
    const style = el.getAttribute('style');
    if (style) {
      for (const { value } of readStyleColors(style)) {
        const norm = normalizeHex(value) ?? value.trim().toLowerCase();
        if (norm && norm !== 'none') {
          counts.set(norm, (counts.get(norm) ?? 0) + 1);
        }
      }
    }
    for (const child of Array.from(el.children)) visit(child);
  };

  if (doc.documentElement) visit(doc.documentElement);

  return Array.from(counts.entries())
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);
}

export function replaceColor(markup: string, from: string, to: string): string {
  const { doc, root, error } = parseSvgDoc(markup);
  if (error || !doc || !root) return markup;
  const fromNorm = (normalizeHex(from) ?? from).toLowerCase();

  const visit = (el: Element) => {
    for (const attr of COLOR_ATTRS) {
      const value = el.getAttribute(attr);
      if (value) {
        const norm = normalizeHex(value) ?? value.toLowerCase();
        if (norm === fromNorm) el.setAttribute(attr, to);
      }
    }
    const style = el.getAttribute('style');
    if (style) {
      const next = rewriteStyle(style, fromNorm, to);
      if (next !== style) el.setAttribute('style', next);
    }
    for (const child of Array.from(el.children)) visit(child);
  };
  visit(root);
  return serialize(doc);
}

export function applyRootAttrs(markup: string, attrs: RootAttrs): string {
  const { doc, root, error } = parseSvgDoc(markup);
  if (error || !doc || !root) return markup;
  if (attrs.width !== undefined) {
    if (attrs.width === '') root.removeAttribute('width');
    else root.setAttribute('width', attrs.width);
  }
  if (attrs.height !== undefined) {
    if (attrs.height === '') root.removeAttribute('height');
    else root.setAttribute('height', attrs.height);
  }
  if (attrs.viewBox !== undefined) {
    if (attrs.viewBox === '') root.removeAttribute('viewBox');
    else root.setAttribute('viewBox', attrs.viewBox);
  }
  if (attrs.preserveAspectRatio !== undefined) {
    if (attrs.preserveAspectRatio === '') root.removeAttribute('preserveAspectRatio');
    else root.setAttribute('preserveAspectRatio', attrs.preserveAspectRatio);
  }
  return serialize(doc);
}

function readViewBoxCenter(root: Element): { cx: number; cy: number } {
  const viewBox = root.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/);
    if (parts.length === 4) {
      const x = parseFloat(parts[0] ?? '');
      const y = parseFloat(parts[1] ?? '');
      const w = parseFloat(parts[2] ?? '');
      const h = parseFloat(parts[3] ?? '');
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return { cx: x + w / 2, cy: y + h / 2 };
      }
    }
  }
  const widthAttr = parseFloat((root.getAttribute('width') ?? '').replace(/[^\d.\-]/g, ''));
  const heightAttr = parseFloat((root.getAttribute('height') ?? '').replace(/[^\d.\-]/g, ''));
  if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr) && widthAttr > 0 && heightAttr > 0) {
    return { cx: widthAttr / 2, cy: heightAttr / 2 };
  }
  return { cx: 0, cy: 0 };
}

function buildTransformString(t: RootTransform, center: { cx: number; cy: number }): string {
  const tx = t.translateX ?? 0;
  const ty = t.translateY ?? 0;
  const rot = t.rotate ?? 0;
  const sc = t.scale ?? 1;
  const hasTranslate = tx !== 0 || ty !== 0;
  const hasRotate = rot !== 0;
  const hasScale = sc !== 1;
  if (!hasTranslate && !hasRotate && !hasScale) return '';

  const parts: string[] = [];
  // Always emit the user translation first so readRootTransform's first
  // translate() match is the user-facing value, not the centering helper.
  parts.push(`translate(${tx} ${ty})`);
  if (hasRotate || hasScale) {
    const { cx, cy } = center;
    parts.push(`translate(${cx} ${cy})`);
    if (hasRotate) parts.push(`rotate(${rot})`);
    if (hasScale) parts.push(`scale(${sc})`);
    parts.push(`translate(${-cx} ${-cy})`);
  }
  return parts.join(' ');
}

export function applyRootTransform(markup: string, transform: RootTransform): string {
  const { doc, root, error } = parseSvgDoc(markup);
  if (error || !doc || !root) return markup;
  const center = readViewBoxCenter(root);
  const transformStr = buildTransformString(transform, center);

  const ns = root.namespaceURI ?? 'http://www.w3.org/2000/svg';
  let wrapper: Element | null = null;
  for (const child of Array.from(root.children)) {
    if (child.getAttribute(TRANSFORM_MARKER) !== null) {
      wrapper = child;
      break;
    }
  }

  if (!transformStr) {
    if (wrapper) {
      const parent = wrapper.parentNode;
      if (parent) {
        while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
        parent.removeChild(wrapper);
      }
    }
    return serialize(doc);
  }

  if (wrapper) {
    wrapper.setAttribute('transform', transformStr);
    return serialize(doc);
  }

  const g = doc.createElementNS(ns, 'g');
  g.setAttribute('transform', transformStr);
  g.setAttribute(TRANSFORM_MARKER, '');
  const movable: ChildNode[] = [];
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 1 || node.nodeType === 3) {
      movable.push(node);
    }
  }
  for (const node of movable) g.appendChild(node);
  root.appendChild(g);
  return serialize(doc);
}

export function readRootAttrs(markup: string): RootAttrs {
  const { root, error } = parseSvgDoc(markup);
  if (error || !root) return {};
  return {
    width: root.getAttribute('width') ?? '',
    height: root.getAttribute('height') ?? '',
    viewBox: root.getAttribute('viewBox') ?? '',
    preserveAspectRatio: root.getAttribute('preserveAspectRatio') ?? '',
  };
}

const SCRIPTABLE_TAGS = new Set(['script', 'foreignobject']);

export function sanitizeForRender(markup: string): string {
  const { doc, root, error } = parseSvgDoc(markup);
  if (error || !doc || !root) return '';

  const removeScriptable = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (SCRIPTABLE_TAGS.has(child.nodeName.toLowerCase())) {
        child.remove();
      } else {
        removeScriptable(child);
      }
    }
  };
  removeScriptable(root);

  const scrubAttrs = (el: Element) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (name === 'href' || name === 'xlink:href') {
        if (/^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
      }
    }
    for (const child of Array.from(el.children)) scrubAttrs(child);
  };
  scrubAttrs(root);

  return new XMLSerializer().serializeToString(doc);
}

export function readRootTransform(markup: string): RootTransform {
  const { root, error } = parseSvgDoc(markup);
  if (error || !root) return {};
  let wrapper: Element | null = null;
  for (const child of Array.from(root.children)) {
    if (child.getAttribute(TRANSFORM_MARKER) !== null) {
      wrapper = child;
      break;
    }
  }
  if (!wrapper) return {};
  const t = wrapper.getAttribute('transform') ?? '';
  const translate = t.match(TRANSLATE_REGEX);
  const rotate = t.match(ROTATE_REGEX);
  const scale = t.match(SCALE_REGEX);
  return {
    translateX: translate?.[1] ? parseFloat(translate[1]) : 0,
    translateY: translate?.[2] ? parseFloat(translate[2]) : 0,
    rotate: rotate?.[1] ? parseFloat(rotate[1]) : 0,
    scale: scale?.[1] ? parseFloat(scale[1]) : 1,
  };
}
