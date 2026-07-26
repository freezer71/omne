# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

This Next.js 16 codebase uses conventions that differ from earlier versions — always cross-check against `node_modules/next/dist/docs/` before assuming an API.

## Commands

- `npm run dev` — dev server on :3000. **Uses `--webpack` on purpose**; Turbopack panics on HMR with `[locale]` dynamic routes. `npm run dev:turbo` exists for spot checks only.
- `npm run build` / `npm run start` — production build/serve.
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`).
- `npm test` — Vitest one-shot. `npm run test:watch`, `npm run test:ui` available.
- `npm run test:e2e` — Playwright (chromium + webkit). It starts `npm run dev` itself via `webServer` and reuses an existing one locally; in CI it spawns its own.
- `npm run test:all` — vitest + playwright sequentially.
- Single test: `npx vitest run path/to/file.test.ts -t "test name"`, or `npx playwright test tests/e2e/<name>.spec.ts --project=chromium`.
- `postinstall` runs the `scripts/copy-*.mjs` scripts (ffmpeg, pdfjs, qr-scanner, fonts, ocr, ort), which copy vendored heavy assets (ffmpeg-core wasm/js, pdf.js worker, QR scanner, PDF fonts, tesseract OCR cores, onnxruntime-web wasm) out of `node_modules` into `public/<name>/` (all gitignored). If those files go missing after a clean clone, re-run `npm install` or the individual `node scripts/copy-<name>.mjs`.

## Architecture

**Privacy promise — load-bearing.** Every conversion runs entirely in the user's browser; no file is ever uploaded. No analytics, no third-party CDN, no cookies. ffmpeg core and the pdf.js worker are *self-hosted* under `/public/` precisely so DevTools Network shows zero outbound traffic during processing. Exactly two sanctioned exceptions exist, flagged via the optional `network` field in `lib/tools/registry.ts` and documented on `/privacy`, in the tool footer (`components/tool-footer-seo.tsx`) and in both READMEs: `skills-browse` (`network: 'proxy'`) is the only tool with runtime network traffic — it proxies search/feed requests to skills.sh through `app/api/skills-search` and `app/api/skills-feed`; `remove-bg` (`network: 'model-download'`) downloads its ~44 MB model once from huggingface.co (`lib/transformers-loader.ts`), then the browser caches it. Don't introduce any other server-side processing, telemetry, or remote loads — and never route user *files* through a server. Any new exception requires the registry flag plus updates to `/privacy`, both READMEs, and this paragraph.

**Routing (Next 16 specifics):**
- `proxy.ts` at the project root replaces the old `middleware.ts` file convention. It sniffs `Accept-Language`, picks `en`/`fr`, and 301-redirects bare paths into `/[locale]/...` (with `Vary: Accept-Language`). The matcher excludes `_next` and any path with a dot.
- Routes live under `app/[locale]/...`. There is **no `app/layout.tsx`** — the only root layout is `app/[locale]/layout.tsx`. Adding a top-level root layout would conflict.
- `params` is a Promise in every page/layout/`generateMetadata`: `const { locale } = await params;` is mandatory.
- The `<html>` tag is rendered in `app/[locale]/layout.tsx` with `suppressHydrationWarning` and a `/theme-init.js` static `<script>` for the pre-paint theme set (anti-flash). Don't inline that script — see "Pitfalls" below.

**Tool architecture (the recipe for adding a tool):**
Every tool has 5 files and one registry entry. They are deliberately separated so logic is testable in pure Node and UI is testable in jsdom.

1. **Pure logic** in `lib/tools/implementations/<id>.ts` — takes `File | Uint8Array | ArrayBuffer`, returns `Uint8Array` or similar. No React, no DOM beyond what's needed (canvas is OK; it gets stubbed in `tests/setup/vitest.setup.ts`).
2. **Client component** in `components/tools/<id>-tool.tsx` — `'use client'`, owns input state, calls the logic, handles drag-drop and download via `lib/file-utils.ts` (`downloadBlob`, `outputName`).
3. **Route page** at `app/[locale]/<category>/<id>/page.tsx` — server component that awaits `params`, calls `getDictionary(locale)`, calls `getToolMetadata(category, id, locale)` from `lib/tools/metadata.ts` for `generateMetadata`, wraps the tool component in `<ToolShell>`, renders `<ToolPageJsonLd category="..." id="..." locale={locale} />` next to the shell, and pipes localized strings down as props.
4. **OpenGraph image** at `app/[locale]/<category>/<id>/opengraph-image.tsx` — delegates to `buildOgImage({ kind: 'tool', locale, category, id })` from `lib/og/build.tsx`. Copy any existing tool's file and change the `alt` + `category`/`id`. `runtime`, `size`, and `contentType` exports are mandatory.
5. **Registry entry** in `lib/tools/registry.ts` — `{ id, category, href, i18nKey, keywords, acceptedMime, status }`. The hub (`app/[locale]/page.tsx`) renders cards from this list grouped by category; `lib/tools/mime-router.ts` uses it for drop-routing decisions; `app/sitemap.xml/route.ts` auto-emits the route in both locales (no manual sitemap edit needed) and `public/sitemap.xsl` renders a human-readable view when the XML is opened in a browser. Sitemap `<lastmod>` dates come from the committed `lib/seo/lastmod.json` — run `npm run lastmod` after content changes and commit the result (it derives per-path dates from git history; it can't run on Vercel's shallow clone, and `tests/unit/lastmod.test.ts` fails when the snapshot is stale).

Add matching keys to **both** `messages/en.json` and `messages/fr.json` under `tools.<category>.<id>` — `tests/setup/i18n-keys.test.ts` enforces structural parity between the two dictionaries and will fail CI if a key is missing on either side. **The `seo` sub-block is part of the contract**, not optional: every tool's entry must include `seo: { title, description, keywords (string[]), ogTitle }` in both locales. Target the queries real users type (e.g. `"merge pdf online no upload"`, `"compresser image en ligne"`) — generic taglines waste the slot. `getToolMetadata` reads these to produce canonical URL, hreflang en/fr/x-default, OpenGraph, Twitter, and robots; `<ToolPageJsonLd>` emits the schema.org `WebApplication` + `WebPage` JSON-LD using the same strings.

**Real-time preview is mandatory for every tool.** Each tool must render a live preview that reflects the current input + settings without requiring the user to click a "Run"/"Apply" button first. The user must always see what they will get before downloading. Implementation guidance:
- Drive the preview from a debounced effect (~150–250 ms) on the input file and option state so dragging a slider or toggling a checkbox updates the canvas/preview pane without re-uploading.
- For heavy pipelines (ffmpeg, pdf.js, remove-bg), render a lightweight proxy preview (lower resolution, first page/frame, downsampled image) and reserve the full pipeline for the final download. Never block the UI thread.
- The download button produces the final asset from the same parameters the preview is showing — no parameter drift between preview and output.
- Existing references: `image-resize` (scale slider with live canvas preview) and the PDF tools' per-page grid are the patterns to follow.

**Never fire a download the user did not ask for.** A tool whose pipeline costs real time (every `video/*` and `audio/*` tool) must not call `downloadBlob` at the end of its handler — after a multi-minute encode that leaves the user with a file in `~/Downloads`, no way to judge it without leaving the browser, and no way to try another preset without redoing everything. Instead:
- Hold the output in `useToolResult(signature)` (`lib/hooks/use-tool-result.ts`) and render `<ToolResult>` (`components/ui/tool-result.tsx`), which plays/displays the file, states the size delta via `compareSizes` (`lib/tools/size-delta.ts`), and owns the **Download** and **Change settings** buttons.
- `signature` must combine `fileSignature(file)` (or `filesSignature(files)`) with **every** option that feeds the pipeline. The hook clears the result as soon as the signature changes, which is what stops the panel from showing a file the controls no longer describe. Forgetting an option there is the bug this design exists to prevent.
- Hide the primary action button while a result is on screen (`{!result && …}`) so there is exactly one obvious next step.
- The panel's strings are shared: `common.result` in both dictionaries, passed from the page as `result={dict.common.result}`. Tools with multiple outputs (`video/split`, `video/frames`, `short-studio`) keep their own per-item result grids and are out of scope for this component.

**Don't claim a number you cannot compute.** `video/compress` encodes at a fixed quantizer (`-q:v`), so output size depends on how hard the footage is to encode and cannot be derived from duration × bitrate the way `audio/extract` does it. The tool's copy promised a size estimate anyway for months. `estimateCompressedSize` (`lib/tools/implementations/video-compress.ts`) answers it honestly by encoding the first few seconds at the chosen preset and scaling up — the "lightweight proxy" rule above, applied to a number instead of a picture. Two constraints learned the hard way: the sample must use **output-side `-t` after `-i`** (before `-i` it trims the input instead), and seeking to a more representative middle is not worth it, because output-side `-ss` decodes everything up to the seek point. Present the result as an approximation and let it fail silently — a missing estimate is fine, a wrong one is not.

**Verifying video tools:** `tests/fixtures/videos/sample-1s.mp4` is a hand-built minimum that browsers refuse to decode, so `<video>` never reports a duration for it; use `playable-4s.mp4` when a test needs real metadata. Note that the mpeg4 encode in ffmpeg.wasm **hangs under Playwright's bundled Chromium** — headed or headless, and for the plain `compressVideo` path too, not just the estimate — so `/video/compress` cannot be covered end-to-end there. It works in a real browser. Cover that tool with unit and component tests instead.

**Every long run must be escapable.** ffmpeg has no cooperative abort — the only exit is `terminate()`, which rejects all in-flight calls and kills the worker. `useFfmpegCancel(busy)` (`lib/hooks/use-ffmpeg-cancel.ts`) packages that:
- Renders nothing itself; the tool shows `{busy && <Button onClick={cancelRun}>{messages.cancelLabel}</Button>}` beside the busy primary button and `{cancelled && <p role="status">{messages.cancelledLabel}</p>}` next to the error slot. Strings come from `common.cancelRun` / `common.runCancelled`.
- Registers a `beforeunload` listener while `busy`. Nothing is persisted server-side, so a stray breadcrumb click during an 8-minute encode destroys the work outright.
- `beginRun()` goes at the top of the handler, before the first await. **`catch` must gate on `wasCancelled()`** — terminate rejects the pending `exec` with `Error('called FFmpeg.terminate()')`, and reporting that as a failure tells the user their file is broken when they simply changed their mind. `wasCancelled()` reads a ref, not state, because the catch runs after an await.
- `terminateFfmpeg()` clears the loader's cached instance on purpose: the terminated object has `loaded === false` and cannot be reused, so the next run re-downloads the core. That cost is accepted in exchange for a working exit.

**Focus must land on something visible.** Tools style their options as a `<label>` wrapping an `sr-only` radio/checkbox, and their file pickers as an `sr-only` `<input type="file">` beside a styled button. `sr-only` clips the control to a 1×1px box, so the base focus ring in `app/globals.css` was being painted on something nobody could see — keyboard users tabbed through the option chips of 31 tools with no indication of where they were. Two selectors in the same `@layer base` block move the ring to the visible proxy (`label:has(> input.sr-only:focus-visible)` and `input.sr-only:focus-visible + button`) and drop it from the hidden control. **Keep the structure those selectors expect**: the hidden control is a direct child of its label, or the immediate previous sibling of its button. Regression-tested in `tests/e2e/focus-visible.spec.ts`, which drives real Tab presses — `element.focus()` does not reliably set `:focus-visible` and would make the test pass without proving anything. Chromium only: WebKit leaves radios and buttons out of the Tab order unless the user enables Full Keyboard Access.

**i18n boundaries:**
- `lib/i18n/config.ts` is the locale source of truth (`locales`, `defaultLocale`, `isLocale`).
- `lib/i18n/dictionary.ts` is `import 'server-only'` — it must never be imported from a `'use client'` file. Server components call `getDictionary(locale)` and pass plain string props down to client components.
- For string templates with placeholders, use `lib/tpl.ts` (`tpl("{n} pages", { n: 3 })`).

**Heavy deps & loading:**
- `lib/ffmpeg-loader.ts` lazily instantiates `@ffmpeg/ffmpeg` once and caches the instance; both `video-convert` and `video-trim` go through it. Core URLs point at `/ffmpeg/ffmpeg-core.{js,wasm}` (the postinstall-copied files).
- `lib/tools/implementations/pdf-to-images.ts` dynamic-imports `pdfjs-dist` and sets `GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'` exactly once. pdf-lib (for merge/split/rotate/from-images) is bundled normally — no worker.

**Styling:** Tailwind v4 with CSS-first config — *no `tailwind.config.js`*. Design tokens live in `app/globals.css` under `@theme inline`, driven by CSS variables under `[data-theme="dark"|"light"]`. Refer to colors as `text-text-muted`, `bg-surface`, `border-border`, etc. (token names, not raw hex). The theme toggle writes `data-theme` to `<html>`; `/public/theme-init.js` mirrors the user's preference before paint to avoid the flash.

## Testing

**Vitest is configured with three projects** (`vitest.config.ts`):
- `unit` — `tests/unit/**`, Node env. Pure logic + scripts.
- `components` — `tests/components/**`, jsdom env, React Testing Library, `tests/setup/vitest.setup.ts` (which stubs `HTMLCanvasElement.toBlob` and `getContext`).
- `setup` — `tests/setup/**` for cross-cutting checks like the i18n key-parity test.

All projects alias `server-only` → `tests/setup/server-only-shim.ts` (a no-op) so server-only modules can be tested. New unit tests must be placed under the right project's `include` pattern or they won't run.

**Playwright** lives in `tests/e2e/`. Files prefixed with `_` (e.g. `_screenshots.spec.ts`) are utility/screenshot scripts, not part of the default acceptance run.

When adding a new tool, the expected coverage is: pure logic test (unit), component interaction test (components), and at minimum one happy-path E2E if user-visible.

## Documentation

**`README.md` and `README.fr.md` are part of every change.** They live next to each other at the root and must stay in sync — the English file is the source of truth, the French file is its translated mirror (same sections, same order, same content). If a change affects anything user-visible or contributor-visible — a new tool, a new category, a stack swap, a new command, a behavior change in the privacy promise, a new value, an updated architecture rule — update **both** READMEs in the same commit as the code.

Things to check on every change:
- **Tool catalog table** — add/remove the entry for the affected category in both files.
- **Tech stack list** — keep it accurate if a library is added, removed, or replaced.
- **Commands table** — sync any `package.json` script change.
- **Architecture / "Anatomy of a tool"** — update if the recipe for adding a tool changes (new mandatory file, new convention).
- **Values / privacy promise** — only edit deliberately; these are load-bearing claims about the product.

If you're unsure whether a change is "user-facing enough" to warrant a README update, it probably is — err on the side of updating. A stale README is worse than a verbose one.

## Pitfalls (learned the hard way)

- **Do not run dev with Turbopack.** `--webpack` is intentional; switching to Turbopack will panic on HMR through `app/[locale]/...`.
- **Do not add `app/layout.tsx`.** The only root layout in Next 16 here is `app/[locale]/layout.tsx`; adding another is a build error.
- **`params` and `searchParams` are async** in every server-side context (pages, layouts, `generateMetadata`, route handlers). Always `await` them.
- **Never inline a `<script>` with raw HTML** in the layout — the theme init script is served as a static file at `/public/theme-init.js` and referenced by `src`. This is both a CSP-friendlier pattern and avoids a known PreToolUse security-hook false-positive (see user memory).
- **ffmpeg's run-command method** (the three-letter one) is invoked via bracket-notation `(ffmpeg as Like)[methodName](args)` in `lib/tools/implementations/video-{convert,trim}.ts` — that indirection is deliberate; don't "clean it up" to a direct call. Same reason as above.
- **Don't use `RegExp.prototype.exec`** directly here either — prefer `string.match(regex)` for the same reason.
- **`server-only` imports** must stay out of client components and out of files imported by client components. The Vitest alias hides the runtime error during tests, so check imports manually for client-side leakage.
- The pre-paint theme script and the postinstall asset copy together mean a clean clone *requires* `npm install` to succeed before `npm run dev` will work end-to-end (ffmpeg/pdf.js features fail otherwise).
- **COOP/COEP do not survive client-side navigation.** They are *document* response headers; an SPA `<Link>`/`router.push` into an isolated route keeps the previous non-isolated document, so `crossOriginIsolated` stays false and ffmpeg-mt throws ("requires cross-origin isolation") even though the headers are served correctly. Every isolated route (FFMPEG_ROUTES in `next.config.ts`) must render `<EnsureCrossOriginIsolated />` — `/video/*` and `/audio/*` get it via their category `layout.tsx`, `/image/remove-bg` renders it in its page. A new isolated category needs both the FFMPEG_ROUTES entry *and* a layout with the guard.
