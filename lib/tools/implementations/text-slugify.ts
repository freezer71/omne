export type SlugifyOptions = {
  separator?: string;
  lowercase?: boolean;
  removeDiacritics?: boolean;
  collapse?: boolean;
};

const DEFAULTS: Required<SlugifyOptions> = {
  separator: '-',
  lowercase: true,
  removeDiacritics: true,
  collapse: true,
};

const SPECIAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/ß/g, 'ss'],
  [/æ/g, 'ae'],
  [/œ/g, 'oe'],
  [/Æ/g, 'AE'],
  [/Œ/g, 'OE'],
  [/ø/g, 'o'],
  [/Ø/g, 'O'],
  [/þ/g, 'th'],
  [/Þ/g, 'TH'],
  [/đ/g, 'd'],
  [/Đ/g, 'D'],
];

export function slugify(input: string, options: SlugifyOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  let value = input;

  for (const [re, rep] of SPECIAL_REPLACEMENTS) {
    value = value.replace(re, rep);
  }

  if (opts.removeDiacritics) {
    value = value.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  if (opts.lowercase) {
    value = value.toLowerCase();
  }

  const safeSep = opts.separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  value = value
    .replace(/[^a-zA-Z0-9]+/g, opts.separator)
    .replace(new RegExp(`^${safeSep}+|${safeSep}+$`, 'g'), '');

  if (opts.collapse && opts.separator) {
    value = value.replace(new RegExp(`(?:${safeSep})+`, 'g'), opts.separator);
  }

  return value;
}
