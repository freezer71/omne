export type BarcodeScanResult = {
  format: string;
  value: string;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ format: string; rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export const SUPPORTED_FORMATS = [
  'aztec', 'code_128', 'code_39', 'code_93', 'codabar', 'data_matrix',
  'ean_13', 'ean_8', 'itf', 'pdf417', 'qr_code', 'upc_a', 'upc_e',
];

export function isBarcodeDetectorAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function';
}

export async function scanBarcodeFromBitmap(bitmap: ImageBitmap): Promise<BarcodeScanResult[]> {
  if (!isBarcodeDetectorAvailable()) {
    throw new Error('BarcodeDetector API is not available in this browser. Use Chrome or Edge.');
  }
  const detector = new window.BarcodeDetector!({ formats: SUPPORTED_FORMATS });
  const results = await detector.detect(bitmap);
  return results.map((r) => ({ format: r.format, value: r.rawValue }));
}

export async function scanBarcodeFromFile(file: File): Promise<BarcodeScanResult[]> {
  const bitmap = await createImageBitmap(file);
  try {
    return await scanBarcodeFromBitmap(bitmap);
  } finally {
    bitmap.close?.();
  }
}
