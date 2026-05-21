import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
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
