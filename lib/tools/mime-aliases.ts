const EXT_TO_MIMES: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  svg: ['image/svg+xml'],
  mp3: ['audio/mpeg'],
  wav: ['audio/wav', 'audio/x-wav'],
  flac: ['audio/flac', 'audio/x-flac'],
  m4a: ['audio/mp4', 'audio/x-m4a'],
  aac: ['audio/aac'],
  ogg: ['audio/ogg'],
  opus: ['audio/opus'],
  mp4: ['video/mp4'],
  webm: ['video/webm'],
  mov: ['video/quicktime'],
  mkv: ['video/x-matroska'],
  json: ['application/json'],
  csv: ['text/csv'],
  tsv: ['text/tab-separated-values'],
};

export function mimesForToken(token: string): readonly string[] {
  return EXT_TO_MIMES[token.toLowerCase()] ?? [];
}

export function matchesAcceptedMime(acceptedMime: readonly string[], token: string): boolean {
  const candidates = mimesForToken(token);
  if (candidates.length === 0) return false;
  return acceptedMime.some((m) => candidates.includes(m));
}
