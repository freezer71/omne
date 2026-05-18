export type CaseMode =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot';

export const CASE_MODES: readonly CaseMode[] = [
  'upper',
  'lower',
  'title',
  'sentence',
  'camel',
  'pascal',
  'snake',
  'kebab',
  'constant',
  'dot',
] as const;

const WORD_BOUNDARY = /[\s_\-./\\]+/;

/**
 * Split an arbitrary string into "words". Handles:
 *  - separators (space, underscore, hyphen, dot, slash)
 *  - camelCase / PascalCase boundaries (lower->upper, ABC->Abc)
 *  - digit runs
 * Returns lowercased tokens.
 */
export function splitWords(input: string): string[] {
  if (!input) return [];
  // Insert a space at common boundaries inside compound camel/Pascal tokens.
  const spaced = input
    // foo|Bar -> foo Bar
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    // FOOBar -> FOO Bar
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // letters|digits boundary
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2');
  return spaced
    .split(WORD_BOUNDARY)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function titleWord(w: string): string {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export function convertCase(input: string, mode: CaseMode): string {
  if (!input) return '';

  switch (mode) {
    case 'upper':
      return input.toUpperCase();
    case 'lower':
      return input.toLowerCase();
    case 'title': {
      // Preserve original whitespace; only change letter casing per word.
      return input.replace(/\b([\p{L}\p{N}']+)\b/gu, (m) =>
        m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
      );
    }
    case 'sentence': {
      const lower = input.toLowerCase();
      // Capitalize first letter after start or sentence-ending punctuation.
      return lower.replace(
        /(^\s*|[.!?]\s+)([\p{L}])/gu,
        (_, prefix: string, letter: string) => prefix + letter.toUpperCase(),
      );
    }
    case 'camel': {
      const words = splitWords(input);
      if (words.length === 0) return '';
      return words[0] + words.slice(1).map(titleWord).join('');
    }
    case 'pascal':
      return splitWords(input).map(titleWord).join('');
    case 'snake':
      return splitWords(input).join('_');
    case 'kebab':
      return splitWords(input).join('-');
    case 'constant':
      return splitWords(input).map((w) => w.toUpperCase()).join('_');
    case 'dot':
      return splitWords(input).join('.');
    default: {
      const _exhaustive: never = mode;
      void _exhaustive;
      return input;
    }
  }
}
