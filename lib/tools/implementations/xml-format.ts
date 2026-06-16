import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { safeParse } from '@/lib/json/parse';

export type XmlIndent = '2' | '4' | 'tab';
export type XmlMode = 'pretty' | 'minify' | 'to-json' | 'from-json';

export type XmlError = { line: number; col: number; message: string };

export type XmlValidity = { ok: true } | ({ ok: false } & XmlError);

export type XmlResult = { ok: true; output: string } | { ok: false; error: XmlError };

const INDENT_TEXT: Record<XmlIndent, string> = {
  '2': '  ',
  '4': '    ',
  tab: '\t',
};

const INDENT_JSON: Record<XmlIndent, number | string> = {
  '2': 2,
  '4': 4,
  tab: '\t',
};

// Attributes are kept (prefixed `@_`) across every mode so a round-trip never
// silently drops them — the whole point of an XML formatter.
const ATTRS = { ignoreAttributes: false, attributeNamePrefix: '@_' } as const;

/** Validate well-formedness, surfacing the parser's line/column on failure. */
export function validateXml(input: string): XmlValidity {
  const result = XMLValidator.validate(input, { allowBooleanAttributes: true });
  if (result === true) return { ok: true };
  const { line, col, msg } = result.err;
  return { ok: false, line, col, message: msg };
}

// preserveOrder keeps element order, comments, CDATA and the declaration intact,
// so beautify/minify only change whitespace — never structure.
function structuralParser(): XMLParser {
  return new XMLParser({
    ...ATTRS,
    preserveOrder: true,
    commentPropName: '#comment',
    cdataPropName: '#cdata',
    ignoreDeclaration: false,
    ignorePiTags: false,
    parseTagValue: false,
    trimValues: true,
  });
}

function reindent(input: string, indent: XmlIndent, pretty: boolean): XmlResult {
  const validity = validateXml(input);
  if (!validity.ok) {
    return { ok: false, error: { line: validity.line, col: validity.col, message: validity.message } };
  }
  const tree = structuralParser().parse(input);
  const builder = new XMLBuilder({
    ...ATTRS,
    preserveOrder: true,
    commentPropName: '#comment',
    cdataPropName: '#cdata',
    format: pretty,
    indentBy: pretty ? INDENT_TEXT[indent] : '',
    suppressEmptyNode: false,
  });
  return { ok: true, output: String(builder.build(tree)).trim() };
}

function xmlToJson(input: string, indent: XmlIndent): XmlResult {
  const validity = validateXml(input);
  if (!validity.ok) {
    return { ok: false, error: { line: validity.line, col: validity.col, message: validity.message } };
  }
  // Coerce element text (<n>42</n> → 42) but keep attribute values as strings —
  // XML is untyped, and coercing would mangle ids/versions like x="007", v="1.0".
  const parser = new XMLParser({
    ...ATTRS,
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true,
  });
  return { ok: true, output: JSON.stringify(parser.parse(input), null, INDENT_JSON[indent]) };
}

function jsonToXml(input: string, indent: XmlIndent): XmlResult {
  const parsed = safeParse(input);
  if (!parsed.ok) {
    return { ok: false, error: { line: parsed.line, col: parsed.col, message: parsed.message } };
  }
  const builder = new XMLBuilder({
    ...ATTRS,
    format: true,
    indentBy: INDENT_TEXT[indent],
    suppressEmptyNode: false,
  });
  return { ok: true, output: String(builder.build(parsed.value)).trim() };
}

/** Beautify, minify, or convert XML↔JSON depending on `mode`. */
export function formatXml(input: string, opts: { mode: XmlMode; indent: XmlIndent }): XmlResult {
  if (!input.trim()) return { ok: true, output: '' };
  switch (opts.mode) {
    case 'pretty':
      return reindent(input, opts.indent, true);
    case 'minify':
      return reindent(input, opts.indent, false);
    case 'to-json':
      return xmlToJson(input, opts.indent);
    case 'from-json':
      return jsonToXml(input, opts.indent);
  }
}
