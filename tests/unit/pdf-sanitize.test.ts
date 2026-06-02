import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } from 'pdf-lib';
import { stripPageActions } from '@/lib/tools/pdf-sanitize';

async function buildPageWithActions() {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const ctx = doc.context;

  const jsAction = ctx.obj({ S: 'JavaScript', JS: 'alert(1)' });
  const uriAction = ctx.obj({ S: 'URI', URI: 'https://example.com' });
  const launchAction = ctx.obj({ S: 'Launch', F: 'calc.exe' });

  const jsAnnot = ctx.obj({ Type: 'Annot', Subtype: 'Link', A: jsAction });
  const uriAnnot = ctx.obj({ Type: 'Annot', Subtype: 'Link', A: uriAction });
  const launchAnnot = ctx.obj({ Type: 'Annot', Subtype: 'Link', A: launchAction });

  const jsAnnotRef = ctx.register(jsAnnot);
  const uriAnnotRef = ctx.register(uriAnnot);
  const launchAnnotRef = ctx.register(launchAnnot);

  const annots = ctx.obj([jsAnnotRef, uriAnnotRef, launchAnnotRef]);
  page.node.set(PDFName.of('Annots'), annots);

  return { doc, page, ctx, jsAnnotRef, uriAnnotRef, launchAnnotRef };
}

describe('stripPageActions', () => {
  it('removes /AA from the page dict', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const ctx = doc.context;

    const aaDict = ctx.obj({ O: ctx.obj({ S: 'JavaScript', JS: 'alert(1)' }) });
    page.node.set(PDFName.of('AA'), aaDict);

    expect(page.node.get(PDFName.of('AA'))).toBeDefined();
    stripPageActions(page);
    expect(page.node.get(PDFName.of('AA'))).toBeUndefined();
  });

  it('removes JavaScript action from annotation', async () => {
    const { page, ctx, jsAnnotRef } = await buildPageWithActions();

    const annotBefore = ctx.lookup(jsAnnotRef) as PDFDict;
    expect(annotBefore.get(PDFName.of('A'))).toBeDefined();

    stripPageActions(page);

    const annotAfter = ctx.lookup(jsAnnotRef) as PDFDict;
    expect(annotAfter.get(PDFName.of('A'))).toBeUndefined();
  });

  it('removes Launch action from annotation', async () => {
    const { page, ctx, launchAnnotRef } = await buildPageWithActions();

    const annotBefore = ctx.lookup(launchAnnotRef) as PDFDict;
    expect(annotBefore.get(PDFName.of('A'))).toBeDefined();

    stripPageActions(page);

    const annotAfter = ctx.lookup(launchAnnotRef) as PDFDict;
    expect(annotAfter.get(PDFName.of('A'))).toBeUndefined();
  });

  it('preserves URI action on annotation', async () => {
    const { page, ctx, uriAnnotRef } = await buildPageWithActions();

    stripPageActions(page);

    const annotAfter = ctx.lookup(uriAnnotRef) as PDFDict;
    const action = annotAfter.get(PDFName.of('A')) as PDFDict;
    expect(action).toBeDefined();
    expect((action.get(PDFName.of('S')) as PDFName).asString()).toBe('/URI');
  });

  it('removes /AA from annotations', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const ctx = doc.context;

    const annotAA = ctx.obj({ Fo: ctx.obj({ S: 'JavaScript', JS: 'alert(1)' }) });
    const annot = ctx.obj({ Type: 'Annot', Subtype: 'Widget', AA: annotAA });
    const annotRef = ctx.register(annot);
    page.node.set(PDFName.of('Annots'), ctx.obj([annotRef]));

    const annotBefore = ctx.lookup(annotRef) as PDFDict;
    expect(annotBefore.get(PDFName.of('AA'))).toBeDefined();

    stripPageActions(page);

    const annotAfter = ctx.lookup(annotRef) as PDFDict;
    expect(annotAfter.get(PDFName.of('AA'))).toBeUndefined();
  });

  it('handles pages with no annotations', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();

    expect(() => stripPageActions(page)).not.toThrow();
  });

  it('handles empty annotations array', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    page.node.set(PDFName.of('Annots'), doc.context.obj([]));

    expect(() => stripPageActions(page)).not.toThrow();
  });

  it('strips SubmitForm, ImportData, and ResetForm actions', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const ctx = doc.context;

    const submitAnnot = ctx.obj({ Type: 'Annot', A: ctx.obj({ S: 'SubmitForm' }) });
    const importAnnot = ctx.obj({ Type: 'Annot', A: ctx.obj({ S: 'ImportData' }) });
    const resetAnnot = ctx.obj({ Type: 'Annot', A: ctx.obj({ S: 'ResetForm' }) });

    const refs = [submitAnnot, importAnnot, resetAnnot].map((a) => ctx.register(a));
    page.node.set(PDFName.of('Annots'), ctx.obj(refs));

    stripPageActions(page);

    for (const ref of refs) {
      const dict = ctx.lookup(ref) as PDFDict;
      expect(dict.get(PDFName.of('A'))).toBeUndefined();
    }
  });

  it('preserves GoTo navigation actions', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const ctx = doc.context;

    const gotoAction = ctx.obj({ S: 'GoTo', D: 'dest-name' });
    const annot = ctx.obj({ Type: 'Annot', Subtype: 'Link', A: gotoAction });
    const ref = ctx.register(annot);
    page.node.set(PDFName.of('Annots'), ctx.obj([ref]));

    stripPageActions(page);

    const dict = ctx.lookup(ref) as PDFDict;
    expect(dict.get(PDFName.of('A'))).toBeDefined();
  });

  it('works end-to-end through merge', async () => {
    const src = await PDFDocument.create();
    const srcPage = src.addPage();
    const srcCtx = src.context;

    const jsAction = srcCtx.obj({ S: 'JavaScript', JS: 'alert("pwned")' });
    const annot = srcCtx.obj({ Type: 'Annot', Subtype: 'Link', A: jsAction });
    const annotRef = srcCtx.register(annot);
    srcPage.node.set(PDFName.of('Annots'), srcCtx.obj([annotRef]));

    const srcBytes = await src.save();

    const out = await PDFDocument.create();
    const loaded = await PDFDocument.load(srcBytes);
    const pages = await out.copyPages(loaded, loaded.getPageIndices());
    for (const p of pages) {
      stripPageActions(p);
      out.addPage(p);
    }

    const resultBytes = await out.save();
    const result = await PDFDocument.load(resultBytes);
    const resultPage = result.getPage(0);

    const annots = resultPage.node.get(PDFName.of('Annots'));
    if (annots instanceof PDFArray) {
      for (let i = 0; i < annots.size(); i++) {
        const entry = annots.get(i);
        const aDict = (entry instanceof PDFRef ? result.context.lookup(entry) : entry) as PDFDict;
        const action = aDict.get(PDFName.of('A'));
        if (action) {
          const actionDict = (action instanceof PDFRef ? result.context.lookup(action) : action) as PDFDict;
          const subtype = actionDict.get(PDFName.of('S')) as PDFName;
          expect(subtype.asString()).not.toBe('/JavaScript');
        }
      }
    }
  });
});
