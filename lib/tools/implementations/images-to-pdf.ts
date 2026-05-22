type ImageInput = Uint8Array | ArrayBuffer | File;

type DetectedFormat = 'png' | 'jpg';

function detectFormat(bytes: Uint8Array, mime?: string): DetectedFormat {
  if (mime === 'image/png' || (bytes[0] === 0x89 && bytes[1] === 0x50)) return 'png';
  if (mime === 'image/jpeg' || (bytes[0] === 0xff && bytes[1] === 0xd8)) return 'jpg';
  throw new Error('Unsupported image format. Use PNG or JPEG.');
}

async function toBytes(input: ImageInput): Promise<{ bytes: Uint8Array; mime?: string }> {
  if (input instanceof Uint8Array) return { bytes: input };
  if (input instanceof ArrayBuffer) return { bytes: new Uint8Array(input) };
  return { bytes: new Uint8Array(await input.arrayBuffer()), mime: input.type };
}

export async function imagesToPdf(inputs: ImageInput[]): Promise<Uint8Array> {
  if (inputs.length === 0) throw new Error('imagesToPdf requires at least one image');

  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  for (const input of inputs) {
    const { bytes, mime } = await toBytes(input);
    const format = detectFormat(bytes, mime);
    const image = format === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return doc.save();
}
