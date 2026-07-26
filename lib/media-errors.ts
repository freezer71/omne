// Turns an ffmpeg.wasm failure into the one thing the user can act on: why.
//
// Every media tool reported the same dead end — "Could not compress that video."
// — for causes that call for completely different responses. Two of them are
// reliably identifiable:
//
//   - isolation: `lib/ffmpeg-loader.ts` throws this itself when the document is
//     not cross-origin isolated, which happens after a client-side navigation
//     into an isolated route (see the COOP/COEP note in CLAUDE.md). Reloading
//     the page fixes it outright; nothing about the file is wrong.
//   - memory: the wasm heap gave out. The file is fine, it is just too big for
//     the browser to hold — a shorter clip or a smaller preset will work.
//
// Everything else stays on the tool's own wording, which at least names the
// operation that failed. Guessing further would be worse than saying less.

export type MediaErrorKind = 'isolation' | 'memory' | 'unknown';

const ISOLATION = /cross-origin isolation|sharedarraybuffer/i;
// ffmpeg.wasm surfaces heap exhaustion in several shapes depending on where it
// ran out: an Emscripten abort, a bounds failure, or the browser refusing the
// allocation outright.
//
// Every alternative is anchored on word boundaries. Without them `oom` matched
// the "boom" in a test's throwaway error, which is exactly how a real failure
// would end up mislabelled as an out-of-memory and send the user off to shorten
// a file that was never the problem.
const MEMORY =
  /\bout of memory\b|\boom\b|\bmemory access out of bounds\b|\baborted\b|\ballocation (failed|size)\b|\barray buffer allocation failed\b/i;

export function classifyMediaError(error: unknown): MediaErrorKind {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (ISOLATION.test(text)) return 'isolation';
  if (MEMORY.test(text)) return 'memory';
  if (error instanceof RangeError) return 'memory';
  return 'unknown';
}

export type MediaErrorMessages = {
  memory: string;
  isolation: string;
};

export function mediaErrorMessage(
  error: unknown,
  fallback: string,
  messages: MediaErrorMessages,
): string {
  switch (classifyMediaError(error)) {
    case 'isolation':
      return messages.isolation;
    case 'memory':
      return messages.memory;
    default:
      return fallback;
  }
}
