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

**omne** is a collection of 83+ online tools — PDF, video, audio, image, SVG, passwords, JSON, text, encoding, QR codes, colors, developer utilities — that run **entirely client-side**. No backend, no analytics, no third-party CDN, no cookies. Your files never leave the tab.

Bilingual **English / French**, light / dark mode, `⌘K` command palette.

---

## Values

These are not feature ideas — they are constraints. Everything in the codebase has to honor them.

- 🛡️ **Privacy by design.** Files never leave the device. Processing happens in the browser, in WebAssembly when needed. There is no "trust us, we'll delete it later" — there is no server to delete from.
- 🔍 **Verifiable, not promised.** Open the DevTools Network tab during a conversion: you should see zero outbound requests. If you ever do, that's a bug, not a feature.
- 🚫 **No tracking, ever.** No analytics, no telemetry, no cookies, no third-party CDN, no fingerprinting. We don't know who you are and we don't want to know.
- 🧱 **Self-hosted heavy assets.** ffmpeg.wasm, pdf.js worker, the QR scanner and the background-removal ONNX model are all served from this origin so processing doesn't leak metadata to a CDN.
- 🆓 **No friction.** No signup, no account, no paywall, no rate limit, no "premium tier". Open the page, do the thing, close the tab.
- 🌍 **Open source, built in the open.** Every line is auditable on [github.com/freezer71/omne](https://github.com/freezer71/omne) — also linked from the site header and footer. If you can't verify a claim by reading the code, the claim doesn't count.
- 🌗 **Accessible and bilingual.** Light & dark themes with pre-paint anti-flash, English & French at full parity (enforced by CI), and an `⌘K` palette for keyboard users.

---

## The privacy-first promise

This is the reason the project exists, not a marketing line:

- Every conversion runs in the browser via Web APIs, WebAssembly and Web Workers.
- `@ffmpeg/ffmpeg` (video, audio) and `pdfjs-dist` (PDF) are **self-hosted** under `/public/ffmpeg/` and `/public/pdfjs/` — the DevTools Network tab must show **zero** outbound traffic during processing.
- The app serves `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` to enable `SharedArrayBuffer` (required by the multi-thread ffmpeg build). Because every asset is same-origin, this hardens the page instead of breaking anything.
- No external services: no Sentry, no Google Analytics, no tracking pixel, no asset CDN.

Any contribution that would break that promise (server-side processing, telemetry, remote asset loads) is out of scope.

---

## Getting started

Requirements: Node.js 20+.

```bash
npm install   # runs the postinstall that copies ffmpeg + pdf.js + qr-scanner into /public
npm run dev   # http://localhost:3000
```

> ⚠️ `npm run dev` deliberately uses **Webpack** (`next dev --webpack`). Turbopack panics on HMR through `[locale]` dynamic routes. `npm run dev:turbo` exists for spot checks only.

After a clean clone, if ffmpeg/pdf.js features fail, re-run:

```bash
node scripts/copy-ffmpeg.mjs && node scripts/copy-pdfjs.mjs && node scripts/copy-qr-scanner.mjs
```

---

## Tool catalog

| Category | Tools |
|----------|-------|
| **PDF** | Merge · Split · Rotate · Resize · Watermark · PDF → images · Extract images · Images → PDF |
| **Video** | Convert (MP4 / WebM / GIF) · Trim · Split · Merge · Compress · Resize · Mute · Crop · Rotate / flip · Extract frames · Watermark · Speed · Short Studio (split + numbered watermark, optional 9:16) |
| **Audio** | Convert · Extract (from video) · Trim · Merge · Volume / normalize / fades · ID3 tags |
| **Image** | Convert · Compress · Resize · Crop · Rotate / flip · Remove background (local AI, *beta*) · Paste from clipboard |
| **SVG** | Viewer · Editor · Optimize (SVGO) · → PNG / JPG / WebP · → Data URL · Favicon generator |
| **Password** | Generate · Passphrase (Diceware) · Hash (SHA) · bcrypt · Strength meter |
| **JSON** | Format · Tree · JSONPath · Table · CSV ↔ JSON · Diff · Schema (AJV) |
| **Text** | Case · Counter · Lorem Ipsum · Diff · Regex tester · Slugify · Sort lines · Escape/Unescape · Whitespace cleaner · Markdown preview · Find & Replace |
| **Reading & accessibility** | Reading Focus (bold-start / "bionic") · Dyslexia-friendly formatter (OpenDyslexic + spacing + colour overlay → HTML/PDF, reflows text incl. PDFs) · PDF → dyslexia font (keeps images & layout, swaps font in place) · Read aloud (on-device text-to-speech) · Immersive reader (sentence focus ruler) |
| **Encoding** | Base64 · URL · JWT · Hex · HTML entities · Binary · Morse code |
| **QR** | Generate (WiFi, vCard…) · Scan (camera or image) · Barcode generate (Code 128 / EAN) · Barcode scan |
| **Color** | Converter (hex / rgb / hsl / oklch) · WCAG contrast · Palette from image · Gradient builder · Tints & shades · Blender · Color-blindness simulator |
| **Developer** | Skills installer builder (parse `npx skills add` commands) · Browse & install skills (search the skills.sh catalog, discover top skills by All Time / Trending 24h / Hot, and install multiple in one one-liner) |

Source of truth: [`lib/tools/registry.ts`](./lib/tools/registry.ts). The sitemap, the home page cards and MIME-based drop routing all derive from it.

---

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind v4** — CSS-first config (no `tailwind.config.js`), tokens in `@theme inline` inside `app/globals.css`
- **[@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm)** for video and audio — **multi-thread build (`@ffmpeg/core-mt`)** to parallelize across CPU cores
- **[pdf-lib](https://pdf-lib.js.org/)** + **[@pdf-lib/fontkit](https://github.com/Hopding/fontkit)** + **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** for PDFs (fontkit embeds the self-hosted **[OpenDyslexic](https://opendyslexic.org/)** font into generated reading PDFs)
- **[@huggingface/transformers](https://huggingface.co/docs/transformers.js)** for image background removal (local ONNX model)
- **[SVGO](https://github.com/svg/svgo)** for SVG optimization
- **[AJV](https://ajv.js.org/)** for JSON Schema validation
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
│   ├── seo/                  # metadata, JSON-LD (WebApplication, CollectionPage, BreadcrumbList)
│   └── og/                   # OG image template + builder (hub / privacy / tool / category)
│   ├── i18n/             # Server-side dictionaries (server-only)
│   ├── ffmpeg-loader.ts  # Singleton ffmpeg.wasm
│   └── file-utils.ts     # downloadBlob, outputName, etc.
├── messages/{en,fr}.json # Translations (parity enforced in CI)
├── public/
│   ├── ffmpeg/           # ffmpeg-core.js + .wasm (postinstall-copied, gitignored)
│   ├── pdfjs/            # pdf.worker.min.mjs (same)
│   └── theme-init.js     # Static script to avoid theme flash
├── proxy.ts              # /[locale] redirect (replaces middleware.ts)
├── scripts/              # copy-ffmpeg, copy-pdfjs, copy-qr-scanner
└── tests/
    ├── unit/             # Vitest (Node env)
    ├── components/       # Vitest (jsdom) + RTL
    ├── setup/            # Cross-cutting tests (i18n parity…)
    └── e2e/              # Playwright
```

---

## Contributing a new tool

1. Implement the pure logic in `lib/tools/implementations/<id>.ts` with a unit test.
2. Build the client component in `components/tools/<id>-tool.tsx` with a real-time preview.
3. Wire the page under `app/[locale]/<category>/<id>/page.tsx` + the `opengraph-image.tsx`.
4. Add the entry in `lib/tools/registry.ts`.
5. Add `tools.<category>.<id>` keys (including the `seo` block) in `messages/en.json` **and** `messages/fr.json`.
6. Verify: `npm test` (i18n parity + unit + components), then `npm run test:e2e`.

The sitemap, MIME-based routing and the `⌘K` palette pick the new tool up automatically.

---

## License

Open source, built in the open.
