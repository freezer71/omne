export function stripExtension(name: string): string {
  if (!name) return '';
  if (name.startsWith('.') && name.indexOf('.', 1) === -1) return name;
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? name : name.slice(0, dot);
}

export function outputName(
  action: string,
  fileNames: string[],
  extension: string,
  infix?: string,
): string {
  const first = fileNames[0];
  if (first === undefined) return `${action}.${extension}`;
  const base = stripExtension(first);
  const middle = infix ? `${base}-${infix}` : base;
  return `${action}-${middle}.${extension}`;
}

// Files larger than this should warn users that in-browser ffmpeg.wasm processing
// may fail (OOM) or be very slow. The 150 MB threshold is empirical: 200 MB
// inputs reliably OOM during VP9 encoding on the multi-thread ffmpeg-core build.
export const LARGE_FILE_BYTES = 150 * 1024 * 1024;

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0 || Number.isNaN(bytes)) return '0 B';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return unit === 0 ? `${value} ${UNITS[unit]}` : `${value.toFixed(1)} ${UNITS[unit]}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
