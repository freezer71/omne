import { rasterizeSvg } from './svg-to-png';

export type FaviconBundleOptions = {
  appName?: string;
  themeColor?: string;
  backgroundColor?: string;
};

export type FaviconEntry = {
  filename: string;
  size: number;
  bytes: Uint8Array;
};

const ICO_SIZES = [16, 32, 48] as const;
const PNG_SIZES = [16, 32, 48, 180, 192, 512] as const;
const APPLE_SIZE = 180;
const ANDROID_SIZES = [192, 512] as const;

async function rasterAt(markup: string, size: number): Promise<Uint8Array> {
  return rasterizeSvg(markup, {
    width: size,
    height: size,
    outputMime: 'image/png',
    background: null,
  });
}

function setU16LE(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function setU32LE(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

export function buildIco(pngs: Array<{ size: number; bytes: Uint8Array }>): Uint8Array {
  const directorySize = 6 + 16 * pngs.length;
  const totalSize = directorySize + pngs.reduce((sum, p) => sum + p.bytes.length, 0);
  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const out = new Uint8Array(buf);

  // ICONDIR header
  setU16LE(view, 0, 0); // reserved
  setU16LE(view, 2, 1); // type: ICO
  setU16LE(view, 4, pngs.length);

  let dirOffset = 6;
  let imageOffset = directorySize;
  for (const { size, bytes } of pngs) {
    // ICONDIRENTRY
    out[dirOffset + 0] = size >= 256 ? 0 : size; // width
    out[dirOffset + 1] = size >= 256 ? 0 : size; // height
    out[dirOffset + 2] = 0; // colorCount
    out[dirOffset + 3] = 0; // reserved
    setU16LE(view, dirOffset + 4, 1); // planes
    setU16LE(view, dirOffset + 6, 32); // bitCount
    setU32LE(view, dirOffset + 8, bytes.length); // bytesInRes
    setU32LE(view, dirOffset + 12, imageOffset); // imageOffset

    // Image data
    out.set(bytes, imageOffset);

    dirOffset += 16;
    imageOffset += bytes.length;
  }

  return out;
}

export type FaviconBundle = {
  entries: FaviconEntry[];
  ico: Uint8Array;
  webmanifest: string;
};

export async function generateFaviconAssets(
  markup: string,
  opts: FaviconBundleOptions = {},
): Promise<FaviconBundle> {
  if (!markup.trim()) throw new Error('Empty SVG markup');

  const renders = new Map<number, Uint8Array>();
  for (const size of PNG_SIZES) {
    renders.set(size, await rasterAt(markup, size));
  }

  const entries: FaviconEntry[] = [];
  for (const size of [16, 32, 48] as const) {
    entries.push({ filename: `favicon-${size}x${size}.png`, size, bytes: renders.get(size)! });
  }
  entries.push({ filename: 'apple-touch-icon.png', size: APPLE_SIZE, bytes: renders.get(APPLE_SIZE)! });
  for (const size of ANDROID_SIZES) {
    entries.push({
      filename: `android-chrome-${size}x${size}.png`,
      size,
      bytes: renders.get(size)!,
    });
  }

  const ico = buildIco(
    ICO_SIZES.map((size) => ({ size, bytes: renders.get(size)! })),
  );

  const webmanifest = JSON.stringify(
    {
      name: opts.appName ?? 'My App',
      short_name: opts.appName ?? 'My App',
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: opts.themeColor ?? '#ffffff',
      background_color: opts.backgroundColor ?? '#ffffff',
      display: 'standalone',
    },
    null,
    2,
  );

  return { entries, ico, webmanifest };
}

export async function generateFaviconZip(
  markup: string,
  opts: FaviconBundleOptions = {},
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const bundle = await generateFaviconAssets(markup, opts);
  const zip = new JSZip();
  zip.file('favicon.ico', bundle.ico);
  for (const entry of bundle.entries) {
    zip.file(entry.filename, entry.bytes);
  }
  zip.file('site.webmanifest', bundle.webmanifest);
  return zip.generateAsync({ type: 'blob' });
}
