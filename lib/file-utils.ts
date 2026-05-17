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
  if (fileNames.length === 0) return `${action}.${extension}`;
  const base = stripExtension(fileNames[0]);
  const middle = infix ? `${base}-${infix}` : base;
  return `${action}-${middle}.${extension}`;
}

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
