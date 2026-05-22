export type RotationAngle = 90 | 180 | 270 | 360;

export type RotateOptions =
  | { angle: RotationAngle; pages?: number[]; perPage?: never }
  | { perPage: Record<number, RotationAngle>; angle?: never; pages?: never };

type PdfInput = Uint8Array | ArrayBuffer | File;

async function toBytes(input: PdfInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

function isPerPageMode(options: RotateOptions): options is { perPage: Record<number, RotationAngle> } {
  return 'perPage' in options && options.perPage !== undefined;
}

export async function rotatePdf(input: PdfInput, options: RotateOptions): Promise<Uint8Array> {
  if (!isPerPageMode(options)) {
    if (options.angle === undefined || options.angle % 90 !== 0) {
      throw new Error('Angle must be a multiple of 90');
    }
  } else {
    for (const angle of Object.values(options.perPage)) {
      if (angle % 90 !== 0) {
        throw new Error('Angle must be a multiple of 90');
      }
    }
  }
  const bytes = await toBytes(input);
  if (bytes.byteLength === 0) {
    throw new Error('Empty PDF input');
  }

  const { PDFDocument, degrees } = await import('pdf-lib');
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  if (isPerPageMode(options)) {
    for (const [pageNumStr, angle] of Object.entries(options.perPage)) {
      const pageNum = parseInt(pageNumStr, 10);
      const page = pages[pageNum - 1];
      if (!page) continue;
      const current = page.getRotation().angle;
      const next = (current + angle) % 360;
      page.setRotation(degrees(next));
    }
  } else {
    const selected = options.pages ?? pages.map((_, i) => i + 1);
    for (const oneBasedIdx of selected) {
      const page = pages[oneBasedIdx - 1];
      if (!page) continue;
      const current = page.getRotation().angle;
      const next = (current + options.angle) % 360;
      page.setRotation(degrees(next));
    }
  }
  return doc.save();
}
