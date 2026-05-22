type PdfInput = Uint8Array | ArrayBuffer | File;

async function toBytes(input: PdfInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

export async function mergePdfs(inputs: PdfInput[]): Promise<Uint8Array> {
  if (inputs.length === 0) {
    throw new Error('mergePdfs requires at least one PDF');
  }
  const { PDFDocument } = await import('pdf-lib');

  const out = await PDFDocument.create();
  for (const input of inputs) {
    const bytes = await toBytes(input);
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) {
      out.addPage(page);
    }
  }
  return out.save();
}
