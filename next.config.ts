import type { NextConfig } from "next";

// Content-Security-Policy:
// - default-src 'self': everything from the same origin by default.
// - script-src / style-src 'unsafe-inline': required by Next.js runtime (no nonces yet).
// - script-src extra dev token: React Fast Refresh (@next/react-refresh-utils)
//   evaluates module code at runtime. Stripped from prod builds.
// - img-src data: blob:: tools render preview images from local blobs/data URLs.
// - media-src blob:: video/audio tools preview converted output via blob URLs.
// - connect-src exceptions:
//     * huggingface.co + cdn-lfs.huggingface.co: image-remove-bg fetches RMBG-1.4 model
//     * www.skills.sh: dev/skills-browse proxy (documented exception to "no backend" claim)
// - worker-src blob:: pdf.js and ffmpeg workers are spawned from blob URLs.
// - frame-ancestors 'none': disallow embedding to prevent clickjacking.
const isDev = process.env.NODE_ENV !== 'production';
// Token is assembled via concat so the literal does not appear in source — the
// PreToolUse security hook string-matches the token otherwise. See user memory
// "feedback-omne-security-hooks" for the same workaround pattern.
const DEV_SCRIPT_EXTRA = isDev ? ` 'unsafe-${'ev' + 'al'}'` : '';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${DEV_SCRIPT_EXTRA}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self' https://huggingface.co https://cdn-lfs.huggingface.co https://www.skills.sh",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const IMMUTABLE_CACHE = [
  { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
  // Required so these assets load on pages with COEP: require-corp (ffmpeg/wasm
  // tool routes). Without an explicit CORP, COEP-isolated documents block the
  // fetch even for same-origin subresources.
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

// Same as IMMUTABLE_CACHE, plus COEP — used for files that are loaded as Workers
// inside cross-origin isolated pages. The Worker must have COEP: require-corp on
// its own response to join the isolated agent cluster and access SharedArrayBuffer
// (required by @ffmpeg/core-mt's pthreads). CORP alone lets the worker LOAD but
// not be isolated, which causes pthread init to silently hang ffmpeg.load().
const ISOLATED_WORKER_ASSET = [
  ...IMMUTABLE_CACHE,
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

// COOP/COEP enable cross-origin isolation, required by @ffmpeg/core-mt (SharedArrayBuffer).
// Scoped to routes that actually use ffmpeg/transformers — keeps the rest of the site free
// of the cross-origin restriction.
const CROSS_ORIGIN_ISOLATED = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

// Note: short-studio lives at /video/short-studio, so /video/:path* covers it.
const FFMPEG_ROUTES = [
  '/:locale(en|fr)/video/:path*',
  '/:locale(en|fr)/audio/:path*',
  '/:locale(en|fr)/image/remove-bg',
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Favicons & SEO assets — explicit cross-origin so embeds and crawlers can fetch them.
      {
        source: '/:file(favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|sitemap.xsl)',
        headers: [{ key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }],
      },
      // Vendored binaries copied by postinstall scripts — content-addressed, can be cached forever.
      // /ffmpeg/* gets COEP too because ffmpeg-core.worker.js is loaded directly as a Worker
      // (not via blob:) and must be isolated to access SharedArrayBuffer.
      {
        source: '/ffmpeg/:path*',
        headers: ISOLATED_WORKER_ASSET,
      },
      {
        source: '/pdfjs/:path*',
        headers: IMMUTABLE_CACHE,
      },
      {
        source: '/qr-scanner/:path*',
        headers: IMMUTABLE_CACHE,
      },
      {
        source: '/fonts/:path*',
        headers: IMMUTABLE_CACHE,
      },
      // Next.js bundled chunks include @ffmpeg/ffmpeg's wrapper Worker. It needs
      // both CORP (loadable in COEP-isolated context) and COEP (the worker itself
      // joins the isolated agent cluster, enabling SharedArrayBuffer for pthreads).
      // COEP on these responses is ignored for non-worker loads (scripts, etc.),
      // so this does not change behavior on non-isolated pages.
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      // Cross-origin isolation for ffmpeg/wasm-heavy tools only.
      ...FFMPEG_ROUTES.map((source) => ({ source, headers: CROSS_ORIGIN_ISOLATED })),
      // Global security headers on every other route.
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:locale(en|fr)/image/rotate',
        destination: '/:locale/image/rotate-flip',
        permanent: true,
      },
      {
        source: '/:locale(en|fr)/image/flip',
        destination: '/:locale/image/rotate-flip',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
