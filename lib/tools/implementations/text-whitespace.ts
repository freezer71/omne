export type WhitespaceOptions = {
  trimLines: boolean;
  collapseSpaces: boolean;
  removeBlankLines: boolean;
  trimDocument: boolean;
  normalizeLineEndings: 'unix' | 'windows' | 'mac' | 'keep';
  tabsToSpaces: number;
  removeTrailingSpaces: boolean;
};

export const DEFAULT_WHITESPACE_OPTIONS: WhitespaceOptions = {
  trimLines: false,
  collapseSpaces: false,
  removeBlankLines: false,
  trimDocument: false,
  normalizeLineEndings: 'unix',
  tabsToSpaces: 0,
  removeTrailingSpaces: true,
};

export function cleanWhitespace(input: string, options: WhitespaceOptions): string {
  if (!input) return '';
  let value = input;

  if (options.tabsToSpaces > 0) {
    value = value.replace(/\t/g, ' '.repeat(options.tabsToSpaces));
  }

  value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let lines = value.split('\n');

  if (options.trimLines) lines = lines.map((l) => l.trim());
  else if (options.removeTrailingSpaces) lines = lines.map((l) => l.replace(/[ \t]+$/, ''));

  if (options.collapseSpaces) lines = lines.map((l) => l.replace(/[ \t]{2,}/g, ' '));
  if (options.removeBlankLines) lines = lines.filter((l) => l.length > 0);

  value = lines.join('\n');

  if (options.trimDocument) value = value.replace(/^\n+|\n+$/g, '');

  if (options.normalizeLineEndings === 'windows') value = value.replace(/\n/g, '\r\n');
  else if (options.normalizeLineEndings === 'mac') value = value.replace(/\n/g, '\r');

  return value;
}
