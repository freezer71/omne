import 'server-only';
import { ImageResponse } from 'next/og';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getTool, TOOLS, toolsByCategory } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';
import { SITE_NAME } from '@/lib/seo/site';
import { OgTemplate, type OgTemplateData, type IconSpec, type OgVariant } from './template';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

type ToolDictNode = {
  name?: string;
  description?: string;
  seo?: {
    title?: string;
    description?: string;
    ogTitle?: string;
  };
};

type MetaDictNode = {
  siteName?: string;
  tagline?: string;
  seo?: { description?: string; ogTitle?: string };
};

type PrivacyDictNode = {
  title?: string;
  leadParagraph?: string;
  seo?: { description?: string; ogTitle?: string };
};

type HubInput = { kind: 'hub'; locale: Locale };
type PrivacyInput = { kind: 'privacy'; locale: Locale };
type ToolInput = {
  kind: 'tool';
  locale: Locale;
  category: ToolCategory;
  id: string;
};
type CategoryInput = {
  kind: 'category';
  locale: Locale;
  category: ToolCategory;
};

export type OgInput = HubInput | PrivacyInput | ToolInput | CategoryInput;

type CategoryDictNode = {
  name?: string;
  intro?: string;
  seo?: { title?: string; description?: string; ogTitle?: string };
};

function privacyBadge(locale: Locale): string {
  return locale === 'fr' ? '100 % local · aucun envoi' : '100% local · no upload';
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1).trimEnd();
  return `${slice}…`;
}

export async function buildOgImage(input: OgInput): Promise<ImageResponse> {
  const dict = (await getDictionary(input.locale)) as unknown as {
    meta?: MetaDictNode;
    privacy?: PrivacyDictNode;
    hub?: { categories?: Record<string, string> };
    tools?: Record<string, Record<string, ToolDictNode>>;
    categories?: Record<string, CategoryDictNode>;
  };

  let title: string;
  let description: string;
  let category: string | undefined;
  let variant: OgVariant;
  let gridIcons: IconSpec[] | undefined;
  let heroIcon: IconSpec | undefined;

  if (input.kind === 'hub') {
    const meta = dict.meta ?? {};
    title = meta.seo?.ogTitle ?? meta.siteName ?? SITE_NAME;
    description = meta.tagline ?? '';
    variant = 'hub';
    gridIcons = TOOLS.map((t) => ({ category: t.category, id: t.id }));
  } else if (input.kind === 'privacy') {
    const privacy = dict.privacy ?? {};
    title = privacy.seo?.ogTitle ?? privacy.title ?? 'Privacy';
    description = privacy.leadParagraph ?? '';
    variant = 'privacy';
  } else if (input.kind === 'category') {
    const node = dict.categories?.[input.category];
    const label = dict.hub?.categories?.[input.category] ?? input.category;
    title = node?.seo?.ogTitle ?? node?.name ?? label;
    description = node?.intro ?? node?.seo?.description ?? '';
    variant = 'category';
    gridIcons = (toolsByCategory()[input.category] ?? []).map((t) => ({
      category: t.category,
      id: t.id,
    }));
  } else {
    const tool = getTool(input.category, input.id);
    const node = dict.tools?.[input.category]?.[input.id];
    if (!tool || !node) {
      title = input.id;
      description = '';
    } else {
      title = node.seo?.ogTitle ?? node.name ?? input.id;
      description = node.description ?? '';
    }
    category = dict.hub?.categories?.[input.category];
    variant = 'tool';
    heroIcon = { category: input.category, id: input.id };
  }

  const templateProps: OgTemplateData = {
    brand: SITE_NAME,
    title: truncate(title, 60),
    description: truncate(description, 180),
    privacyBadge: privacyBadge(input.locale),
    variant,
    ...(category ? { category } : {}),
    ...(gridIcons ? { gridIcons } : {}),
    ...(heroIcon ? { heroIcon } : {}),
  };

  return new ImageResponse(<OgTemplate {...templateProps} />, OG_SIZE);
}
