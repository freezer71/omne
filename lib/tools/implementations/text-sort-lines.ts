export type SortOrder = 'asc' | 'desc';

export type SortMode =
  | 'alphabetical'
  | 'natural'
  | 'numeric'
  | 'length'
  | 'reverse'
  | 'shuffle';

export type SortOptions = {
  mode: SortMode;
  order: SortOrder;
  caseSensitive: boolean;
  trim: boolean;
  removeEmpty: boolean;
  removeDuplicates: boolean;
};

export const DEFAULT_SORT_OPTIONS: SortOptions = {
  mode: 'alphabetical',
  order: 'asc',
  caseSensitive: false,
  trim: false,
  removeEmpty: false,
  removeDuplicates: false,
};

function naturalCompare(a: string, b: string, caseSensitive: boolean): number {
  return (caseSensitive ? a : a.toLowerCase()).localeCompare(
    caseSensitive ? b : b.toLowerCase(),
    undefined,
    { numeric: true, sensitivity: caseSensitive ? 'case' : 'base' },
  );
}

function alphabeticalCompare(a: string, b: string, caseSensitive: boolean): number {
  const aa = caseSensitive ? a : a.toLowerCase();
  const bb = caseSensitive ? b : b.toLowerCase();
  if (aa < bb) return -1;
  if (aa > bb) return 1;
  return 0;
}

function numericCompare(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  const aIsNaN = Number.isNaN(na);
  const bIsNaN = Number.isNaN(nb);
  if (aIsNaN && bIsNaN) return 0;
  if (aIsNaN) return 1;
  if (bIsNaN) return -1;
  return na - nb;
}

export function sortLines(input: string, options: SortOptions): string {
  const opts = { ...DEFAULT_SORT_OPTIONS, ...options };
  let lines = input.split(/\r?\n/);

  if (opts.trim) lines = lines.map((l) => l.trim());
  if (opts.removeEmpty) lines = lines.filter((l) => l.length > 0);

  switch (opts.mode) {
    case 'alphabetical':
      lines.sort((a, b) => alphabeticalCompare(a, b, opts.caseSensitive));
      break;
    case 'natural':
      lines.sort((a, b) => naturalCompare(a, b, opts.caseSensitive));
      break;
    case 'numeric':
      lines.sort(numericCompare);
      break;
    case 'length':
      lines.sort((a, b) => a.length - b.length);
      break;
    case 'reverse':
      lines.reverse();
      break;
    case 'shuffle': {
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = lines[i] ?? '';
        lines[i] = lines[j] ?? '';
        lines[j] = tmp;
      }
      break;
    }
  }

  if (opts.order === 'desc' && opts.mode !== 'reverse' && opts.mode !== 'shuffle') {
    lines.reverse();
  }

  if (opts.removeDuplicates) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      const key = opts.caseSensitive ? l : l.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return lines.join('\n');
}
