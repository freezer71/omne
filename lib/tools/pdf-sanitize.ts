import { PDFName, PDFDict, PDFArray, PDFRef, type PDFPage } from 'pdf-lib';

const DANGEROUS_ACTION_NAMES: PDFName[] = [
  PDFName.of('JavaScript'),
  PDFName.of('Launch'),
  PDFName.of('SubmitForm'),
  PDFName.of('ImportData'),
  PDFName.of('ResetForm'),
];

export function stripPageActions(page: PDFPage): void {
  const node = page.node;
  const context = node.context;

  node.delete(PDFName.of('AA'));

  const annotsRaw = node.get(PDFName.of('Annots'));
  if (!annotsRaw) return;

  const annots =
    annotsRaw instanceof PDFRef ? context.lookup(annotsRaw) : annotsRaw;
  if (!(annots instanceof PDFArray)) return;

  for (let i = 0; i < annots.size(); i++) {
    const entry = annots.get(i);
    const annotDict =
      entry instanceof PDFRef ? context.lookup(entry) : entry;
    if (!(annotDict instanceof PDFDict)) continue;

    annotDict.delete(PDFName.of('AA'));

    const actionRaw = annotDict.get(PDFName.of('A'));
    if (!actionRaw) continue;

    const actionDict =
      actionRaw instanceof PDFRef ? context.lookup(actionRaw) : actionRaw;
    if (!(actionDict instanceof PDFDict)) continue;

    const subtype = actionDict.get(PDFName.of('S'));
    if (
      subtype instanceof PDFName &&
      DANGEROUS_ACTION_NAMES.some((name) => name === subtype)
    ) {
      annotDict.delete(PDFName.of('A'));
    }
  }
}
