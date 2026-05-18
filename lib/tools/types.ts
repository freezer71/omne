export const TOOL_CATEGORIES = ['pdf', 'video', 'audio', 'image', 'svg', 'password', 'json', 'text', 'encode', 'qr', 'color', 'utility'] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export type ToolStatus = 'stable' | 'beta' | 'soon';

export type ToolMeta = {
  id: string;
  category: ToolCategory;
  href: string;
  i18nKey: string;
  keywords: string[];
  acceptedMime: string[];
  status: ToolStatus;
};

export function isToolCategory(value: string): value is ToolCategory {
  return (TOOL_CATEGORIES as readonly string[]).includes(value);
}
