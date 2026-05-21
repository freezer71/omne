import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/seo/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Privacy-first browser toolkit`,
    short_name: SITE_NAME,
    description:
      'Free online tools that run entirely in your browser. Merge PDFs, convert images, trim videos, generate passwords — no upload, no signup, no tracking.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    lang: 'en',
    categories: ['utilities', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
