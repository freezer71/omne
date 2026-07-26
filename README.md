<p align="center">
  <img src="./app/icon.svg" alt="omne logo" width="96" height="96" />
</p>

<h1 align="center">omne</h1>

<p align="center">
  <strong>Privacy-first toolbox. Everything runs in your browser. No file is ever uploaded.</strong>
</p>

<p align="center">
  <a href="./README.fr.md">🇫🇷 Lire en français</a>
</p>

---

**omne** is a collection of 90 online tools — PDF, video, audio, image, SVG, passwords, JSON, XML, text, encoding, QR codes, colors, developer utilities — that run **entirely client-side**. No analytics, no third-party CDN, no cookies, no server-side file processing — your files never leave the tab. The two narrow, documented exceptions (a skills.sh search proxy and a one-time AI model download) are covered in [the privacy-first promise](#the-privacy-first-promise) and on the in-app privacy page.

Bilingual **English / French**, light / dark mode, `⌘K` command palette.

---

## Values

These are not feature ideas — they are constraints. Everything in the codebase has to honor them.

- 🛡️ **Privacy by design.** Files never leave the device. Processing happens in the browser, in WebAssembly when needed. There is no "trust us, we'll delete it later" — there is no server to delete from.
- 🔍 **Verifiable, not promised.** Open the DevTools Network tab during a conversion: you should see zero outbound requests. The only two sanctioned exceptions — the Skills browser's search proxy and the one-time background-removal model download — are documented below and on the in-app privacy page; anything else is a bug, not a feature.
- 🚫 **No tracking, ever.** No analytics, no telemetry, no cookies, no third-party CDN, no fingerprinting. We don't know who you are and we don't want to know.
- 🧱 **Self-hosted heavy assets.** ffmpeg.wasm, pdf.js worker, the QR scanner, the OCR engine (tesseract.js + its language data) and the ONNX runtime (onnxruntime-web) are all served from this origin so processing doesn't leak metadata to a CDN. The one documented exception: the RMBG-1.4 background-removal *model weights* (~44 MB) are fetched once from Hugging Face on first use, then cached by the browser — your image itself never leaves the device (see the in-app privacy page).
- 🆓 **No friction.** No signup, no account, no paywall, no rate limit, no "premium tier". Open the page, do the thing, close the tab.
- 🌍 **Open source, built in the open.** Every line is auditable on [github.com/freezer71/omne](https://github.com/freezer71/omne) — also linked from the site header and footer. If you can't verify a claim by reading the code, the claim doesn't count.
- 🌗 **Accessible and bilingual.** Light & dark themes with pre-paint anti-flash, English & French at full parity (enforced by CI), and an `⌘K` palette for keyboard users.

---

## The privacy-first promise

This is the reason the project exists, not a marketing line:

- Every conversion runs in the browser via Web APIs, WebAssembly and Web Workers.
- `@ffmpeg/ffmpeg` (video, audio), `pdfjs-dist` (PDF) and `tesseract.js` (OCR, with its English + French models) are **self-hosted** under `/public/ffmpeg/`, `/public/pdfjs/` and `/public/ocr/` — the DevTools Network tab must show **zero** outbound traffic during processing, OCR included.
- The app serves `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` to enable `SharedArrayBuffer` (required by the multi-thread ffmpeg build). Because every asset is same-origin, this hardens the page instead of breaking anything.
- No external services: no Sentry, no Google Analytics, no tracking pixel, no asset CDN.
- Two documented exceptions, both opt-in and file-free: the **Skills browser** (`/dev/skills-browse`) is the only tool that makes network requests at runtime — it relays your search to skills.sh through two same-origin proxy routes (`app/api/skills-search`, `app/api/skills-feed`); and the **background remover** fetches its RMBG-1.4 model (~44 MB) once from Hugging Face, then your browser caches it. Both are flagged `network` in `lib/tools/registry.ts`, disclosed in their own UI and footer, and detailed on the in-app privacy page.

Any contribution that would break that promise (server-side file processing, telemetry, undocumented remote loads) is out of scope. A new network-touching feature is only acceptable with the same treatment as the exceptions above: a `network` flag in the registry, in-UI disclosure, and privacy-page documentation.

---

## Getting started

Requirements: Node.js 20+.

```bash
npm install   # runs the postinstall that copies ffmpeg + pdf.js + qr-scanner + fonts + OCR + ONNX runtime into /public
npm run dev   # http://localhost:3000
```

> ⚠️ `npm run dev` deliberately uses **Webpack** (`next dev --webpack`). Turbopack panics on HMR through `[locale]` dynamic routes. `npm run dev:turbo` exists for spot checks only.

After a clean clone, if ffmpeg/pdf.js/OCR/background-removal features fail, re-run:

```bash
node scripts/copy-ffmpeg.mjs && node scripts/copy-pdfjs.mjs && node scripts/copy-qr-scanner.mjs && node scripts/copy-fonts.mjs && node scripts/copy-ocr.mjs && node scripts/copy-ort.mjs
```

---

## Tool catalog

| Category | Tools |
|----------|-------|
| **PDF** | Merge · Split · Rotate · Resize · Watermark · PDF → images · Extract images · Images → PDF |
| **Video** | Convert (MP4 / WebM / GIF) · Trim · Split · Merge · Compress · Resize · Mute · Crop · Rotate / flip · Extract frames · Watermark · Speed · Short Studio (split + numbered watermark, optional 9:16) |
| **Audio** | Convert · Extract (from video) · Trim · Merge · Volume / normalize / fades · ID3 tags |
| **Image** | Convert · Compress · Resize · Crop · Rotate / flip · Remove background (local AI, *beta*) · Paste from clipboard · Banner maker (color background + text & image layers, size presets) |
| **SVG** | Viewer · Editor · Optimize (SVGO) · → PNG / JPG / WebP · → Data URL · Favicon generator |
| **Password** | Generate · Passphrase (Diceware) · Hash (SHA) · bcrypt · Strength meter |
| **JSON** | Format · Tree · JSONPath · Table · CSV ↔ JSON · Diff · Schema (AJV) |
| **XML** | Beautify · Minify · Validate (line/column errors) · XML ↔ JSON |
| **Text** | Case · Counter · Lorem Ipsum · Diff · Regex tester · Slugify · Sort lines · Escape/Unescape · Whitespace cleaner · Markdown preview · Find & Replace |
| **Reading & accessibility** | Guided reading (bold-start / "bionic") · Text to dyslexia font (OpenDyslexic + spacing + colour overlay → HTML/PDF, reflows text incl. PDFs) · PDF to dyslexia font (keeps images & layout, swaps the font in place — same font & colour-overlay palette as the text tool) · Read aloud (on-device text-to-speech) · Immersive reading (sentence focus ruler) — both dyslexia tools offer a fullscreen reading mode right in the browser (continuous page scrolling for PDFs, auto-hiding controls, A−/A+ text sizing), and the text tools auto-detect corrupted PDF text layers (broken ligatures from Pages/Quartz exports) and scanned PDFs, and recover the text with on-device OCR (English + French) |
| **Encoding** | Base64 · URL · JWT · Hex · HTML entities · Binary · Morse code |
| **QR** | Generate (WiFi, vCard…) · Scan (camera or image) · Barcode generate (Code 128 / EAN) · Barcode scan |
| **Color** | Converter (hex / rgb / hsl / oklch) · WCAG contrast · Palette from image · Gradient builder · Tints & shades · Blender · Color-blindness simulator |
| **Developer** | Build a skills installer (parse `npx skills add` commands) · Browse & install skills (search the skills.sh catalog, discover top skills by All Time / Trending 24h / Hot, and install multiple in one one-liner) — both emit Bash, PowerShell or CMD output and download a ready-to-run `.sh` / `.ps1` / `.cmd` script |

Source of truth: [`lib/tools/registry.ts`](./lib/tools/registry.ts). The sitemap, the home page cards and MIME-based drop routing all derive from it.

---

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind v4** — CSS-first config (no `tailwind.config.js`), tokens in `@theme inline` inside `app/globals.css`
- **[@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm)** for video and audio — **multi-thread build (`@ffmpeg/core-mt`)** to parallelize across CPU cores
- **[pdf-lib](https://pdf-lib.js.org/)** + **[@pdf-lib/fontkit](https://github.com/Hopding/fontkit)** + **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** for PDFs (fontkit embeds the self-hosted **[OpenDyslexic](https://opendyslexic.org/)** font into generated reading PDFs)
- **[tesseract.js](https://tesseract.projectnaptha.com/)** for on-device OCR — recovers text from corrupted PDF text layers and scanned PDFs in the reading tools (wasm core + English/French models self-hosted under `/public/ocr/`)
- **[@huggingface/transformers](https://huggingface.co/docs/transformers.js)** for image background removal (local ONNX model)
- **[SVGO](https://github.com/svg/svgo)** for SVG optimization
- **[AJV](https://ajv.js.org/)** for JSON Schema validation
- **[fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)** for XML validation, formatting and XML↔JSON conversion
- **In-house i18n** — no runtime, static dictionaries at `messages/{en,fr}.json`
- **Vitest** (unit + components + setup) + **Playwright** (e2e on chromium + webkit)

---

## Architecture

### Routing (Next 16 specifics)

- **`proxy.ts`** at the project root replaces the old `middleware.ts` convention. It sniffs `Accept-Language` and 307-redirects bare paths into `/[locale]/...`.
- All routes live under `app/[locale]/...`. There is **no** `app/layout.tsx` — the only root layout is `app/[locale]/layout.tsx`.
- `params` is a **Promise** in every page, layout and `generateMetadata`: `const { locale } = await params;` is mandatory.
- Per-locale category landing pages live at `app/[locale]/[category]/page.tsx` (`/en/pdf`, `/fr/image`, …). They're prerendered for every populated category, with their own metadata, OpenGraph image, breadcrumb and `CollectionPage` JSON-LD.
- A localized 404 at `app/[locale]/not-found.tsx` catches unmatched paths under `/[locale]/...`, picks language via `Accept-Language`, and suggests popular tools. The PWA manifest (`app/manifest.ts`) and `theme-color` viewport are emitted automatically.

### Anatomy of a tool

Each tool follows the same 5-file skeleton plus one registry entry:

1. **Pure logic** — `lib/tools/implementations/<id>.ts` (testable in Node, no React)
2. **Client component** — `components/tools/<id>-tool.tsx` (`'use client'`)
3. **Page** — `app/[locale]/<category>/<id>/page.tsx` (Server Component)
4. **OpenGraph image** — `app/[locale]/<category>/<id>/opengraph-image.tsx`
5. **Registry entry** — `lib/tools/registry.ts`
6. **Translations** — `tools.<category>.<id>` keys in **both** `messages/{en,fr}.json` (`seo` block included, parity checked in CI). An optional `content` block (`howItWorks` + `features` arrays) provides tool-specific copy for the SEO footer. A new category also needs a `categories.<category>` block (`name`, `intro`, `seo`) for its landing page.

**Real-time preview is mandatory**: every tool must render a live result that reflects the current parameters — drive it from a ~150–250 ms debounced effect, no "Apply" button before the preview shows. For heavy pipelines (ffmpeg, pdf.js, remove-bg), render a lightweight proxy (lower resolution, first page/frame).

**Nothing downloads behind the user's back**: a tool that runs an expensive pipeline hands its output to `<ToolResult>` (`components/ui/tool-result.tsx`) instead of calling `downloadBlob` itself. The panel plays or displays the produced file, states the size change against the source, and carries the only **Download** button, plus a **Change settings** button that clears it while keeping the source file loaded. Hold the output with `useToolResult(signature)` (`lib/hooks/use-tool-result.ts`): build `signature` from the source file identity plus every option that feeds the pipeline, and the hook drops the result the moment they diverge, so the panel can never show a file the controls no longer describe. The strings are shared across tools under `common.result` — pass them down as `result={dict.common.result}`.

**Show the queue, not the file names**: merge tools measure every queued clip with `useClipMetadata` and summarise it with `lib/tools/clip-summary.ts` — thumbnail, duration and dimensions per row, a running total, and a warning when the clips are not all the same size. Ordering clips by file name is exactly where users get it wrong, and without this the mistake only surfaced after the encode.

**Focus must land on something visible**: option chips wrap an `sr-only` radio in a styled `<label>`, and file pickers put an `sr-only` input beside a styled button. `sr-only` clips the control to 1×1px, so the base focus ring was painted where nobody could see it. Two selectors in `app/globals.css` move it onto the visible proxy — keep the hidden control a direct child of its label, or the immediate previous sibling of its button.

**Don't promise a number you cannot compute**: `video/compress` encodes at a fixed quantizer, so its output size cannot be derived from duration × bitrate. `estimateCompressedSize` answers it by encoding the first few seconds at the chosen preset and scaling up — the lightweight-proxy rule applied to a figure rather than a picture. It is an approximation by construction, is labelled as one, and fails silently rather than showing something wrong.

**Say why it failed, when you can tell**: media tools route their failures through `mediaErrorMessage` (`lib/media-errors.ts`), which separates a lost cross-origin isolation (reload; the file is fine) and heap exhaustion (shorter clip, lighter preset) from everything else, and falls back to the tool's own wording rather than guessing.

**Every long run is escapable**: an ffmpeg tool calls `useFfmpegCancel(busy)` (`lib/hooks/use-ffmpeg-cancel.ts`), which renders a **Cancel** button beside the busy primary button, warns before the tab is closed mid-encode, and calls `terminateFfmpeg()` (`lib/ffmpeg-loader.ts`) to abort the worker. Terminating leaves the FFmpeg object dead, so the loader drops its cached instance and the next run loads a fresh core. Call `beginRun()` at the top of the handler and gate the failure report on `wasCancelled()` — a cancel rejects the pending `exec` too, and reporting it would tell the user their file is broken when it is not.

Full details in [`CLAUDE.md`](./CLAUDE.md).

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `:3000` (Webpack — see warning above) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest (unit + components + setup) one-shot |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:ui` | Vitest UI |
| `npm run test:e2e` | Playwright (chromium + webkit) |
| `npm run test:all` | Vitest then Playwright |
| `npm run favicons` | Regenerate `app/favicon.ico` (16/32/48) + `app/apple-icon.png` (180×180) from `app/icon.svg` |
| `npm run lastmod` | Regenerate `lib/seo/lastmod.json` (per-page sitemap `<lastmod>` dates from git history) — run after content changes and commit the result |

Run a single test:

```bash
npx vitest run path/to/file.test.ts -t "test name"
npx playwright test tests/e2e/<name>.spec.ts --project=chromium
```

---

## Repository layout

```
omne/
├── app/
│   ├── [locale]/         # Pages (Server Components) per category/tool + not-found.tsx
│   └── manifest.ts       # PWA Web App Manifest (icons, theme, start_url)
├── components/tools/     # Client components for each tool
├── lib/
│   ├── tools/
│   │   ├── implementations/  # Pure logic (testable outside the DOM)
│   │   ├── registry.ts       # Source of truth for the catalog
│   │   └── mime-router.ts    # MIME-based routing on drop
│   ├── seo/                  # metadata, JSON-LD (WebApplication, CollectionPage, BreadcrumbList, FAQPage)
│   └── og/                   # OG image template + builder (hub / privacy / tool / category)
│   ├── i18n/             # Server-side dictionaries (server-only)
│   ├── ffmpeg-loader.ts  # Singleton ffmpeg.wasm
│   ├── ocr-loader.ts     # Singleton tesseract.js worker (self-hosted assets)
│   └── file-utils.ts     # downloadBlob, outputName, etc.
├── messages/{en,fr}.json # Translations (parity enforced in CI)
├── public/
│   ├── ffmpeg/           # ffmpeg-core.js + .wasm (postinstall-copied, gitignored)
│   ├── pdfjs/            # pdf.worker.min.mjs (same)
│   ├── ocr/              # tesseract worker + wasm cores + eng/fra traineddata (same)
│   ├── ort/              # onnxruntime-web wasm runtime for remove-bg (same)
│   ├── kouma-tile-*.svg  # Kouma Labs tiles for the co-branded lockup (committed)
│   └── theme-init.js     # Static script to avoid theme flash
├── proxy.ts              # /[locale] redirect (replaces middleware.ts)
├── scripts/              # copy-ffmpeg, copy-pdfjs, copy-qr-scanner, copy-fonts, copy-ocr, copy-ort
└── tests/
    ├── unit/             # Vitest (Node env)
    ├── components/       # Vitest (jsdom) + RTL
    ├── setup/            # Cross-cutting tests (i18n parity…)
    └── e2e/              # Playwright
```

---

## Contributing a new tool

1. Implement the pure logic in `lib/tools/implementations/<id>.ts` with a unit test.
2. Build the client component in `components/tools/<id>-tool.tsx` with a real-time preview — and, if the pipeline is expensive, a `<ToolResult>` panel rather than an automatic download.
3. Wire the page under `app/[locale]/<category>/<id>/page.tsx` + the `opengraph-image.tsx`.
4. Add the entry in `lib/tools/registry.ts`.
5. Add `tools.<category>.<id>` keys (including the `seo` block) in `messages/en.json` **and** `messages/fr.json`.
6. Verify: `npm test` (i18n parity + unit + components), then `npm run test:e2e`.

The sitemap, MIME-based routing and the `⌘K` palette pick the new tool up automatically.

---

## Brand

omne is a Kouma Labs product. The header and the footer carry the co-branded lockup — the Kouma Labs app-icon, a muted slash, then the omne logo — as specified in the brand kit at [koumalabs.org/brands](https://koumalabs.org/brands). The omne mark's size is derived from the tile's rather than fixed, so the two marks stay balanced at every step of the scale: the ring sits at ~0.9 of the tile, because the Kouma halftone reads lighter than omne's solid stroke and needs the extra size to hold its side. The header drops the tile below `md`, where it has no room; the footer shows the full lockup at every width.

Both tiles (`public/kouma-tile-{dark,light}.svg`) are self-hosted and swapped through the `--kouma-tile` CSS variable under `[data-theme]` rather than Tailwind's `dark:` variant: this project drives its theme from the `data-theme` attribute, so a `prefers-color-scheme` swap would desync from what the user actually sees. Linking to koumalabs.org adds no outbound request — the privacy promise is unchanged.

---

## License

Open source, built in the open.
