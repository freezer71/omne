import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:file(favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|sitemap.xsl)',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
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
