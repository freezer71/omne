import type { NextConfig } from "next";

// Content-Security-Policy:
// - default-src 'self': everything from the same origin by default.
// - script-src / style-src 'unsafe-inline': required by Next.js runtime (no nonces yet).
// - img-src data: blob:: tools render preview images from local blobs/data URLs.
// - connect-src exceptions:
//     * huggingface.co + cdn-lfs.huggingface.co: image-remove-bg fetches RMBG-1.4 model
//     * www.skills.sh: dev/skills-browse proxy (documented exception to "no backend" claim)
// - worker-src blob:: pdf.js and ffmpeg workers are spawned from blob URLs.
// - frame-ancestors 'none': disallow embedding to prevent clickjacking.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
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
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const IMMUTABLE_CACHE = [
  { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
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
      {
        source: '/ffmpeg/:path*',
        headers: IMMUTABLE_CACHE,
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
