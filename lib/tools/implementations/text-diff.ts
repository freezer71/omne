export type DiffOpKind = 'eq' | 'add' | 'del';

export type DiffLine = {
  kind: DiffOpKind;
  text: string;
  aLine?: number;
  bLine?: number;
};

export type DiffMode = 'line' | 'word' | 'char';

export type DiffStats = {
  additions: number;
  deletions: number;
  unchanged: number;
};

function tokenize(input: string, mode: DiffMode): string[] {
  if (mode === 'line') return input.split(/\r?\n/);
  if (mode === 'word') return input.split(/(\s+)/).filter((t) => t.length > 0);
  return Array.from(input);
}

function lcsTable(a: string[], b: string[]): Uint32Array {
  const m = a.length;
  const n = b.length;
  const dp = new Uint32Array((m + 1) * (n + 1));
  const w = n + 1;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i * w + j] = (dp[(i - 1) * w + (j - 1)] as number) + 1;
      } else {
        const up = dp[(i - 1) * w + j] as number;
        const left = dp[i * w + (j - 1)] as number;
        dp[i * w + j] = up >= left ? up : left;
      }
    }
  }
  return dp;
}

export function diffTokens(a: string[], b: string[]): Array<{ kind: DiffOpKind; value: string; aIndex?: number; bIndex?: number }> {
  const m = a.length;
  const n = b.length;
  const dp = lcsTable(a, b);
  const w = n + 1;
  const ops: Array<{ kind: DiffOpKind; value: string; aIndex?: number; bIndex?: number }> = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      ops.push({ kind: 'eq', value: a[i - 1] as string, aIndex: i - 1, bIndex: j - 1 });
      i--; j--;
    } else if ((dp[(i - 1) * w + j] as number) >= (dp[i * w + (j - 1)] as number)) {
      ops.push({ kind: 'del', value: a[i - 1] as string, aIndex: i - 1 });
      i--;
    } else {
      ops.push({ kind: 'add', value: b[j - 1] as string, bIndex: j - 1 });
      j--;
    }
  }
  while (i > 0) {
    ops.push({ kind: 'del', value: a[i - 1] as string, aIndex: i - 1 });
    i--;
  }
  while (j > 0) {
    ops.push({ kind: 'add', value: b[j - 1] as string, bIndex: j - 1 });
    j--;
  }
  ops.reverse();
  return ops;
}

export function diffText(a: string, b: string, mode: DiffMode = 'line'): DiffLine[] {
  const tokensA = tokenize(a, mode);
  const tokensB = tokenize(b, mode);
  const ops = diffTokens(tokensA, tokensB);
  if (mode !== 'line') {
    return ops.map((op) => ({ kind: op.kind, text: op.value }));
  }
  let aLine = 1;
  let bLine = 1;
  return ops.map((op) => {
    if (op.kind === 'eq') {
      const line: DiffLine = { kind: op.kind, text: op.value, aLine, bLine };
      aLine++; bLine++;
      return line;
    }
    if (op.kind === 'del') {
      const line: DiffLine = { kind: op.kind, text: op.value, aLine };
      aLine++;
      return line;
    }
    const line: DiffLine = { kind: op.kind, text: op.value, bLine };
    bLine++;
    return line;
  });
}

export function diffStats(diff: DiffLine[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;
  for (const op of diff) {
    if (op.kind === 'add') additions++;
    else if (op.kind === 'del') deletions++;
    else unchanged++;
  }
  return { additions, deletions, unchanged };
}
