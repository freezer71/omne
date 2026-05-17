import type { ToolMeta, ToolCategory } from './types';

const IMG_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

export const TOOLS: readonly ToolMeta[] = [
  {
    id: 'merge',
    category: 'pdf',
    href: '/pdf/merge',
    i18nKey: 'tools.pdf.merge',
    keywords: ['merge', 'combine', 'join', 'pdf', 'fusion', 'fusionner'],
    acceptedMime: ['application/pdf'],
    status: 'stable',
  },
  {
    id: 'split',
    category: 'pdf',
    href: '/pdf/split',
    i18nKey: 'tools.pdf.split',
    keywords: ['split', 'extract', 'pages', 'pdf', 'decouper', 'découper'],
    acceptedMime: ['application/pdf'],
    status: 'stable',
  },
  {
    id: 'rotate',
    category: 'pdf',
    href: '/pdf/rotate',
    i18nKey: 'tools.pdf.rotate',
    keywords: ['rotate', 'orientation', 'pdf', 'pivoter'],
    acceptedMime: ['application/pdf'],
    status: 'stable',
  },
  {
    id: 'to-images',
    category: 'pdf',
    href: '/pdf/to-images',
    i18nKey: 'tools.pdf.to-images',
    keywords: ['pdf', 'png', 'jpg', 'image', 'render', 'export'],
    acceptedMime: ['application/pdf'],
    status: 'stable',
  },
  {
    id: 'from-images',
    category: 'pdf',
    href: '/pdf/from-images',
    i18nKey: 'tools.pdf.from-images',
    keywords: ['image', 'png', 'jpg', 'pdf', 'combine'],
    acceptedMime: IMG_MIMES,
    status: 'stable',
  },
  {
    id: 'convert',
    category: 'video',
    href: '/video/convert',
    i18nKey: 'tools.video.convert',
    keywords: ['video', 'convert', 'mp4', 'webm', 'gif', 'convertir'],
    acceptedMime: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
    status: 'stable',
  },
  {
    id: 'trim',
    category: 'video',
    href: '/video/trim',
    i18nKey: 'tools.video.trim',
    keywords: ['video', 'trim', 'cut', 'clip', 'decouper', 'découper'],
    acceptedMime: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
    status: 'stable',
  },
  {
    id: 'convert',
    category: 'image',
    href: '/image/convert',
    i18nKey: 'tools.image.convert',
    keywords: ['image', 'convert', 'png', 'jpg', 'jpeg', 'webp', 'convertir', 'format'],
    acceptedMime: IMG_MIMES,
    status: 'stable',
  },
  {
    id: 'compress',
    category: 'image',
    href: '/image/compress',
    i18nKey: 'tools.image.compress',
    keywords: ['image', 'compress', 'reduce', 'size', 'compresser', 'reduire', 'réduire', 'optimize'],
    acceptedMime: IMG_MIMES,
    status: 'stable',
  },
  {
    id: 'resize',
    category: 'image',
    href: '/image/resize',
    i18nKey: 'tools.image.resize',
    keywords: ['image', 'resize', 'scale', 'redimensionner', 'taille', 'dimensions'],
    acceptedMime: IMG_MIMES,
    status: 'stable',
  },
  {
    id: 'crop',
    category: 'image',
    href: '/image/crop',
    i18nKey: 'tools.image.crop',
    keywords: ['image', 'crop', 'cut', 'rogner', 'recadrer', 'decouper', 'découper'],
    acceptedMime: IMG_MIMES,
    status: 'stable',
  },
  {
    id: 'rotate-flip',
    category: 'image',
    href: '/image/rotate-flip',
    i18nKey: 'tools.image.rotate-flip',
    keywords: ['image', 'rotate', 'flip', 'mirror', 'pivoter', 'miroir', 'retourner'],
    acceptedMime: IMG_MIMES,
    status: 'stable',
  },
  {
    id: 'remove-bg',
    category: 'image',
    href: '/image/remove-bg',
    i18nKey: 'tools.image.remove-bg',
    keywords: ['image', 'remove', 'background', 'bg', 'detourer', 'détourer', 'transparent', 'ai', 'ia'],
    acceptedMime: IMG_MIMES,
    status: 'beta',
  },
] as const;

export function getTool(category: string, id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.category === category && t.id === id);
}

export function toolsByCategory(): Partial<Record<ToolCategory, ToolMeta[]>> {
  const acc: Partial<Record<ToolCategory, ToolMeta[]>> = {};
  for (const t of TOOLS) {
    (acc[t.category] ??= []).push(t);
  }
  return acc;
}

export function toolsForMime(mime: string): ToolMeta[] {
  return TOOLS.filter((t) => t.acceptedMime.includes(mime));
}
