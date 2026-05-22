type PdfInput = Uint8Array | ArrayBuffer | File;
type ImageInput = Uint8Array | ArrayBuffer | File;

export type WatermarkOptions =
  | {
      kind: 'text';
      text: string;
      opacity: number;
      fontSize: number;
      angle: number;
    }
  | {
      kind: 'image';
      image: ImageInput;
      opacity: number;
      scale: number;
      angle: number;
    };

async function toBytes(input: PdfInput | ImageInput): Promise<{ bytes: Uint8Array; mime?: string }> {
  if (input instanceof Uint8Array) return { bytes: input };
  if (input instanceof ArrayBuffer) return { bytes: new Uint8Array(input) };
  return { bytes: new Uint8Array(await input.arrayBuffer()), mime: input.type };
}

type ImageFormat = 'png' | 'jpg';

function detectImageFormat(bytes: Uint8Array, mime?: string): ImageFormat {
  if (mime === 'image/png' || (bytes[0] === 0x89 && bytes[1] === 0x50)) return 'png';
  if (mime === 'image/jpeg' || (bytes[0] === 0xff && bytes[1] === 0xd8)) return 'jpg';
  throw new Error('Unsupported image format. Use PNG or JPEG.');
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function centeredAnchor(boxWidth: number, boxHeight: number, pageWidth: number, pageHeight: number, angleDeg: number) {
  const theta = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  const x = cx - (boxWidth / 2) * cos + (boxHeight / 2) * sin;
  const y = cy - (boxWidth / 2) * sin - (boxHeight / 2) * cos;
  return { x, y };
}

export async function watermarkPdf(input: PdfInput, options: WatermarkOptions): Promise<Uint8Array> {
  const { bytes } = await toBytes(input);
  if (bytes.byteLength === 0) {
    throw new Error('Empty PDF input');
  }

  const opacity = clamp01(options.opacity);
  const angle = options.angle;

  const { PDFDocument, StandardFonts, degrees, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  if (options.kind === 'text') {
    const text = options.text.trim();
    if (text.length === 0) {
      throw new Error('Watermark text is empty');
    }
    const fontSize = Math.max(1, options.fontSize);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    let textWidth: number;
    let textHeight: number;
    try {
      textWidth = font.widthOfTextAtSize(text, fontSize);
      textHeight = font.heightAtSize(fontSize);
    } catch {
      throw new Error('Unsupported character — Helvetica supports Latin alphabets only.');
    }

    for (const page of pages) {
      const { width, height } = page.getSize();
      const { x, y } = centeredAnchor(textWidth, textHeight, width, height, angle);
      try {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.25, 0.25, 0.25),
          opacity,
          rotate: degrees(angle),
        });
      } catch {
        throw new Error('Unsupported character — Helvetica supports Latin alphabets only.');
      }
    }
  } else {
    const { bytes: imgBytes, mime } = await toBytes(options.image);
    if (imgBytes.byteLength === 0) {
      throw new Error('Empty watermark image');
    }
    const format = detectImageFormat(imgBytes, mime);
    const image = format === 'png' ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);
    const scale = clamp01(options.scale);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const w = width * scale;
      const h = image.height * (w / image.width);
      const { x, y } = centeredAnchor(w, h, width, height, angle);
      page.drawImage(image, {
        x,
        y,
        width: w,
        height: h,
        opacity,
        rotate: degrees(angle),
      });
    }
  }

  return doc.save();
}
