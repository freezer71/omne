export const TOOL_CATEGORIES = ['pdf', 'video', 'audio', 'image', 'svg', 'password', 'json', 'xml', 'text', 'reading', 'encode', 'qr', 'color', 'utility', 'dev'] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export type ToolStatus = 'stable' | 'beta' | 'soon';

/** Sanctioned network behavior. Absent = strictly zero runtime network traffic. */
export type ToolNetwork = 'proxy' | 'model-download';

export type ToolMeta = {
  id: string;
  category: ToolCategory;
  href: string;
  i18nKey: string;
  keywords: string[];
  acceptedMime: string[];
  status: ToolStatus;
  network?: ToolNetwork;
};

export function isToolCategory(value: string): value is ToolCategory {
  return (TOOL_CATEGORIES as readonly string[]).includes(value);
}
