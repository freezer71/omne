This directory holds FFmpeg WebAssembly assets self-hosted to keep the privacy
promise (no third-party CDN call when the user opens a video tool).

The `.js` and `.wasm` files here are **generated** by `scripts/copy-ffmpeg.mjs`
during `npm install` (postinstall hook). They are git-ignored — do not commit
them or edit them by hand.

If they are missing, run `node scripts/copy-ffmpeg.mjs`.
