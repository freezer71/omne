import { getTool, toolsForMime } from './registry';
import type { ToolMeta } from './types';

export type RouteResult =
  | { kind: 'direct'; tool: ToolMeta; files: File[] }
  | { kind: 'choose'; tools: ToolMeta[]; files: File[] }
  | { kind: 'unsupported'; files: File[] };

const IMG_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function allHaveMime(files: File[], predicate: (mime: string) => boolean): boolean {
  return files.length > 0 && files.every((f) => predicate(f.type));
}

export function routeDroppedFiles(files: File[]): RouteResult {
  if (files.length === 0) return { kind: 'unsupported', files };

  // 2+ PDFs → merge directly
  if (files.length > 1 && allHaveMime(files, (m) => m === 'application/pdf')) {
    const tool = getTool('pdf', 'merge')!;
    return { kind: 'direct', tool, files };
  }

  // 2+ images → images-to-pdf directly
  if (files.length > 1 && allHaveMime(files, (m) => IMG_MIMES.has(m))) {
    const tool = getTool('pdf', 'from-images')!;
    return { kind: 'direct', tool, files };
  }

  // Single .json file → JSON Formatter directly (avoids a "choose" between 7 JSON tools)
  if (files.length === 1 && files[0]?.type === 'application/json') {
    const tool = getTool('json', 'format');
    if (tool) return { kind: 'direct', tool, files };
  }

  // Single file: get all tools that accept its MIME
  const onlyFile = files.length === 1 ? files[0] : undefined;
  if (onlyFile) {
    const candidates = toolsForMime(onlyFile.type);
    const first = candidates[0];
    if (!first) return { kind: 'unsupported', files };
    if (candidates.length === 1) return { kind: 'direct', tool: first, files };
    return { kind: 'choose', tools: candidates, files };
  }

  // Mixed or otherwise unhandled
  return { kind: 'unsupported', files };
}
