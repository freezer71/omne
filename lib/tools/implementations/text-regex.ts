export type RegexFlags = {
  global: boolean;
  caseInsensitive: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
  sticky: boolean;
};

export type RegexMatch = {
  index: number;
  length: number;
  match: string;
  groups: string[];
  named: Record<string, string>;
};

export type RegexResult =
  | { ok: true; matches: RegexMatch[] }
  | { ok: false; error: string };

export function flagsToString(f: RegexFlags): string {
  let out = '';
  if (f.global) out += 'g';
  if (f.caseInsensitive) out += 'i';
  if (f.multiline) out += 'm';
  if (f.dotAll) out += 's';
  if (f.unicode) out += 'u';
  if (f.sticky) out += 'y';
  return out;
}

export function buildRegex(pattern: string, flags: RegexFlags): RegExp | Error {
  try {
    const fstr = flagsToString({ ...flags, global: true });
    return new RegExp(pattern, fstr);
  } catch (e) {
    return e as Error;
  }
}

export function findMatches(input: string, pattern: string, flags: RegexFlags): RegexResult {
  if (!pattern) return { ok: true, matches: [] };
  const re = buildRegex(pattern, flags);
  if (re instanceof Error) return { ok: false, error: re.message };

  const matches: RegexMatch[] = [];
  let safety = 0;
  for (const m of input.matchAll(re)) {
    safety++;
    if (safety > 100000) break;
    const groups = m.slice(1).map((g) => (g === undefined ? '' : g));
    const named: Record<string, string> = {};
    if (m.groups) {
      for (const [k, v] of Object.entries(m.groups)) {
        named[k] = v ?? '';
      }
    }
    matches.push({
      index: m.index ?? 0,
      length: m[0].length,
      match: m[0],
      groups,
      named,
    });
  }
  return { ok: true, matches };
}

export function replaceAll(input: string, pattern: string, replacement: string, flags: RegexFlags): string {
  const re = buildRegex(pattern, flags);
  if (re instanceof Error) return input;
  return input.replace(re, replacement);
}
