export type OptimizeOptions = {
  precision?: number;
  cleanupIds?: boolean;
  removeViewBox?: boolean;
  multipass?: boolean;
};

export type OptimizeResult = {
  data: string;
  before: number;
  after: number;
  savings: number;
};

function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

type SvgoMod = typeof import('svgo/browser');

let cached: Promise<SvgoMod> | null = null;
function loadSvgo(): Promise<SvgoMod> {
  if (!cached) cached = import('svgo/browser');
  return cached;
}

export async function optimizeSvg(
  markup: string,
  opts: OptimizeOptions = {},
): Promise<OptimizeResult> {
  const trimmed = markup.trim();
  const before = utf8Bytes(markup);
  if (!trimmed) {
    return { data: '', before, after: 0, savings: 0 };
  }

  const { optimize } = await loadSvgo();
  const result = optimize(trimmed, {
    multipass: opts.multipass ?? false,
    floatPrecision: opts.precision ?? 3,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupIds: opts.cleanupIds ?? true ? {} : false,
            removeViewBox: opts.removeViewBox ?? false ? {} : false,
          },
        },
      },
    ],
  });

  const data = result.data ?? trimmed;
  const after = utf8Bytes(data);
  const savings = before > 0 ? 1 - after / before : 0;
  return { data, before, after, savings };
}
