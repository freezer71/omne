export type EntityMode = 'named' | 'numeric' | 'hex';

const NAMED_ENTITIES: Record<string, string> = {
  '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos',
  ' ': 'nbsp', '©': 'copy', '®': 'reg', '™': 'trade',
  '«': 'laquo', '»': 'raquo', '€': 'euro', '£': 'pound', '¥': 'yen',
  '§': 'sect', '¶': 'para', '°': 'deg', '±': 'plusmn',
  '×': 'times', '÷': 'divide', '…': 'hellip', '—': 'mdash', '–': 'ndash',
  '‘': 'lsquo', '’': 'rsquo', '“': 'ldquo', '”': 'rdquo',
  '‹': 'lsaquo', '›': 'rsaquo', '‚': 'sbquo', '„': 'bdquo',
  '¡': 'iexcl', '¿': 'iquest', '¢': 'cent',
  'à': 'agrave', 'â': 'acirc', 'ä': 'auml',
  'é': 'eacute', 'è': 'egrave', 'ê': 'ecirc', 'ë': 'euml',
  'ç': 'ccedil', 'î': 'icirc', 'ï': 'iuml',
  'ô': 'ocirc', 'ö': 'ouml', 'ù': 'ugrave', 'û': 'ucirc', 'ü': 'uuml',
  'ñ': 'ntilde', 'À': 'Agrave', 'É': 'Eacute', 'È': 'Egrave',
  'Ê': 'Ecirc', 'Ç': 'Ccedil', 'Ô': 'Ocirc', 'Ù': 'Ugrave',
};

const REVERSE_NAMED: Record<string, string> = Object.fromEntries(
  Object.entries(NAMED_ENTITIES).map(([k, v]) => [v, k]),
);

export function encodeEntities(input: string, mode: EntityMode = 'named'): string {
  if (!input) return '';
  return [...input].map((char) => {
    const code = char.codePointAt(0)!;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      return mode === 'hex' ? `&#x${code.toString(16)};` : `&#${code};`;
    }
    if (code < 0x80 && char !== '&' && char !== '<' && char !== '>' && char !== '"' && char !== "'") {
      return char;
    }
    if (mode === 'named' && NAMED_ENTITIES[char]) {
      return `&${NAMED_ENTITIES[char]};`;
    }
    if (mode === 'hex') return `&#x${code.toString(16)};`;
    return `&#${code};`;
  }).join('');
}

export function decodeEntities(input: string): string {
  if (!input) return '';
  return input.replace(/&(#x?)?([0-9a-zA-Z]+);/g, (full, hashKind: string | undefined, body: string) => {
    if (hashKind === '#') {
      const n = parseInt(body, 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : full;
    }
    if (hashKind === '#x') {
      const n = parseInt(body, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : full;
    }
    return REVERSE_NAMED[body] ?? full;
  });
}
