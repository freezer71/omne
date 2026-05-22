import type { ImageMime } from '@/lib/image-utils';

const SUPPORTED_TYPES: ReadonlyArray<ImageMime> = ['image/png', 'image/webp', 'image/jpeg'];

type ClipboardItemLike = {
  readonly types: ReadonlyArray<string>;
  getType: (type: string) => Promise<Blob>;
};

export async function extractImageBlobFromClipboardItems(
  items: ReadonlyArray<ClipboardItemLike>,
): Promise<Blob | null> {
  for (const preferred of SUPPORTED_TYPES) {
    const item = items.find((it) => it.types.includes(preferred));
    if (item) return item.getType(preferred);
  }
  for (const item of items) {
    const fallback = item.types.find((t) => t.startsWith('image/'));
    if (fallback) return item.getType(fallback);
  }
  return null;
}

export function extractImageFileFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  const items = Array.from(dt.items ?? []);
  const imageItem = items.find(
    (it) => it.kind === 'file' && it.type.startsWith('image/'),
  );
  if (imageItem) {
    const file = imageItem.getAsFile();
    if (file) return file;
  }
  const files = Array.from(dt.files ?? []);
  return files.find((f) => f.type.startsWith('image/')) ?? null;
}
